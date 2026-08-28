import pandas as pd

def main():
    print("Loading feature engineered dataset...")
    df = pd.read_csv('datasets/unified_dataset/unified_feature_engineered.csv', low_memory=False)
    
    print("Running leakage audit...")
    # 1. Negative days_since_previous_similar
    negative_days = df[df['days_since_previous_similar'] < 0]
    
    report = "# Leakage Audit Report\n\n"
    
    if len(negative_days) == 0:
        report += "[PASS]: No records found with negative `days_since_previous_similar`.\n\n"
    else:
        report += f"[FAIL]: Found {len(negative_days)} records with negative `days_since_previous_similar`.\n\n"
        # Output some examples
        report += "Examples:\n"
        for _, row in negative_days.head().iterrows():
            report += f"- Record {row['challenge_id']}: {row['days_since_previous_similar']} days\n"
            
    # 2. Check for missingness in key features correctly corresponding to source
    bmc_missing_coords = df[(df['source_dataset'] == 'bmc') & (df['latitude_approx'].isna())]
    if len(bmc_missing_coords) == 0:
        report += "[PASS]: All BMC records have coordinates.\n\n"
    else:
        report += f"[FAIL]: Found {len(bmc_missing_coords)} BMC records missing coordinates.\n\n"
        
    out_path = 'C:\\Users\\omini\\.gemini\\antigravity-ide\\brain\\a31e0efc-a997-4d0f-af36-093272ec1d86\\leakage_audit_report.md'
    with open(out_path, 'w') as f:
        f.write(report)
        
    print(f"Leakage audit complete. Report generated: {out_path}")

if __name__ == '__main__':
    main()
