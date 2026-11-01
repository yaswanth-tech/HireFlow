import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal, engine, Base
from app.services.synthetic_data_service import generate_synthetic_data
from app.services.validation_service import run_data_validation_suite
from app.services.export_service import export_sql_seed, export_ground_truth_json, export_json_data
import json

def run_seed():
    print("=" * 60)
    print("HireFlow Enterprise Synthetic Data Generator & Validation Engine")
    print("=" * 60)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("[1/4] Generating benchmark reproducible dataset (Seed: 20261022)...")
        res = generate_synthetic_data(
            db,
            seed=20261022,
            req_count=200,
            cand_count=5000,
            app_count=8000,
            int_count=2000,
            inject_edge_cases=True
        )
        print(f"      Status: {res['status']}")
        print(f"      Checksum: {res['checksum']}")
        print(f"      Generated counts: {res['counts']}")

        print("\n[2/4] Running automated Data Validation Suite...")
        report = run_data_validation_suite(db)
        print(f"      Overall status: {report['overall_status']}")
        print(f"      Passed checks: {report['passed_checks']} / {report['total_checks']}")
        for c in report['checks']:
            icon = "[PASS]" if c['passed'] else "[FAIL]"
            print(f"      {icon} {c['check_name']} ({c['category']})")

        print("\n[3/4] Exporting PostgreSQL Seed Dump (hireflow_seed_postgres.sql)...")
        sql = export_sql_seed(db)
        with open("hireflow_seed_postgres.sql", "w", encoding="utf-8") as f:
            f.write(sql)
        print(f"      Exported {len(sql.splitlines())} SQL lines.")

        print("\n[4/4] Exporting Separate Ground-Truth Exceptions (ground_truth_exceptions.json)...")
        gt = export_ground_truth_json(db)
        with open("ground_truth_exceptions.json", "w", encoding="utf-8") as f:
            json.dump(gt, f, indent=2)
        print(f"      Exported {gt['total_edge_cases']} ground-truth edge cases.")

        print("\nSeed and export complete!")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
