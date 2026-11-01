import React, { useState, useEffect } from 'react';
import { 
  GitFork, Search, Filter, ArrowRight, CheckCircle2, 
  AlertCircle, Clock, ShieldAlert, ChevronRight, X, FileText 
} from 'lucide-react';
import { Application, ApplicationStageHistory } from '../../types';
import { api } from '../../api/client';

const STAGES = [
  { id: 'APPLIED', label: 'Applied', color: 'border-blue-500 bg-blue-50 text-blue-700' },
  { id: 'SCREENING', label: 'Screening', color: 'border-sky-500 bg-sky-50 text-sky-700' },
  { id: 'TECHNICAL_INTERVIEW', label: 'Technical Interview', color: 'border-indigo-500 bg-indigo-50 text-indigo-700' },
  { id: 'PANEL_INTERVIEW', label: 'Panel Interview', color: 'border-purple-500 bg-purple-50 text-purple-700' },
  { id: 'OFFER', label: 'Offer Stage', color: 'border-amber-500 bg-amber-50 text-amber-700' },
  { id: 'HIRED', label: 'Hired & Confirmed', color: 'border-emerald-500 bg-emerald-50 text-emerald-700' }
];

export const PipelineView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [transitionModalApp, setTransitionModalApp] = useState<Application | null>(null);
  const [targetStage, setTargetStage] = useState<string>('');
  const [transitionNotes, setTransitionNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [forceOverride, setForceOverride] = useState<boolean>(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'table'>('board');
  const [selectedAppDetail, setSelectedAppDetail] = useState<Application | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications({
        stage: selectedStage || undefined,
        search: search || undefined,
        limit: 100
      });
      setApplications(data.items || []);
    } catch (err) {
      console.error("Failed to load applications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [selectedStage]);

  const handleOpenTransition = (app: Application) => {
    setTransitionModalApp(app);
    setTargetStage('');
    setTransitionNotes('');
    setRejectionReason('');
    setForceOverride(false);
    setTransitionError(null);
  };

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionModalApp || !targetStage) return;

    setTransitionError(null);
    try {
      await api.transitionStage(
        transitionModalApp.id,
        {
          to_stage: targetStage,
          notes: transitionNotes || undefined,
          rejection_reason: rejectionReason || undefined
        },
        forceOverride
      );
      setTransitionModalApp(null);
      fetchApplications();
    } catch (err: any) {
      setTransitionError(err.message || 'Stage transition rejected by compliance rule.');
    }
  };

  const handleInspectDetail = async (appId: string) => {
    try {
      const fullApp = await api.getApplication(appId);
      setSelectedAppDetail(fullApp);
    } catch (err) {
      console.error("Failed to inspect application", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruitment Pipeline & Stage Transitions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enforced stage-transition rules, candidate progression history, and compliance safeguards.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('board')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kanban Board
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate name, requisition title, or application ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchApplications()}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Active Stages</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Kanban Board View */}
      {activeTab === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STAGES.map((col) => {
            const stageApps = applications.filter((a) => a.stage === col.id);
            return (
              <div key={col.id} className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 flex flex-col min-w-[220px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">{col.label}</span>
                  <span className="px-2 py-0.5 text-xs font-extrabold bg-white text-slate-800 rounded-full border border-slate-200 shadow-2xs">
                    {stageApps.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 mt-3 overflow-y-auto max-h-[650px] pr-0.5">
                  {stageApps.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-white/60 rounded-lg border border-dashed border-slate-200">
                      Empty stage
                    </div>
                  ) : (
                    stageApps.map((app) => (
                      <div
                        key={app.id}
                        className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-sm transition-all text-xs space-y-2 group"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {app.candidate_name}
                          </span>
                          <button
                            onClick={() => handleOpenTransition(app)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                            title="Transition Stage"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-slate-600 font-medium line-clamp-1">{app.requisition_title}</p>
                        <p className="mono-font text-[10px] text-slate-400">{app.id}</p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>{app.source}</span>
                          <button
                            onClick={() => handleInspectDetail(app.id)}
                            className="text-blue-600 font-semibold hover:underline"
                          >
                            History
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Application ID</th>
                  <th className="py-3.5 px-4">Candidate</th>
                  <th className="py-3.5 px-4">Requisition</th>
                  <th className="py-3.5 px-4">Current Stage</th>
                  <th className="py-3.5 px-4">Applied Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 mono-font text-xs font-medium text-slate-600">
                      {app.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {app.candidate_name}
                      <div className="text-xs font-normal text-slate-400">{app.candidate_email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{app.requisition_title}</div>
                      <div className="text-xs text-slate-400">{app.requisition_department}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        {app.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleInspectDetail(app.id)}
                        className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        History
                      </button>
                      <button
                        onClick={() => handleOpenTransition(app)}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Advance Stage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stage Transition Modal with Mandatory Rule Checks */}
      {transitionModalApp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleExecuteTransition} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Candidate Stage Transition</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enforced lifecycle & compliance verification</p>
              </div>
              <button
                type="button"
                onClick={() => setTransitionModalApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate & Current State */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <p>Candidate: <strong className="text-slate-900">{transitionModalApp.candidate_name}</strong></p>
              <p>Requisition: <strong className="text-slate-900">{transitionModalApp.requisition_title}</strong></p>
              <p>Current Stage: <span className="font-semibold text-blue-700">{transitionModalApp.stage}</span></p>
            </div>

            {/* Target Stage Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Target Stage *</label>
              <select
                required
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select target stage...</option>
                <option value="SCREENING">Screening</option>
                <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                <option value="PANEL_INTERVIEW">Panel Interview</option>
                <option value="OFFER">Offer (Requires Scorecard)</option>
                <option value="HIRED">Hired (Requires Approved Offer)</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Transition Notes</label>
              <textarea
                rows={2}
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder="Reasoning for candidate stage progression..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Rejection reason if moving to REJECTED */}
            {targetStage === 'REJECTED' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Rejection Reason *</label>
                <input
                  type="text"
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Lacks senior system architecture experience"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Compliance Error Alert if triggered */}
            {transitionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-xs text-red-800">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Compliance Rule Block:</p>
                  <p>{transitionError}</p>
                  <label className="flex items-center space-x-2 mt-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={forceOverride}
                      onChange={(e) => setForceOverride(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span>Recruiter Executive Force Override (Logged to Audit)</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setTransitionModalApp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
              >
                Confirm Transition
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Immutable Application History Timeline Modal */}
      {selectedAppDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[85vh] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Application Progression History</h3>
                <p className="mono-font text-xs text-blue-600 font-bold">{selectedAppDetail.id}</p>
              </div>
              <button
                onClick={() => setSelectedAppDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Immutable Transition Timeline</h4>
              {selectedAppDetail.stage_history && selectedAppDetail.stage_history.length > 0 ? (
                <div className="relative border-l-2 border-blue-500 pl-4 space-y-4 ml-2">
                  {selectedAppDetail.stage_history.map((hist, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white"></div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>
                            {hist.from_stage ? `${hist.from_stage} → ` : 'Started: '}
                            <span className="text-blue-600">{hist.to_stage}</span>
                          </span>
                          <span className="text-slate-400 font-normal">
                            {new Date(hist.transitioned_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600">Transitioned by: <span className="font-medium text-slate-800">{hist.transitioned_by}</span></p>
                        {hist.notes && <p className="text-slate-500 italic mt-1 font-sans">"{hist.notes}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No previous stage history records found.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedAppDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
