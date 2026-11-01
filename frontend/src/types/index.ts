export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface SkillRequirement {
  id?: string;
  requisition_id?: string;
  skill_name: string;
  importance: 'REQUIRED' | 'PREFERRED';
  min_years_experience: number;
}

export interface Requisition {
  id: string;
  title: string;
  department: string;
  hiring_manager_id: string;
  hiring_manager_name?: string;
  experience_level: string;
  min_salary: number;
  max_salary: number;
  currency: string;
  location: string;
  status: 'DRAFT' | 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'CANCELLED';
  openings_count: number;
  created_at: string;
  updated_at: string;
  skills: SkillRequirement[];
  applications_count?: number;
}

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  current_company?: string;
  current_title?: string;
  years_experience: number;
  skills?: string;
  location?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'BLACKLISTED';
  created_at: string;
  active_applications_count?: number;
}

export interface ApplicationStageHistory {
  id: string;
  application_id: string;
  from_stage?: string;
  to_stage: string;
  transitioned_by: string;
  transitioned_at: string;
  notes?: string;
}

export interface Application {
  id: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  requisition_id: string;
  requisition_title?: string;
  requisition_department?: string;
  stage: 'APPLIED' | 'SCREENING' | 'TECHNICAL_INTERVIEW' | 'PANEL_INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
  source: string;
  applied_at: string;
  updated_at: string;
  rejection_reason?: string;
  notes?: string;
  stage_history?: ApplicationStageHistory[];
  interviews?: Interview[];
  scorecards?: Scorecard[];
  offers?: Offer[];
}

export interface Interview {
  id: string;
  application_id: string;
  requisition_id: string;
  candidate_id: string;
  candidate_name?: string;
  requisition_title?: string;
  interview_type: 'SCREENING' | 'TECHNICAL' | 'PANEL' | 'EXECUTIVE';
  scheduled_start: string;
  scheduled_end: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';
  interviewer_id: string;
  interviewer_name: string;
  meeting_link?: string;
  notes?: string;
  created_at: string;
  has_scorecard?: boolean;
}

export interface Scorecard {
  id: string;
  interview_id: string;
  application_id: string;
  reviewer_id: string;
  reviewer_name: string;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  role_relevance_score: number;
  weighted_score: number;
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'LEANING_HIRE' | 'LEANING_NO' | 'STRONG_NO';
  feedback: string;
  criteria_evaluated?: string;
  submitted_at: string;
}

export interface Approval {
  id: string;
  offer_id: string;
  approver_id: string;
  approver_name: string;
  approver_role: 'HIRING_MANAGER' | 'VP_FINANCE' | 'VP_HR';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  action_date?: string;
}

export interface Offer {
  id: string;
  application_id: string;
  candidate_id: string;
  candidate_name?: string;
  requisition_id: string;
  requisition_title?: string;
  salary_range?: string;
  base_salary: number;
  bonus: number;
  equity_shares: number;
  start_date: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXTENDED' | 'ACCEPTED' | 'DECLINED';
  is_salary_band_violation: boolean;
  violation_reason?: string;
  created_at: string;
  updated_at: string;
  approvals: Approval[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_state?: string;
  new_state?: string;
  metadata_info?: string;
}

export interface ExceptionItem {
  id: string;
  type: string;
  category?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  entity_type: string;
  entity_id: string;
  title: string;
  description: string;
  violated_rule?: string;
  recommended_action?: string;
  status?: 'ACTIVE' | 'RESOLVED';
  detected_at: string;
  resolution_action: string;
}

export interface ExceptionResolution {
  id: string;
  exception_id: string;
  exception_type: string;
  entity_type: string;
  entity_id: string;
  action_taken: string;
  resolved_by: string;
  resolved_at: string;
  notes?: string;
}

export interface DashboardMetrics {
  total_requisitions: number;
  open_requisitions: number;
  total_candidates: number;
  total_applications: number;
  active_interviews: number;
  completed_interviews?: number;
  total_offers?: number;
  pending_offers: number;
  accepted_offers?: number;
  total_hired: number;
  hiring_conversion_rate: number;
  offer_acceptance_rate: number;
  average_time_to_hire_days?: number;
  active_exceptions_count: number;
  critical_exceptions_count?: number;
  department_distribution: Array<{ department: string; requisitions: number; openings: number }>;
  department_performance?: Array<{
    department: string;
    requisitions: number;
    openings: number;
    hires: number;
    fill_rate: number;
    active_pipeline: number;
  }>;
  source_distribution?: Array<{
    source: string;
    candidates: number;
    applications: number;
    hires: number;
    conversion_rate: number;
  }>;
  pipeline_funnel: Array<{ stage: string; key: string; count: number }>;
  monthly_trends: Array<{ month: string; applied: number; hired: number }>;
  interviewer_workload: Array<{ name: string; total: number; completed: number; scheduled: number }>;
  recent_activities: AuditLog[];
  hiring_insights?: Array<{
    type: string;
    title: string;
    description: string;
    metric?: string;
    trend?: string;
    status?: string;
  }>;
}

export interface ValidationCheck {
  check_name: string;
  category: string;
  passed: boolean;
  details: string;
  error_count: number;
  records_checked: number;
}

export interface ValidationReport {
  overall_status: 'PASSED' | 'FAILED';
  checksum: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  checks: ValidationCheck[];
  summary: {
    total_records_evaluated: number;
    integrity_checks: number;
    business_logic_checks: number;
  };
  generated_at: string;
}
