import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { Ledger, LearningRule } from '../types/index.ts';
import { Store } from '../services/store.ts';

interface LedgersViewProps {
  ledgers: Ledger[];
  onOpenCreateLedger: () => void;
  onLedgerUpdated: (ledger: Ledger) => void;
}

export const LedgersView: React.FC<LedgersViewProps> = ({
  ledgers,
  onOpenCreateLedger,
  onLedgerUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'MASTER' | 'RULES'>('MASTER');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [rules, setRules] = useState<LearningRule[]>(Store.getRules());

  // Filtered ledgers
  const filteredLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      if (selectedGroup !== 'ALL' && l.parentGroup !== selectedGroup) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.parentGroup.toLowerCase().includes(q) ||
          (l.tallyLedgerId && l.tallyLedgerId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [ledgers, selectedGroup, searchQuery]);

  const uniqueGroups = useMemo(() => {
    return Array.from(new Set(ledgers.map((l) => l.parentGroup))).sort();
  }, [ledgers]);

  // Toggle active/inactive ledger
  const handleToggleLedgerStatus = (ledger: Ledger) => {
    const updated: Ledger = {
      ...ledger,
      status: ledger.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    };
    Store.saveLedger(updated);
    onLedgerUpdated(updated);
  };

  // Rule actions
  const handleToggleRule = (id: string) => {
    Store.toggleRule(id);
    setRules([...Store.getRules()]);
  };

  const handleDeleteRule = (id: string) => {
    Store.deleteRule(id);
    setRules([...Store.getRules()]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Ledger Master & Classification Rules</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your chart of accounts and AI learned rules for automatic bank narration classification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center">
            <button
              onClick={() => setActiveTab('MASTER')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'MASTER' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ledger Master ({ledgers.length})
            </button>
            <button
              onClick={() => setActiveTab('RULES')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'RULES' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Learned Rules ({rules.length})</span>
            </button>
          </div>

          {activeTab === 'MASTER' && (
            <button
              onClick={onOpenCreateLedger}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ledger</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'MASTER' ? (
        /* Ledger Master Screen */
        <div className="space-y-4">
          {/* Search & Group Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledgers by name, parent group, or Tally ID..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Parent Group:</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 font-medium outline-none"
              >
                <option value="ALL">All Groups ({ledgers.length})</option>
                {uniqueGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredLedgers.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="font-semibold text-slate-600 text-sm">No ledgers found</div>
                <div className="text-xs text-slate-400 mt-1">
                  Try changing your search query or click "Create Ledger" to add a new accounting ledger.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Ledger Name</th>
                      <th className="py-3 px-4">Parent Group</th>
                      <th className="py-3 px-4 text-center">Nature</th>
                      <th className="py-3 px-4 text-center">GST Applicable</th>
                      <th className="py-3 px-4 text-center">GST Rate</th>
                      <th className="py-3 px-4">Tally Ledger ID</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLedgers.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-semibold text-slate-900">{l.name}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {l.parentGroup}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              l.nature === 'DEBIT'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {l.nature}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {l.gstApplicable ? (
                            <span className="text-emerald-700 font-bold text-[11px]">Yes</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {l.gstApplicable ? `${l.gstRate}%` : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {l.tallyLedgerId || <span className="text-slate-300">Auto-map</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleLedgerStatus(l)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                              l.status === 'ACTIVE'
                                ? 'text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {l.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Learned Rules Screen */
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-xs text-indigo-900 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Autonomous Rule Learning Engine</div>
              <div className="text-indigo-800 mt-0.5 leading-relaxed">
                When you edit a ledger on any transaction, TaxFlow saves that keyword mapping here. Future statement
                rows containing that keyword will automatically receive this ledger suggestion at high confidence. You
                have full control to edit, toggle, or delete any learned rule.
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {rules.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                No learned rules yet. Whenever you modify a suggested ledger in the Transaction Review screen, TaxFlow
                learns it automatically!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Narration Keyword</th>
                      <th className="py-3 px-4">Suggested Ledger</th>
                      <th className="py-3 px-4 text-center">Confidence</th>
                      <th className="py-3 px-4 text-center">Matches</th>
                      <th className="py-3 px-4 text-center">Active Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {rule.keyword}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{rule.targetLedger}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            {rule.confidence}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {rule.matchCount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleRule(rule.id)}
                            className="inline-flex items-center text-xs font-semibold"
                          >
                            {rule.isActive ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <ToggleRight className="w-5 h-5 text-emerald-600" /> Active
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-1">
                                <ToggleLeft className="w-5 h-5 text-slate-400" /> Disabled
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Delete this rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
