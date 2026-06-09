"""
batch_predict.py — Run predictions on all lake data and export JSON files.

Reads cleaned_data.csv, runs ML predictions on every row, groups by lake,
picks the latest record per lake, and exports:
  - ../backend/data/lake_predictions.json
  - ../backend/data/lake_parameters.json
"""

import json
import os
import sys

import numpy as np
import pandas as pd
import joblib


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "cleaned_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "logistic_risk_model.pkl")
BACKEND_DATA_DIR = os.path.join(BASE_DIR, "..", "backend", "data")

FEATURE_COLS = [
    "pH",
    "BOD (mg/L)",
    "COD (mg/L)",
    "Total Dissolved Solids",
    "Total Coliform (MPN/100)",
]

RISK_LABELS = ["Low", "Medium", "High"]

# Month ordering for chronological sorting
MONTH_ORDER = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}


# ---------------------------------------------------------------------------
# CPCB rule-based classification
# ---------------------------------------------------------------------------
def cpcb_rule_based(ph, bod, cod, tds, coliform):
    """Apply CPCB threshold rules and return (risk_level, violations)."""
    violations = []

    if ph < 6.5 or ph > 8.5:
        violations.append("pH")
    if bod > 3:
        violations.append("BOD (mg/L)")
    if cod > 10:
        violations.append("COD (mg/L)")
    if tds > 500:
        violations.append("Total Dissolved Solids")
    if coliform > 5000:
        violations.append("Total Coliform (MPN/100)")

    count = len(violations)
    if count == 0:
        risk = "Low"
    elif count <= 2:
        risk = "Medium"
    else:
        risk = "High"

    return risk, violations


def main() -> None:
    print("=" * 60)
    print("Water Quality Risk -- Batch Prediction")
    print("=" * 60)

    # ------------------------------------------------------------------
    # 1. Load data & model
    # ------------------------------------------------------------------
    if not os.path.isfile(DATA_PATH):
        print(f"ERROR: Data file not found at {DATA_PATH}")
        sys.exit(1)
    if not os.path.isfile(MODEL_PATH):
        print(f"ERROR: Model not found at {MODEL_PATH}")
        print("  -> Run train.py first to create the model.")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    model = joblib.load(MODEL_PATH)
    print(f"\n[OK] Loaded {len(df)} rows from {DATA_PATH}")
    print(f"[OK] Model loaded from {MODEL_PATH}")

    # ------------------------------------------------------------------
    # 2. Clean: drop rows with missing features
    # ------------------------------------------------------------------
    initial_len = len(df)
    df = df.dropna(subset=FEATURE_COLS)
    dropped = initial_len - len(df)
    if dropped:
        print(f"  [WARN] Dropped {dropped} rows with missing feature values")

    # ------------------------------------------------------------------
    # 3. Run ML predictions
    # ------------------------------------------------------------------
    X = df[FEATURE_COLS].values.astype(np.float64)
    predictions = model.predict(X)
    probabilities = model.predict_proba(X)

    # The model may have been trained with fewer than 3 classes (e.g., no Low samples).
    # model.classes_ tells us which classes the model actually knows.
    model_classes = list(model.classes_)  # e.g., [1, 2] if no Low samples

    # Build full 3-class probability arrays (fill missing classes with 0)
    full_proba = np.zeros((len(predictions), 3))
    for idx, cls in enumerate(model_classes):
        full_proba[:, cls] = probabilities[:, idx]

    df["ml_risk"] = [RISK_LABELS[p] for p in predictions]
    df["ml_confidence"] = [round(float(full_proba[i][predictions[i]]), 4) for i in range(len(predictions))]
    df["prob_low"] = [round(float(full_proba[i][0]), 4) for i in range(len(predictions))]
    df["prob_medium"] = [round(float(full_proba[i][1]), 4) for i in range(len(predictions))]
    df["prob_high"] = [round(float(full_proba[i][2]), 4) for i in range(len(predictions))]

    # Rule-based predictions
    rule_results = df.apply(
        lambda row: cpcb_rule_based(
            row["pH"], row["BOD (mg/L)"], row["COD (mg/L)"],
            row["Total Dissolved Solids"], row["Total Coliform (MPN/100)"]
        ),
        axis=1,
    )
    df["rule_based_risk"] = [r[0] for r in rule_results]
    df["rule_based_violations"] = [r[1] for r in rule_results]

    print(f"\n[OK] Predictions complete for {len(df)} rows")

    # ------------------------------------------------------------------
    # 4. Add month ordering for sorting
    # ------------------------------------------------------------------
    df["month_num"] = df["Sampling Month"].map(MONTH_ORDER).fillna(0).astype(int)

    # ------------------------------------------------------------------
    # 5. Build lake_predictions.json (latest record per lake)
    # ------------------------------------------------------------------
    df_sorted = df.sort_values(["Year", "month_num"], ascending=[True, True])
    latest = df_sorted.groupby("Name of Monitoring Station").last().reset_index()

    lake_predictions = []
    for _, row in latest.iterrows():
        lake_predictions.append({
            "lake_name": str(row["Name of Monitoring Station"]),
            "latitude": float(row["Latitude"]) if pd.notna(row["Latitude"]) else None,
            "longitude": float(row["Longitude"]) if pd.notna(row["Longitude"]) else None,
            "year": int(row["Year"]) if pd.notna(row["Year"]) else None,
            "month": str(row["Sampling Month"]),
            "ph": float(row["pH"]),
            "bod": float(row["BOD (mg/L)"]),
            "cod": float(row["COD (mg/L)"]),
            "tds": float(row["Total Dissolved Solids"]),
            "total_coliform": float(row["Total Coliform (MPN/100)"]),
            "ml_risk": str(row["ml_risk"]),
            "ml_confidence": float(row["ml_confidence"]),
            "probabilities": {
                "Low": float(row["prob_low"]),
                "Medium": float(row["prob_medium"]),
                "High": float(row["prob_high"]),
            },
            "rule_based_risk": str(row["rule_based_risk"]),
            "rule_based_violations": row["rule_based_violations"],
        })

    # ------------------------------------------------------------------
    # 6. Build lake_parameters.json (all records, grouped by lake)
    # ------------------------------------------------------------------
    lake_parameters = {}
    for _, row in df_sorted.iterrows():
        lake_name = str(row["Name of Monitoring Station"])
        if lake_name not in lake_parameters:
            lake_parameters[lake_name] = {
                "lake_name": lake_name,
                "latitude": float(row["Latitude"]) if pd.notna(row["Latitude"]) else None,
                "longitude": float(row["Longitude"]) if pd.notna(row["Longitude"]) else None,
                "records": [],
            }
        lake_parameters[lake_name]["records"].append({
            "year": int(row["Year"]) if pd.notna(row["Year"]) else None,
            "month": str(row["Sampling Month"]),
            "ph": float(row["pH"]),
            "bod": float(row["BOD (mg/L)"]),
            "cod": float(row["COD (mg/L)"]),
            "tds": float(row["Total Dissolved Solids"]),
            "total_coliform": float(row["Total Coliform (MPN/100)"]),
            "ml_risk": str(row["ml_risk"]),
            "ml_confidence": float(row["ml_confidence"]),
            "probabilities": {
                "Low": float(row["prob_low"]),
                "Medium": float(row["prob_medium"]),
                "High": float(row["prob_high"]),
            },
            "rule_based_risk": str(row["rule_based_risk"]),
            "rule_based_violations": row["rule_based_violations"],
        })

    # Convert dict to list
    lake_parameters_list = list(lake_parameters.values())

    # ------------------------------------------------------------------
    # 7. Export JSON files
    # ------------------------------------------------------------------
    os.makedirs(BACKEND_DATA_DIR, exist_ok=True)

    predictions_path = os.path.join(BACKEND_DATA_DIR, "lake_predictions.json")
    parameters_path = os.path.join(BACKEND_DATA_DIR, "lake_parameters.json")

    with open(predictions_path, "w", encoding="utf-8") as f:
        json.dump(lake_predictions, f, indent=2, ensure_ascii=False)
    print(f"\n[OK] Exported {len(lake_predictions)} lake predictions -> {predictions_path}")
    print(f"  File size: {os.path.getsize(predictions_path) / 1024:.1f} KB")

    with open(parameters_path, "w", encoding="utf-8") as f:
        json.dump(lake_parameters_list, f, indent=2, ensure_ascii=False)
    print(f"[OK] Exported {len(lake_parameters_list)} lakes (all records) -> {parameters_path}")
    print(f"  File size: {os.path.getsize(parameters_path) / 1024:.1f} KB")

    # ------------------------------------------------------------------
    # 8. Summary stats
    # ------------------------------------------------------------------
    risk_counts = latest["ml_risk"].value_counts()
    print(f"\n{'=' * 40}")
    print("Risk Distribution (latest records):")
    for label in RISK_LABELS:
        count = risk_counts.get(label, 0)
        print(f"  {label:>8s}: {count:>4d}  ({count / len(latest) * 100:.1f}%)")
    print(f"{'=' * 40}")
    print("=" * 60)


if __name__ == "__main__":
    main()
