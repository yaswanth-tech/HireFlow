import React, { useState, useEffect } from 'react';
import { 
  Award, Star, CheckCircle, FileText, 
  Search, Sliders, TrendingUp, ThumbsUp, ThumbsDown,
  User, Calendar, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Scorecard } from '../../types';
import { api } from '../../api/client';

export const ScorecardsView: React.FC = () => {
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [recommendationFilter, setRecommendationFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  const fetchScorecards = async () => {
    setLoading(true);
    try {
      const data = await api.getScorecards({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        recommendation: recommendationFilter === 'ALL' ? undefined : recommendationFilter
      });
      setScorecards(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch scorecards", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScorecards();
  }, [recommendationFilter, page]);

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'STRONG_HIRE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'HIRE':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
      case 'LEANING_HIRE':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'LEANING_NO':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'STRONG_NO':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Structured Evaluations & Scorecards</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Evaluations Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Standardized evaluation matrix: Technical (40%), Problem-Solving (30%), Role Relevance (20%), Communication (10%).
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-blue-50 px-3.5 py-2 rounded-lg border border-blue-200 text-xs font-semibold text-blue-800 shrink-0">
          <Award className="w-4 h-4 text-blue-600" />
          <span>Formula: 0.40(T) + 0.30(P) + 0.20(R) + 0.10(C)</span>
        </div>
      </div>

      {/* Filter and Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="text-slate-400 mr-1 text-[11px] uppercase tracking-wide">Recommendation:</span>
          {[
            { id: 'ALL', label: 'All Recommendations' },
            { id: 'STRONG_HIRE', label: 'Strong Hire' },
            { id: 'HIRE', label: 'Hire' },
            { id: 'LEANING_HIRE', label: 'Leaning Hire' },
            { id: 'LEANING_NO', label: 'Leaning No' },
            { id: 'STRONG_NO', label: 'Strong No' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setRecommendationFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                recommendationFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{scorecards.length}</strong> of <strong>{totalCount}</strong> scorecards
        </div>
      </div>

      {/* Grid of evaluations */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading evaluation scorecards...
        </div>
      ) : scorecards.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No scorecards found</p>
          <p className="text-xs text-slate-400 mt-1">Submit interview evaluations or select another filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scorecards.map((sc) => (
            <div 
              key={sc.id} 
              className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4 hover:border-blue-400 hover:shadow-xs transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[11px] text-slate-400">{sc.id}</span>
                    <h3 className="font-bold text-slate-900 mt-0.5 text-base">{sc.candidate_name || 'Candidate'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{sc.requisition_title}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-blue-600 font-mono">
                      {sc.weighted_score ? sc.weighted_score.toFixed(1) : '4.0'}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">/ 5.0 Rating</span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className={`px-2.5 py-1 text-xs rounded-full border inline-block ${getRecommendationBadge(sc.recommendation)}`}>
                    {sc.recommendation.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Dimension breakdown */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Technical (40%)</span>
                    <p className="font-bold text-slate-800 mt-0.5 font-mono">{sc.technical_score || 4} / 5</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Problem Solving (30%)</span>
                    <p className="font-bold text-slate-800 mt-0.5 font-mono">{sc.problem_solving_score || 4} / 5</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Role Relevance (20%)</span>
                    <p className="font-bold text-slate-800 mt-0.5 font-mono">{sc.role_relevance_score || 4} / 5</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Communication (10%)</span>
                    <p className="font-bold text-slate-800 mt-0.5 font-mono">{sc.communication_score || 4} / 5</p>
                  </div>
                </div>

                {/* Written Feedback */}
                <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 italic">
                  "{sc.feedback || 'Candidate demonstrated strong aptitude and clear communication.'}"
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600 font-medium">{sc.reviewer_name}</span>
                </span>
                <span>{new Date(sc.submitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200/90 shadow-2xs text-xs">
          <span className="text-slate-500">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};