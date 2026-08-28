import pandas as pd
import numpy as np

def extract_samples(df, center, margin=0.02, k=3):
    lower = center - margin
    upper = center + margin
    subset = df[(df['semantic_similarity'] >= lower) & (df['semantic_similarity'] <= upper)]
    if len(subset) == 0:
        return []
    # Sample up to k records
    return subset.sample(min(k, len(subset))).to_dict(orient='records')

def main():
    print("Loading feature engineered dataset...")
    df = pd.read_csv('datasets/unified_dataset/unified_feature_engineered.csv', low_memory=False)
    
    # We only care about text-based records (synthetic and civicdex) which actually computed semantic_similarity using BGE-M3
    # BMC used a proxy similarity (0.90 or 0.75), so we'll filter out BMC for this particular text-similarity validation
    df_text = df[df['source_dataset'] != 'bmc']
    
    report = "# Similarity Validation Report\n\n"
    report += "This report samples text-based records (Synthetic/CivicDex) around specific semantic similarity thresholds to help manually verify if the threshold tuning is correct.\n\n"
    
    thresholds = [0.70, 0.80, 0.90]
    
    for th in thresholds:
        report += f"## Threshold ~ {th:.2f} (±0.02)\n\n"
        samples = extract_samples(df_text, th, margin=0.02, k=5)
        if not samples:
            report += "No samples found in this range.\n\n"
            continue
            
        for idx, row in enumerate(samples):
            report += f"### Sample {idx+1} (Score: {row['semantic_similarity']:.4f})\n"
            report += f"- **Current Record ({row['challenge_id']})**: {row['problem_text']}\n"
            report += f"- **Other features**: Days Since: {row['days_since_previous_similar']}, Distance: {row['distance_from_previous_km']} km\n\n"
            
    out_path = 'C:\\Users\\omini\\.gemini\\antigravity-ide\\brain\\a31e0efc-a997-4d0f-af36-093272ec1d86\\similarity_validation_report.md'
    with open(out_path, 'w') as f:
        f.write(report)
        
    print(f"Report generated: {out_path}")

if __name__ == '__main__':
    main()
