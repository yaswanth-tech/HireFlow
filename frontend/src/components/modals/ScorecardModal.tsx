import React, { useState } from 'react';
import { X, Award, Star, CheckCircle, Calculator } from 'lucide-react';
import { api } from '../../api/client';
import { Interview } from '../../types';

interface ScorecardModalProps {
  interview: Interview | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export const ScorecardModal: React.FC<ScorecardModalProps> = ({
  interview,
  onClose,
  onSubmitted
}) => {
  const [techScore, setTechScore] = useState<number>(4);
  const [probScore, setProbScore] = useState<number>(4);
  const [roleScore, setRoleScore] = useState<number>(4);
  const [commScore, setCommScore] = useState<number>(5);
  const [recommendation, setRecommendation] = useState<string>('HIRE');
  const [feedback, setFeedback] = useState<string>('Demonstrated strong architecture and technical competency throughout the interview session.');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!interview) return null;

  // Real-time weighted formula calculation:
  // 40% Technical, 30% Problem Solving, 20% Role Relevance, 10% Communication
  const calculatedWeightedScore = Number((
    0.40 * techScore +
    0.30 * probScore +
    0.20 * roleScore +
    0.10 * commScore
  ).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.submitScorecard({
        interview_id: interview.id,
        reviewer_id: interview.interviewer_id,
        reviewer_name: interview.interviewer_name,
        technical_score: techScore,
        problem_solving_score: probScore,
        role_relevance_score: roleScore,
        communication_score: commScore,
        recommendation,
        feedback,
        criteria_evaluated: 'Core Technical Competencies, Problem Solving, Communication'
      });
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit scorecard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Structured Interview Scorecard</h3>
            <p className="text-xs text-slate-500">Evaluation for {interview.candidate_name} ({interview.id})</p>
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

        {/* Live Weighted Score Display Box */}
        <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-200 uppercase font-bold tracking-wider">
              Calculated Weighted Score
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-black mono-font text-white">{calculatedWeightedScore}</span>
              <span className="text-xs text-blue-200 font-medium">/ 5.0 Rating</span>
            </div>
            <p className="text-[11px] text-blue-300 mt-1 font-mono">
              = 0.40({techScore}) + 0.30({probScore}) + 0.20({roleScore}) + 0.10({commScore})
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-blue-200 uppercase font-bold block">Recommendation</span>
            <span className="px-3 py-1 bg-white/20 text-white font-bold rounded-lg text-xs inline-block mt-1 border border-white/20">
              {recommendation.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Score Sliders / Ratings */}
        <div className="space-y-3 pt-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800">Technical Skills (40% Weight)</span>
              <p className="text-[11px] text-slate-500">Architecture, coding proficiency, domain mastery</p>
            </div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTechScore(val)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    techScore === val ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800">Problem Solving (30% Weight)</span>
              <p className="text-[11px] text-slate-500">Analytical thinking, edge case handling, debugging</p>
            </div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setProbScore(val)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    probScore === val ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800">Role Relevance (20% Weight)</span>
              <p className="text-[11px] text-slate-500">Fit for specific requisition requirements</p>
            </div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRoleScore(val)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    roleScore === val ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800">Communication & Teamwork (10% Weight)</span>
              <p className="text-[11px] text-slate-500">Clarity, articulation, cross-functional collaboration</p>
            </div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCommScore(val)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    commScore === val ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Final Recommendation */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase">Hiring Recommendation *</label>
          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
          >
            <option value="STRONG_HIRE">Strong Hire</option>
            <option value="HIRE">Hire</option>
            <option value="LEANING_HIRE">Leaning Hire</option>
            <option value="LEANING_NO">Leaning No</option>
            <option value="STRONG_NO">Strong No</option>
          </select>
        </div>

        {/* Qualitative Feedback Text */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase">Written Feedback & Synthesis *</label>
          <textarea
            required
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
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
            {loading ? 'Submitting...' : 'Submit Scorecard & Complete Interview'}
          </button>
        </div>
      </form>
    </div>
  );
};
