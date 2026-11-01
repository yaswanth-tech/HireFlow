# HireFlow – Smart Recruitment & Hiring Management System

**HireFlow** is an enterprise-grade full-stack recruitment management and hiring intelligence platform designed for high-volume, compliant talent acquisition workflows. It enforces strict compensation band governance, lifecycle transition rules, automated double-booking prevention, multi-tier executive offer approvals, and cryptographic audit logging.

---

## 🚀 Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy 2.0 (PostgreSQL/SQLite dual-mode), Pydantic v2 |
| **Data Processing** | Pandas, NumPy, Faker |
| **Authentication** | JWT (JSON Web Tokens), OAuth2 Bearer, Bcrypt password hashing |
| **Testing** | Pytest, HTTPX TestClient |
| **DevOps** | Docker, Docker Compose, Nginx |

---

## 🏛️ System Architecture & ID Conventions

HireFlow uses normalized relational PostgreSQL schemas with immutable event history and monotonic enterprise identifiers:

- **Requisition:** `REQ-2026-000001`
- **Candidate:** `CAND-000001`
- **Application:** `APP-CAND-000001-REQ-2026-000001`
- **Interview:** `INT-2026-000001`
- **Scorecard:** `SCORE-{interview-id}-{reviewer-id}`
- **Offer:** `OFF-2026-000001`
- **Approval:** `APPR-2026-000001`
- **Audit Log:** `AUD-{uuid}`
- **Ground Truth:** `GT-000001`

```
┌─────────────────────────────────────────────────────────────┐
│                       HireFlow Platform                      │
└─────────────────────────────────────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────┐                               ┌──────────────┐
│ React + Vite │ <──── REST API (JWT/JSON) ────>│   FastAPI    │
│  Tailwind    │                               │  App Engine  │
└──────────────┘                               └──────────────┘
                                                       │
                      ┌────────────────────────────────┴──────────────────┐
                      ▼                                                   ▼
            ┌──────────────────┐                                ┌──────────────────┐
            │ PostgreSQL / SQL │                                │ Validation Suite │
            │  Relational DB   │                                │  & Seed Engine   │
            └──────────────────┘                                └──────────────────┘
```

---

## ⚡ Core Features & Business Logic

### 1. Hiring Intelligence Dashboard
- Live, database-driven metrics calculation (Total Requisitions, Open Positions, Talent Pool Size, Applications, Interviews, Pending Offers, Hired Volume).
- Dynamic Recruitment Pipeline Funnel visualization.
- Monthly Hiring Velocity trend analysis.
- Department Headcount Demand & Openings breakdown.
- Interviewer Workload and active compliance exception indicators.

### 2. Job Requisition Management
- Create, filter, search, and manage corporate job requisitions.
- Approved minimum and maximum compensation band configuration.
- Skill criteria mapping with required vs. preferred importance and minimum experience thresholds.

### 3. Candidate Profile Management
- Comprehensive talent directory indexing contact info, skills, current titles, and verified experience.
- Full candidate profile drawer displaying active applications, interview history, and audit milestones.

### 4. Recruitment Pipeline with Mandatory Stage Rules
Enforces strict lifecycle progression:
`APPLIED` ➔ `SCREENING` ➔ `TECHNICAL_INTERVIEW` ➔ `PANEL_INTERVIEW` ➔ `OFFER` ➔ `HIRED` (plus `REJECTED` & `WITHDRAWN`).
- **Rule 1 (Review Prerequisite):** Candidates cannot advance to `OFFER` without at least one completed interview evaluation scorecard.
- **Rule 2 (Approved Offer Prerequisite):** Candidates cannot transition to `HIRED` without a formally approved and accepted employment offer.
- **Rule 3 (Terminal Stage Protection):** Withdrawn or rejected candidates cannot transition to active stages without an explicit reopening note.
- **Rule 4 (Audit Trail):** Every stage transition creates an immutable record in `application_stage_history`.

### 5. Interview Scheduling & Conflict Prevention
- Schedules interviews across `SCREENING`, `TECHNICAL`, `PANEL`, and `EXECUTIVE` tiers.
- **Double-Booking Prevention:** Automatically detects if an interviewer or candidate is already scheduled for an overlapping time window (`scheduled_start < existing_end` and `scheduled_end > existing_start`). Rejects conflicting bookings unless an override is logged.
- Full support for rescheduling and cancellations.

### 6. Structured Interview Scorecards
Standardized evaluation matrix with mathematically verified weighted scoring:
$$\text{Weighted Score} = 0.40 \times \text{Technical} + 0.30 \times \text{Problem Solving} + 0.20 \times \text{Role Relevance} + 0.10 \times \text{Communication}$$
- 1–5 scoring with real-time score display.
- Formal recommendations: `STRONG_HIRE`, `HIRE`, `LEANING_HIRE`, `LEANING_NO`, `STRONG_NO`.
- Submitting a scorecard automatically updates interview status to `COMPLETED`.

### 7. Offer Management & Multi-Tier Approvals
- Generates compensation packages with base salary, bonus, equity shares, and start dates.
- **Salary Band Validation:** Compares offered salary against requisition `min_salary` and `max_salary`. Flags salary violations and records the deviation reason.
- Automatically generates 3 required executive approval tiers:
  1. Department Hiring Manager
  2. VP of Finance
  3. VP of People / HR
- Offer acceptance automatically triggers candidate application transition to `HIRED`.

### 8. Compliance & Exception Management Center
Automated real-time scanner for 5 enterprise anomaly classes:
1. **Salary Band Violations:** Base salaries exceeding or falling below approved bands.
2. **Interviewer Double-Bookings:** Concurrent scheduled interviews for the same reviewer.
3. **Advanced Without Review:** Candidates progressing to Offer/Hire without scorecards.
4. **Withdrawn Candidates Remaining Scheduled:** Active interviews booked for withdrawn candidates.
5. **Irrelevant Criteria:** Evaluations containing non-compliant competencies.
- Ground-truth reconciliation calculating true positives, precision, and recall against benchmark datasets.

### 9. Immutable Audit Event History
- Cryptographic append-only event logging for all mutations: stage transitions, offer creations, approvals, scheduling, and requisitions.
- Payload inspection modal with before/after state diffing.

### 10. Reproducible Synthetic Data Generator
- Fixed deterministic random seed: **`20261022`**
- Benchmark dataset volumes:
  - **200 Requisitions**
  - **5,000 Candidates**
  - **8,000 Applications**
  - **2,000 Interviews**
  - **1,500 Scorecards**
  - **1,049 Offers**
  - **3,147 Executive Approvals**
  - **20 Injected Ground-Truth Edge Cases**
- Fast batch insertion (< 10 seconds) with guaranteed foreign-key integrity.

### 11. Automated Data Validation Suite
Runs 8 enterprise verification checks:
1. `Primary-Key Uniqueness`: Validates unique IDs across all tables.
2. `Foreign-Key Integrity`: Zero orphan records.
3. `Enum & Domain Validation`: Validates stages, statuses, and recommendations.
4. `Date Chronological Validation`: End dates occur after start dates; interviews occur after applications.
5. `Lifecycle Stage Progression`: 100% of hired candidates possess linked offers.
6. `Arithmetic Reconciliation`: Validates scorecard weighted formula mathematically.
7. `Duplicate Application Prevention`: Zero duplicate candidate-requisition pairs.
8. `Deterministic Checksum`: Computes SHA-256 dataset hash (`1b8aa7266be43f619b5c412bc5edf9b52a068ea831be7df5e7e1f689c02a4e4d`).

### 12. 1-Click Multi-Format Data Exports
- **CSV Bundle:** Downloadable `.zip` containing all 8 normalized database tables.
- **JSON Export:** Full nested JSON dataset dump.
- **PostgreSQL Seed SQL:** Executable `hireflow_seed_postgres.sql` (20,900+ lines).
- **Ground Truth Export:** Separate `ground_truth_exceptions.json` file.

---

## 🛠️ Quickstart & Local Installation

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Method 1: Run Locally (Fastest)

1. **Install backend dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Generate benchmark dataset (Seed: 20261022):**
   ```bash
   python seed.py
   ```

3. **Install frontend dependencies & build:**
   ```bash
   cd ../frontend
   npm install
   npm run build
   ```

4. **Launch the platform:**
   - **On Windows:** Double-click `start.bat` or run `powershell -ExecutionPolicy Bypass -File start.ps1`
   - **Manually:**
     - Backend: `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` (in `backend/`)
     - Frontend: `npm run dev` (in `frontend/`)

- Frontend UI: **http://127.0.0.1:5173**
- Backend API Docs (Swagger): **http://127.0.0.1:8000/docs**

---

### Method 2: Docker Compose (Full Stack with PostgreSQL)

```bash
docker-compose up --build
```
- Frontend UI: **http://localhost:3000**
- Backend API: **http://localhost:8000**
- PostgreSQL Server: **localhost:5432**

---

## 🧪 Running Automated Tests

Run the full Pytest test suite:
```bash
python -m pytest backend/tests -v
```

All 6 test modules run and pass:
- `test_auth.py`
- `test_requisitions.py`
- `test_pipeline_transitions.py`
- `test_interview_scheduling.py`
- `test_offers_and_approvals.py`
- `test_validation_engine.py`
