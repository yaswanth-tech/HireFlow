import React, { useState, useEffect } from 'react';
import { 
  FileCheck, AlertTriangle, CheckCircle2, XCircle, 
  Clock, DollarSign, Plus, ArrowUpRight, ShieldCheck, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Offer } from '../../types';
import { api } from '../../api/client';

interface OffersViewProps {
  onOpenCreateOfferModal: () => void;
}

export const OffersView: React.FC<OffersViewProps> = ({
  onOpenCreateOfferModal
}) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [violationsOnly, setViolationsOnly] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [approvalModalApprId, setApprovalModalApprId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approvalComment, setApprovalComment] = useState<string>('');
  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{ offerId: string; newStatus: string } | null>(null);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await api.getOffers({
        status: status || undefined,
        violations_only: violationsOnly || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize
      });
      setOffers(data.items || []);
    } catch (err) {
      console.error("Failed to fetch offers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [status, violationsOnly, page]);

  const handleExecuteApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalApprId) return;

    try {
      await api.actOnApproval(approvalModalApprId, {
        status: approvalStatus,
        comments: approvalComment || undefined
      });
      setApprovalModalApprId(null);
      fetchOffers();
    } catch (err: any) {
      alert(err.message || 'Failed to submit approval');
    }
  };

  const handleUpdateStatus = async (offerId: string, newStatus: string) => {
    setConfirmAction({ offerId, newStatus });
  };

  const executeStatusUpdate = async () => {
    if (!confirmAction) return;
    try {
      await api.updateOfferStatus(confirmAction.offerId, confirmAction.newStatus);
      setConfirmAction(null);
      fetchOffers();
    } catch (err: any) {
      alert(err.message || 'Failed to update offer status');
      setConfirmAction(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Offer Management & Multi-Tier Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated compensation band verification, executive approval workflows, and hire conversions.
          </p>
        </div>

        <button
          onClick={onOpenCreateOfferModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Offer</span>
        </button>
      </div>

      {/* Filter and Violations Toggle Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={violationsOnly}
              onChange={(e) => setViolationsOnly(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <span className="flex items-center gap-1.5 text-red-700 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Salary Band Violations Only
            </span>
          </label>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Offer Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="EXTENDED">Extended to Candidate</option>
            <option value="ACCEPTED">Accepted (Hired)</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Offers Cards List */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading offer dossiers...
        </div>
      ) : offers.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No offers found</p>
          <p className="text-xs text-slate-400 mt-1">Generate an offer or adjust filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((off) => (
            <div 
              key={off.id}
              className={`bg-white rounded-xl border shadow-sm p-5 space-y-4 transition-all ${
                off.is_salary_band_violation 
                  ? 'border-red-300 bg-red-50/20 shadow-red-500/5' 
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="mono-font text-xs font-bold text-slate-500">{off.id}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-base text-slate-900">{off.candidate_name}</span>
                  <span className="text-slate-400 text-sm">for {off.requisition_title}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {off.is_salary_band_violation && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Salary Band Exception
                    </span>
                  )}
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                    off.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    off.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    off.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    'bg-slate-100 text-slate-800 border-slate-300'
                  }`}>
                    {off.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Compensation Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Offered Base Salary</span>
                  <p className="text-base font-extrabold text-slate-900 mono-font mt-0.5">
                    ${off.base_salary.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">Approved Range: {off.salary_range}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Annual Bonus</span>
                  <p className="text-base font-extrabold text-slate-900 mono-font mt-0.5">
                    ${off.bonus.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">Target Incentive</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Equity Options / Shares</span>
                  <p className="text-base font-extrabold text-slate-900 mono-font mt-0.5">
                    {off.equity_shares.toLocaleString()} units
                  </p>
                  <span className="text-[10px] text-slate-400">4-Year Vesting Schedule</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Target Start Date</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {new Date(off.start_date).toLocaleDateString()}
                  </p>
                  <span className="text-[10px] text-slate-400">Agreed employment date</span>
                </div>
              </div>

              {/* Violation Reason if flagged */}
              {off.is_salary_band_violation && off.violation_reason && (
                <div className="p-3 bg-red-100/70 border border-red-300 rounded-lg text-xs text-red-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <p><strong>Compliance Notice:</strong> {off.violation_reason}</p>
                </div>
              )}

              {/* Multi-Tier Executive Approval Badges */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Executive Approval Chain
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {off.approvals?.map((appr) => (
                    <div 
                      key={appr.id}
                      className="p-3 rounded-lg border bg-white flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{appr.approver_role.replace('_', ' ')}</p>
                        <p className="text-slate-500 text-[11px]">{appr.approver_name}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {appr.status === 'APPROVED' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        ) : appr.status === 'REJECTED' ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold text-[11px] flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setApprovalModalApprId(appr.id);
                              setApprovalStatus('APPROVED');
                              setApprovalComment('');
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-[11px] shadow-2xs"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-3 text-xs">
                {off.status === 'APPROVED' && (
                  <button
                    onClick={() => handleUpdateStatus(off.id, 'EXTENDED')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Extend to Candidate
                  </button>
                )}

                {off.status === 'EXTENDED' && (
                  <button
                    onClick={() => handleUpdateStatus(off.id, 'ACCEPTED')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Mark Accepted (Confirm Hire)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Decision Modal */}
      {approvalModalApprId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleExecuteApproval} className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Executive Compensation Decision</h3>
              <button
                type="button"
                onClick={() => setApprovalModalApprId(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Decision *</label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setApprovalStatus('APPROVED')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    approvalStatus === 'APPROVED' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Approve Offer
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalStatus('REJECTED')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    approvalStatus === 'REJECTED' 
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Reject Package
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Comments / Waiver Justification</label>
              <textarea
                rows={3}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Reasoning for compensation decision..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setApprovalModalApprId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
              >
                Submit Decision
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Dialog for Status Actions */}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Confirm Status Change</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to change this offer's status to <strong>{confirmAction.newStatus.replace(/_/g, ' ')}</strong>?
              {confirmAction.newStatus === 'ACCEPTED' && ' This will mark the candidate as hired.'}
            </p>
            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeStatusUpdate}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200/90 shadow-2xs text-xs">
        <span className="text-slate-500">
          Page <strong>{page}</strong> • Showing {offers.length} offers
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer flex items-center space-x-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={offers.length < pageSize}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer flex items-center space-x-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
