from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.models import User, HiringManager, Requisition
from app.services.auth_service import hash_password
from app.services.synthetic_data_service import generate_synthetic_data
from app.routers import (
    auth, dashboard, requisitions, candidates, applications,
    interviews, scorecards, offers, exceptions, audit, data_ops
)

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise Recruitment Management & Hiring Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(requisitions.router, prefix=settings.API_V1_STR)
app.include_router(candidates.router, prefix=settings.API_V1_STR)
app.include_router(applications.router, prefix=settings.API_V1_STR)
app.include_router(interviews.router, prefix=settings.API_V1_STR)
app.include_router(scorecards.router, prefix=settings.API_V1_STR)
app.include_router(offers.router, prefix=settings.API_V1_STR)
app.include_router(exceptions.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(data_ops.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        # Create default demo users if not present
        if not db.query(User).filter(User.email == "recruiter@hireflow.internal").first():
            demo_user = User(
                id="USR-DEMO-001",
                email="recruiter@hireflow.internal",
                name="Sarah Jenkins",
                password_hash=hash_password("admin123"),
                role="RECRUITER"
            )
            db.add(demo_user)
            db.commit()

        # Seed initial dataset if empty
        req_count = db.query(Requisition).count()
        if req_count == 0:
            print("Database empty: Auto-seeding initial benchmark dataset (seed: 20261022)...")
            generate_synthetic_data(
                db,
                seed=settings.SEED_DEFAULT,
                req_count=200,
                cand_count=5000,
                app_count=8000,
                int_count=2000,
                inject_edge_cases=True
            )
            print("Auto-seeding complete!")
    except Exception as e:
        print(f"Startup initialization notice: {e}")
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "seed": settings.SEED_DEFAULT,
        "engine": "PostgreSQL-compatible SQLAlchemy ORM"
    }
