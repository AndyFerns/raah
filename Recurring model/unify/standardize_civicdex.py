import pandas as pd
import numpy as np
from unify.config import map_score, normalize_domain, normalize_subdomain, SEVERITY_RANGES, URGENCY_RANGES

def standardize_civicdex():
    print("Loading CivicDex datasets...")
    main_df = pd.read_csv('datasets/civicdex_dataset/main.csv')
    adapted_df = pd.read_csv('datasets/civicdex_dataset/adpated.csv')
    
    # Check for new request_ids in adapted_df
    new_records = adapted_df[~adapted_df['request_id'].isin(main_df['request_id'])]
    if len(new_records) > 0:
        print(f"Adding {len(new_records)} new records from adpated.csv")
        # Ensure they have the same columns before concat
        # We only need specific columns for mapping
        df = pd.concat([main_df, new_records], ignore_index=True)
    else:
        print("adpated.csv contains no new records. Using main.csv only.")
        df = main_df

    # Map columns
    unified = pd.DataFrame()
    unified['challenge_id'] = 'CDX_' + df['request_id'].astype(str)
    unified['problem_text'] = df['english_gloss']          # genuine citizen-reported text
    unified['generated_problem_text'] = np.nan             # no generated text for CivicDex
    unified['problem_text_source'] = np.where(df['english_gloss'].notna(), 'original', 'missing')
    unified['domain'] = df['category'].apply(normalize_domain)
    unified['subdomain'] = df['category'].apply(normalize_subdomain)
    unified['district'] = df['district']
    unified['locality'] = df['locality']
    
    # Missing geographic and temporal fields
    unified['latitude_approx'] = np.nan
    unified['longitude_approx'] = np.nan
    unified['coordinate_source'] = 'missing'   # CivicDex has no coordinate data
    unified['report_date'] = pd.NaT
    
    unified['severity_score'] = df['severity'].apply(lambda x: map_score(x, SEVERITY_RANGES))
    unified['urgency_score'] = df['urgency'].apply(lambda x: map_score(x, URGENCY_RANGES))
    unified['affected_population'] = np.nan
    unified['source_type'] = df['source_type']
    unified['evidence_type'] = np.nan
    unified['ward_code'] = np.nan
    unified['zone'] = np.nan
    unified['ward_type'] = np.nan
    unified['department'] = df['department']
    unified['intent'] = df['intent']
    unified['is_season'] = np.nan
    
    # Initialize derived and label columns as NULL
    unified['previous_similar_report_count'] = np.nan
    unified['days_since_previous_similar'] = np.nan
    unified['distance_from_previous_km'] = np.nan
    unified['semantic_similarity'] = np.nan
    unified['category_similarity'] = np.nan   # Not applicable for text-based records
    unified['lexical_similarity'] = np.nan
    unified['same_subdomain'] = np.nan
    unified['is_recurring'] = np.nan
    unified['recurrence_category'] = np.nan
    unified['recurring_group_id'] = np.nan
    
    unified['source_dataset'] = 'civicdex'
    unified['source_record_id'] = unified['challenge_id']
    
    return unified

if __name__ == "__main__":
    df_cdx = standardize_civicdex()
    print("Standardized CivicDex dataset shape:", df_cdx.shape)
    df_cdx.to_csv('datasets/unified_dataset/civicdex_standardized.csv', index=False)
    print("Saved to datasets/unified_dataset/civicdex_standardized.csv")
