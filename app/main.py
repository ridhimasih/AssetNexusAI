
from pydantic import BaseModel, Field
from app.ml_model import predict_failure

from fastapi.middleware.cors import CORSMiddleware
from contextlib import closing

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_connection, init_db


app = FastAPI(
    title="AssetNexusAI Backend",
    description="Industrial Asset Intelligence API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialize the SQLite database when the backend starts
@app.on_event("startup")
def startup_event():
    init_db()


# Sample analysis data for development.
# These values are illustrative, not real model predictions.
analyses = {
    "AST-001": {
        "asset_id": "AST-001",
        "anomaly": "No significant anomaly detected",
        "diagnosis": "Operating normally",
        "rul_days": 186,
        "uncertainty": 0.12,
        "trust_level": "high",
        "recommendation": "Continue routine monitoring",
        "requires_human_review": False
    },
    "AST-002": {
        "asset_id": "AST-002",
        "anomaly": "High vibration",
        "diagnosis": "Possible bearing degradation",
        "rul_days": 74,
        "uncertainty": 0.32,
        "trust_level": "medium",
        "recommendation": "Inspect the bearing",
        "requires_human_review": True
    },
    "AST-003": {
        "asset_id": "AST-003",
        "anomaly": "Elevated temperature",
        "diagnosis": "Possible compressor overheating",
        "rul_days": 30,
        "uncertainty": 0.78,
        "trust_level": "low",
        "recommendation": "Escalate for engineer assessment",
        "requires_human_review": True
    },
    "AST-004": {
        "asset_id": "AST-004",
        "anomaly": "Minor vibration variation",
        "diagnosis": "No confirmed fault",
        "rul_days": 120,
        "uncertainty": 0.22,
        "trust_level": "high",
        "recommendation": "Continue routine monitoring",
        "requires_human_review": False
    }
}


class FeedbackRequest(BaseModel):
    engineer_name: str = Field(min_length=1, max_length=100)
    correction: str = Field(min_length=1, max_length=2000)
    notes: Optional[str] = Field(default=None, max_length=2000)


@app.get("/")
def home():
    return {
        "message": "Welcome to AssetNexusAI Backend",
        "status": "running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AssetNexusAI Backend"
    }


@app.get("/api/assets")
def get_assets():
    with closing(get_connection()) as connection:
        rows = connection.execute(
            "SELECT id, name, location, health, status "
            "FROM assets ORDER BY id"
        ).fetchall()

    assets = [dict(row) for row in rows]

    return {
        "count": len(assets),
        "assets": assets
    }


@app.get("/api/assets/{asset_id}")
def get_asset(asset_id: str):
    with closing(get_connection()) as connection:
        row = connection.execute(
            "SELECT id, name, location, health, status "
            "FROM assets WHERE id = ?",
            (asset_id,)
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    return dict(row)


@app.get("/api/assets/{asset_id}/analysis")
def get_asset_analysis(asset_id: str):
    # Confirm that this asset exists in the database.
    asset = get_asset(asset_id)

    analysis = analyses.get(asset["id"])

    if analysis is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found for this asset"
        )

    return analysis


@app.post("/api/assets/{asset_id}/feedback", status_code=201)
def submit_feedback(asset_id: str, feedback: FeedbackRequest):
    # Confirm that the asset exists.
    get_asset(asset_id)

    connection = get_connection()

    try:
        with connection:
            cursor = connection.execute(
                """
                INSERT INTO feedback
                    (asset_id, engineer_name, correction, notes)
                VALUES (?, ?, ?, ?)
                """,
                (
                    asset_id,
                    feedback.engineer_name.strip(),
                    feedback.correction.strip(),
                    feedback.notes.strip() if feedback.notes else None
                )
            )

            feedback_id = cursor.lastrowid

            row = connection.execute(
                """
                SELECT id, asset_id, engineer_name,
                       correction, notes, created_at
                FROM feedback
                WHERE id = ?
                """,
                (feedback_id,)
            ).fetchone()

        record = dict(row)

    finally:
        connection.close()

    return {
        "message": "Feedback saved successfully",
        "feedback": record
    }


@app.get("/api/knowledge")
def get_feedback_knowledge():
    with closing(get_connection()) as connection:
        rows = connection.execute(
            """
            SELECT id, asset_id, engineer_name,
                   correction, notes, created_at
            FROM feedback
            ORDER BY id DESC
            """
        ).fetchall()

    items = [dict(row) for row in rows]

    return {
        "count": len(items),
        "items": items
    }


@app.get("/api/dataset/stats")
def get_dataset_stats():
    connection = get_connection()

    try:
        total = connection.execute(
            "SELECT COUNT(*) FROM ai4i_sensor_records"
        ).fetchone()[0]

        failures = connection.execute(
            "SELECT COUNT(*) FROM ai4i_sensor_records "
            "WHERE machine_failure = 1"
        ).fetchone()[0]

        non_failures = total - failures

        return {
            "dataset": "AI4I 2020 Predictive Maintenance",
            "total_records": total,
            "machine_failures": failures,
            "non_failures": non_failures,
            "failure_percentage": round(
                (failures / total) * 100, 2
            ) if total else 0
        }

    finally:
        connection.close()


@app.get("/api/dataset/records")
def get_dataset_records(limit: int = 10, offset: int = 0):
    if limit < 1 or limit > 100:
        return {"error": "Limit must be between 1 and 100"}

    if offset < 0:
        return {"error": "Offset cannot be negative"}

    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT *
            FROM ai4i_sensor_records
            ORDER BY udi
            LIMIT ? OFFSET ?
            """,
            (limit, offset)
        ).fetchall()

        return {
            "count": len(rows),
            "limit": limit,
            "offset": offset,
            "records": [dict(row) for row in rows]
        }

    finally:
        connection.close()


@app.get("/api/dataset/failures")
def get_failure_records(
    machine_type: str | None = None,
    limit: int = 10,
    offset: int = 0
):
    if limit < 1 or limit > 100:
        return {"error": "Limit must be between 1 and 100"}

    if offset < 0:
        return {"error": "Offset cannot be negative"}

    connection = get_connection()

    try:
        query = """
            SELECT *
            FROM ai4i_sensor_records
            WHERE machine_failure = 1
        """
        params = []

        if machine_type:
            query += " AND machine_type = ?"
            params.append(machine_type.upper())

        query += " ORDER BY udi LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = connection.execute(query, params).fetchall()

        return {
            "count": len(rows),
            "limit": limit,
            "offset": offset,
            "machine_type": machine_type,
            "failures": [dict(row) for row in rows]
        }

    finally:
        connection.close()


class SensorInput(BaseModel):
    machine_type: str = Field(pattern=r"^[LMHlmh]$")
    air_temperature_k: float = Field(ge=250, le=350)
    process_temperature_k: float = Field(ge=250, le=400)
    rotational_speed_rpm: int = Field(gt=0, le=10000)
    torque_nm: float = Field(ge=0, le=500)
    tool_wear_min: int = Field(ge=0, le=1000)

    
def get_trust_decision(failure_probability: float) -> dict:
    """
    Prototype uncertainty-gated trust policy.
    The uncertainty score is derived from the model's
    failure probability; it is not a calibrated measure.
    """

    if not 0.0 <= failure_probability <= 1.0:
        raise ValueError("Failure probability must be between 0 and 1.")

    # Uncertainty is highest when the probability is near 0.5.
    uncertainty = 1.0 - abs(2.0 * failure_probability - 1.0)

    if uncertainty <= 0.25:
        trust_level = "high"
        action = "recommendation_permitted"
        recommendation = (
            "A recommendation may be presented for engineer review."
        )
        requires_human_review = False

    elif uncertainty <= 0.60:
        trust_level = "medium"
        action = "request_human_review"
        recommendation = (
            "Ask an engineer to review the prediction before proceeding."
        )
        requires_human_review = True

    else:
        trust_level = "low"
        action = "restrict_automatic_action"
        recommendation = (
            "Do not act automatically. Escalate for engineer assessment."
        )
        requires_human_review = True

    return {
        "uncertainty": round(uncertainty, 4),
        "trust_level": trust_level,
        "autonomy_action": action,
        "recommendation": recommendation,
        "requires_human_review": requires_human_review,
    }



class CorrectiveKnowledgeInput(BaseModel):
    asset_id: str = Field(min_length=1, max_length=50)
    engineer_name: str = Field(min_length=1, max_length=100)
    observed_fault: str = Field(min_length=1, max_length=500)
    corrected_diagnosis: str = Field(min_length=1, max_length=500)
    reason: str | None = Field(default=None, max_length=1000)
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)




@app.post("/api/predict")
def predict_machine_failure(sensor: SensorInput):
    try:
        sensor_data = sensor.model_dump()
        result = predict_failure(sensor_data)

        failure_probability = float(
            result["estimated_failure_probability"]
        )

        trust_decision = get_trust_decision(
            failure_probability
        )

        with closing(get_connection()) as connection:

          
       
            with connection:
                connection.execute(
                    """
                    INSERT INTO prediction_history (
                        machine_type,
                        air_temperature_k,
                        process_temperature_k,
                        rotational_speed_rpm,
                        torque_nm,
                        tool_wear_min,
                        predicted_failure,
                        failure_probability,
                        uncertainty,
                        trust_level,
                        autonomy_action,
                        requires_human_review,
                        recommendation
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        sensor_data["machine_type"].upper(),
                        sensor_data["air_temperature_k"],
                        sensor_data["process_temperature_k"],
                        sensor_data["rotational_speed_rpm"],
                        sensor_data["torque_nm"],
                        sensor_data["tool_wear_min"],
                        result["predicted_failure"],
                        failure_probability,
                        trust_decision["uncertainty"],
                        trust_decision["trust_level"],
                        trust_decision["autonomy_action"],
                        int(trust_decision["requires_human_review"]),
                        trust_decision["recommendation"],
                    ),
                )

            

        response = dict(result)
        response.update(trust_decision)

        return response

    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Trained model file was not found.",
        )

@app.get("/api/predictions")
def get_prediction_history(limit: int = 50, offset: int = 0):
    from app.database import get_connection
    from fastapi import HTTPException

    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 500.",
        )

    if offset < 0:
        raise HTTPException(
            status_code=400,
            detail="Offset cannot be negative.",
        )

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM prediction_history
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()

        total = connection.execute(
            "SELECT COUNT(*) FROM prediction_history"
        ).fetchone()[0]

    return {
        "total_predictions": total,
        "limit": limit,
        "offset": offset,
        "predictions": [dict(row) for row in rows],
    }

@app.get("/api/predictions/audit")
def get_prediction_audit(limit: int = 50, offset: int = 0):
    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 500.",
        )

    if offset < 0:
        raise HTTPException(
            status_code=400,
            detail="Offset cannot be negative.",
        )

    with closing(get_connection()) as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                machine_type,
                predicted_failure,
                failure_probability,
                uncertainty,
                trust_level,
                autonomy_action,
                requires_human_review,
                recommendation
            FROM prediction_history
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()

        total = connection.execute(
            "SELECT COUNT(*) FROM prediction_history"
        ).fetchone()[0]

    return {
        "total_records": total,
        "limit": limit,
        "offset": offset,
        "audit_records": [dict(row) for row in rows],
        "note": (
            "This endpoint displays stored model decisions. "
            "It does not represent independently verified machine outcomes."
        ),
    }

@app.get("/api/predictions/review-required")
def get_predictions_requiring_review(limit: int = 50, offset: int = 0):
    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 500.",
        )

    if offset < 0:
        raise HTTPException(
            status_code=400,
            detail="Offset cannot be negative.",
        )

    with closing(get_connection()) as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                machine_type,
                predicted_failure,
                failure_probability,
                uncertainty,
                trust_level,
                autonomy_action,
                requires_human_review,
                recommendation
            FROM prediction_history
            WHERE requires_human_review = 1
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()

        total = connection.execute(
            """
            SELECT COUNT(*)
            FROM prediction_history
            WHERE requires_human_review = 1
            """
        ).fetchone()[0]

    return {
        "total_requiring_review": total,
        "limit": limit,
        "offset": offset,
        "predictions": [dict(row) for row in rows],
        "note": (
            "These are model-generated review flags, "
            "not confirmed machine faults."
        ),
    }


@app.get("/api/predictions/summary")
def get_prediction_summary():
    with closing(get_connection()) as connection:
        row = connection.execute("""
            SELECT
                COUNT(*) AS total_predictions,
                SUM(
                    CASE WHEN predicted_failure = 1
                    THEN 1 ELSE 0 END
                ) AS predicted_failures,
                AVG(failure_probability)
                    AS average_failure_probability,
                SUM(
                    CASE WHEN trust_level = 'high'
                    THEN 1 ELSE 0 END
                ) AS high_trust_predictions,
                SUM(
                    CASE WHEN trust_level = 'medium'
                    THEN 1 ELSE 0 END
                ) AS medium_trust_predictions,
                SUM(
                    CASE WHEN trust_level = 'low'
                    THEN 1 ELSE 0 END
                ) AS low_trust_predictions,
                SUM(
                    CASE WHEN requires_human_review = 1
                    THEN 1 ELSE 0 END
                ) AS human_review_required
            FROM prediction_history
        """).fetchone()

    total = row["total_predictions"]
    failures = row["predicted_failures"] or 0
    average_probability = row["average_failure_probability"]

    return {
        "total_predictions": total,
        "predicted_failures": failures,
        "predicted_non_failures": total - failures,
        "average_failure_probability": (
            round(average_probability, 4)
            if average_probability is not None else None
        ),
        "high_trust_predictions": row["high_trust_predictions"] or 0,
        "medium_trust_predictions": row["medium_trust_predictions"] or 0,
        "low_trust_predictions": row["low_trust_predictions"] or 0,
        "human_review_required": row["human_review_required"] or 0,
        "note": (
            "Predictions are not confirmed machine failures. "
            "Trust counts reflect stored trust decisions."
        ),
    }


@app.get("/api/assets/{asset_id}/feedback")
def get_asset_feedback(asset_id: str):
    from app.database import get_connection
    from fastapi import HTTPException

    with get_connection() as connection:
        asset = connection.execute(
            "SELECT id FROM assets WHERE id = ?",
            (asset_id,),
        ).fetchone()

        if asset is None:
            raise HTTPException(
                status_code=404,
                detail="Asset not found.",
            )

        rows = connection.execute(
            """
            SELECT
                id,
                asset_id,
                engineer_name,
                correction,
                notes,
                created_at
            FROM feedback
            WHERE asset_id = ?
            ORDER BY id DESC
            """,
            (asset_id,),
        ).fetchall()

    return {
        "asset_id": asset_id,
        "total_feedback": len(rows),
        "feedback": [dict(row) for row in rows],
    }



@app.post("/api/knowledge", status_code=201)
def create_corrective_knowledge(
    knowledge: CorrectiveKnowledgeInput
):
    with closing(get_connection()) as connection:
        data = knowledge.model_dump()

        asset = connection.execute(
            "SELECT id FROM assets WHERE id = ?",
            (data["asset_id"].strip(),),
        ).fetchone()

        if asset is None:
            raise HTTPException(
                status_code=404,
                detail="Asset not found.",
            )

        cursor = connection.execute(
            """
            INSERT INTO corrective_knowledge (
                asset_id,
                engineer_name,
                observed_fault,
                corrected_diagnosis,
                reason,
                confidence
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                data["asset_id"].strip(),
                data["engineer_name"].strip(),
                data["observed_fault"].strip(),
                data["corrected_diagnosis"].strip(),
                data["reason"].strip() if data["reason"] else None,
                data["confidence"],
            ),
        )

        knowledge_id = cursor.lastrowid

    return {
        "message": "Corrective knowledge saved successfully.",
        "knowledge_id": knowledge_id,
        "review_status": "pending",
    }



@app.get("/api/knowledge/corrections")
def get_corrective_knowledge(
    review_status: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 500.",
        )

    if offset < 0:
        raise HTTPException(
            status_code=400,
            detail="Offset cannot be negative.",
        )

    if review_status is not None and review_status not in {
        "pending", "approved", "rejected"
    }:
        raise HTTPException(
            status_code=400,
            detail="review_status must be pending, approved, or rejected.",
        )

    query = """
        SELECT *
        FROM corrective_knowledge
    """
    params = []

    if review_status is not None:
        query += " WHERE review_status = ?"
        params.append(review_status)

    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with closing(get_connection()) as connection:
        rows = connection.execute(query, params).fetchall()

        count_query = "SELECT COUNT(*) FROM corrective_knowledge"
        count_params = []

        if review_status is not None:
            count_query += " WHERE review_status = ?"
            count_params.append(review_status)

        total = connection.execute(
            count_query, count_params
        ).fetchone()[0]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "review_status": review_status,
        "corrections": [dict(row) for row in rows],
    }


@app.get("/api/knowledge/assets/{asset_id}")
def get_asset_corrective_knowledge(asset_id: str):
    with closing(get_connection()) as connection:
        asset = connection.execute(
            "SELECT id FROM assets WHERE id = ?",
            (asset_id,),
        ).fetchone()

        if asset is None:
            raise HTTPException(
                status_code=404,
                detail="Asset not found.",
            )

        rows = connection.execute(
            """
            SELECT *
            FROM corrective_knowledge
            WHERE asset_id = ?
            ORDER BY id DESC
            """,
            (asset_id,),
        ).fetchall()

    return {
        "asset_id": asset_id,
        "total_corrections": len(rows),
        "corrections": [dict(row) for row in rows],
    }


@app.get("/api/knowledge/assets/{asset_id}/latest")
def get_latest_asset_knowledge(asset_id: str):
    with closing(get_connection()) as connection:
        asset = connection.execute(
            "SELECT id FROM assets WHERE id = ?",
            (asset_id,),
        ).fetchone()

        if asset is None:
            raise HTTPException(
                status_code=404,
                detail="Asset not found.",
            )

        row = connection.execute(
            """
            SELECT *
            FROM corrective_knowledge
            WHERE asset_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (asset_id,),
        ).fetchone()

    if row is None:
        return {
            "asset_id": asset_id,
            "message": "No corrective knowledge recorded for this asset.",
            "correction": None,
        }

    return {
        "asset_id": asset_id,
        "correction": dict(row),
    }


@app.get("/api/knowledge/review-summary")
def get_knowledge_review_summary():
    with closing(get_connection()) as connection:
        row = connection.execute(
            """
            SELECT
                COUNT(*) AS total_corrections,
                SUM(
                    CASE WHEN review_status = 'pending'
                    THEN 1 ELSE 0 END
                ) AS pending,
                SUM(
                    CASE WHEN review_status = 'approved'
                    THEN 1 ELSE 0 END
                ) AS approved,
                SUM(
                    CASE WHEN review_status = 'rejected'
                    THEN 1 ELSE 0 END
                ) AS rejected
            FROM corrective_knowledge
            """
        ).fetchone()

    return {
        "total_corrections": row["total_corrections"],
        "pending": row["pending"] or 0,
        "approved": row["approved"] or 0,
        "rejected": row["rejected"] or 0,
    }



class KnowledgeReviewInput(BaseModel):
    review_status: str = Field(
        pattern=r"^(approved|rejected)$"
    )
    reviewer_name: str = Field(
        min_length=1,
        max_length=100
    )


@app.patch("/api/knowledge/corrections/{knowledge_id}/review")
def review_corrective_knowledge(
    knowledge_id: int,
    review: KnowledgeReviewInput,
):
    with closing(get_connection()) as connection:
        existing = connection.execute(
            """
            SELECT id
            FROM corrective_knowledge
            WHERE id = ?
            """,
            (knowledge_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Corrective knowledge not found.",
            )

      
        connection.execute(
            """
            UPDATE corrective_knowledge
            SET review_status = ?,
                reviewed_by = ?,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                review.review_status,
                review.reviewer_name.strip(),
                knowledge_id,
            ),
        )


    return {
        "message": "Knowledge review status updated.",
        "knowledge_id": knowledge_id,
        "review_status": review.review_status,
    }
 
@app.get("/api/knowledge/approved")
def get_approved_knowledge(limit: int = 50, offset: int = 0):
    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 500."
        )

    if offset < 0:
        raise HTTPException(
            status_code=400,
            detail="Offset cannot be negative."
        )

    with closing(get_connection()) as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM corrective_knowledge
            WHERE review_status = 'approved'
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset)
        ).fetchall()

        total = connection.execute(
            """
            SELECT COUNT(*)
            FROM corrective_knowledge
            WHERE review_status = 'approved'
            """
        ).fetchone()[0]

    return {
        "total_approved": total,
        "limit": limit,
        "offset": offset,
        "approved_knowledge": [dict(row) for row in rows],
        "note": (
            "Approved corrections are stored knowledge. "
            "They are not automatically used to retrain the model."
        )
    }
