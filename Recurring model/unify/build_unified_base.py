import pandas as pd
from unify.standardize_bmc import standardize_bmc
from unify.standardize_civicdex import standardize_civicdex
from unify.standardize_synthetic import standardize_synthetic

def build_unified_base():
    # 1. Load standardized dataframes
    df_bmc = standardize_bmc()
    df_cdx = standardize_civicdex()
    df_syn = standardize_synthetic()
    
    # 2. Concatenate
    print("Concatenating datasets...")
    unified_base = pd.concat([df_bmc, df_cdx, df_syn], ignore_index=True)
    
    # 3. Remove exact duplicates based on source_record_id
    initial_len = len(unified_base)
    unified_base = unified_base.drop_duplicates(subset=['source_record_id'])
    final_len = len(unified_base)
    print(f"Removed {initial_len - final_len} exact duplicate source records.")
    
    # 4. Add Missingness and Provenance flags
    print("Adding missingness flags...")
    unified_base['feature_missing_problem_text'] = unified_base['problem_text'].isna().astype(int)
    unified_base['feature_missing_evidence'] = unified_base['evidence_type'].isna().astype(int)
    unified_base['feature_missing_coordinates'] = unified_base['latitude_approx'].isna().astype(int)
    
    # 5. Save to CSV
    unified_base.to_csv('datasets/unified_dataset/unified_base.csv', index=False)
    print("Saved unified base dataset to datasets/unified_dataset/unified_base.csv")
    return unified_base

if __name__ == "__main__":
    build_unified_base()
