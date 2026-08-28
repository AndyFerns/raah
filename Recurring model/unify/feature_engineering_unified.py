import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import time
from tqdm import tqdm
from unify.config import SEM_SIM_THRESH, DIST_THRESH_KM

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    if pd.isna(lat1) or pd.isna(lon1) or pd.isna(lat2) or pd.isna(lon2):
        return np.nan
    R = 6371.0 # Earth radius in kilometers
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    return R * c

def jaccard_similarity(str1, str2):
    if pd.isna(str1) or pd.isna(str2):
        return np.nan
    set1 = set(str(str1).lower().split())
    set2 = set(str(str2).lower().split())
    if not set1 or not set2:
        return 0.0
    return len(set1.intersection(set2)) / len(set1.union(set2))

def feature_engineering_unified():
    print("Loading unified base dataset...")
    df = pd.read_csv('datasets/unified_dataset/unified_base.csv', low_memory=False)
    df['report_date'] = pd.to_datetime(df['report_date'])
    
    # Pre-sort: dated records first (ascending), then undated
    df_dated = df[df['report_date'].notna()].sort_values('report_date').copy()
    df_undated = df[df['report_date'].isna()].copy()
    
    df = pd.concat([df_dated, df_undated]).reset_index(drop=True)
    
    # We will process BMC (no text) vectorially for speed (~960k rows)
    # And Text records (Synthetic + CivicDex) with FAISS (~1.6k rows)
    
    print("Processing BMC (non-text) records via chunked proxy similarity (Zone by Zone)...")
    bmc_mask = (df['source_dataset'] == 'bmc')
    df_bmc = df[bmc_mask].copy()
    
    # We will process BMC one zone at a time to save memory, as our proxy matches
    # (locality, zone, subdomain) never cross zone boundaries.
    processed_dfs = []
    
    zones = df_bmc['zone'].unique()
    for current_zone in zones:
        if pd.isna(current_zone):
            z_df = df_bmc[df_bmc['zone'].isna()].copy()
        else:
            z_df = df_bmc[df_bmc['zone'] == current_zone].copy()
            
        print(f"  -> Processing Zone: {current_zone} ({len(z_df)} records)")
        
        # Sort chronologically with tie-breaking on challenge_id to ensure deterministic
        # ordering within the same date (prevents arbitrary future-record leakage)
        z_df = z_df.sort_values(['report_date', 'challenge_id'])
        
        # Temporal safety assertion: after sort, no shifted date should be greater than current
        prev_dates = z_df.groupby(['locality', 'subdomain'])['report_date'].shift(1)
        violation = (prev_dates > z_df['report_date']).sum()
        if violation > 0:
            raise ValueError(f"TEMPORAL LEAKAGE DETECTED in zone {current_zone}: {violation} records have a 'previous' record dated after them.")
        
        # Calculate previous count (same locality + subdomain)
        z_df['previous_similar_report_count'] = z_df.groupby(['locality', 'subdomain']).cumcount()
        
        # Calculate days since best match (ward-level, zone-level)
        z_df['prev_date_full_match']    = z_df.groupby(['locality', 'subdomain', 'source_type'])['report_date'].shift(1)
        z_df['prev_date_partial_match'] = z_df.groupby(['locality', 'subdomain'])['report_date'].shift(1)
        z_df['prev_date_zone_match']    = z_df.groupby(['zone', 'subdomain'])['report_date'].shift(1)
        
        # Fully vectorized boolean flags for this zone
        has_full_match    = z_df['prev_date_full_match'].notna()
        has_partial_match = z_df['prev_date_partial_match'].notna() & ~has_full_match
        has_zone_match    = z_df['prev_date_zone_match'].notna() & ~has_full_match & ~has_partial_match
        
        # Days since previous similar
        z_df['days_since_previous_similar'] = np.where(
            has_full_match,
            (pd.to_datetime(z_df['report_date']) - pd.to_datetime(z_df['prev_date_full_match'])).dt.days,
            np.where(
                has_partial_match,
                (pd.to_datetime(z_df['report_date']) - pd.to_datetime(z_df['prev_date_partial_match'])).dt.days,
                np.where(
                    has_zone_match,
                    (pd.to_datetime(z_df['report_date']) - pd.to_datetime(z_df['prev_date_zone_match'])).dt.days,
                    np.nan
                )
            )
        )
        
        # Category-based similarity proxy (NOT semantic similarity — explicitly named separately)
        # Values reflect match quality: 0.90 = same locality+subdomain+source_type,
        #                               0.75 = same locality+subdomain,
        #                               0.60 = same zone+subdomain only
        z_df['category_similarity'] = np.where(
            has_full_match,    0.90,
            np.where(has_partial_match, 0.75,
            np.where(has_zone_match,    0.60, np.nan))
        )
        # semantic_similarity remains NaN for all BMC rows — no genuine text available
        z_df['semantic_similarity'] = np.nan
        
        # Same subdomain
        z_df['same_subdomain'] = np.where(
            has_full_match | has_partial_match | has_zone_match, 1.0, np.nan
        )
        
        # Hierarchical distance imputation
        DIST_SAME_WARD  = 1.0
        DIST_SAME_ZONE  = 5.0
        
        z_df['distance_from_previous_km'] = np.where(
            has_full_match | has_partial_match, DIST_SAME_WARD,
            np.where(has_zone_match,            DIST_SAME_ZONE, np.nan)
        )
        
        z_df['lexical_similarity'] = np.nan
        
        processed_dfs.append(z_df)
        
        # Free memory for the zone chunk
        del z_df
        del has_full_match
        del has_partial_match
        del has_zone_match
    
    # Recombine all processed zones
    df_bmc_processed = pd.concat(processed_dfs)
    
    # Update master df with BMC features
    print("Updating master dataframe with BMC features...")
    df.loc[df_bmc_processed.index, 'previous_similar_report_count'] = df_bmc_processed['previous_similar_report_count']
    df.loc[df_bmc_processed.index, 'days_since_previous_similar']   = df_bmc_processed['days_since_previous_similar']
    df.loc[df_bmc_processed.index, 'category_similarity']           = df_bmc_processed['category_similarity']
    df.loc[df_bmc_processed.index, 'semantic_similarity']           = np.nan  # Never populated for BMC
    df.loc[df_bmc_processed.index, 'same_subdomain']                = df_bmc_processed['same_subdomain']
    df.loc[df_bmc_processed.index, 'distance_from_previous_km']     = df_bmc_processed['distance_from_previous_km']
    
    print("Cleaning up BMC memory...")
    import gc
    del df_bmc
    del df_bmc_processed
    del processed_dfs
    gc.collect()
    
    print("Processing Text records (Synthetic + CivicDex) with FAISS...")
    # Filter strictly on problem_text_source == 'original' to exclude BMC generated text
    text_mask = (df['problem_text_source'] == 'original') & df['problem_text'].notna()
    text_indices = df[text_mask].index.tolist()
    
    # Accumulate match pairs for the similarity threshold audit
    match_pairs = []  # list of dicts: {current_challenge_id, matched_challenge_id, semantic_similarity, distance_km}
    
    if len(text_indices) > 0:
        print("Loading SentenceTransformer model...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        texts = df.loc[text_indices, 'problem_text'].tolist()
        print(f"Generating embeddings for {len(texts)} text records...")
        embeddings = model.encode(texts, show_progress_bar=True)
        # Normalize for cosine similarity
        faiss.normalize_L2(embeddings)
        
        dim = embeddings.shape[1]
        print("Initializing FAISS index...")
        index = faiss.IndexFlatIP(dim)
        
        # We process text records one by one to ensure chronological integrity
        
        count_vals = []
        days_vals = []
        dist_vals = []
        sim_vals = []
        lex_vals = []
        sub_vals = []
        
        print("Running similarity search and reranking...")
        # Since FAISS is global, we build it incrementally. 
        # But CivicDex is undated, so it should only search against Synthetic (which are dated and added before it).
        
        added_to_index = 0
        
        for i, df_idx in enumerate(tqdm(text_indices)):
            row = df.loc[df_idx]
            current_emb = embeddings[i].reshape(1, -1)
            
            # For candidate retrieval, we query the FAISS index with all previously added embeddings
            if added_to_index > 0:
                k = min(added_to_index, 50) # top 50
                distances, indices = index.search(current_emb, k)
                
                best_final_score = -1
                best_candidate_idx = -1
                sim_count = 0
                
                # Reranking logic
                for rank, (cand_faiss_idx, sem_sim) in enumerate(zip(indices[0], distances[0])):
                    if cand_faiss_idx < 0:
                        continue
                    
                    cand_df_idx = text_indices[cand_faiss_idx]
                    cand_row = df.loc[cand_df_idx]
                    
                    # Calculate distance
                    dist_km = haversine(row['latitude_approx'], row['longitude_approx'], 
                                        cand_row['latitude_approx'], cand_row['longitude_approx'])
                    
                    # Candidate filtering
                    same_locality = (row['locality'] == cand_row['locality'] and pd.notna(row['locality']))
                    same_district = (row['district'] == cand_row['district'] and pd.notna(row['district']))
                    
                    is_sim = False
                    if sem_sim >= SEM_SIM_THRESH:
                        if pd.notna(dist_km) and dist_km <= DIST_THRESH_KM:
                            is_sim = True
                        elif pd.isna(dist_km) and (same_locality or same_district):
                            is_sim = True
                    
                    if is_sim:
                        sim_count += 1
                        
                    # Reranking score: Semantic Sim - Geographic penalty
                    penalty = 0.0
                    if pd.notna(dist_km):
                        penalty = min(dist_km, 100) / 100.0 * 0.1 # max 0.1 penalty
                    else:
                        if not same_locality and not same_district:
                            penalty = 0.05
                            
                    final_score = sem_sim - penalty
                    
                    if final_score > best_final_score:
                        best_final_score = final_score
                        best_candidate_idx = cand_df_idx
                
                if best_candidate_idx != -1:
                    best_cand = df.loc[best_candidate_idx]
                    raw_sem_sim = best_final_score + penalty  # restore raw cosine similarity
                    dist_km = haversine(row['latitude_approx'], row['longitude_approx'],
                                       best_cand['latitude_approx'], best_cand['longitude_approx'])
                    
                    # Extract final features
                    count_vals.append(sim_count)
                    sim_vals.append(raw_sem_sim)
                    
                    if pd.notna(row['report_date']) and pd.notna(best_cand['report_date']):
                        days_vals.append((row['report_date'] - best_cand['report_date']).days)
                    else:
                        days_vals.append(np.nan)
                        
                    dist_vals.append(dist_km)
                    lex_vals.append(jaccard_similarity(row['problem_text'], best_cand['problem_text']))
                    
                    if pd.notna(row['subdomain']) and pd.notna(best_cand['subdomain']):
                        sub_vals.append(1.0 if row['subdomain'] == best_cand['subdomain'] else 0.0)
                    else:
                        sub_vals.append(np.nan)
                    
                    # Store match pair for threshold audit
                    match_pairs.append({
                        'current_challenge_id':  row.get('challenge_id', df_idx),
                        'matched_challenge_id':  best_cand.get('challenge_id', best_candidate_idx),
                        'semantic_similarity':   raw_sem_sim,
                        'distance_km':           dist_km,
                    })
                        
                else:
                    count_vals.append(0)
                    days_vals.append(np.nan)
                    dist_vals.append(np.nan)
                    sim_vals.append(np.nan)
                    lex_vals.append(np.nan)
                    sub_vals.append(np.nan)
            else:
                count_vals.append(0)
                days_vals.append(np.nan)
                dist_vals.append(np.nan)
                sim_vals.append(np.nan)
                lex_vals.append(np.nan)
                sub_vals.append(np.nan)
            
            # Add current to index (only if dated, because undated CivicDex records shouldn't be matched against by other records since chronology is unknown, 
            # BUT CivicDex records can match against CivicDex records if we just accept arbitrary ordering. Let's strictly only add dated records to history).
            if pd.notna(row['report_date']):
                index.add(current_emb)
                added_to_index += 1
                
        # Assign back
        df.loc[text_indices, 'previous_similar_report_count'] = count_vals
        df.loc[text_indices, 'days_since_previous_similar'] = days_vals
        df.loc[text_indices, 'distance_from_previous_km'] = dist_vals
        df.loc[text_indices, 'semantic_similarity'] = sim_vals
        df.loc[text_indices, 'lexical_similarity'] = lex_vals
        df.loc[text_indices, 'same_subdomain'] = sub_vals
        
        # Save embeddings
        np.save('datasets/unified_dataset/unified_embeddings.npy', embeddings)
        
        # Save match pairs for similarity threshold audit
        if match_pairs:
            import os
            pairs_df = pd.DataFrame(match_pairs)
            pairs_df.to_csv('datasets/unified_dataset/text_record_match_pairs.csv', index=False)
            print(f"Saved {len(pairs_df)} match pairs to text_record_match_pairs.csv")
        
    print("Saving engineered dataset...")
    df.to_csv('datasets/unified_dataset/unified_feature_engineered.csv', index=False)
    print("Done!")

if __name__ == "__main__":
    feature_engineering_unified()
