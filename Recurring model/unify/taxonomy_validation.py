import pandas as pd

def main():
    print("Loading unified base dataset...")
    df = pd.read_csv('datasets/unified_dataset/unified_base.csv', usecols=['source_dataset', 'domain', 'subdomain'])
    
    print("Generating taxonomy validation report...")
    report = "# Taxonomy Validation Report\n\n"
    report += "This report summarizes the resulting `domain` and `subdomain` mappings for each source dataset to identify inconsistencies (e.g. 'Roads' vs 'Road').\n\n"
    
    for source in df['source_dataset'].unique():
        report += f"## {source.upper()}\n\n"
        sub_df = df[df['source_dataset'] == source]
        
        # Group by domain and subdomain
        counts = sub_df.groupby(['domain', 'subdomain']).size().reset_index(name='count').sort_values(by=['domain', 'count'], ascending=[True, False])
        
        report += "| Domain | Subdomain | Count |\n"
        report += "|---|---|---|\n"
        for _, row in counts.iterrows():
            report += f"| {row['domain']} | {row['subdomain']} | {row['count']} |\n"
            
        report += "\n"
        
    out_path = 'C:\\Users\\omini\\.gemini\\antigravity-ide\\brain\\a31e0efc-a997-4d0f-af36-093272ec1d86\\taxonomy_validation_report.md'
    with open(out_path, 'w') as f:
        f.write(report)
        
    print(f"Report generated: {out_path}")

if __name__ == '__main__':
    main()
