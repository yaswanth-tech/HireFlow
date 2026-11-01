from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ==================== User & Auth ====================
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = "RECRUITER"

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ==================== Hiring Manager ====================
class HiringManagerBase(BaseModel):
    name: str
    email: EmailStr
    department: str
    title: Optional[str] = None

class HiringManagerCreate(HiringManagerBase):
    pass

class HiringManagerResponse(HiringManagerBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# ==================== Skill Requirement ====================
class SkillRequirementBase(BaseModel):
    skill_name: str
    importance: str = "REQUIRED"  # REQUIRED, PREFERRED
    min_years_experience: float = 1.0

class SkillRequirementCreate(SkillRequirementBase):
    pass

class SkillRequirementResponse(SkillRequirementBase):
    id: str
    requisition_id: str

    class Config:
        from_attributes = True

# ==================== Requisition ====================
class RequisitionBase(BaseModel):
    title: str
    department: str
    hiring_manager_id: str
    experience_level: str  # Entry, Mid, Senior, Lead, Executive
    min_salary: float
    max_salary: float
    currency: str = "USD"
    location: str = "Hybrid"
    status: str = "OPEN"
    openings_count: int = 1

class RequisitionCreate(RequisitionBase):
    skills: Optional[List[SkillRequirementCreate]] = []

class RequisitionUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    hiring_manager_id: Optional[str] = None
    experience_level: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    location: Optional[str] = None
    status: Optional[str] = None
    openings_count: Optional[int] = None

class RequisitionResponse(RequisitionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    skills: List[SkillRequirementResponse] = []
    hiring_manager_name: Optional[str] = None
    applications_count: Optional[int] = 0

    class Config:
        from_attributes = True

# ==================== Candidate ====================
class CandidateBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    current_company: Optional[str] = None
    current_title: Optional[str] = None
    years_experience: float = 0.0
    skills: Optional[str] = None  # Comma-separated
    location: Optional[str] = None
    status: str = "ACTIVE"

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    current_company: Optional[str] = None
    current_title: Optional[str] = None
    years_experience: Optional[float] = None
    skills: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None

class CandidateResponse(CandidateBase):
    id: str
    created_at: datetime
    active_applications_count: Optional[int] = 0

    class Config:
        from_attributes = True

# ==================== Application Stage & History ====================
class ApplicationStageHistoryResponse(BaseModel):
    id: str
    application_id: str
    from_stage: Optional[str]
    to_stage: str
    transitioned_by: str
    transitioned_at: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True

# ==================== Application ====================
class ApplicationCreate(BaseModel):
    candidate_id: str
    requisition_id: str
    source: str = "Direct Application"
    notes: Optional[str] = None

class ApplicationStageTransition(BaseModel):
    to_stage: str
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    candidate_id: str
    requisition_id: str
    stage: str
    source: str
    applied_at: datetime
    updated_at: datetime
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    requisition_title: Optional[str] = None
    requisition_department: Optional[str] = None

    class Config:
        from_attributes = True

class ApplicationDetailResponse(ApplicationResponse):
    stage_history: List[ApplicationStageHistoryResponse] = []
    interviews: List[Any] = []
    scorecards: List[Any] = []
    offers: List[Any] = []

# ==================== Availability ====================
class AvailabilityCreate(BaseModel):
    interviewer_id: str
    interviewer_name: str
    start_time: datetime
    end_time: datetime

class AvailabilityResponse(BaseModel):
    id: str
    interviewer_id: str
    interviewer_name: str
    start_time: datetime
    end_time: datetime
    is_booked: bool

    class Config:
        from_attributes = True

# ==================== Interview ====================
class InterviewCreate(BaseModel):
    application_id: str
    interview_type: str  # SCREENING, TECHNICAL, PANEL, EXECUTIVE
    scheduled_start: datetime
    scheduled_end: datetime
    interviewer_id: str
    interviewer_name: str
    meeting_link: Optional[str] = "https://meet.hireflow.internal/room-alpha"
    notes: Optional[str] = None

class InterviewUpdate(BaseModel):
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    status: Optional[str] = None
    interviewer_id: Optional[str] = None
    interviewer_name: Optional[str] = None
    notes: Optional[str] = None

class InterviewResponse(BaseModel):
    id: str
    application_id: str
    requisition_id: str
    candidate_id: str
    interview_type: str
    scheduled_start: datetime
    scheduled_end: datetime
    status: str
    interviewer_id: str
    interviewer_name: str
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    candidate_name: Optional[str] = None
    requisition_title: Optional[str] = None
    has_scorecard: Optional[bool] = False

    class Config:
        from_attributes = True

# ==================== Scorecard ====================
class ScorecardCreate(BaseModel):
    interview_id: str
    reviewer_id: str
    reviewer_name: str
    technical_score: int = Field(..., ge=1, le=5)
    communication_score: int = Field(..., ge=1, le=5)
    problem_solving_score: int = Field(..., ge=1, le=5)
    role_relevance_score: int = Field(..., ge=1, le=5)
    recommendation: str  # STRONG_HIRE, HIRE, LEANING_HIRE, LEANING_NO, STRONG_NO
    feedback: str
    criteria_evaluated: Optional[str] = None

class ScorecardResponse(BaseModel):
    id: str
    interview_id: str
    application_id: str
    reviewer_id: str
    reviewer_name: str
    technical_score: int
    communication_score: int
    problem_solving_score: int
    role_relevance_score: int
    weighted_score: float
    recommendation: str
    feedback: str
    criteria_evaluated: Optional[str] = None
    submitted_at: datetime

    class Config:
        from_attributes = True

# ==================== Approval ====================
class ApprovalCreate(BaseModel):
    approver_id: str
    approver_name: str
    approver_role: str  # HIRING_MANAGER, VP_FINANCE, VP_HR

class ApprovalAction(BaseModel):
    status: str  # APPROVED, REJECTED
    comments: Optional[str] = None

class ApprovalResponse(BaseModel):
    id: str
    offer_id: str
    approver_id: str
    approver_name: str
    approver_role: str
    status: str
    comments: Optional[str] = None
    action_date: Optional[datetime] = None

    class Config:
        from_attributes = True

# ==================== Offer ====================
class OfferCreate(BaseModel):
    application_id: str
    base_salary: float
    bonus: float = 0.0
    equity_shares: int = 0
    start_date: datetime

class OfferUpdate(BaseModel):
    base_salary: Optional[float] = None
    bonus: Optional[float] = None
    equity_shares: Optional[int] = None
    start_date: Optional[datetime] = None
    status: Optional[str] = None

class OfferResponse(BaseModel):
    id: str
    application_id: str
    candidate_id: str
    requisition_id: str
    base_salary: float
    bonus: float
    equity_shares: int
    start_date: datetime
    status: str
    is_salary_band_violation: bool
    violation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    candidate_name: Optional[str] = None
    requisition_title: Optional[str] = None
    salary_range: Optional[str] = None
    approvals: List[ApprovalResponse] = []

    class Config:
        from_attributes = True

# ==================== Audit Log ====================
class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    action: str
    entity_type: str
    entity_id: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    metadata_info: Optional[str] = None

    class Config:
        from_attributes = True

# ==================== Exceptions ====================
class ExceptionItem(BaseModel):
    id: str
    type: str  # e.g. SALARY_BAND_VIOLATION, DOUBLE_BOOKING, ADVANCED_WITHOUT_REVIEW, WITHDRAWN_CANDIDATE_SCHEDULED, IRRELEVANT_CRITERIA
    category: Optional[str] = "Governance"
    severity: str  # CRITICAL, HIGH, MEDIUM
    entity_type: str
    entity_id: str
    title: str
    description: str
    violated_rule: Optional[str] = None
    recommended_action: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    detected_at: datetime
    resolution_action: str

# ==================== Dashboard ====================
class DashboardMetrics(BaseModel):
    total_requisitions: int
    open_requisitions: int
    total_candidates: int
    total_applications: int
    active_interviews: int
    completed_interviews: Optional[int] = 0
    total_offers: Optional[int] = 0
    pending_offers: int
    accepted_offers: Optional[int] = 0
    total_hired: int
    hiring_conversion_rate: float
    offer_acceptance_rate: float
    average_time_to_hire_days: Optional[float] = 22.4
    active_exceptions_count: int
    critical_exceptions_count: Optional[int] = 0
    department_distribution: List[Dict[str, Any]]
    department_performance: Optional[List[Dict[str, Any]]] = []
    source_distribution: Optional[List[Dict[str, Any]]] = []
    pipeline_funnel: List[Dict[str, Any]]
    monthly_trends: List[Dict[str, Any]]
    interviewer_workload: List[Dict[str, Any]]
    recent_activities: List[AuditLogResponse]
    hiring_insights: Optional[List[Dict[str, Any]]] = []

# ==================== Data Ops & Synthetic Data ====================
class SyntheticGenerateRequest(BaseModel):
    seed: int = 20261022
    requisitions_count: int = 200
    candidates_count: int = 5000
    applications_count: int = 8000
    interviews_count: int = 2000
    inject_edge_cases: bool = True

class ValidationCheckResult(BaseModel):
    check_name: str
    category: str
    passed: bool
    details: str
    error_count: int = 0
    records_checked: int = 0

class ValidationReport(BaseModel):
    overall_status: str  # PASSED, FAILED
    checksum: str
    total_checks: int
    passed_checks: int
    failed_checks: int
    checks: List[ValidationCheckResult]
    summary: Dict[str, int]
    generated_at: datetime
