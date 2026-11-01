import io
import csv
import json
import zipfile
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.models import (
    Requisition, Candidate, Application, Interview, Scorecard,
    Offer, Approval, GroundTruthException
)

def export_json_data(db: Session, include_ground_truth: bool = True) -> Dict[str, Any]:
    def query_to_dict_list(model):
        items = db.query(model).all()
        result = []
        for item in items:
            row = {}
            for col in item.__table__.columns:
                val = getattr(item, col.name)
                if isinstance(val, datetime):
                    val = val.isoformat()
                row[col.name] = val
            result.append(row)
        return result

    data = {
        "metadata": {
            "exported_at": datetime.utcnow().isoformat(),
            "app": "HireFlow",
            "seed": 20261022
        },
        "requisitions": query_to_dict_list(Requisition),
        "candidates": query_to_dict_list(Candidate),
        "applications": query_to_dict_list(Application),
        "interviews": query_to_dict_list(Interview),
        "scorecards": query_to_dict_list(Scorecard),
        "offers": query_to_dict_list(Offer),
        "approvals": query_to_dict_list(Approval)
    }

    if include_ground_truth:
        data["ground_truth_exceptions"] = query_to_dict_list(GroundTruthException)

    return data

def export_ground_truth_json(db: Session) -> Dict[str, Any]:
    gt_items = db.query(GroundTruthException).all()
    items = []
    for g in gt_items:
        items.append({
            "id": g.id,
            "entity_type": g.entity_type,
            "entity_id": g.entity_id,
            "exception_type": g.exception_type,
            "description": g.description,
            "injected_at": g.injected_at.isoformat() if g.injected_at else None,
            "is_resolved": g.is_resolved
        })
    return {
        "total_edge_cases": len(items),
        "dataset_seed": 20261022,
        "exported_at": datetime.utcnow().isoformat(),
        "ground_truth_exceptions": items
    }

def export_csv_zip(db: Session) -> io.BytesIO:
    zip_buffer = io.BytesIO()
    models = [
        ("requisitions.csv", Requisition),
        ("candidates.csv", Candidate),
        ("applications.csv", Application),
        ("interviews.csv", Interview),
        ("scorecards.csv", Scorecard),
        ("offers.csv", Offer),
        ("approvals.csv", Approval),
        ("ground_truth_exceptions.csv", GroundTruthException)
    ]

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for filename, model in models:
            items = db.query(model).all()
            if not items:
                # Write header only
                cols = [c.name for c in model.__table__.columns]
                csv_data = io.StringIO()
                writer = csv.writer(csv_data)
                writer.writerow(cols)
                zip_file.writestr(filename, csv_data.getvalue())
                continue

            cols = [c.name for c in model.__table__.columns]
            csv_data = io.StringIO()
            writer = csv.writer(csv_data)
            writer.writerow(cols)

            for item in items:
                row = []
                for c in cols:
                    val = getattr(item, c)
                    if isinstance(val, datetime):
                        val = val.isoformat()
                    row.append(val)
                writer.writerow(row)

            zip_file.writestr(filename, csv_data.getvalue())

    zip_buffer.seek(0)
    return zip_buffer

def export_sql_seed(db: Session) -> str:
    lines = [
        "-- HireFlow PostgreSQL Database Seed Dump",
        f"-- Generated At: {datetime.utcnow().isoformat()}",
        "-- Seed: 20261022",
        "",
        "BEGIN;",
        ""
    ]

    models = [
        ("requisitions", Requisition),
        ("candidates", Candidate),
        ("applications", Application),
        ("interviews", Interview),
        ("scorecards", Scorecard),
        ("offers", Offer),
        ("approvals", Approval),
        ("ground_truth_exceptions", GroundTruthException)
    ]

    for tbl_name, model in models:
        items = db.query(model).all()
        if not items:
            continue
        cols = [c.name for c in model.__table__.columns]
        lines.append(f"-- Table: {tbl_name} ({len(items)} records)")
        for item in items:
            vals = []
            for c in cols:
                v = getattr(item, c)
                if v is None:
                    vals.append("NULL")
                elif isinstance(v, (int, float)):
                    vals.append(str(v))
                elif isinstance(v, bool):
                    vals.append("TRUE" if v else "FALSE")
                elif isinstance(v, datetime):
                    vals.append(f"'{v.isoformat()}'")
                else:
                    safe_v = str(v).replace("'", "''")
                    vals.append(f"'{safe_v}'")
            lines.append(f"INSERT INTO {tbl_name} ({', '.join(cols)}) VALUES ({', '.join(vals)});")
        lines.append("")

    lines.append("COMMIT;")
    return "\n".join(lines)
