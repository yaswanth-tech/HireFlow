import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Search, Filter, Plus, ArrowUpDown, 
  MapPin, DollarSign, Award, ChevronRight, X, CheckCircle,
  ChevronLeft, Users
} from 'lucide-react';
import { Requisition, SkillRequirement } from '../../types';
import { api } from '../../api/client';

interface RequisitionsViewProps {
  onOpenNewReqModal: () => void;
  onSelectRequisition?: (reqId: string) => void;
}

export const RequisitionsView: React.FC<RequisitionsViewProps> = ({
  onOpenNewReqModal,
  onSelectRequisition
}) => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const data = await api.getRequisitions({
        search: search || undefined,
        department: department || undefined,
        status: status || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize
      });
      setRequisitions(data.items || []);
    } catch (err) {
      console.error("Failed to load requisitions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, [department, status, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequisitions();
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'OPEN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'ON_HOLD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Requisition Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Active Job Banding
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create requisitions, enforce approved salary compensation bands, and monitor competency skill requirements.
          </p>
        </div>

        <button
          onClick={onOpenNewReqModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-2xs transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Requisition</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, requisition ID (REQ-2026-...), or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Data & AI">Data & AI</option>
            <option value="Design">Design</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="Customer Success">Customer Success</option>
            <option value="Finance">Finance</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="CLOSED">Closed</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Requisitions List Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading requisitions...
          </div>
        ) : requisitions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">No requisitions found</p>
            <p className="text-xs text-slate-400 mt-1">Try modifying your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Requisition Details</th>
                  <th className="py-3.5 px-4">Department & Level</th>
                  <th className="py-3.5 px-4">Approved Salary Band</th>
                  <th className="py-3.5 px-4">Required Skills</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Applicants</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requisitions.map((req) => (
                  <tr 
                    key={req.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => setSelectedReq(req)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {req.title}
                      </div>
                      <div className="font-mono text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{req.id}</span>
                        <span>•</span>
                        <span className="text-slate-500 font-sans">{req.location}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{req.department}</div>
                      <div className="text-xs text-slate-400">{req.experience_level} Level</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 font-mono">
                        ${req.min_salary.toLocaleString()} - ${req.max_salary.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-medium">Approved Ceiling</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {req.skills?.slice(0, 3).map((sk, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded border border-slate-200">
                            {sk.skill_name}
                          </span>
                        ))}
                        {req.skills && req.skills.length > 3 && (
                          <span className="text-xs text-slate-400 self-center">
                            +{req.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">{req.applications_count || 0}</span>
                      <span className="text-xs text-slate-400 ml-1">applicants</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReq(req);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50 text-xs">
          <span className="text-slate-500">
            Page <strong>{page}</strong> • Showing up to {pageSize} requisitions per page
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
              disabled={requisitions.length < pageSize}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Requisition Detail Drawer Modal */}
      {selectedReq && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600">{selectedReq.id}</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedReq.title}</h2>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Compensation & Openings Banner */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 font-medium">Approved Salary Band</span>
                <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                  ${selectedReq.min_salary.toLocaleString()} - ${selectedReq.max_salary.toLocaleString()}
                </p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">Verified Compensation Ceiling</p>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium">Approved Openings</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedReq.openings_count} Positions
                </p>
                <p className="text-[11px] text-slate-500 mt-1">{selectedReq.applications_count || 0} Total Active Applicants</p>
              </div>
            </div>

            {/* Department & Hiring Manager */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Position Metadata</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-400">Department</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedReq.department}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-400">Experience Level</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedReq.experience_level}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-400">Hiring Manager</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedReq.hiring_manager_name || 'Assigned Lead'}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-400">Location</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedReq.location}</p>
                </div>
              </div>
            </div>

            {/* Required Competencies */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Required Skills & Competencies</h3>
              <div className="space-y-2">
                {selectedReq.skills && selectedReq.skills.length > 0 ? (
                  selectedReq.skills.map((sk, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-slate-800 text-sm">{sk.skill_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          sk.importance === 'REQUIRED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {sk.importance}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {sk.min_years_experience}+ yrs exp
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No specific skills configured.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};