const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('hireflow_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),

  // Dashboard
  getDashboardMetrics: () => request<any>('/dashboard/metrics'),

  // Requisitions
  getRequisitions: (params?: { skip?: number; limit?: number; department?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/requisitions?${q}`);
  },
  getRequisition: (id: string) => request<any>(`/requisitions/${id}`),
  createRequisition: (data: any) => request<any>('/requisitions', { method: 'POST', body: JSON.stringify(data) }),
  updateRequisition: (id: string, data: any) => request<any>(`/requisitions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Candidates
  getCandidates: (params?: { skip?: number; limit?: number; status?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/candidates?${q}`);
  },
  getCandidate: (id: string) => request<any>(`/candidates/${id}`),
  createCandidate: (data: any) => request<any>('/candidates', { method: 'POST', body: JSON.stringify(data) }),
  updateCandidate: (id: string, data: any) => request<any>(`/candidates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Applications
  getApplications: (params?: { skip?: number; limit?: number; stage?: string; requisition_id?: string; candidate_id?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/applications?${q}`);
  },
  getApplication: (id: string) => request<any>(`/applications/${id}`),
  createApplication: (data: any) => request<any>('/applications', { method: 'POST', body: JSON.stringify(data) }),
  transitionStage: (id: string, data: { to_stage: string; notes?: string; rejection_reason?: string }, forceOverride: boolean = false) =>
    request<any>(`/applications/${id}/transition?force_override=${forceOverride}`, { method: 'POST', body: JSON.stringify(data) }),

  // Interviews
  getInterviews: (params?: { skip?: number; limit?: number; status?: string; interviewer_id?: string; interview_type?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/interviews?${q}`);
  },
  scheduleInterview: (data: any, allowConflictOverride: boolean = false) =>
    request<any>(`/interviews?allow_conflict_override=${allowConflictOverride}`, { method: 'POST', body: JSON.stringify(data) }),
  rescheduleInterview: (id: string, data: { new_start: string; new_end: string; allow_override?: boolean }) =>
    request<any>(`/interviews/${id}/reschedule`, { method: 'POST', body: JSON.stringify(data) }),
  cancelInterview: (id: string, reason: string) =>
    request<any>(`/interviews/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Scorecards
  getScorecards: (params?: { skip?: number; limit?: number; recommendation?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/scorecards?${q}`);
  },
  submitScorecard: (data: any) => request<any>('/scorecards', { method: 'POST', body: JSON.stringify(data) }),
  getScorecardsForApplication: (appId: string) => request<any[]>(`/scorecards/by-application/${appId}`),

  // Offers
  getOffers: (params?: { skip?: number; limit?: number; status?: string; violations_only?: boolean }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/offers?${q}`);
  },
  getOffer: (id: string) => request<any>(`/offers/${id}`),
  createOffer: (data: any) => request<any>('/offers', { method: 'POST', body: JSON.stringify(data) }),
  actOnApproval: (approvalId: string, action: { status: 'APPROVED' | 'REJECTED'; comments?: string }) =>
    request<any>(`/offers/approvals/${approvalId}/action`, { method: 'POST', body: JSON.stringify(action) }),
  updateOfferStatus: (offerId: string, status: string) =>
    request<any>(`/offers/${offerId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Exceptions
  getExceptions: () => request<any>('/exceptions'),
  getExceptionHistory: () => request<any>('/exceptions/history'),
  getReconciliation: () => request<any>('/exceptions/reconciliation'),
  resolveException: (id: string, data: { action: string; notes?: string }) =>
    request<any>(`/exceptions/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),

  // Audit Logs
  getAuditLogs: (params?: { skip?: number; limit?: number; entity_type?: string; action?: string; actor?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/audit?${q}`);
  },

  // Data Ops
  generateSyntheticData: (data: { seed?: number; requisitions_count?: number; candidates_count?: number; applications_count?: number; interviews_count?: number; inject_edge_cases?: boolean }) =>
    request<any>('/data/generate', { method: 'POST', body: JSON.stringify(data) }),
  runValidationSuite: () => request<any>('/data/validate'),
  getGroundTruthExport: () => request<any>('/data/export/ground-truth'),
};
