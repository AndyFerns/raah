"""
Step 1: Train the Teacher Model
Trains XGBoost on the 1,000 synthetic records (500 recurring / 500 non-recurring).
Since the data is perfectly balanced, no class weights or undersampling are needed.
"""
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import GroupKFold, cross_validate
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import json
import os

from ml_pipeline import (
    UNIFIED_DATASET_PATH, TEACHER_MODEL_PATH, SAVED_MODELS_DIR,
    NUMERIC_FEATURES, CATEGORICAL_FEATURES, TEACHER_TARGET
)


def load_synthetic_data():
    """Load only the labeled synthetic records."""
    print("Loading unified dataset...")
    df = pd.read_csv(UNIFIED_DATASET_PATH, low_memory=False)
    
    # Filter to only labeled records (synthetic dataset — genuine ground-truth)
    df_labeled = df[df[TEACHER_TARGET].notna()].copy()
    print(f"Labeled records: {len(df_labeled)}")
    print(f"Class distribution:\n{df_labeled[TEACHER_TARGET].value_counts()}")
    
    return df_labeled


def prepare_features(df, label_encoders=None, fit=False):
    """Prepare features for training/prediction."""
    features = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    X = df[features].copy()
    
    # Force numeric columns to numeric dtype (handles mixed-type columns like affected_population)
    for col in NUMERIC_FEATURES:
        X[col] = pd.to_numeric(X[col], errors='coerce')
    
    # Encode categorical features
    if label_encoders is None:
        label_encoders = {}
    
    for col in CATEGORICAL_FEATURES:
        if fit:
            le = LabelEncoder()
            # Handle NaN by converting to string first
            X[col] = X[col].fillna('__MISSING__').astype(str)
            # Ensure __MISSING__ is always in the vocabulary
            all_values = list(X[col].unique())
            if '__MISSING__' not in all_values:
                all_values.append('__MISSING__')
            le.fit(all_values)
            X[col] = le.transform(X[col])
            label_encoders[col] = le
        else:
            le = label_encoders[col]
            X[col] = X[col].fillna('__MISSING__').astype(str)
            # Map unseen categories to __MISSING__
            known_classes = set(le.classes_)
            X[col] = X[col].apply(lambda x: x if x in known_classes else '__MISSING__')
            X[col] = le.transform(X[col])
    
    return X, label_encoders


def train_teacher():
    """Train the Teacher model on synthetic data with cross-validation."""
    df = load_synthetic_data()
    
    # Prepare features
    X, label_encoders = prepare_features(df, fit=True)
    y = df[TEACHER_TARGET].astype(int)
    
    # Assign unique group IDs to non-recurring records (which have NaN group ID)
    # This allows GroupKFold to distribute them across folds without putting them all in one fold
    groups = df['recurring_group_id'].copy()
    nan_mask = groups.isna()
    unique_ids = [f"__NON_RECURRING_{i}__" for i in range(nan_mask.sum())]
    groups.loc[nan_mask] = unique_ids
    
    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Features: {list(X.columns)}")
    
    # Group-aware cross-validation (unconditional): ensures no recurring_group_id
    # appears in both train and validation folds — prevents group leakage.
    print("\n--- 5-Fold Group-Aware Cross-Validation (GroupKFold) ---")
    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss',
        use_label_encoder=False,
        missing=float('nan'),   # native NaN handling — no imputation
        random_state=42,
        verbosity=0
    )
    
    cv = GroupKFold(n_splits=5)
    cv_results = cross_validate(
        model, X, y, cv=cv, groups=groups,
        scoring=['accuracy', 'f1', 'precision', 'recall', 'roc_auc'],
        return_train_score=True
    )
    
    print(f"  Accuracy:  {cv_results['test_accuracy'].mean():.4f} (+/- {cv_results['test_accuracy'].std():.4f})")
    print(f"  F1-Score:  {cv_results['test_f1'].mean():.4f} (+/- {cv_results['test_f1'].std():.4f})")
    print(f"  Precision: {cv_results['test_precision'].mean():.4f} (+/- {cv_results['test_precision'].std():.4f})")
    print(f"  Recall:    {cv_results['test_recall'].mean():.4f} (+/- {cv_results['test_recall'].std():.4f})")
    print(f"  AUC-ROC:   {cv_results['test_roc_auc'].mean():.4f} (+/- {cv_results['test_roc_auc'].std():.4f})")
    
    # Train on full labeled data
    print("\n--- Training Final Teacher Model on Full Synthetic Data ---")
    model.fit(X, y)
    
    # Feature importance
    print("\nFeature Importance (Top 10):")
    importances = model.feature_importances_
    feature_names = list(X.columns)
    sorted_idx = np.argsort(importances)[::-1]
    for i in sorted_idx[:10]:
        print(f"  {feature_names[i]}: {importances[i]:.4f}")
    
    # Save model and encoders
    artifact = {
        'model': model,
        'label_encoders': label_encoders,
        'feature_names': feature_names,
        'cv_metrics': {
            'accuracy': float(cv_results['test_accuracy'].mean()),
            'f1': float(cv_results['test_f1'].mean()),
            'precision': float(cv_results['test_precision'].mean()),
            'recall': float(cv_results['test_recall'].mean()),
            'auc_roc': float(cv_results['test_roc_auc'].mean()),
        }
    }
    
    joblib.dump(artifact, TEACHER_MODEL_PATH)
    print(f"\nTeacher model saved to: {TEACHER_MODEL_PATH}")
    
    return artifact


if __name__ == '__main__':
    train_teacher()
