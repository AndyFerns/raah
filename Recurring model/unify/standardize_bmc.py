import pandas as pd
import numpy as np
from unify.config import map_score, normalize_domain, normalize_subdomain, SEVERITY_RANGES, MONSOON_MONTHS

def standardize_bmc():
    print("Loading BMC datasets...")
    train = pd.read_csv('datasets/mumbai_dataset/bmc_train.csv')
    test = pd.read_csv('datasets/mumbai_dataset/bmc_test.csv')
    df = pd.concat([train, test], ignore_index=True)
    
    # Map columns
    unified = pd.DataFrame()
    unified['challenge_id'] = 'BMC_' + df['complaint_id'].astype(str)

    # BMC has NO genuine citizen-written problem text.
    # problem_text = NaN (original absence preserved).
    # generated_problem_text stores a metadata template for potential experimentation only —
    # it MUST NOT be used as equivalent to real citizen text or for semantic similarity.
    unified['problem_text'] = np.nan
    unified['generated_problem_text'] = df.apply(
        lambda row: f"A complaint regarding {str(row['complaint_category']).lower()} was reported to the {str(row['department_assigned']).title()} department in {str(row['ward_area']).title()}.",
        axis=1
    )
    unified['problem_text_source'] = 'missing'  # no original text available

    unified['domain'] = df['complaint_category'].apply(normalize_domain)
    unified['subdomain'] = df['complaint_category'].apply(normalize_subdomain)
    unified['district'] = np.nan
    unified['locality'] = df['ward_area']
    
    # Ward coordinates: merge from geocoded cache.
    # All coordinates in bmc_ward_coordinates.csv are ward-level polygon centroids.
    try:
        coords_df = pd.read_csv('datasets/mumbai_dataset/bmc_ward_coordinates.csv')
        df = pd.merge(df, coords_df, on=['ward_code', 'ward_area'], how='left')
        unified['latitude_approx'] = df['latitude']
        unified['longitude_approx'] = df['longitude']
        # coordinate_source: ward_centroid where found, missing otherwise
        unified['coordinate_source'] = np.where(df['latitude'].notna(), 'ward_centroid', 'missing')
    except FileNotFoundError:
        print("Warning: bmc_ward_coordinates.csv not found, leaving coordinates as NaN")
        unified['latitude_approx'] = np.nan
        unified['longitude_approx'] = np.nan
        unified['coordinate_source'] = 'missing'
    
    unified['report_date'] = pd.to_datetime(df['complaint_date']).dt.date
    unified['severity_score'] = df['severity'].apply(lambda x: map_score(x, SEVERITY_RANGES))
    unified['urgency_score'] = np.nan
    unified['affected_population'] = df['population_density'] # contextual proxy
    unified['source_type'] = df['complainant_type']
    unified['evidence_type'] = df['has_photo_evidence'].apply(lambda x: 'photo' if x == 1 else np.nan)
    unified['ward_code'] = df['ward_code']
    unified['zone'] = df['zone']
    unified['ward_type'] = df['ward_type']
    unified['department'] = df['department_assigned']
    unified['intent'] = np.nan
    unified['is_season'] = df['is_monsoon_season']
    
    # Initialize derived and label columns as NULL
    unified['previous_similar_report_count'] = np.nan
    unified['days_since_previous_similar'] = np.nan
    unified['distance_from_previous_km'] = np.nan
    unified['semantic_similarity'] = np.nan   # NULL — BMC has no genuine text; never populated
    unified['category_similarity'] = np.nan   # Populated by feature_engineering_unified.py
    unified['lexical_similarity'] = np.nan
    unified['same_subdomain'] = np.nan
    unified['is_recurring'] = np.nan
    unified['recurrence_category'] = np.nan
    unified['recurring_group_id'] = np.nan
    
    unified['source_dataset'] = 'bmc'
    unified['source_record_id'] = unified['challenge_id']
    
    return unified

if __name__ == "__main__":
    df_bmc = standardize_bmc()
    print("Standardized BMC dataset shape:", df_bmc.shape)
    df_bmc.to_csv('datasets/unified_dataset/bmc_standardized.csv', index=False)
    print("Saved to datasets/unified_dataset/bmc_standardized.csv")
