import React, { useState, useEffect } from 'react';
import { X, DollarSign, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { Application, Requisition } from '../../types';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateOfferModal: React.FC<CreateOfferModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [baseSalary, setBaseSalary] = useState<number>(150000);
  const [bonus, setBonus] = useState<number>(20000);
  const [equity, setEquity] = useState<number>(2500);
  const [startDate, setStartDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      setStartDate(future.toISOString().slice(0, 10));

      api.getApplications({ limit: 50 }).then(async (data) => {
        const apps = (data.items || []).filter(
          (a: Application) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(a.stage)
        );
        setApplications(apps);
        if (apps.length > 0) {
          setSelectedAppId(apps[0].id);
          try {
            const req = await api.getRequisition(apps[0].requisition_id);
            setSelectedReq(req);
            setBaseSalary(Math.round((req.min_salary + req.max_salary) / 2));
          } catch (e) {
            console.error(e);
          }
        }
      });
    }
  }, [isOpen]);

  const handleAppChange = async (appId: string) => {
    setSelectedAppId(appId);
    const chosen = applications.find(a => a.id === appId);
    if (chosen) {
      try {
        const req = await api.getRequisition(chosen.requisition_id);
        setSelectedReq(req);
        setBaseSalary(Math.round((req.min_salary + req.max_salary) / 2));
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!isOpen) return null;

  const isViolation = selectedReq && (baseSalary > selectedReq.max_salary || baseSalary < selectedReq.min_salary);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId || !startDate) return;

    setLoading(true);
    setError(null);
    try {
      await api.createOffer({
        application_id: selectedAppId,
        base_salary: Number(baseSalary),
        bonus: Number(bonus),
        equity_shares: Number(equity),
        start_date: new Date(startDate).toISOString()
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate employment offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Generate Formal Offer Dossier</h3>
            <p className="text-xs text-slate-500">Initiates multi-tier executive approval chain (HM, Finance, HR)</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Application Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase">Target Candidate Application *</label>
          <select
            required
            value={selectedAppId}
            onChange={(e) => handleAppChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.candidate_name} – {app.requisition_title} ({app.stage})
              </option>
            ))}
          </select>
        </div>

        {/* Requisition Approved Salary Band Info */}
        {selectedReq && (
          <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            isViolation ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div>
              <span className="font-bold">Approved Band for Requisition:</span>
              <p className="mono-font font-extrabold text-sm mt-0.5">
                ${selectedReq.min_salary.toLocaleString()} – ${selectedReq.max_salary.toLocaleString()}
              </p>
            </div>
            {isViolation && (
              <span className="px-2 py-0.5 bg-red-200 text-red-900 font-bold rounded flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Band Violation Detected
              </span>
            )}
          </div>
        )}

        {/* Base Salary Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase">Offered Base Salary ($/yr) *</label>
          <input
            type="number"
            required
            step={5000}
            value={baseSalary}
            onChange={(e) => setBaseSalary(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mono-font font-bold focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Annual Bonus ($)</label>
            <input
              type="number"
              step={1000}
              value={bonus}
              onChange={(e) => setBonus(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mono-font focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Equity Shares</label>
            <input
              type="number"
              step={500}
              value={equity}
              onChange={(e) => setEquity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mono-font focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase">Agreed Employment Start Date *</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

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
            {loading ? 'Submitting...' : 'Generate Offer Package'}
          </button>
        </div>
      </form>
    </div>
  );
};
