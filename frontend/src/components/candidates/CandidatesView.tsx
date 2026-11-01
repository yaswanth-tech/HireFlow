import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Plus, Mail, Phone, 
  MapPin, Briefcase, Award, X, ExternalLink, Calendar,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Candidate } from '../../types';
import { api } from '../../api/client';

interface CandidatesViewProps {
  onOpenNewCandModal: () => void;
  onOpenScheduleForCandidate?: (candId: string) => void;
}

export const CandidatesView: React.FC<CandidatesViewProps> = ({
  onOpenNewCandModal,
  onOpenScheduleForCandidate
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await api.getCandidates({
        search: search || undefined,
        status: status || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize
      });
      setCandidates(data.items || []);
    } catch (err) {
      console.error("Failed to load candidates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [status, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Talent Directory & Candidate Pool</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Verified Profiles
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Search talent directory, inspect validated competencies, application histories, and verified hiring records.
          </p>
        </div>

        <button
          onClick={onOpenNewCandModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-2xs transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Candidate</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidates by name, skills (e.g. Python, React), company, or ID (CAND-000001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Candidate Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Searching talent directory...
        </div>
      ) : candidates.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No candidates match your search</p>
          <p className="text-xs text-slate-400 mt-1">Try another keyword or filter setting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              onClick={() => setSelectedCandidate(cand)}
              className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                      {cand.first_name[0]}{cand.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {cand.first_name} {cand.last_name}
                      </h3>
                      <p className="font-mono text-xs text-slate-400">{cand.id}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                    cand.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {cand.status}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2 font-medium text-slate-800">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cand.current_title || 'Software Specialist'}</span>
                    <span className="text-slate-400">•</span>
                    <span>{cand.current_company || 'Independent'}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cand.email}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cand.location || 'Remote'}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-700">{cand.years_experience} yrs exp</span>
                  </div>
                </div>

                {/* Skills tags */}
                {cand.skills && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {cand.skills.split(',').slice(0, 4).map((sk, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded font-medium border border-slate-200">
                        {sk.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Active Applications: <strong className="text-slate-900">{cand.active_applications_count || 0}</strong></span>
                <span className="text-blue-600 font-semibold group-hover:underline">View Profile →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200/90 shadow-2xs text-xs">
        <span className="text-slate-500">
          Page <strong>{page}</strong> • Showing {candidates.length} candidates
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
            disabled={candidates.length < pageSize}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer flex items-center space-x-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xl shadow-md">
                  {selectedCandidate.first_name[0]}{selectedCandidate.last_name[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedCandidate.first_name} {selectedCandidate.last_name}
                  </h2>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                    <span className="font-mono font-bold text-blue-600">{selectedCandidate.id}</span>
                    <span>•</span>
                    <span>{selectedCandidate.current_title} at {selectedCandidate.current_company}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-400">Email Address</span>
                <p className="font-semibold text-slate-800 mt-0.5 truncate">{selectedCandidate.email}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-400">Phone</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedCandidate.phone || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-400">Total Experience</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedCandidate.years_experience} Years</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-400">Location</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedCandidate.location || 'Remote'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-400">Candidate Status</span>
                <p className="font-semibold text-emerald-600 mt-0.5">{selectedCandidate.status}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-400">Profile Created</span>
                <p className="font-semibold text-slate-800 mt-0.5">{new Date(selectedCandidate.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Skills & Competencies */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Competencies</h4>
              <div className="flex flex-wrap gap-2">
                {selectedCandidate.skills ? (
                  selectedCandidate.skills.split(',').map((s, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200">
                      {s.trim()}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No skills listed.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};