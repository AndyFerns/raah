"""
Step 3: Train the Student Model with Temporal Split
- Loads the pseudo-labeled BMC dataset.
- Applies a strict temporal split: Train (2018-2022), Validation (2023), Test (2024+).
- Undersamples the majority class in the TRAIN set only (to ~60/40 ratio).
- Applies moderate class weights during training.
- Evaluates on the untouched Validation and Test sets.
"""
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, f1_score
from sklearn.utils import resample
import joblib

from ml_pipeline import (
    BMC_PSEUDO_LABELED_PATH, STUDENT_MODEL_PATH, SAVED_MODELS_DIR,
    NUMERIC_FEATURES, CATEGORICAL_FEATURES, TARGET,
    TRAIN_END_YEAR, VALIDATION_END_YEAR
)
from ml_pipeline.train_teacher import prepare_features


def temporal_split(df):
    """Split data by year: Train (2018-2022), Validation (2023), Test (2024+)."""
    df['report_date'] = pd.to_datetime(df['report_date'])
    df['year'] = df['report_date'].dt.year
    
    train = df[df['year'] <= TRAIN_END_YEAR].copy()
    val = df[df['year'] == VALIDATION_END_YEAR].copy()
    test = df[df['year'] > VALIDATION_END_YEAR].copy()
    
    print(f"Temporal Split:")
    print(f"  Train (2018-{TRAIN_END_YEAR}):  {len(train)} rows")
    print(f"  Validation ({VALIDATION_END_YEAR}):      {len(val)} rows")
    print(f"  Test ({VALIDATION_END_YEAR+1}+):          {len(test)} rows")
    
    return train, val, test


def undersample_train(df_train, target_ratio=0.6):
    """
    Undersample the majority class in the training set.
    target_ratio: desired proportion of the majority class (0.6 = 60/40 split).
    """
    recurring = df_train[df_train[TARGET] == 1]
    non_recurring = df_train[df_train[TARGET] == 0]
    
    print(f"\n  Before undersampling:")
    print(f"    Recurring:     {len(recurring)}")
    print(f"    Non-Recurring: {len(non_recurring)}")
    
    # Calculate how many majority samples to keep
    # If recurring is minority: keep enough non-recurring to achieve the target_ratio
    if len(recurring) < len(non_recurring):
        minority_count = len(recurring)
        # target_ratio = majority / (majority + minority) => majority = minority * target_ratio / (1 - target_ratio)
        majority_target = int(minority_count * target_ratio / (1 - target_ratio))
        majority_target = min(majority_target, len(non_recurring))  # Don't oversample
        
        non_recurring_sampled = resample(
            non_recurring, n_samples=majority_target, random_state=42, replace=False
        )
        df_balanced = pd.concat([recurring, non_recurring_sampled])
    else:
        minority_count = len(non_recurring)
        majority_target = int(minority_count * target_ratio / (1 - target_ratio))
        majority_target = min(majority_target, len(recurring))
        
        recurring_sampled = resample(
            recurring, n_samples=majority_target, random_state=42, replace=False
        )
        df_balanced = pd.concat([recurring_sampled, non_recurring])
    
    df_balanced = df_balanced.sample(frac=1, random_state=42).reset_index(drop=True)  # Shuffle
    
    print(f"  After undersampling:")
    print(f"    Recurring:     {len(df_balanced[df_balanced[TARGET] == 1])}")
    print(f"    Non-Recurring: {len(df_balanced[df_balanced[TARGET] == 0])}")
    print(f"    Total:         {len(df_balanced)}")
    
    return df_balanced


def compute_class_weight(y_train):
    """Compute moderate scale_pos_weight for XGBoost."""
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    weight = neg_count / pos_count if pos_count > 0 else 1.0
    print(f"\n  Computed scale_pos_weight: {weight:.2f}")
    return weight


def train_student():
    """Train the Student model with temporal split and balanced training."""
    print("Loading pseudo-labeled BMC dataset...")
    df = pd.read_csv(BMC_PSEUDO_LABELED_PATH, low_memory=False)
    print(f"Total records: {len(df)}")
    
    # 1. Temporal Split
    df_train, df_val, df_test = temporal_split(df)
    
    # 2. Undersample the training set only
    print("\n--- Undersampling Train Set ---")
    df_train_balanced = undersample_train(df_train, target_ratio=0.6)
    
    # 3. Prepare features
    # Fit encoders on training data
    X_train, label_encoders = prepare_features(df_train_balanced, fit=True)
    y_train = df_train_balanced[TARGET].astype(int)
    
    X_val, _ = prepare_features(df_val, label_encoders=label_encoders, fit=False)
    y_val = df_val[TARGET].astype(int)
    
    X_test, _ = prepare_features(df_test, label_encoders=label_encoders, fit=False)
    y_test = df_test[TARGET].astype(int)
    
    # 4. Compute class weight for the balanced training set
    spw = compute_class_weight(y_train)
    
    # 5. Train Student Model
    print("\n--- Training Student Model ---")
    model = XGBClassifier(
        n_estimators=300,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=spw,
        eval_metric='logloss',
        use_label_encoder=False,
        early_stopping_rounds=20,
        random_state=42,
        verbosity=0
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )
    
    print(f"  Best iteration: {model.best_iteration}")
    
    # 6. Evaluate on Validation
    print("\n--- Validation Set Results ---")
    y_val_pred = model.predict(X_val)
    y_val_proba = model.predict_proba(X_val)[:, 1]
    print(classification_report(y_val, y_val_pred, target_names=['Non-Recurring', 'Recurring']))
    print(f"  AUC-ROC: {roc_auc_score(y_val, y_val_proba):.4f}")
    
    # 7. Evaluate on Test
    print("\n--- Test Set Results (Final, Unseen) ---")
    y_test_pred = model.predict(X_test)
    y_test_proba = model.predict_proba(X_test)[:, 1]
    print(classification_report(y_test, y_test_pred, target_names=['Non-Recurring', 'Recurring']))
    print(f"  AUC-ROC: {roc_auc_score(y_test, y_test_proba):.4f}")
    
    print("\nConfusion Matrix (Test Set):")
    cm = confusion_matrix(y_test, y_test_pred)
    print(f"  [[TN={cm[0][0]}  FP={cm[0][1]}]")
    print(f"   [FN={cm[1][0]}  TP={cm[1][1]}]]")
    
    # 8. Feature importance
    print("\nFeature Importance (Top 10):")
    importances = model.feature_importances_
    feature_names = list(X_train.columns)
    sorted_idx = np.argsort(importances)[::-1]
    for i in sorted_idx[:10]:
        print(f"  {feature_names[i]}: {importances[i]:.4f}")
    
    # 9. Save
    artifact = {
        'model': model,
        'label_encoders': label_encoders,
        'feature_names': feature_names,
        'test_metrics': {
            'f1': float(f1_score(y_test, y_test_pred)),
            'auc_roc': float(roc_auc_score(y_test, y_test_proba)),
        }
    }
    joblib.dump(artifact, STUDENT_MODEL_PATH)
    print(f"\nStudent model saved to: {STUDENT_MODEL_PATH}")
    
    return artifact


if __name__ == '__main__':
    train_student()
