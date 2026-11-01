import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { RequisitionsView } from './components/requisitions/RequisitionsView';
import { CandidatesView } from './components/candidates/CandidatesView';
import { PipelineView } from './components/pipeline/PipelineView';
import { InterviewsView } from './components/interviews/InterviewsView';
import { ScorecardsView } from './components/scorecards/ScorecardsView';
import { OffersView } from './components/offers/OffersView';
import { ExceptionsView } from './components/exceptions/ExceptionsView';
import { AuditView } from './components/audit/AuditView';
import { DataOpsView } from './components/data_ops/DataOpsView';

import { NewRequisitionModal } from './components/modals/NewRequisitionModal';
import { NewCandidateModal } from './components/modals/NewCandidateModal';
import { ScheduleInterviewModal } from './components/modals/ScheduleInterviewModal';
import { ScorecardModal } from './components/modals/ScorecardModal';
import { CreateOfferModal } from './components/modals/CreateOfferModal';

import { DashboardMetrics, Interview } from './types';
import { api } from './api/client';

export function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeRole, setActiveRole] = useState<string>('RECRUITER');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  // Modals state
  const [isNewReqOpen, setIsNewReqOpen] = useState<boolean>(false);
  const [isNewCandOpen, setIsNewCandOpen] = useState<boolean>(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [scorecardInterview, setScorecardInterview] = useState<Interview | null>(null);
  const [isCreateOfferOpen, setIsCreateOfferOpen] = useState<boolean>(false);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [currentView]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Application Header */}
      <Navbar
        activeExceptionsCount={metrics?.active_exceptions_count || 0}
        onNavigate={setCurrentView}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        onTriggerDataOps={() => setCurrentView('data_ops')}
      />

      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          activeExceptionsCount={metrics?.active_exceptions_count || 0}
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)]">
          {currentView === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              loading={loadingMetrics}
              onNavigate={setCurrentView}
              onOpenNewReqModal={() => setIsNewReqOpen(true)}
              onOpenNewCandModal={() => setIsNewCandOpen(true)}
              onOpenScheduleModal={() => setIsScheduleOpen(true)}
              onRefresh={fetchMetrics}
            />
          )}

          {currentView === 'requisitions' && (
            <RequisitionsView
              onOpenNewReqModal={() => setIsNewReqOpen(true)}
            />
          )}

          {currentView === 'candidates' && (
            <CandidatesView
              onOpenNewCandModal={() => setIsNewCandOpen(true)}
              onOpenScheduleForCandidate={() => setIsScheduleOpen(true)}
            />
          )}

          {currentView === 'pipeline' && (
            <PipelineView />
          )}

          {currentView === 'interviews' && (
            <InterviewsView
              onOpenScheduleModal={() => setIsScheduleOpen(true)}
              onOpenScorecardModal={(intObj) => setScorecardInterview(intObj)}
            />
          )}

          {currentView === 'scorecards' && (
            <ScorecardsView />
          )}

          {currentView === 'offers' && (
            <OffersView
              onOpenCreateOfferModal={() => setIsCreateOfferOpen(true)}
            />
          )}

          {currentView === 'exceptions' && (
            <ExceptionsView />
          )}

          {currentView === 'audit' && (
            <AuditView />
          )}

          {currentView === 'data_ops' && (
            <DataOpsView />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <NewRequisitionModal
        isOpen={isNewReqOpen}
        onClose={() => setIsNewReqOpen(false)}
        onCreated={() => {
          fetchMetrics();
        }}
      />

      <NewCandidateModal
        isOpen={isNewCandOpen}
        onClose={() => setIsNewCandOpen(false)}
        onCreated={() => {
          fetchMetrics();
        }}
      />

      <ScheduleInterviewModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onScheduled={() => {
          fetchMetrics();
        }}
      />

      <ScorecardModal
        interview={scorecardInterview}
        onClose={() => setScorecardInterview(null)}
        onSubmitted={() => {
          fetchMetrics();
        }}
      />

      <CreateOfferModal
        isOpen={isCreateOfferOpen}
        onClose={() => setIsCreateOfferOpen(false)}
        onCreated={() => {
          fetchMetrics();
        }}
      />
    </div>
  );
}

export default App;
