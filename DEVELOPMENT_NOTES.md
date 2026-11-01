# HireFlow – Architectural & Development Notes

## 1. System Overview & Architecture
**HireFlow** is an enterprise-grade recruitment management and hiring intelligence platform built on a decoupled full-stack architecture:
- **Backend:** Python FastAPI with SQLAlchemy ORM, Pydantic data schemas, and PostgreSQL-compatible normalized schema (SQLite for local standalone execution).
- **Frontend:** React 18 with TypeScript, Vite, Tailwind CSS, Lucide icons, and Recharts.
- **Data Engine:** Pandas, NumPy, Faker, and deterministic random seed generation.

```
                    ┌──────────────────────────────────────────────┐
                    │               React 18 Frontend              │
                    │   Vite + Tailwind CSS + Recharts + Lucide    │
                    └──────────────────────┬───────────────────────┘
                                           │  JSON REST /api/v1
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │             FastAPI Backend (v2.4)           │
                    │   • JWT Auth & RBAC (Recruiter, Lead, VP)    │
                    │   • Pipeline State Transition Engine         │
                    │   • Conflict Detection & Availability Guard  │
                    │   • Compensation Band Compliance Engine      │
                    │   • Anomaly Sentinel & Audit Ledger          │
                    └──────────────────────┬───────────────────────┘
                                           │  SQLAlchemy ORM
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         Normalized Relational Storage        │
                    │  Requisitions, Candidates, Applications,     │
                    │  Interviews, Scorecards, Offers, Approvals,  │
                    │  AuditLogs, ExceptionResolutions             │
                    └──────────────────────────────────────────────┘
```

---

## 2. Core Architectural Decisions

### 2.1 Deterministic Synthetic Data Generation
- **Internal Fixed Seed (20261022):** Kept strictly inside the backend generator and configuration. All user-facing UI screens omit the seed number to deliver a commercial enterprise product experience.
- **Relational Consistency:** Generated records follow strict foreign key cascades:
  `HiringManager` -> `Requisition` -> `SkillRequirement`
  `Candidate` -> `Application` -> `Interview` -> `Scorecard` -> `Offer` -> `Approval`
- **Labelled Edge Cases:** Injected intentional edge cases (double bookings, salary violations, withdrawn candidates scheduled, missing scorecards, irrelevant evaluation criteria) paired with a ground-truth dataset export for evaluation reconciliation.

### 2.2 Pipeline Transition & Governance Engine
- **State Transition Gatekeeper:** Prohibits skipping essential vetting stages. Advancing directly from `APPLIED` to `OFFER` or `HIRED` is blocked unless explicitly authorized via an audited administrative force-override.
- **Scorecard Requirement Rule:** Candidates cannot advance past `TECHNICAL_INTERVIEW` or `PANEL_INTERVIEW` without a recorded scorecard.

### 2.3 Conflict Prevention & Availability Scheduling
- **Interviewer Double-Booking Detection:** Queries all existing active (`SCHEDULED`) interviews for an interviewer and flags temporal overlaps ($S_1 < E_2 \land S_2 < E_1$).
- **Offset-Naive Normalization:** Datetime values are stripped of timezone awareness (`to_naive()`) before interval comparisons to prevent SQLite type incompatibility.

### 2.4 Exception Intelligence & Remediations
- **Dynamic Sentinel Engine:** Cross-validates business constraints across 5 exception categories.
- **Resolution Tracking:** Unlike ephemeral alerts, exceptions resolved by hiring managers or recruiters are persisted in the `ExceptionResolution` table, recording the resolution ID, entity ID, action taken, actor, timestamp, and notes.

---

## 3. Automated Validation Suite (8-Point Check)
The platform features an automated validation suite accessible via API (`/api/v1/data/validate`) and UI (`Data Engine & Validation`):
1. **Primary Key Uniqueness Check:** Verifies zero PK collisions across all core tables.
2. **Foreign Key Referential Integrity:** Ensures all candidate IDs, requisition IDs, application IDs, and interview IDs resolve to parent records.
3. **Enum Domain Validation:** Validates status enums (`DRAFT`, `OPEN`, `SCHEDULED`, `APPROVED`, etc.).
4. **Temporal Ordering Check:** Verifies dates maintain logical flow (`applied_at <= scheduled_start < scheduled_end`).
5. **Lifecycle Gate Compliance:** Detects orphaned offers or interviews associated with withdrawn/rejected applications.
6. **Arithmetic Reconciliation:** Validates weighted scorecard score formulas ($0.40T + 0.30P + 0.20R + 0.10C = \text{Score}$).
7. **Duplicate Candidate Detection:** Verifies unique email constraints and flags duplicate applications.
8. **Deterministic State Checksum:** Generates a SHA-256 fingerprint over the system state.

---

## 4. Verification & Testing

### 4.1 Backend Pytest Suite
Ran `python -m pytest backend/tests -v`:
- `test_register_and_login`: PASSED
- `test_interview_conflict_prevention`: PASSED
- `test_offers_and_approvals`: PASSED
- `test_pipeline_transition_rules`: PASSED
- `test_requisition_lifecycle`: PASSED
- `test_synthetic_data_generation_and_validation`: PASSED

### 4.2 Frontend Production Bundle
Ran `npm --prefix frontend run build`:
- `dist/index.html`: 1.02 kB
- `dist/assets/index-YmdaNCY5.css`: 34.68 kB
- `dist/assets/index-B9mpaqKw.js`: 710.48 kB
- Output: 2,313 modules transformed, 0 TypeScript or bundling errors.

---

## 5. Known Assumptions & Operational Boundaries
- **Database Engine:** The platform uses SQLite locally for immediate single-file deployment (`hireflow.db`), but the database schema, models, constraints, and exported SQL scripts are designed for direct execution on enterprise PostgreSQL.
- **Export Paths:** CSV and SQL exports are generated on-the-fly and streamed via FastAPI streaming responses to minimize server memory footprints on large datasets.
