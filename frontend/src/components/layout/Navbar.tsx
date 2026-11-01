import React from 'react';
import { 
  Building2, ShieldCheck, AlertTriangle, UserCheck, 
  Database, RefreshCw, Sparkles 
} from 'lucide-react';

interface NavbarProps {
  activeExceptionsCount: number;
  onNavigate: (view: string) => void;
  activeRole: string;
  setActiveRole: (role: string) => void;
  onTriggerDataOps: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeExceptionsCount,
  onNavigate,
  activeRole,
  setActiveRole,
  onTriggerDataOps
}) => {
  return (
    <header className="h-16 bg-navy-900 border-b border-navy-800 px-6 flex items-center justify-between sticky top-0 z-40 text-white shadow-sm">
      {/* Brand & Platform Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-white">HireFlow</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium border border-blue-400/30">
              Enterprise v2.4
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Smart Recruitment & Hiring Intelligence Platform
          </p>
        </div>
      </div>

      {/* Center status indicators */}
      <div className="hidden md:flex items-center space-x-4 text-xs text-slate-300">
        <div className="flex items-center space-x-2 bg-navy-800/60 px-3 py-1.5 rounded-full border border-navy-700/60">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 font-medium">System Operational</span>
        </div>

        <div className="flex items-center space-x-2 bg-navy-800/60 px-3 py-1.5 rounded-full border border-navy-700/60">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-300">Audit & Governance Engine Active</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-4">
        {/* Exception alert badge */}
        <button
          onClick={() => onNavigate('exceptions')}
          className="relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 transition-colors border border-navy-700"
          title="Compliance & Exception Alerts"
        >
          <AlertTriangle className={`w-4 h-4 ${activeExceptionsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="text-xs font-semibold">Exceptions</span>
          {activeExceptionsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse">
              {activeExceptionsCount}
            </span>
          )}
        </button>

        {/* Data Ops Quick Button */}
        <button
          onClick={onTriggerDataOps}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all text-xs font-medium"
        >
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Data Ops</span>
        </button>

        {/* Role Switcher */}
        <div className="flex items-center space-x-2 border-l border-navy-800 pl-4">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-semibold text-white">Sarah Jenkins</p>
            <p className="text-[10px] text-blue-300 font-mono">{activeRole}</p>
          </div>

          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value)}
            className="bg-navy-800 text-xs text-slate-200 border border-navy-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="RECRUITER">Recruiter</option>
            <option value="HIRING_MANAGER">Hiring Manager</option>
            <option value="VP_HR">VP of People</option>
            <option value="ADMIN">System Admin</option>
          </select>

          <div className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center font-bold text-xs text-blue-300">
            SJ
          </div>
        </div>
      </div>
    </header>
  );
};
