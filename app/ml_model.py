
from pathlib import Path

import joblib
import pandas as pd


MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "models"
    / "failure_model.joblib"
)

FEATURES = [
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]


def predict_failure(sensor_data: dict) -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained model not found: {MODEL_PATH}"
        )

    model = joblib.load(MODEL_PATH)

    row = {
        "Type": sensor_data["machine_type"].upper(),
        "Air temperature [K]": sensor_data["air_temperature_k"],
        "Process temperature [K]": sensor_data["process_temperature_k"],
        "Rotational speed [rpm]": sensor_data["rotational_speed_rpm"],
        "Torque [Nm]": sensor_data["torque_nm"],
        "Tool wear [min]": sensor_data["tool_wear_min"],
    }

    input_data = pd.DataFrame([row], columns=FEATURES)

    prediction = int(model.predict(input_data)[0])

    probabilities = model.predict_proba(input_data)[0]
    failure_probability = float(probabilities[1])

    return {
        "predicted_failure": prediction,
        "prediction_label": (
            "Failure risk detected"
            if prediction == 1
            else "No failure predicted"
        ),
        "estimated_failure_probability": round(
            failure_probability, 4
        ),
        "model": "Random Forest",
        "warning": (
            "Research prototype only; not validated for "
            "operational safety decisions."
        ),
    }
