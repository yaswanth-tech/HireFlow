from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(32), primary_key=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="RECRUITER", nullable=False) # ADMIN, RECRUITER, HIRING_MANAGER, INTERVIEWER, VP_HR
    created_at = Column(DateTime, default=utcnow, nullable=False)

class HiringManager(Base):
    __tablename__ = "hiring_managers"

    id = Column(String(32), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    title = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    requisitions = relationship("Requisition", back_populates="hiring_manager")

class Requisition(Base):
    __tablename__ = "requisitions"

    id = Column(String(32), primary_key=True)  # REQ-2026-000001
    title = Column(String(200), nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    hiring_manager_id = Column(String(32), ForeignKey("hiring_managers.id"), nullable=False, index=True)
    experience_level = Column(String(50), nullable=False)  # Entry, Mid, Senior, Lead, Executive
    min_salary = Column(Float, nullable=False)
    max_salary = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    location = Column(String(100), default="Hybrid", nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # DRAFT, OPEN, ON_HOLD, CLOSED, CANCELLED
    openings_count = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    hiring_manager = relationship("HiringManager", back_populates="requisitions")
    skills = relationship("SkillRequirement", back_populates="requisition", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="requisition")
    interviews = relationship("Interview", back_populates="requisition")
    offers = relationship("Offer", back_populates="requisition")

class SkillRequirement(Base):
    __tablename__ = "skill_requirements"

    id = Column(String(32), primary_key=True)
    requisition_id = Column(String(32), ForeignKey("requisitions.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False)
    importance = Column(String(50), default="REQUIRED", nullable=False)  # REQUIRED, PREFERRED
    min_years_experience = Column(Float, default=1.0, nullable=False)

    requisition = relationship("Requisition", back_populates="skills")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(32), primary_key=True)  # CAND-000001
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    current_company = Column(String(150), nullable=True)
    current_title = Column(String(150), nullable=True)
    years_experience = Column(Float, default=0.0, nullable=False)
    skills = Column(Text, nullable=True)  # comma separated list
    location = Column(String(100), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # ACTIVE, ARCHIVED, BLACKLISTED
    created_at = Column(DateTime, default=utcnow, nullable=False)

    applications = relationship("Application", back_populates="candidate")

class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("candidate_id", "requisition_id", name="uq_candidate_requisition"),
    )

    id = Column(String(64), primary_key=True)  # APP-CAND-000001-REQ-2026-000001
    candidate_id = Column(String(32), ForeignKey("candidates.id"), nullable=False, index=True)
    requisition_id = Column(String(32), ForeignKey("requisitions.id"), nullable=False, index=True)
    stage = Column(String(50), default="APPLIED", nullable=False, index=True)
    # Stages: APPLIED, SCREENING, TECHNICAL_INTERVIEW, PANEL_INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN
    source = Column(String(100), default="Direct Application", nullable=False)
    applied_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    rejection_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    candidate = relationship("Candidate", back_populates="applications")
    requisition = relationship("Requisition", back_populates="applications")
    stage_history = relationship("ApplicationStageHistory", back_populates="application", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="application")
    scorecards = relationship("Scorecard", back_populates="application")
    offers = relationship("Offer", back_populates="application")

class ApplicationStageHistory(Base):
    __tablename__ = "application_stage_history"

    id = Column(String(32), primary_key=True)
    application_id = Column(String(64), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    from_stage = Column(String(50), nullable=True)
    to_stage = Column(String(50), nullable=False)
    transitioned_by = Column(String(100), default="System", nullable=False)
    transitioned_at = Column(DateTime, default=utcnow, nullable=False)
    notes = Column(Text, nullable=True)

    application = relationship("Application", back_populates="stage_history")

class InterviewPanel(Base):
    __tablename__ = "interview_panels"

    id = Column(String(32), primary_key=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    members = relationship("PanelMember", back_populates="panel", cascade="all, delete-orphan")

class PanelMember(Base):
    __tablename__ = "panel_members"

    id = Column(String(32), primary_key=True)
    panel_id = Column(String(32), ForeignKey("interview_panels.id", ondelete="CASCADE"), nullable=False, index=True)
    interviewer_id = Column(String(32), nullable=False, index=True)
    interviewer_name = Column(String(100), nullable=False)
    interviewer_email = Column(String(150), nullable=True)
    role = Column(String(50), default="INTERVIEWER", nullable=False)

    panel = relationship("InterviewPanel", back_populates="members")

class Availability(Base):
    __tablename__ = "availabilities"

    id = Column(String(32), primary_key=True)
    interviewer_id = Column(String(32), nullable=False, index=True)
    interviewer_name = Column(String(100), nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    is_booked = Column(Boolean, default=False, nullable=False)

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String(32), primary_key=True)  # INT-2026-000001
    application_id = Column(String(64), ForeignKey("applications.id"), nullable=False, index=True)
    requisition_id = Column(String(32), ForeignKey("requisitions.id"), nullable=False, index=True)
    candidate_id = Column(String(32), ForeignKey("candidates.id"), nullable=False, index=True)
    interview_type = Column(String(50), nullable=False)  # SCREENING, TECHNICAL, PANEL, EXECUTIVE
    scheduled_start = Column(DateTime, nullable=False, index=True)
    scheduled_end = Column(DateTime, nullable=False, index=True)
    status = Column(String(50), default="SCHEDULED", nullable=False, index=True)  # SCHEDULED, COMPLETED, RESCHEDULED, CANCELLED
    interviewer_id = Column(String(32), nullable=False, index=True)
    interviewer_name = Column(String(100), nullable=False)
    meeting_link = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    application = relationship("Application", back_populates="interviews")
    requisition = relationship("Requisition", back_populates="interviews")
    candidate = relationship("Candidate")
    scorecards = relationship("Scorecard", back_populates="interview")

class Scorecard(Base):
    __tablename__ = "scorecards"
    __table_args__ = (
        UniqueConstraint("interview_id", "reviewer_id", name="uq_interview_reviewer"),
    )

    id = Column(String(64), primary_key=True)  # SCORE-{interview-id}-{reviewer-id}
    interview_id = Column(String(32), ForeignKey("interviews.id"), nullable=False, index=True)
    application_id = Column(String(64), ForeignKey("applications.id"), nullable=False, index=True)
    reviewer_id = Column(String(32), nullable=False, index=True)
    reviewer_name = Column(String(100), nullable=False)
    technical_score = Column(Integer, nullable=False)  # 1-5
    communication_score = Column(Integer, nullable=False)  # 1-5
    problem_solving_score = Column(Integer, nullable=False)  # 1-5
    role_relevance_score = Column(Integer, nullable=False)  # 1-5
    weighted_score = Column(Float, nullable=False)
    recommendation = Column(String(50), nullable=False)  # STRONG_HIRE, HIRE, LEANING_HIRE, LEANING_NO, STRONG_NO
    feedback = Column(Text, nullable=False)
    criteria_evaluated = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=utcnow, nullable=False)

    interview = relationship("Interview", back_populates="scorecards")
    application = relationship("Application", back_populates="scorecards")

class Offer(Base):
    __tablename__ = "offers"

    id = Column(String(32), primary_key=True)  # OFF-2026-000001
    application_id = Column(String(64), ForeignKey("applications.id"), nullable=False, index=True)
    candidate_id = Column(String(32), ForeignKey("candidates.id"), nullable=False, index=True)
    requisition_id = Column(String(32), ForeignKey("requisitions.id"), nullable=False, index=True)
    base_salary = Column(Float, nullable=False)
    bonus = Column(Float, default=0.0, nullable=False)
    equity_shares = Column(Integer, default=0, nullable=False)
    start_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="PENDING_APPROVAL", nullable=False, index=True)  
    # DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, EXTENDED, ACCEPTED, DECLINED
    is_salary_band_violation = Column(Boolean, default=False, nullable=False, index=True)
    violation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    application = relationship("Application", back_populates="offers")
    candidate = relationship("Candidate")
    requisition = relationship("Requisition", back_populates="offers")
    approvals = relationship("Approval", back_populates="offer", cascade="all, delete-orphan")

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String(32), primary_key=True)  # APPR-2026-000001
    offer_id = Column(String(32), ForeignKey("offers.id", ondelete="CASCADE"), nullable=False, index=True)
    approver_id = Column(String(32), nullable=False, index=True)
    approver_name = Column(String(100), nullable=False)
    approver_role = Column(String(50), nullable=False)  # HIRING_MANAGER, VP_FINANCE, VP_HR
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED
    comments = Column(Text, nullable=True)
    action_date = Column(DateTime, nullable=True)

    offer = relationship("Offer", back_populates="approvals")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(32), primary_key=True)
    timestamp = Column(DateTime, default=utcnow, nullable=False, index=True)
    actor = Column(String(100), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)  # CREATE, UPDATE, DELETE, TRANSITION, APPROVE, REJECT, SCHEDULE, CANCEL
    entity_type = Column(String(100), nullable=False, index=True)  # REQUISITION, CANDIDATE, APPLICATION, INTERVIEW, SCORECARD, OFFER, APPROVAL
    entity_id = Column(String(100), nullable=False, index=True)
    previous_state = Column(Text, nullable=True)  # JSON formatted
    new_state = Column(Text, nullable=True)       # JSON formatted
    metadata_info = Column(Text, nullable=True)   # JSON formatted

class GroundTruthException(Base):
    __tablename__ = "ground_truth_exceptions"

    id = Column(String(32), primary_key=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(100), nullable=False, index=True)
    exception_type = Column(String(100), nullable=False, index=True)
    # Types: SALARY_BAND_VIOLATION, DOUBLE_BOOKING, ADVANCED_WITHOUT_REVIEW, WITHDRAWN_CANDIDATE_SCHEDULED, IRRELEVANT_CRITERIA
    description = Column(Text, nullable=False)
    injected_at = Column(DateTime, default=utcnow, nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)

class ExceptionResolution(Base):
    __tablename__ = "exception_resolutions"

    id = Column(String(32), primary_key=True)
    exception_id = Column(String(100), nullable=False, index=True)
    exception_type = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=False, index=True)
    action_taken = Column(String(100), nullable=False)
    resolved_by = Column(String(100), nullable=False)
    resolved_at = Column(DateTime, default=utcnow, nullable=False)
    notes = Column(Text, nullable=True)
