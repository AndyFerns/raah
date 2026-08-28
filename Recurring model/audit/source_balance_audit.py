"""
Source Balance Audit
Reports row counts, label availability, pseudo-label distribution,
and feature missingness per source dataset.
Outputs: source_balance_report.md
"""
import pandas as pd
import numpy as np

UNIFIED_PATH     = 'datasets/unified_dataset/unified_feature_engineered.csv'
PSEUDO_PATH      = 'datasets/unified_dataset/bmc_pseudo_labeled.csv'
OUTPUT_PATH      = 'source_balance_report.md'

KEY_FEATURES = [
    'problem_text', 'semantic_similarity', 'category_similarity',
    'lexical_similarity', 'severity_score', 'urgency_score',
    'distance_from_previous_km', 'days_since_previous_similar',
    'previous_similar_report_count', 'same_subdomain', 'is_season',
    'is_recurring', 'coordinate_source', 'problem_text_source',
]


def pct_null(series):
    return f"{100 * series.isna().mean():.1f}%"


def audit_source_balance():
    print("Loading unified feature-engineered dataset...")
    df = pd.read_csv(UNIFIED_PATH, low_memory=False)

    sources = df['source_dataset'].value_counts()
    print(f"\nSource distribution:\n{sources}")

    # ── Ground-truth label availability ─────────────────────────────────────
    label_avail = df.groupby('source_dataset')['is_recurring'].apply(
        lambda s: f"{s.notna().sum()} / {len(s)} ({100*s.notna().mean():.1f}%)"
    )

    # ── Feature missingness by source ────────────────────────────────────────
    miss_rows = []
    available_features = [f for f in KEY_FEATURES if f in df.columns]
    for src, grp in df.groupby('source_dataset'):
        row = {'source': src}
        for feat in available_features:
            row[feat] = pct_null(grp[feat])
        miss_rows.append(row)
    miss_df = pd.DataFrame(miss_rows).set_index('source')

    # ── Pseudo-label distribution (post pseudo-labeling) ────────────────────
    pseudo_section = []
    try:
        df_pseudo = pd.read_csv(PSEUDO_PATH, low_memory=False)
        if 'teacher_pseudo_label' in df_pseudo.columns:
            dist = df_pseudo['teacher_pseudo_label'].value_counts()
            conf_stats = df_pseudo['teacher_confidence'].describe()
            high_conf = (df_pseudo['teacher_confidence'] >= 0.90).sum()
            low_conf  = (df_pseudo['teacher_confidence'] <  0.60).sum()
            pseudo_section = [
                "## Teacher Pseudo-Label Distribution (BMC only)",
                f"- Pseudo-labeled rows: **{len(df_pseudo):,}**",
                f"- Recurring (1):     **{dist.get(1,0):,}** ({100*dist.get(1,0)/len(df_pseudo):.1f}%)",
                f"- Non-recurring (0): **{dist.get(0,0):,}** ({100*dist.get(0,0)/len(df_pseudo):.1f}%)",
                f"- High-confidence (>=0.90): {high_conf:,} ({100*high_conf/len(df_pseudo):.1f}%)",
                f"- Low-confidence  (<0.60):  {low_conf:,}  ({100*low_conf/len(df_pseudo):.1f}%)",
                "",
                "### Teacher Confidence Statistics",
                f"```",
                conf_stats.to_string(),
                f"```",
            ]
        else:
            pseudo_section = ["> `teacher_pseudo_label` column not found in bmc_pseudo_labeled.csv. Run generate_pseudo_labels.py first."]
    except FileNotFoundError:
        pseudo_section = ["> `bmc_pseudo_labeled.csv` not found. Run generate_pseudo_labels.py first."]

    # ── Build report ─────────────────────────────────────────────────────────
    lines = [
        "# Source Balance Report",
        "",
        "## Row Counts by Source",
        "",
    ]
    for src, cnt in sources.items():
        lines.append(f"- **{src}**: {cnt:,} rows")
    lines += [
        "",
        "## Ground-Truth Label (`is_recurring`) Availability",
        "",
    ]
    for src, val in label_avail.items():
        lines.append(f"- **{src}**: {val}")
    lines += [
        "",
        "## Feature Missingness (% null) by Source",
        "",
        miss_df.to_markdown(),
        "",
        "> Note: `semantic_similarity` must be 100% null for BMC rows.",
        "> Note: `category_similarity` must be 100% null for Synthetic/CivicDex rows.",
        "",
    ] + pseudo_section

    with open(OUTPUT_PATH, 'w') as f:
        f.write('\n'.join(lines))
    print(f"\nReport saved to: {OUTPUT_PATH}")


if __name__ == '__main__':
    audit_source_balance()
