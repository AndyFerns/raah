"""
Step 2: Generate Pseudo-Labels for BMC
Loads the trained Teacher model and predicts is_recurring for all 1.2M BMC records.
Outputs bmc_pseudo_labeled.csv with the predicted labels and probabilities.
"""
import pandas as pd
import numpy as np
import joblib

from ml_pipeline import (
    UNIFIED_DATASET_PATH, TEACHER_MODEL_PATH, BMC_PSEUDO_LABELED_PATH,
    NUMERIC_FEATURES, CATEGORICAL_FEATURES, TARGET
)
from ml_pipeline.train_teacher import prepare_features


def generate_pseudo_labels():
    """Use Teacher model to predict labels for all BMC records."""
    print("Loading Teacher model...")
    artifact = joblib.load(TEACHER_MODEL_PATH)
    model = artifact['model']
    label_encoders = artifact['label_encoders']
    
    print("Loading unified dataset (BMC records only)...")
    df = pd.read_csv(UNIFIED_DATASET_PATH, low_memory=False)
    df_bmc = df[df['source_dataset'] == 'bmc'].copy()
    print(f"BMC records: {len(df_bmc)}")
    
    # Prepare features using the same encoders from training
    X_bmc, _ = prepare_features(df_bmc, label_encoders=label_encoders, fit=False)
    
    # Predict probabilities
    print("Predicting is_recurring for BMC records...")
    proba = model.predict_proba(X_bmc)[:, 1]  # Probability of recurrence
    predictions = model.predict(X_bmc)
    
    # Write to separate columns — NEVER overwrite is_recurring (stays NaN for BMC)
    # teacher_pseudo_label: Teacher's predicted class (not ground truth)
    # teacher_confidence:   Teacher's predicted probability of recurrence
    df_bmc['teacher_pseudo_label'] = predictions.astype(int)
    df_bmc['teacher_confidence'] = proba
    
    # Distribution of predictions
    print(f"\nPseudo-label distribution:")
    print(df_bmc['teacher_pseudo_label'].value_counts())
    print(f"\nTeacher confidence statistics:")
    print(df_bmc['teacher_confidence'].describe())
    high_conf = (df_bmc['teacher_confidence'] >= 0.90).sum()
    low_conf  = (df_bmc['teacher_confidence'] < 0.60).sum()
    print(f"\nHigh-confidence (>=0.90): {high_conf} ({100*high_conf/len(df_bmc):.1f}%)")
    print(f"Low-confidence  (<0.60):  {low_conf}  ({100*low_conf/len(df_bmc):.1f}%)")
    
    # Save — is_recurring column remains NaN (original absence preserved)
    df_bmc.to_csv(BMC_PSEUDO_LABELED_PATH, index=False)
    print(f"\nSaved pseudo-labeled BMC dataset to: {BMC_PSEUDO_LABELED_PATH}")
    
    return df_bmc


if __name__ == '__main__':
    generate_pseudo_labels()
