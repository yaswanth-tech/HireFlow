import React, { useState, useEffect } from 'react';
import { 
  History, Search, Filter, ShieldCheck, 
  Clock, ArrowUpDown, ChevronRight, X, Code2 
} from 'lucide-react';
import { AuditLog } from '../../types';
import { api } from '../../api/client';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [entityType, setEntityType] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [actor, setActor] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        entity_type: entityType || undefined,
        action: action || undefined,
        actor: actor || undefined,
        limit: 100
      });
      setLogs(data.items || []);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [entityType, action]);

  const renderJsonOrString = (raw: string | undefined) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Immutable Audit Log History</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-evident trail for stage transitions, offers, approvals, scheduling, and configuration changes.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Cryptographic Append-Only Ledger</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by actor name (e.g. Sarah Jenkins, Recruiter)..."
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Entity Types</option>
            <option value="APPLICATION">Application</option>
            <option value="REQUISITION">Requisition</option>
            <option value="INTERVIEW">Interview</option>
            <option value="SCORECARD">Scorecard</option>
            <option value="OFFER">Offer</option>
            <option value="APPROVAL">Approval</option>
            <option value="CANDIDATE">Candidate</option>
          </select>

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Action Types</option>
            <option value="STAGE_TRANSITION">Stage Transition</option>
            <option value="CREATE_OFFER">Create Offer</option>
            <option value="APPROVAL_DECISION">Approval Decision</option>
            <option value="SCHEDULE_INTERVIEW">Schedule Interview</option>
            <option value="SUBMIT_SCORECARD">Submit Scorecard</option>
            <option value="CREATE_REQUISITION">Create Requisition</option>
          </select>
        </div>
      </div>

      {/* Table of logs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">No audit records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Event ID & Time</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Target Entity</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{log.id}</div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-sans font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs border border-slate-200">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-medium text-blue-700">{log.entity_id}</div>
                      <div className="text-[11px] text-slate-400 uppercase font-mono">{log.entity_type}</div>
                    </td>

                    <td className="py-3.5 px-4 font-sans font-medium text-slate-700">
                      {log.actor}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="text-blue-600 hover:underline font-sans text-xs font-semibold">
                        Inspect →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Payload Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Audit Record Inspection</h3>
                <p className="mono-font text-xs text-blue-600">{selectedLog.id} • {selectedLog.action}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400">Actor</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedLog.actor}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400">Timestamp</span>
                <p className="font-bold text-slate-800 mt-0.5">{new Date(selectedLog.timestamp).toISOString()}</p>
              </div>
            </div>

            {selectedLog.previous_state && (
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-slate-500">Previous State</span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs overflow-x-auto font-mono">
                  {renderJsonOrString(selectedLog.previous_state)}
                </pre>
              </div>
            )}

            {selectedLog.new_state && (
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-slate-500">New State</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-xs overflow-x-auto font-mono">
                  {renderJsonOrString(selectedLog.new_state)}
                </pre>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
