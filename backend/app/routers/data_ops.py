from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import SyntheticGenerateRequest, ValidationReport
from app.services.synthetic_data_service import generate_synthetic_data
from app.services.validation_service import run_data_validation_suite
from app.services.export_service import (
    export_json_data, export_ground_truth_json, export_csv_zip, export_sql_seed
)

router = APIRouter(prefix="/data", tags=["Data Operations & Synthetic Generator"])

@router.post("/generate")
def trigger_generation(data: SyntheticGenerateRequest, db: Session = Depends(get_db)):
    result = generate_synthetic_data(
        db,
        seed=data.seed,
        req_count=data.requisitions_count,
        cand_count=data.candidates_count,
        app_count=data.applications_count,
        int_count=data.interviews_count,
        inject_edge_cases=data.inject_edge_cases
    )
    return result

@router.get("/validate", response_model=ValidationReport)
def run_validation(db: Session = Depends(get_db)):
    report = run_data_validation_suite(db)
    return report

@router.get("/export/json")
def get_json_export(include_ground_truth: bool = True, db: Session = Depends(get_db)):
    return export_json_data(db, include_ground_truth=include_ground_truth)

@router.get("/export/ground-truth")
def get_ground_truth_export(db: Session = Depends(get_db)):
    return export_ground_truth_json(db)

@router.get("/export/sql")
def get_sql_export(db: Session = Depends(get_db)):
    sql_text = export_sql_seed(db)
    return Response(
        content=sql_text,
        media_type="application/sql",
        headers={"Content-Disposition": "attachment; filename=hireflow_seed_postgres.sql"}
    )

@router.get("/export/csv")
def get_csv_export(db: Session = Depends(get_db)):
    zip_bytes = export_csv_zip(db)
    return Response(
        content=zip_bytes.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=hireflow_datasets.zip"}
    )
