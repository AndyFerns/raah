"""
Similarity Threshold Audit
Qualitative inspection of FAISS-matched text pairs at multiple thresholds.
⚠ This is a qualitative sanity check only. 5 pairs per threshold does NOT
  constitute a statistically valid precision estimate.
Outputs: similarity_threshold_report.md
"""
import pandas as pd
import numpy as np

PAIRS_PATH   = 'datasets/unified_dataset/text_record_match_pairs.csv'
UNIFIED_PATH = 'datasets/unified_dataset/unified_feature_engineered.csv'
OUTPUT_PATH  = 'similarity_threshold_report.md'
THRESHOLDS   = [0.70, 0.75, 0.80, 0.85, 0.90]
N_SAMPLES    = 5


def audit_similarity_threshold():
    print("Loading match pairs...")
    try:
        pairs = pd.read_csv(PAIRS_PATH)
    except FileNotFoundError:
        print("ERROR: text_record_match_pairs.csv not found.")
        print("Re-run unify/feature_engineering_unified.py to generate this file.")
        return

    print(f"Total match pairs found: {len(pairs)}")

    print("Loading unified dataset for problem_text lookup...")
    df = pd.read_csv(UNIFIED_PATH, low_memory=False, usecols=['challenge_id', 'problem_text', 'domain', 'subdomain'])
    text_lookup = df.set_index('challenge_id')[['problem_text', 'domain', 'subdomain']].to_dict('index')

    lines = [
        "# Similarity Threshold Audit",
        "",
        "> **⚠️ Scope disclaimer:** This inspection is a **qualitative sanity check only**.",
        "> 5 sampled pairs per threshold does not constitute a statistically valid precision estimate.",
        "> Threshold selection based on this audit should be treated as a defensible starting point,",
        "> not a rigorously calibrated value.",
        "",
        "## Coverage by Threshold",
        "",
        "| Threshold | Pairs at/above | % of all pairs |",
        "|-----------|---------------|----------------|",
    ]

    # Coverage table
    for thresh in THRESHOLDS:
        above = (pairs['semantic_similarity'] >= thresh).sum()
        pct   = 100 * above / len(pairs) if len(pairs) > 0 else 0
        lines.append(f"| >= {thresh:.2f}   | {above:,}         | {pct:.1f}%          |")

    lines += ["", "---", ""]

    # Sampled pairs per threshold
    for thresh in THRESHOLDS:
        lines += [f"## Threshold >= {thresh:.2f}", ""]
        subset = pairs[pairs['semantic_similarity'] >= thresh]
        
        if thresh < max(THRESHOLDS):
            next_thresh = THRESHOLDS[THRESHOLDS.index(thresh) + 1]
            subset = subset[subset['semantic_similarity'] < next_thresh]  # Show band, not cumulative
            lines[lines.index(f"## Threshold >= {thresh:.2f}")] = f"## Band [{thresh:.2f}, {next_thresh:.2f})"

        sample = subset.sample(min(N_SAMPLES, len(subset)), random_state=42) if len(subset) > 0 else subset

        if len(sample) == 0:
            lines.append(f"_No pairs in this band._\n")
            continue

        for _, row in sample.iterrows():
            cid  = row['current_challenge_id']
            mid  = row['matched_challenge_id']
            sim  = row['semantic_similarity']
            dist = row.get('distance_km', float('nan'))

            curr_info = text_lookup.get(str(cid), {})
            match_info = text_lookup.get(str(mid), {})

            curr_text  = curr_info.get('problem_text', '_(not found)_')
            match_text = match_info.get('problem_text', '_(not found)_')

            lines += [
                f"**Pair** | sim={sim:.4f} | dist={dist:.2f}km" if not pd.isna(dist) else f"**Pair** | sim={sim:.4f} | dist=N/A",
                f"- **Current** [{cid}]: {str(curr_text)[:200]}",
                f"- **Match**   [{mid}]: {str(match_text)[:200]}",
                "",
            ]

    lines += [
        "---",
        "",
        "## Manual Review Notes",
        "",
        "_Fill in after reviewing the pairs above:_",
        "",
        "| Threshold | Assessment |",
        "|-----------|------------|",
    ]
    for thresh in THRESHOLDS:
        lines.append(f"| >= {thresh:.2f}   | _(to be filled)_ |")

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"\nReport saved to: {OUTPUT_PATH}")


if __name__ == '__main__':
    audit_similarity_threshold()
