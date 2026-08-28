import pandas as pd

def generate_quality_report():
    print("Loading engineered dataset...")
    df = pd.read_csv('datasets/unified_dataset/unified_feature_engineered.csv')
    
    report = []
    report.append("# Unified Dataset Data Quality Report\n")
    
    report.append("## Overview")
    report.append(f"- **Total Rows**: {len(df)}")
    report.append(f"- **Total Columns**: {len(df.columns)}")
    report.append(f"- **Duplicate Challenge IDs**: {df.duplicated('challenge_id').sum()}")
    
    report.append("\n## Source Breakdown")
    source_counts = df['source_dataset'].value_counts()
    for source, count in source_counts.items():
        report.append(f"- **{source}**: {count} rows")
        
    report.append("\n## Missing Values Analysis (Percentage)")
    missing_pct = (df.isnull().sum() / len(df)) * 100
    missing_pct = missing_pct[missing_pct > 0].sort_values(ascending=False)
    for col, pct in missing_pct.items():
        report.append(f"- `{col}`: {pct:.2f}% missing")
        
    report.append("\n## Domain Mapping Statistics")
    domain_counts = df['domain'].value_counts().head(10)
    for domain, count in domain_counts.items():
        report.append(f"- **{domain}**: {count}")
        
    report.append("\n## Target Variable (`is_recurring`) Distribution")
    rec_counts = df['is_recurring'].value_counts(dropna=False)
    for val, count in rec_counts.items():
        label = "NULL (Unlabeled)" if pd.isna(val) else val
        report.append(f"- **{label}**: {count}")
        
    report.append("\n## Feature Coverage (Non-NULL values)")
    features = ['semantic_similarity', 'lexical_similarity', 'distance_from_previous_km', 'days_since_previous_similar']
    for feat in features:
        coverage = df[feat].notna().sum()
        report.append(f"- `{feat}`: {coverage} rows ({(coverage/len(df))*100:.2f}%)")
        
    # Leakage check
    negative_days = df[df['days_since_previous_similar'] < 0]
    report.append("\n## Leakage Check")
    report.append(f"- Rows with `days_since_previous_similar` < 0: {len(negative_days)}")
    
    report_text = "\n".join(report)
    with open('datasets/unified_dataset/data_quality_report.md', 'w') as f:
        f.write(report_text)
        
    print("Quality report generated: datasets/unified_dataset/data_quality_report.md")

if __name__ == "__main__":
    generate_quality_report()
