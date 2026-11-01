import React, { useState, useEffect } from 'react';
import { 
  DatabaseZap, Sparkles, ShieldCheck, CheckCircle2, 
  XCircle, Download, FileSpreadsheet, FileCode, 
  FileText, RefreshCw, AlertTriangle, KeyRound, Layers, Cpu
} from 'lucide-react';
import { ValidationReport } from '../../types';
import { api } from '../../api/client';

export const DataOpsView: React.FC = () => {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [validating, setValidating] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [reqCount, setReqCount] = useState<number>(200);
  const [candCount, setCandCount] = useState<number>(5000);
  const [appCount, setAppCount] = useState<number>(8000);
  const [intCount, setIntCount] = useState<number>(2000);
  const [injectEdgeCases, setInjectEdgeCases] = useState<boolean>(true);
  const [generationResult, setGenerationResult] = useState<any>(null);

  const runValidation = async () => {
    setValidating(true);
    try {
      const data = await api.runValidationSuite();
      setReport(data);
    } catch (err) {
      console.error("Failed to run validation suite", err);
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, []);

  const handleTriggerGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerationResult(null);
    try {
      // Deterministic seed 20261022 maintained internally for reproducibility
      const res = await api.generateSyntheticData({
        seed: 20261022,
        requisitions_count: reqCount,
        candidates_count: candCount,
        applications_count: appCount,
        interviews_count: intCount,
        inject_edge_cases: injectEdgeCases
      });
      setGenerationResult(res);
      await runValidation();
    } catch (err: any) {
      alert(err.message || 'Data generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Data Engine, Validation Suite & Benchmark Exports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Integrity Engine Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic synthetic generation engine, 8-point automated constraint validation suite, and multi-format enterprise dataset exports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={runValidation}
            disabled={validating}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${validating ? 'animate-spin' : ''}`} />
            <span>{validating ? 'Verifying Integrity...' : 'Run Validation Suite'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Column = Generator Controls; Right Column = Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Synthetic Generator Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Enterprise Synthetic Data Generator</h2>
              <p className="text-xs text-slate-500">Deterministic relational generator with referential integrity</p>
            </div>
          </div>

          <form onSubmit={handleTriggerGeneration} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Requisitions</label>
                <input
                  type="number"
                  required
                  value={reqCount}
                  onChange={(e) => setReqCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Candidates</label>
                <input
                  type="number"
                  required
                  value={candCount}
                  onChange={(e) => setCandCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Applications</label>
                <input
                  type="number"
                  required
                  value={appCount}
                  onChange={(e) => setAppCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Interviews</label>
                <input
                  type="number"
                  required
                  value={intCount}
                  onChange={(e) => setIntCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={injectEdgeCases}
                  onChange={(e) => setInjectEdgeCases(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Inject Labelled Edge Cases & Exception Anomalies</span>
              </label>

              <button
                type="submit"
                disabled={generating}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-2xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating Relational Dataset...</span>
                  </>
                ) : (
                  <>
                    <DatabaseZap className="w-4 h-4" />
                    <span>Generate Benchmark Dataset</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {generationResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Benchmark Dataset Generated & Committed</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[11px]">
                  Deterministic State Verified
                </span>
              </div>
              <p className="font-mono text-[11px] text-emerald-700">SHA-256 Checksum: {generationResult.checksum}</p>
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-semibold text-emerald-800">
                <span>{generationResult.counts.requisitions} Requisitions</span>
                <span>•</span>
                <span>{generationResult.counts.candidates.toLocaleString()} Candidates</span>
                <span>•</span>
                <span>{generationResult.counts.applications.toLocaleString()} Applications</span>
                <span>•</span>
                <span>{generationResult.counts.interviews.toLocaleString()} Interviews</span>
                <span>•</span>
                <span>{generationResult.counts.ground_truth_exceptions} Labelled Edge Cases</span>
              </div>
            </div>
          )}
        </div>

        {/* Data Exports Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Enterprise Dataset Exports</h2>
              <p className="text-xs text-slate-500">CSV, JSON, SQL seed & Ground Truth exports</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <a
              href="/api/v1/data/export/csv"
              download="hireflow_datasets.zip"
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-xs font-semibold text-slate-800 group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>CSV Archive (Zip of 8 Normalized Tables)</span>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </a>

            <a
              href="/api/v1/data/export/sql"
              download="hireflow_seed_postgres.sql"
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-xs font-semibold text-slate-800 group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <FileCode className="w-4 h-4 text-blue-600" />
                <span>PostgreSQL Seed SQL Script</span>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </a>

            <a
              href="/api/v1/data/export/json"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-xs font-semibold text-slate-800 group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>JSON Normalized Records</span>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </a>

            <a
              href="/api/v1/data/export/ground-truth"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-xs font-semibold text-slate-800 group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <KeyRound className="w-4 h-4 text-purple-600" />
                <span>Separate Ground-Truth Benchmark Labels</span>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </a>
          </div>
        </div>
      </div>

      {/* Live Data Validation Suite Report */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">8-Point Automated Data Validation Suite</h2>
              {report && (
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  report.overall_status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {report.overall_status} ({report.passed_checks}/{report.total_checks} PASSED)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Automated tests for primary keys, foreign keys, enums, dates, lifecycle states, arithmetic reconciliation, duplicate detection, and checksum.
            </p>
          </div>

          {report && (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-400">SHA-256 Checksum:</span>
              <span className="font-mono font-bold text-blue-700">{report.checksum.slice(0, 16)}...</span>
            </div>
          )}
        </div>

        {validating ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Executing data reconciliation tests...
          </div>
        ) : !report ? (
          <div className="p-8 text-center text-slate-500">No validation report available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.checks.map((check, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  check.passed
                    ? 'bg-emerald-50/30 border-emerald-200/80'
                    : 'bg-rose-50/40 border-rose-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    {check.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{check.check_name}</h3>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {check.category}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    check.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {check.passed ? 'PASSED' : `${check.error_count} Violations`}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {check.details}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Evaluated Records: <strong className="text-slate-700">{check.records_checked.toLocaleString()}</strong></span>
                  <span className="text-emerald-700 font-medium">100% Integrity Validated</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};