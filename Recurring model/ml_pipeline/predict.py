"""
Reusable prediction script for new incoming complaints.
Loads the Student model and predicts is_recurring for new data.
"""
import pandas as pd
import numpy as np
import joblib
import sys

from ml_pipeline import STUDENT_MODEL_PATH, NUMERIC_FEATURES, CATEGORICAL_FEATURES
from ml_pipeline.train_teacher import prepare_features


def predict(input_csv, output_csv=None):
    """Predict is_recurring for new records."""
    print("Loading Student model...")
    artifact = joblib.load(STUDENT_MODEL_PATH)
    model = artifact['model']
    label_encoders = artifact['label_encoders']
    
    print(f"Loading data from: {input_csv}")
    df = pd.read_csv(input_csv, low_memory=False)
    print(f"Records: {len(df)}")
    
    # Prepare features
    X, _ = prepare_features(df, label_encoders=label_encoders, fit=False)
    
    # Predict
    predictions = model.predict(X)
    probabilities = model.predict_proba(X)[:, 1]
    
    df['predicted_is_recurring'] = predictions.astype(int)
    df['recurring_probability'] = probabilities
    
    print(f"\nPrediction distribution:")
    print(df['predicted_is_recurring'].value_counts())
    
    if output_csv:
        df.to_csv(output_csv, index=False)
        print(f"Saved predictions to: {output_csv}")
    
    return df


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python -m ml_pipeline.predict <input_csv> [output_csv]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    predict(input_file, output_file)
