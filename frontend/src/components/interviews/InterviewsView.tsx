import React, { useState, useEffect } from 'react';
import { 
  Calendar, Search, Filter, Plus, Clock, Video, 
  AlertTriangle, CheckCircle, X, Award, AlertCircle 
} from 'lucide-react';
import { Interview } from '../../types';
import { api } from '../../api/client';

interface InterviewsViewProps {
  onOpenScheduleModal: () => void;
  onOpenScorecardModal: (interview: Interview) => void;
}

export const InterviewsView: React.FC<InterviewsViewProps> = ({
  onOpenScheduleModal,
  onOpenScorecardModal
}) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('');
  const [interviewType, setInterviewType] = useState<string>('');
  const [rescheduleModalInt, setRescheduleModalInt] = useState<Interview | null>(null);
  const [newStart, setNewStart] = useState<string>('');
  const [newEnd, setNewEnd] = useState<string>('');
  const [allowOverride, setAllowOverride] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [cancelModalInt, setCancelModalInt] = useState<Interview | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const data = await api.getInterviews({
        status: status || undefined,
        interview_type: interviewType || undefined,
        limit: 100
      });
      setInterviews(data.items || []);
    } catch (err) {
      console.error("Failed to load interviews", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [status, interviewType]);

  const handleExecuteReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModalInt || !newStart || !newEnd) return;

    setRescheduleError(null);
    try {
      await api.rescheduleInterview(rescheduleModalInt.id, {
        new_start: new Date(newStart).toISOString(),
        new_end: new Date(newEnd).toISOString(),
        allow_override: allowOverride
      });
      setRescheduleModalInt(null);
      fetchInterviews();
    } catch (err: any) {
      setRescheduleError(err.message || 'Rescheduling conflict detected.');
    }
  };

  const handleExecuteCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalInt) return;

    try {
      await api.cancelInterview(cancelModalInt.id, cancelReason || 'Cancelled by recruiter');
      setCancelModalInt(null);
      fetchInterviews();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel interview');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interview Scheduling & Panel Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated conflict prevention, interviewer calendar coordination, and evaluation dispatch.
          </p>
        </div>

        <button
          onClick={onOpenScheduleModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Interview</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Showing {interviews.length} Scheduled & Completed Sessions</span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Interview Types</option>
            <option value="SCREENING">Screening</option>
            <option value="TECHNICAL">Technical</option>
            <option value="PANEL">Panel</option>
            <option value="EXECUTIVE">Executive</option>
          </select>
        </div>
      </div>

      {/* Interviews Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading interview schedule...
          </div>
        ) : interviews.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">No interviews match filters</p>
            <p className="text-xs text-slate-400 mt-1">Schedule a new interview or adjust filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Interview ID & Date</th>
                  <th className="py-3.5 px-4">Candidate & Role</th>
                  <th className="py-3.5 px-4">Panel Interviewer</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Evaluation</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interviews.map((intObj) => (
                  <tr key={intObj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="mono-font text-xs font-bold text-slate-900">{intObj.id}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(intObj.scheduled_start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{intObj.candidate_name}</div>
                      <div className="text-xs text-slate-400">{intObj.requisition_title}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{intObj.interviewer_name}</div>
                      <div className="mono-font text-xs text-slate-400">{intObj.interviewer_id}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {intObj.interview_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        intObj.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        intObj.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        intObj.status === 'RESCHEDULED' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {intObj.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {intObj.has_scorecard ? (
                        <span className="flex items-center space-x-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Submitted</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onOpenScorecardModal(intObj)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Submit Scorecard</span>
                        </button>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      {intObj.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => {
                              setRescheduleModalInt(intObj);
                              setNewStart(new Date(intObj.scheduled_start).toISOString().slice(0, 16));
                              setNewEnd(new Date(intObj.scheduled_end).toISOString().slice(0, 16));
                              setAllowOverride(false);
                              setRescheduleError(null);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => {
                              setCancelModalInt(intObj);
                              setCancelReason('');
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModalInt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleExecuteReschedule} className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Reschedule Interview</h3>
              <button
                type="button"
                onClick={() => setRescheduleModalInt(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Rescheduling session for <strong className="text-slate-900">{rescheduleModalInt.candidate_name}</strong> with interviewer <strong className="text-slate-900">{rescheduleModalInt.interviewer_name}</strong>.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">New Start Time *</label>
              <input
                type="datetime-local"
                required
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">New End Time *</label>
              <input
                type="datetime-local"
                required
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {rescheduleError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1.5">
                <p className="font-bold">Interviewer Conflict Alert:</p>
                <p>{rescheduleError}</p>
                <label className="flex items-center space-x-2 mt-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowOverride}
                    onChange={(e) => setAllowOverride(e.target.checked)}
                    className="rounded text-red-600"
                  />
                  <span>Allow Double-Booking Override (Logged)</span>
                </label>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRescheduleModalInt(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold"
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
              >
                Confirm Reschedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalInt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleExecuteCancel} className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Cancel Interview</h3>
              <button
                type="button"
                onClick={() => setCancelModalInt(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel interview <strong className="mono-font">{cancelModalInt.id}</strong>?
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Cancellation Reason *</label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Candidate withdrew application"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCancelModalInt(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
