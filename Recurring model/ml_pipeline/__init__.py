# ML Pipeline shared configuration
import os

# Paths
UNIFIED_DATASET_PATH = 'datasets/unified_dataset/unified_feature_engineered.csv'
SAVED_MODELS_DIR = 'saved_models'
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

TEACHER_MODEL_PATH = os.path.join(SAVED_MODELS_DIR, 'teacher_model.joblib')
STUDENT_MODEL_PATH = os.path.join(SAVED_MODELS_DIR, 'student_model.joblib')
BMC_PSEUDO_LABELED_PATH = 'datasets/unified_dataset/bmc_pseudo_labeled.csv'

# Feature sets
# Rules:
#   semantic_similarity  - Real cosine similarity; NaN for all BMC rows (no genuine text).
#                          XGBoost handles NaN natively via missing=np.nan.
#   category_similarity  - Explicit category-based proxy for BMC (0.60/0.75/0.90).
#                          NaN for Synthetic/CivicDex rows (text-based matching used instead).
#   lexical_similarity   - Jaccard similarity; NaN for BMC (no text).
#   urgency_score        - NaN for BMC; included but sparse.
NUMERIC_FEATURES = [
    'semantic_similarity',      # NaN for BMC — native XGBoost missing handling
    'category_similarity',      # NaN for Synthetic/CivicDex — proxy for BMC only
    'distance_from_previous_km',
    'days_since_previous_similar',
    'previous_similar_report_count',
    'severity_score',
    'same_subdomain',
    'is_season',
]

CATEGORICAL_FEATURES = [
    'domain',
    'subdomain',
]

# Target columns — MUST NOT be mixed between Teacher and Student training
TEACHER_TARGET = 'is_recurring'          # Genuine ground-truth labels (synthetic dataset only)
STUDENT_TARGET = 'teacher_pseudo_label'  # Teacher-predicted pseudo-labels (BMC dataset)

# Legacy alias for backwards compatibility with any script still using TARGET
TARGET = TEACHER_TARGET

# Temporal Split Boundaries (based on actual data range 2018-2026)
# Train: 2018-2022 | Validation: 2023 | Test: 2024+
TRAIN_END_YEAR = 2022      # inclusive
VALIDATION_END_YEAR = 2023  # inclusive
# Test: everything after 2023
