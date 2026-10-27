
import csv
from pathlib import Path

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# Dataset location
DATASET_PATH = Path(
    r"C:\Users\Asutosh Sharma\Downloads\ai4i+2020+predictive+maintenance+dataset\ai4i2020.csv"
)

# Model save location
MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "failure_model.joblib"


# Input features used for prediction
FEATURES = [
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]

# Target to predict
TARGET = "Machine failure"


def main():
    # Check whether the dataset exists
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    # Read the CSV dataset
    with open(
        DATASET_PATH,
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        required_columns = FEATURES + [TARGET]

        if not reader.fieldnames or not all(
            column in reader.fieldnames
            for column in required_columns
        ):
            raise ValueError(
                "The CSV file is missing required columns."
            )

        records = list(reader)

    if not records:
        raise ValueError("The dataset contains no records.")

    # Prepare input features and target values
    X = []
    y = []

    for row in records:
        X.append({
            "Type": row["Type"],
            "Air temperature [K]": float(
                row["Air temperature [K]"]
            ),
            "Process temperature [K]": float(
                row["Process temperature [K]"]
            ),
            "Rotational speed [rpm]": float(
                row["Rotational speed [rpm]"]
            ),
            "Torque [Nm]": float(
                row["Torque [Nm]"]
            ),
            "Tool wear [min]": float(
                row["Tool wear [min]"]
            ),
        })

        y.append(int(row[TARGET]))

    # Convert input records into a 2D table
    X = pd.DataFrame(X, columns=FEATURES)

    # Select categorical and numerical features
    numeric_features = FEATURES[1:]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "machine_type",
                OneHotEncoder(handle_unknown="ignore"),
                ["Type"],
            ),
            (
                "numeric",
                "passthrough",
                numeric_features,
            ),
        ]
    )

    # Build the machine-learning pipeline
    model = Pipeline([
        ("preprocessor", preprocessor),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=200,
                class_weight="balanced",
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ])

    # Split data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    # Train the model
    print("Training the machine-failure model...")
    model.fit(X_train, y_train)

    # Evaluate the trained model
    predictions = model.predict(X_test)

    print("\nMODEL EVALUATION")
    print("----------------")
    print(f"Total records: {len(X)}")
    print(f"Training records: {len(X_train)}")
    print(f"Testing records: {len(X_test)}")

    print(
        f"Accuracy: {accuracy_score(y_test, predictions):.4f}"
    )

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, predictions))

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            predictions,
            labels=[0, 1],
            target_names=["No failure", "Failure"],
            zero_division=0,
        )
    )

    # Save the trained model
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    print("\nModel saved successfully!")
    print(f"Model location: {MODEL_PATH}")


if __name__ == "__main__":
    main()
