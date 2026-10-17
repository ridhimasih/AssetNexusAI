
import sqlite3
from pathlib import Path

# Store the database file inside assetnexus-backend
DATABASE_PATH = Path(__file__).resolve().parent.parent / "assetnexus.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                health INTEGER NOT NULL,
                status TEXT NOT NULL
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id TEXT NOT NULL,
                engineer_name TEXT NOT NULL,
                correction TEXT NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (asset_id) REFERENCES assets(id)
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS prediction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_type TEXT NOT NULL,
                air_temperature_k REAL NOT NULL,
                process_temperature_k REAL NOT NULL,
                rotational_speed_rpm INTEGER NOT NULL,
                torque_nm REAL NOT NULL,
                tool_wear_min INTEGER NOT NULL,
                predicted_failure INTEGER NOT NULL,
                failure_probability REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS corrective_knowledge (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id TEXT NOT NULL,
                engineer_name TEXT NOT NULL,
                observed_fault TEXT NOT NULL,
                corrected_diagnosis TEXT NOT NULL,
                reason TEXT,
                confidence REAL NOT NULL DEFAULT 0.8,
                review_status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (asset_id) REFERENCES assets(id)
            )
        """)


        columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(corrective_knowledge)"
            ).fetchall()
        }

        if "reviewed_by" not in columns:
            connection.execute(
                "ALTER TABLE corrective_knowledge ADD COLUMN reviewed_by TEXT"
            )

        if "reviewed_at" not in columns:
            connection.execute(
                "ALTER TABLE corrective_knowledge ADD COLUMN reviewed_at TIMESTAMP"
            )


        # Add trust-decision fields without deleting existing predictions
        columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(prediction_history)"
            ).fetchall()
        }

        new_columns = {
            "uncertainty": "REAL",
            "trust_level": "TEXT",
            "autonomy_action": "TEXT",
            "requires_human_review": "INTEGER",
            "recommendation": "TEXT",
        }

        for column_name, column_type in new_columns.items():
            if column_name not in columns:
                connection.execute(
                    f"ALTER TABLE prediction_history "
                    f"ADD COLUMN {column_name} {column_type}"
                )

if __name__ == "__main__":
    init_db()
    print(f"Database initialized at: {DATABASE_PATH}")
