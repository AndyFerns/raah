"""
Train Student Model (Corrected & Ablated)
Implements Ablation A, B, and C as per the implementation plan (v3).
Reports metrics on the frozen synthetic holdout set.
Outputs: feature_ablation_report.md
"""
import pandas as pd
import numpy as np
import os
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, average_precision_score, precision_score, recall_score
import joblib

from ml_pipeline import (
    UNIFIED_DATASET_PATH, BMC_PSEUDO_LABELED_PATH, SAVED_MODELS_DIR,
    NUMERIC_FEATURES, CATEGORICAL_FEATURES, STUDENT_TARGET, TEACHER_TARGET,
    TRAIN_END_YEAR, VALIDATION_END_YEAR
)
from ml_pipeline.train_teacher import prepare_features

OUTPUT_PATH = 'feature_ablation_report.md'

ABLATION_A_FEATURES = [
    'category_similarity',
    'semantic_similarity', # (NaN for BMC)
    'lexical_similarity',  # (NaN for BMC)
    'previous_similar_report_count',
    'days_since_previous_similar',
    'distance_from_previous_km',
    'same_subdomain',
    'is_season'
]

ABLATION_B_FEATURES = ABLATION_A_FEATURES + [
    'severity_score',
    'urgency_score',
    'source_type',
    'department',
    'domain',
    'subdomain'
]


def train_and_eval_student(df_bmc, df_syn, feature_list, ablation_name, high_conf_only=False):
    print(f"\n--- Running {ablation_name} ---")
    
    # Restrict BMC to high confidence if requested (Ablation C)
    if high_conf_only:
        initial_len = len(df_bmc)
        df_train_bmc = df_bmc[(df_bmc['teacher_confidence'] >= 0.90) | (df_bmc['teacher_confidence'] <= 0.10)].copy()
        print(f"Filtered BMC to high-confidence only (>=0.90 or <=0.10): {len(df_train_bmc)} / {initial_len} rows")
    else:
        df_train_bmc = df_bmc.copy()

    # Combine BMC (pseudo-labeled) + Synthetic (holdout)
    df_combined = pd.concat([df_train_bmc, df_syn], ignore_index=True)
    
    # We only fit encoders on the combined dataset
    X_full, _ = prepare_features(df_combined, fit=True)
    
    # Subset to the requested features
    # Note: prepare_features one-hot encodes categorical variables, so we need to grab
    # any columns that start with the categorical feature prefixes, plus the exact numeric features
    selected_cols = []
    for col in X_full.columns:
        if col in feature_list:
            selected_cols.append(col)
        else:
            for cat_feat in CATEGORICAL_FEATURES:
                # Add one-hot encoded columns for the categorical features in the list
                if cat_feat in feature_list and col.startswith(cat_feat + '_'):
                    selected_cols.append(col)
                    
    X_full = X_full[selected_cols]
    
    # Split back into Train (BMC) and Test (Synthetic Holdout)
    X_train = X_full[df_combined['source_dataset'] == 'bmc']
    y_train = df_combined[df_combined['source_dataset'] == 'bmc'][STUDENT_TARGET].astype(int)
    
    X_test_syn = X_full[df_combined['source_dataset'] == 'synthetic']
    y_test_syn = df_combined[df_combined['source_dataset'] == 'synthetic'][TEACHER_TARGET].astype(int)
    
    print(f"Training features: {list(X_train.columns)}")
    print(f"Training on {len(X_train)} BMC pseudo-labeled records...")
    
    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss',
        use_label_encoder=False,
        missing=float('nan'),
        random_state=42,
        verbosity=0
    )
    
    model.fit(X_train, y_train)
    
    # Teacher-to-Student agreement on BMC
    preds_bmc = model.predict(X_train)
    agreement = accuracy_score(y_train, preds_bmc)
    
    # Generalization metrics on frozen Synthetic holdout
    print(f"Evaluating on {len(X_test_syn)} frozen Synthetic holdout records...")
    preds_syn = model.predict(X_test_syn)
    proba_syn = model.predict_proba(X_test_syn)[:, 1]
    
    f1 = f1_score(y_test_syn, preds_syn)
    roc_auc = roc_auc_score(y_test_syn, proba_syn)
    pr_auc = average_precision_score(y_test_syn, proba_syn)
    
    acc = accuracy_score(y_test_syn, preds_syn)
    prec = precision_score(y_test_syn, preds_syn, zero_division=0)
    rec = recall_score(y_test_syn, preds_syn)
    
    # Feature importances
    importances = model.feature_importances_
    feat_imp = pd.DataFrame({'feature': X_train.columns, 'importance': importances})
    feat_imp = feat_imp.sort_values('importance', ascending=False).head(10)
    
    return {
        'name': ablation_name,
        'train_size': len(X_train),
        'agreement': agreement,
        'acc': acc,
        'prec': prec,
        'rec': rec,
        'f1': f1,
        'roc_auc': roc_auc,
        'pr_auc': pr_auc,
        'importances': feat_imp
    }

def main():
    print("Loading BMC Pseudo-labeled dataset...")
    df_bmc = pd.read_csv(BMC_PSEUDO_LABELED_PATH, low_memory=False)
    
    print("Loading Synthetic dataset (ground truth holdout)...")
    df_unified = pd.read_csv(UNIFIED_DATASET_PATH, low_memory=False)
    df_syn = df_unified[df_unified['source_dataset'] == 'synthetic'].copy()
    
    # Add fake columns to df_bmc for missing text features to satisfy subsetting logic, though they are NaN
    for col in ['lexical_similarity']:
        if col not in df_bmc.columns:
            df_bmc[col] = np.nan
            
    # Add fake columns to df_syn for missing pseudo-label
    df_syn[STUDENT_TARGET] = np.nan
    
    results = []
    
    # Ablation A: Recurrence-evidence-only
    res_a = train_and_eval_student(df_bmc, df_syn, ABLATION_A_FEATURES, 'Ablation A (Recurrence-evidence-only)')
    results.append(res_a)
    
    # Ablation B: Full model
    # Note: we need 'source_type', 'department', 'domain', 'subdomain' in categories
    for col in ['source_type', 'department']:
        if col not in CATEGORICAL_FEATURES:
            CATEGORICAL_FEATURES.append(col)
            
    res_b = train_and_eval_student(df_bmc, df_syn, ABLATION_B_FEATURES, 'Ablation B (Full model)')
    results.append(res_b)
    
    # Ablation C: High-confidence pseudo-labels only
    res_c = train_and_eval_student(df_bmc, df_syn, ABLATION_B_FEATURES, 'Ablation C (High-confidence pseudo-labels only)', high_conf_only=True)
    results.append(res_c)
    
    # Write report
    lines = [
        "# Feature Ablation Report (Student Model)",
        "",
        "> **Note:** All generalization metrics are computed on a **frozen synthetic holdout set**",
        "> whose groups were entirely isolated from Teacher training.",
        "",
        "## Overall Metrics",
        "",
        "| Ablation | Train Size | T-S Agreement | Accuracy | Precision | Recall | F1-Score | AUC-ROC | PR-AUC |",
        "|----------|------------|---------------|----------|-----------|--------|----------|---------|--------|"
    ]
    
    for r in results:
        lines.append(f"| {r['name']} | {r['train_size']:,} | {r['agreement']:.4f} | {r['acc']:.4f} | {r['prec']:.4f} | {r['rec']:.4f} | {r['f1']:.4f} | {r['roc_auc']:.4f} | {r['pr_auc']:.4f} |")
        
    lines += [
        "",
        "## Feature Importances (Top 10)",
        ""
    ]
    
    for r in results:
        lines += [f"### {r['name']}", ""]
        lines += [r['importances'].to_markdown(index=False), ""]
        
    # Highlight severity score in Ablation A
    sev_a = res_a['importances'][res_a['importances']['feature'] == 'severity_score']
    if len(sev_a) == 0 or sev_a.iloc[0]['importance'] == 0.0:
        lines += ["> ✅ `severity_score` importance is 0.0 or absent in Ablation A (shortcut eliminated)"]
    else:
        lines += ["> ❌ `severity_score` found in Ablation A (shortcut still exists!)"]
        
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
        
    print(f"\nReport saved to: {OUTPUT_PATH}")

if __name__ == '__main__':
    main()
