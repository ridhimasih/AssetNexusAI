
import csv
from pathlib import Path

csv_file = Path(
    r"C:\Users\Asutosh Sharma\Downloads\ai4i+2020+predictive+maintenance+dataset\ai4i2020.csv"
)

print("Checking file:", csv_file)
print("File exists:", csv_file.exists())

if csv_file.exists():
    with open(csv_file, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        print("\nDataset columns:")
        print(reader.fieldnames)

        print("\nFirst 3 records:")
        for index, row in enumerate(reader):
            if index >= 3:
                break
            print(row)
else:
    print("CSV file not found. Check the file path.")
