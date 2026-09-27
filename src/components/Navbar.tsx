import React from 'react';
import { Building2, ShieldCheck, User as UserIcon, LogOut, UploadCloud, RefreshCw } from 'lucide-react';
import { User, TallyConnectionConfig } from '../types/index.ts';

interface NavbarProps {
  user: User | null;
  tallyConfig: TallyConnectionConfig;
  onLogout: () => void;
  onUploadClick: () => void;
  onNavigate: (view: string) => void;
  pendingReviewCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  tallyConfig,
  onLogout,
  onUploadClick,
  onNavigate,
  pendingReviewCount,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center font-bold text-xl text-white shadow-inner">
            TF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-slate-50">TAXFLOW</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                CA Automation
              </span>
            </div>
            <p className="text-xs text-slate-400">Bank Statement → Classification → Tally Prime</p>
          </div>
        </div>

        {/* Statuses & Action Badges */}
        <div className="flex items-center gap-4">
          {/* Tally Live Indicator */}
          <button
            onClick={() => onNavigate('tally')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              tallyConfig.status === 'CONNECTED'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
                : 'bg-rose-950/80 text-rose-300 border-rose-700/60 hover:bg-rose-900'
            }`}
            title="Click to view Tally connection"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                tallyConfig.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>Tally: {tallyConfig.status === 'CONNECTED' ? 'Connected' : 'Offline'}</span>
            {tallyConfig.tallyCompany && (
              <span className="text-slate-400 border-l border-slate-700 pl-1.5 max-w-[130px] truncate">
                {tallyConfig.tallyCompany}
              </span>
            )}
          </button>

          {/* Pending Review alert */}
          {pendingReviewCount > 0 && (
            <button
              onClick={() => onNavigate('transactions')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60 hover:bg-amber-900"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{pendingReviewCount} For Review</span>
            </button>
          )}

          {/* Quick Upload CTA */}
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Statement</span>
          </button>

          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{user.name}</div>
                <div className="text-[11px] text-indigo-400 font-mono">
                  {user.role === 'CA_OWNER' ? 'CA / OWNER' : user.role}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
