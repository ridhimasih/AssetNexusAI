
import csv
from pathlib import Path
from app.database import get_connection

CSV_PATH = Path(
    r"C:\Users\Asutosh Sharma\Downloads\ai4i+2020+predictive+maintenance+dataset\ai4i2020.csv"
)

if not CSV_PATH.exists():
    raise FileNotFoundError(f"Dataset not found: {CSV_PATH}")

connection = get_connection()

try:
    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        required_columns = [
            "UDI", "Product ID", "Type",
            "Air temperature [K]", "Process temperature [K]",
            "Rotational speed [rpm]", "Torque [Nm]",
            "Tool wear [min]", "Machine failure",
            "TWF", "HDF", "PWF", "OSF", "RNF"
        ]

        if not reader.fieldnames or not all(
            column in reader.fieldnames for column in required_columns
        ):
            raise ValueError("CSV columns do not match the expected AI4I dataset.")

        with connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS ai4i_sensor_records (
                    udi INTEGER PRIMARY KEY,
                    product_id TEXT NOT NULL,
                    machine_type TEXT NOT NULL,
                    air_temperature_k REAL NOT NULL,
                    process_temperature_k REAL NOT NULL,
                    rotational_speed_rpm INTEGER NOT NULL,
                    torque_nm REAL NOT NULL,
                    tool_wear_min INTEGER NOT NULL,
                    machine_failure INTEGER NOT NULL,
                    twf INTEGER NOT NULL,
                    hdf INTEGER NOT NULL,
                    pwf INTEGER NOT NULL,
                    osf INTEGER NOT NULL,
                    rnf INTEGER NOT NULL
                )
            """)

            sql = """
                INSERT OR IGNORE INTO ai4i_sensor_records (
                    udi, product_id, machine_type,
                    air_temperature_k, process_temperature_k,
                    rotational_speed_rpm, torque_nm, tool_wear_min,
                    machine_failure, twf, hdf, pwf, osf, rnf
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """

            batch = []

            for row in reader:
                batch.append((
                    int(row["UDI"]),
                    row["Product ID"],
                    row["Type"],
                    float(row["Air temperature [K]"]),
                    float(row["Process temperature [K]"]),
                    int(row["Rotational speed [rpm]"]),
                    float(row["Torque [Nm]"]),
                    int(row["Tool wear [min]"]),
                    int(row["Machine failure"]),
                    int(row["TWF"]),
                    int(row["HDF"]),
                    int(row["PWF"]),
                    int(row["OSF"]),
                    int(row["RNF"])
                ))

            connection.executemany(sql, batch)

            total = connection.execute(
                "SELECT COUNT(*) FROM ai4i_sensor_records"
            ).fetchone()[0]

            print(f"Dataset import complete. Total records in database: {total}")

finally:
    connection.close()
