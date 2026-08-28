"""
Pseudo-Label Quality Report
Reports Teacher confidence calibration on the synthetic holdout dataset,
and compares pseudo-labels against high/low confidence boundaries.
Outputs: pseudo_label_quality_report.md
"""
import pandas as pd
import numpy as np
import os
import joblib
from xgboost import XGBClassifier

from ml_pipeline import (
    UNIFIED_DATASET_PATH, BMC_PSEUDO_LABELED_PATH, TEACHER_MODEL_PATH, TEACHER_TARGET
)
from ml_pipeline.train_teacher import prepare_features

OUTPUT_PATH = 'pseudo_label_quality_report.md'

def main():
    print("Loading Teacher model...")
    if not os.path.exists(TEACHER_MODEL_PATH):
        raise FileNotFoundError("Teacher model not found. Run train_teacher.py first.")
    
    artifact = joblib.load(TEACHER_MODEL_PATH)
    teacher_model = artifact['model']
    
    print("Loading Unified Dataset (for synthetic holdout)...")
    df_unified = pd.read_csv(UNIFIED_DATASET_PATH, low_memory=False)
    
    # We only evaluate calibration on the synthetic ground-truth
    df_syn = df_unified[df_unified['source_dataset'] == 'synthetic'].copy()
    
    print("Preparing features for synthetic holdout...")
    X_syn, _ = prepare_features(df_syn, fit=True)
    y_syn = df_syn[TEACHER_TARGET].astype(int)
    
    # Keep only the features that were used during teacher training
    model_features = teacher_model.get_booster().feature_names
    for col in model_features:
        if col not in X_syn.columns:
            X_syn[col] = 0
    X_syn = X_syn[model_features]
    
    # Get teacher probabilities
    probas = teacher_model.predict_proba(X_syn)[:, 1]
    
    # Calibration Curve (Binning)
    bins = np.linspace(0, 1, 11)
    df_calib = pd.DataFrame({'proba': probas, 'actual': y_syn})
    df_calib['bin'] = pd.cut(df_calib['proba'], bins, include_lowest=True)
    
    calib_stats = df_calib.groupby('bin', observed=False).agg(
        count=('actual', 'count'),
        actual_prob=('actual', 'mean'),
        pred_prob=('proba', 'mean')
    ).reset_index()
    
    # Load BMC pseudo-labeled stats
    print("Loading BMC pseudo-labeled dataset...")
    df_bmc = pd.read_csv(BMC_PSEUDO_LABELED_PATH, low_memory=False)
    
    teacher_conf = df_bmc['teacher_confidence']
    high_conf = (teacher_conf >= 0.90).sum()
    low_conf = (teacher_conf < 0.60).sum()
    total_bmc = len(df_bmc)
    
    lines = [
        "# Pseudo-Label Quality & Calibration Report",
        "",
        "## Teacher Calibration (on Synthetic Ground Truth)",
        "This checks if the Teacher's predicted probabilities align with actual recurrence rates.",
        "",
        "| Confidence Bin | N Samples | Predicted Mean | Actual Mean |",
        "|----------------|-----------|----------------|-------------|"
    ]
    
    for _, row in calib_stats.iterrows():
        cnt = int(row['count'])
        if cnt == 0:
            lines.append(f"| {row['bin']} | 0 | - | - |")
        else:
            lines.append(f"| {row['bin']} | {cnt:,} | {row['pred_prob']:.4f} | {row['actual_prob']:.4f} |")
            
    lines += [
        "",
        "## BMC Pseudo-Label Distribution",
        "",
        f"- **Total BMC records:** {total_bmc:,}",
        f"- **High-confidence (>= 0.90):** {high_conf:,} ({100*high_conf/total_bmc:.1f}%)",
        f"- **Low-confidence (< 0.60):** {low_conf:,} ({100*low_conf/total_bmc:.1f}%)",
        "",
        "### Teacher Confidence Percentiles",
        f"```",
        teacher_conf.describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]).to_string(),
        f"```",
    ]
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
        
    print(f"\nReport saved to: {OUTPUT_PATH}")

if __name__ == '__main__':
    main()
