import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  CheckSquare,
  BookOpen,
  Send,
  History,
  Settings,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  pendingReviewCount: number;
  pendingPushCount: number;
  statementCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  pendingReviewCount,
  pendingPushCount,
  statementCount,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'statements',
      label: 'Bank Statements',
      icon: FileSpreadsheet,
      badge: statementCount > 0 ? statementCount : undefined,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: CheckSquare,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-900',
    },
    {
      id: 'ledgers',
      label: 'Ledgers & Rules',
      icon: BookOpen,
    },
    {
      id: 'tally',
      label: 'Tally Connector',
      icon: Send,
      badge: pendingPushCount > 0 ? `${pendingPushCount} ready` : undefined,
      badgeColor: 'bg-emerald-500 text-slate-900',
    },
    {
      id: 'sync-history',
      label: 'Sync History',
      icon: History,
    },
    {
      id: 'settings',
      label: 'Settings & Audit',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1 space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Accounting Workflow
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* CA Workflow Summary Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs space-y-2">
        <div className="text-[11px] font-semibold text-slate-400 uppercase">Core Automation Loop</div>
        <div className="text-[11px] text-slate-400 leading-relaxed font-mono">
          Upload Bank PDF/Excel <br />
          ↓ AI Classifies Ledgers <br />
          ↓ CA Reviews & Approves <br />
          ↓ Direct Push to Tally Prime
        </div>
      </div>
    </aside>
  );
};
