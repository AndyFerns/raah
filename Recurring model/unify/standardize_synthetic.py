import pandas as pd
import numpy as np

def standardize_synthetic():
    print("Loading Synthetic dataset...")
    df = pd.read_csv('datasets/unified_dataset/unified_dataset.csv')
    
    unified = pd.DataFrame()
    
    # Prefix challenge_id if not already
    unified['challenge_id'] = df['challenge_id'].apply(lambda x: x if str(x).startswith('SYN_') else 'SYN_' + str(x))
    
    # Use raw/generated values
    unified['problem_text'] = df['problem_text']
    unified['generated_problem_text'] = np.nan      # no generated text for synthetic records
    unified['problem_text_source'] = 'original'     # genuine citizen/synthetic authored text
    unified['domain'] = df['domain']
    unified['subdomain'] = df['subdomain']
    unified['district'] = df['district']
    unified['locality'] = df['locality']
    unified['latitude_approx'] = df['latitude_approx']
    unified['longitude_approx'] = df['longitude_approx']
    unified['coordinate_source'] = np.where(df['latitude_approx'].notna(), 'original', 'missing')
    
    # Ensure date format is standardized
    unified['report_date'] = pd.to_datetime(df['report_date']).dt.date
    
    unified['severity_score'] = df['severity_score']
    unified['urgency_score'] = df['urgency_score']
    unified['affected_population'] = df['affected_population']
    unified['source_type'] = df['source_type']
    unified['evidence_type'] = df['evidence_type']
    unified['ward_code'] = df['ward_code']
    unified['zone'] = df['zone']
    unified['ward_type'] = df['ward_type']
    
    unified['department'] = np.nan
    unified['intent'] = np.nan
    unified['is_season'] = df['is_season']
    
    # CRITICAL: Reset derived similarity features to NULL
    unified['previous_similar_report_count'] = np.nan
    unified['days_since_previous_similar'] = np.nan
    unified['distance_from_previous_km'] = np.nan
    unified['semantic_similarity'] = np.nan
    unified['category_similarity'] = np.nan   # Not applicable for text-based records
    unified['lexical_similarity'] = np.nan
    unified['same_subdomain'] = np.nan
    
    # Preserve synthetic labels (ground truth)
    unified['is_recurring'] = df['is_recurring']
    unified['recurrence_category'] = df['recurrence_category']
    unified['recurring_group_id'] = df['recurring_group_id']
    
    unified['source_dataset'] = 'synthetic'
    unified['source_record_id'] = unified['challenge_id']
    
    return unified

if __name__ == "__main__":
    df_syn = standardize_synthetic()
    print("Standardized Synthetic dataset shape:", df_syn.shape)
    df_syn.to_csv('datasets/unified_dataset/synthetic_standardized.csv', index=False)
    print("Saved to datasets/unified_dataset/synthetic_standardized.csv")
