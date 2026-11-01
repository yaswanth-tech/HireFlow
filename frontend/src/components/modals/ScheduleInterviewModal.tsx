import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../../api/client';
import { Application } from '../../types';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  onScheduled
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [interviewType, setInterviewType] = useState<string>('TECHNICAL');
  const [interviewerName, setInterviewerName] = useState<string>('Dr. Alan Grant');
  const [interviewerId, setInterviewerId] = useState<string>('INTV-001');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [allowConflictOverride, setAllowConflictOverride] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Set default tomorrow at 10:00 AM
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      tmrw.setHours(10, 0, 0, 0);
      const tmrwEnd = new Date(tmrw);
      tmrwEnd.setHours(11, 0, 0, 0);

      setStartTime(tmrw.toISOString().slice(0, 16));
      setEndTime(tmrwEnd.toISOString().slice(0, 16));

      // Fetch active applications
      api.getApplications({ limit: 50 }).then((data) => {
        const eligible = (data.items || []).filter(
          (a: Application) => !['WITHDRAWN', 'REJECTED', 'HIRED'].includes(a.stage)
        );
        setApplications(eligible);
        if (eligible.length > 0) {
          setSelectedAppId(eligible[0].id);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId || !startTime || !endTime) return;

    setConflictError(null);
    setLoading(true);

    try {
      await api.scheduleInterview(
        {
          application_id: selectedAppId,
          interview_type: interviewType,
          scheduled_start: new Date(startTime).toISOString(),
          scheduled_end: new Date(endTime).toISOString(),
          interviewer_id: interviewerId,
          interviewer_name: interviewerName,
          meeting_link: `https://meet.hireflow.internal/${selectedAppId.toLowerCase()}`
        },
        allowConflictOverride
      );
      onScheduled();
      onClose();
    } catch (err: any) {
      setConflictError(err.message || 'Scheduling conflict detected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Schedule Interview Panel</h3>
            <p className="text-xs text-slate-500">Automated double-booking prevention & calendar checking</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Application / Candidate Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase">Select Candidate Application *</label>
          <select
            required
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.candidate_name} – {app.requisition_title} ({app.stage})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Interview Stage *</label>
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="SCREENING">Initial Screening</option>
              <option value="TECHNICAL">Technical Architecture</option>
              <option value="PANEL">Cross-Functional Panel</option>
              <option value="EXECUTIVE">Executive Final</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Lead Interviewer *</label>
            <select
              value={interviewerId}
              onChange={(e) => {
                setInterviewerId(e.target.value);
                const names: Record<string, string> = {
                  'INTV-001': 'Dr. Alan Grant',
                  'INTV-002': 'Marcus Vance',
                  'INTV-003': 'Elena Rostova',
                  'INTV-004': 'Sarah Jenkins'
                };
                setInterviewerName(names[e.target.value] || 'Reviewer');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="INTV-001">Dr. Alan Grant (Engineering Lead)</option>
              <option value="INTV-002">Marcus Vance (VP People)</option>
              <option value="INTV-003">Elena Rostova (VP Finance)</option>
              <option value="INTV-004">Sarah Jenkins (Senior Recruiter)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Scheduled Start *</label>
            <input
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Scheduled End *</label>
            <input
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conflict Error Notice */}
        {conflictError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Conflict Prevention Alert:</span>
            </div>
            <p>{conflictError}</p>
            <label className="flex items-center space-x-2 mt-2 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={allowConflictOverride}
                onChange={(e) => setAllowConflictOverride(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span>Force Overlap Override (Recorded to Audit Trail)</span>
            </label>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            {loading ? 'Checking Availability...' : 'Confirm Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
};
