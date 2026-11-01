import React from 'react';
import { 
  LayoutDashboard, Briefcase, Users, GitFork, 
  Calendar, Award, FileCheck, AlertOctagon, 
  History, DatabaseZap, Settings
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  activeExceptionsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  activeExceptionsCount
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requisitions', label: 'Requisitions', icon: Briefcase },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'pipeline', label: 'Recruitment Pipeline', icon: GitFork },
    { id: 'interviews', label: 'Interview Scheduling', icon: Calendar },
    { id: 'scorecards', label: 'Evaluations & Scores', icon: Award },
    { id: 'offers', label: 'Offer Management', icon: FileCheck },
    { 
      id: 'exceptions', 
      label: 'Exceptions & Alerts', 
      icon: AlertOctagon, 
      badge: activeExceptionsCount > 0 ? activeExceptionsCount : undefined,
      badgeColor: 'bg-amber-500' 
    },
    { id: 'audit', label: 'Audit Logs', icon: History },
    { id: 'data_ops', label: 'Data Engine & Validation', icon: DatabaseZap }
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-800 text-slate-300 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Core Workflows
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-semibold'
                  : 'text-slate-300 hover:bg-navy-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full text-white ${item.badgeColor || 'bg-blue-600'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Status info box in footer */}
      <div className="p-4 border-t border-navy-800/80 bg-navy-950/40">
        <div className="rounded-lg bg-navy-800/60 p-3 border border-navy-700/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Compliance Guard</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Enforced
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            All stage transitions, salary bands, and conflict rules actively validated.
          </p>
        </div>
      </div>
    </aside>
  );
};
