"""
train.py -- Train a Logistic Regression model for water quality risk classification.

Reads risk_table.csv, encodes the Risk column (Low=0, Medium=1, High=2),
builds a Pipeline(StandardScaler -> LogisticRegression), evaluates with a
stratified 75/25 split, and saves the model to models/logistic_risk_model.pkl.
"""

import os
import sys
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "risk_table.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "logistic_risk_model.pkl")

FEATURE_COLS = [
    "pH",
    "BOD (mg/L)",
    "COD (mg/L)",
    "Total Dissolved Solids",
    "Total Coliform (MPN/100)",
]

RISK_MAP = {"Low": 0, "Medium": 1, "High": 2}
RISK_LABELS = ["Low", "Medium", "High"]


def main() -> None:
    # ------------------------------------------------------------------
    # 1. Load data
    # ------------------------------------------------------------------
    print("=" * 60)
    print("Water Quality Risk -- Model Training")
    print("=" * 60)

    if not os.path.isfile(DATA_PATH):
        print(f"ERROR: Data file not found at {DATA_PATH}")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    print(f"\n[OK] Loaded {len(df)} rows from {DATA_PATH}")

    # ------------------------------------------------------------------
    # 2. Validate & clean
    # ------------------------------------------------------------------
    missing_cols = [c for c in FEATURE_COLS + ["Risk"] if c not in df.columns]
    if missing_cols:
        print(f"ERROR: Missing columns: {missing_cols}")
        sys.exit(1)

    # Drop rows with missing features or labels
    initial_len = len(df)
    df = df.dropna(subset=FEATURE_COLS + ["Risk"])
    dropped = initial_len - len(df)
    if dropped:
        print(f"  [WARN] Dropped {dropped} rows with missing values")

    # Filter to known risk labels only
    df = df[df["Risk"].isin(RISK_MAP.keys())]
    print(f"  -> {len(df)} rows after cleaning")

    # ------------------------------------------------------------------
    # 3. Prepare features & labels
    # ------------------------------------------------------------------
    X = df[FEATURE_COLS].values.astype(np.float64)
    y = df["Risk"].map(RISK_MAP).values

    print(f"\nClass distribution:")
    for label, code in RISK_MAP.items():
        count = (y == code).sum()
        print(f"  {label:>8s} ({code}): {count:>5d}  ({count/len(y)*100:.1f}%)")

    # ------------------------------------------------------------------
    # 4. Train / Test split
    # ------------------------------------------------------------------
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.25,
        random_state=42,
        stratify=y,
    )
    print(f"\nTrain: {len(X_train)}  |  Test: {len(X_test)}")

    # ------------------------------------------------------------------
    # 5. Build & fit pipeline
    # ------------------------------------------------------------------
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(
            solver="lbfgs",
            max_iter=1000,
            random_state=42,
        )),
    ])

    print("\nTraining StandardScaler -> LogisticRegression ...")
    pipeline.fit(X_train, y_train)

    # ------------------------------------------------------------------
    # 6. Evaluate
    # ------------------------------------------------------------------
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    # Determine which classes are present in the data
    present_classes = sorted(set(y_train) | set(y_test))
    present_labels = [RISK_LABELS[c] for c in present_classes]

    print(f"\n{'=' * 60}")
    print(f"Accuracy: {acc:.4f}")
    print(f"{'=' * 60}")
    print("\nClassification Report:\n")
    print(classification_report(
        y_test, y_pred,
        labels=present_classes,
        target_names=present_labels,
    ))

    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred, labels=present_classes)
    header = "".join(f"  {lbl:>6s}" for lbl in present_labels)
    print(f"{'':>12s}{header}")
    for i, label in enumerate(present_labels):
        row = "".join(f"  {cm[i][j]:>6d}" for j in range(len(present_labels)))
        print(f"  {label:>8s}{row}")

    # ------------------------------------------------------------------
    # 7. Save model
    # ------------------------------------------------------------------
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"\n[OK] Model saved to {MODEL_PATH}")
    print(f"  File size: {os.path.getsize(MODEL_PATH) / 1024:.1f} KB")
    print("=" * 60)


if __name__ == "__main__":
    main()
