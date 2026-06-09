"""
predict_api.py — Stdin/stdout JSON bridge for Express.js to call.

Reads a JSON object from stdin with water quality parameters,
loads the trained model, runs both ML and rule-based prediction,
and outputs a JSON result to stdout.

Input  (stdin):  { "ph": 7.2, "bod": 3.8, "cod": 24, "tds": 420, "total_coliform": 3000 }
Output (stdout): {
    "risk_level": "Medium",
    "confidence": 0.72,
    "probabilities": { "Low": 0.12, "Medium": 0.72, "High": 0.16 },
    "rule_based_risk": "Medium",
    "rule_based_violations": ["BOD (mg/L)", "COD (mg/L)"]
}
"""

import json
import os
import sys
import traceback

import numpy as np
import joblib


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "logistic_risk_model.pkl")

FEATURE_ORDER = [
    "ph",
    "bod",
    "cod",
    "tds",
    "total_coliform",
]

RISK_LABELS = ["Low", "Medium", "High"]


# ---------------------------------------------------------------------------
# CPCB rule-based classification
# ---------------------------------------------------------------------------
def cpcb_rule_based(ph: float, bod: float, cod: float, tds: float, coliform: float):
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
    try:
        # ------------------------------------------------------------------
        # 1. Read input
        # ------------------------------------------------------------------
        raw = sys.stdin.read().strip()
        if not raw:
            raise ValueError("No input received on stdin")

        data = json.loads(raw)

        # Extract and validate features
        values = []
        for key in FEATURE_ORDER:
            if key not in data:
                raise ValueError(f"Missing required field: '{key}'")
            val = float(data[key])
            values.append(val)

        ph, bod, cod, tds, coliform = values

        # ------------------------------------------------------------------
        # 2. Load model
        # ------------------------------------------------------------------
        if not os.path.isfile(MODEL_PATH):
            raise FileNotFoundError(f"Model not found at {MODEL_PATH}")

        model = joblib.load(MODEL_PATH)

        # ------------------------------------------------------------------
        # 3. ML prediction
        # ------------------------------------------------------------------
        features = np.array([values], dtype=np.float64)
        prediction = int(model.predict(features)[0])
        probabilities = model.predict_proba(features)[0]

        # Handle models trained with fewer than 3 classes
        model_classes = list(model.classes_)
        full_proba = np.zeros(3)
        for idx, cls in enumerate(model_classes):
            full_proba[cls] = probabilities[idx]

        ml_risk = RISK_LABELS[prediction]
        confidence = float(full_proba[prediction])

        prob_dict = {
            label: round(float(full_proba[i]), 4)
            for i, label in enumerate(RISK_LABELS)
        }

        # ------------------------------------------------------------------
        # 4. Rule-based prediction
        # ------------------------------------------------------------------
        rule_risk, violations = cpcb_rule_based(ph, bod, cod, tds, coliform)

        # ------------------------------------------------------------------
        # 5. Output result
        # ------------------------------------------------------------------
        result = {
            "risk_level": ml_risk,
            "confidence": round(confidence, 4),
            "probabilities": prob_dict,
            "rule_based_risk": rule_risk,
            "rule_based_violations": violations,
        }

        print(json.dumps(result))

    except Exception as exc:
        error_result = {
            "error": True,
            "message": str(exc),
            "traceback": traceback.format_exc(),
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    main()
