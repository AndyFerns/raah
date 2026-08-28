"""
Group Split Audit — synthetic dataset
Reports whether recurring_group_id leaks across train/val splits.
Outputs: synthetic_group_split_report.md
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import GroupShuffleSplit

SYNTHETIC_PATH = 'datasets/unified_dataset/synthetic_standardized.csv'
OUTPUT_PATH    = 'synthetic_group_split_report.md'


def audit_group_split():
    print("Loading synthetic standardized dataset...")
    try:
        df = pd.read_csv(SYNTHETIC_PATH, low_memory=False)
    except FileNotFoundError:
        # Fallback: load from unified and filter
        df = pd.read_csv('datasets/unified_dataset/unified_feature_engineered.csv', low_memory=False)
        df = df[df['source_dataset'] == 'synthetic'].copy()
        print(f"  (loaded from unified, filtered to synthetic: {len(df)} rows)")

    if 'recurring_group_id' not in df.columns:
        raise ValueError("recurring_group_id column not found in synthetic dataset.")

    # Drop rows without a group id (non-recurring records have NaN group id)
    df_grouped = df[df['recurring_group_id'].notna()].copy()
    df_no_group = df[df['recurring_group_id'].isna()].copy()

    total_rows   = len(df)
    total_groups = df_grouped['recurring_group_id'].nunique()

    print(f"Total synthetic rows:    {total_rows}")
    print(f"Rows with group id:      {len(df_grouped)}")
    print(f"Rows without group id:   {len(df_no_group)}")
    print(f"Unique recurring groups: {total_groups}")

    # ── 1. Naive random 80/20 split (documents pre-existing leakage) ────────
    np.random.seed(42)
    shuffled = df.sample(frac=1, random_state=42).reset_index(drop=True)
    split_idx = int(0.8 * len(shuffled))
    naive_train = shuffled.iloc[:split_idx]
    naive_val   = shuffled.iloc[split_idx:]

    naive_train_groups = set(naive_train['recurring_group_id'].dropna())
    naive_val_groups   = set(naive_val['recurring_group_id'].dropna())
    naive_overlap      = naive_train_groups & naive_val_groups

    print(f"\n[Naive random split]")
    print(f"  Groups in train: {len(naive_train_groups)}")
    print(f"  Groups in val:   {len(naive_val_groups)}")
    print(f"  Overlapping groups (LEAKAGE): {len(naive_overlap)}")

    # ── 2. Group-aware split (GroupShuffleSplit) ─────────────────────────────
    groups = df['recurring_group_id'].fillna('__NONE__')
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, val_idx = next(gss.split(df, groups=groups))

    group_train = set(df.iloc[train_idx]['recurring_group_id'].dropna())
    group_val   = set(df.iloc[val_idx]['recurring_group_id'].dropna())
    group_overlap = group_train & group_val

    print(f"\n[Group-aware split (GroupShuffleSplit)]")
    print(f"  Groups in train: {len(group_train)}")
    print(f"  Groups in val:   {len(group_val)}")
    print(f"  Overlapping groups (must be 0): {len(group_overlap)}")

    # ── 3. Write report ──────────────────────────────────────────────────────
    lines = [
        "# Synthetic Dataset Group Split Audit",
        "",
        "## Dataset Summary",
        f"- Total synthetic rows: **{total_rows}**",
        f"- Rows with `recurring_group_id`: **{len(df_grouped)}**",
        f"- Rows without `recurring_group_id` (non-recurring): **{len(df_no_group)}**",
        f"- Unique recurring groups: **{total_groups}**",
        "",
        "## Naive Random 80/20 Split (Pre-existing Leakage)",
        f"- Groups in train: {len(naive_train_groups)}",
        f"- Groups in val:   {len(naive_val_groups)}",
        f"- **Overlapping groups: {len(naive_overlap)}** {'[PASS] no leakage' if len(naive_overlap)==0 else '[LEAKAGE DETECTED]'}",
        "",
        "> This documents whether a naive split would have caused leakage. Even if overlap is 0 by chance (small dataset), the group-aware split is still applied unconditionally.",
        "",
        "## Group-Aware Split (GroupShuffleSplit, test_size=0.20)",
        f"- Groups in train: {len(group_train)}",
        f"- Groups in val:   {len(group_val)}",
        f"- **Overlapping groups: {len(group_overlap)}** {'[PASS] no leakage' if len(group_overlap)==0 else '[FAIL] unexpected overlap'}",
        "",
        "## Decision",
        "Teacher model cross-validation uses `GroupKFold(n_splits=5, groups=recurring_group_id)` **unconditionally**.",
        "This guarantees zero group overlap across all folds regardless of dataset size or group distribution.",
    ]

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"\nReport saved to: {OUTPUT_PATH}")

    return len(group_overlap) == 0  # True = PASS


if __name__ == '__main__':
    passed = audit_group_split()
    exit(0 if passed else 1)
