import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Send,
  Eye,
  Filter,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  BookOpen,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import { Transaction, Ledger, ReviewStatus, TallyStatus } from '../types/index.ts';
import { Store } from '../services/store.ts';

interface TransactionsViewProps {
  transactions: Transaction[];
  ledgers: Ledger[];
  tallyStatus: 'CONNECTED' | 'OFFLINE';
  onTransactionUpdated: (txn: Transaction) => void;
  onBulkUpdate: (txns: Transaction[]) => void;
  onOpenCreateLedger: (defaultName?: string, forTxnId?: string) => void;
  onOpenVoucherPreview: (txn: Transaction) => void;
  onPushToTallySingle: (txn: Transaction) => void;
  onPushApprovedToTally: (txnsToPush: Transaction[]) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  ledgers,
  tallyStatus,
  onTransactionUpdated,
  onBulkUpdate,
  onOpenCreateLedger,
  onOpenVoucherPreview,
  onPushToTallySingle,
  onPushApprovedToTally,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DUPLICATES'>('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState<'ALL' | 'HIGH' | 'LOW'>('ALL');
  const [bulkLedgerTarget, setBulkLedgerTarget] = useState<string>('');
  const [activeDropdownTxnId, setActiveDropdownTxnId] = useState<string | null>(null);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Status filter
      if (statusFilter === 'PENDING' && t.reviewStatus !== 'PENDING') return false;
      if (statusFilter === 'APPROVED' && t.reviewStatus !== 'APPROVED') return false;
      if (statusFilter === 'REJECTED' && t.reviewStatus !== 'REJECTED') return false;
      if (statusFilter === 'DUPLICATES' && !t.isDuplicate) return false;

      // Confidence filter
      if (confidenceFilter === 'HIGH' && t.confidence < 85) return false;
      if (confidenceFilter === 'LOW' && t.confidence >= 85) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNarration = t.narration.toLowerCase().includes(q);
        const matchesLedger = t.finalLedger.toLowerCase().includes(q);
        const matchesDate = t.date.includes(q);
        const matchesAmount = t.amount.toString().includes(q);
        if (!matchesNarration && !matchesLedger && !matchesDate && !matchesAmount) return false;
      }

      return true;
    });
  }, [transactions, statusFilter, confidenceFilter, searchQuery]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Review status changes
  const handleStatusChange = (txn: Transaction, newStatus: ReviewStatus) => {
    const updated: Transaction = {
      ...txn,
      reviewStatus: newStatus,
    };
    onTransactionUpdated(updated);
  };

  // Ledger change with automatic CA Rule Learning!
  const handleLedgerChange = (txn: Transaction, newLedgerName: string) => {
    if (newLedgerName === '__CREATE_NEW__') {
      onOpenCreateLedger(txn.narration.slice(0, 30), txn.id);
      return;
    }

    const updated: Transaction = {
      ...txn,
      finalLedger: newLedgerName,
    };
    onTransactionUpdated(updated);

    // Rule learning: save keyword mapping if changed from suggestion
    if (newLedgerName !== txn.suggestedLedger) {
      const words = txn.narration
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ')
        .split(' ')
        .filter((w) => w.length >= 3 && !['UPI', 'POS', 'NEFT', 'IMPS', 'TRANSFER', 'PVT', 'LTD'].includes(w));
      const keyword = words[0] || txn.narration.slice(0, 15);

      if (keyword) {
        Store.saveRule({
          id: `rule_${Date.now()}`,
          keyword,
          targetLedger: newLedgerName,
          confidence: 98,
          matchCount: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  };

  // Bulk actions
  const handleBulkApprove = () => {
    const toUpdate = transactions
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({ ...t, reviewStatus: 'APPROVED' as ReviewStatus }));
    onBulkUpdate(toUpdate);
    setSelectedIds(new Set());
  };

  const handleBulkReject = () => {
    const toUpdate = transactions
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({ ...t, reviewStatus: 'REJECTED' as ReviewStatus }));
    onBulkUpdate(toUpdate);
    setSelectedIds(new Set());
  };

  const handleBulkChangeLedger = () => {
    if (!bulkLedgerTarget) return;
    const toUpdate = transactions
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({ ...t, finalLedger: bulkLedgerTarget }));
    onBulkUpdate(toUpdate);
    setBulkLedgerTarget('');
  };

  const handleBulkPushApproved = () => {
    const approvedTxns = transactions.filter(
      (t) =>
        t.reviewStatus === 'APPROVED' &&
        t.tallyStatus !== 'SYNCED' &&
        t.tallyStatus !== 'ALREADY_SYNCED' &&
        (selectedIds.size === 0 || selectedIds.has(t.id))
    );
    if (approvedTxns.length === 0) return;
    onPushApprovedToTally(approvedTxns);
  };

  const approvedPendingPushCount = useMemo(() => {
    return transactions.filter(
      (t) => t.reviewStatus === 'APPROVED' && t.tallyStatus !== 'SYNCED' && t.tallyStatus !== 'ALREADY_SYNCED'
    ).length;
  }, [transactions]);

  const activeLedgers = useMemo(() => {
    return ledgers.filter((l) => l.status === 'ACTIVE');
  }, [ledgers]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Transaction Review & Classification</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800">
              {filteredTransactions.length} of {transactions.length} Txns
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI suggests ledgers based on narration. Review, edit ledger, and approve before pushing to Tally.
          </p>
        </div>

        {/* Global Push to Tally CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkPushApproved}
            disabled={approvedPendingPushCount === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
            title="Push all approved transactions to Tally Prime"
          >
            <Send className="w-4 h-4" />
            <span>Push Approved to Tally ({approvedPendingPushCount})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by narration, amount, or ledger..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { key: 'ALL', label: 'All Txns' },
              { key: 'PENDING', label: 'Pending Review' },
              { key: 'APPROVED', label: 'Approved' },
              { key: 'REJECTED', label: 'Rejected' },
              { key: 'DUPLICATES', label: 'Duplicates' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === filter.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Confidence filter */}
        <div className="flex items-center gap-2 text-xs text-slate-600 border-l border-slate-200 pl-3">
          <span>Confidence:</span>
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value as any)}
            className="border border-slate-200 rounded-lg p-1.5 text-xs bg-slate-50 font-medium outline-none"
          >
            <option value="ALL">All Scores</option>
            <option value="HIGH">High (≥85%)</option>
            <option value="LOW">Review (&lt;85%)</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when rows are selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-950 text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="bg-indigo-600 px-2.5 py-0.5 rounded-full font-mono">{selectedIds.size}</span>
            <span>transactions selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Bulk Ledger Change */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-[11px] text-slate-400">Set Ledger:</span>
              <select
                value={bulkLedgerTarget}
                onChange={(e) => setBulkLedgerTarget(e.target.value)}
                className="bg-transparent text-xs text-slate-200 outline-none max-w-[150px]"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  Select ledger...
                </option>
                {activeLedgers.map((l) => (
                  <option key={l.id} value={l.name} className="bg-slate-900 text-slate-200">
                    {l.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkChangeLedger}
                disabled={!bulkLedgerTarget}
                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded text-[11px] font-semibold"
              >
                Apply
              </button>
            </div>

            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Selected</span>
            </button>

            <button
              onClick={handleBulkReject}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject Selected</span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Review Table or Empty State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No transactions to review</div>
            <div className="text-xs text-slate-400 max-w-sm mx-auto">
              {transactions.length === 0
                ? 'No bank statements have been uploaded yet. Upload a statement in Bank Statements view.'
                : 'No transactions match the selected filters.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button onClick={handleSelectAll} className="p-0.5 text-slate-400 hover:text-slate-700">
                      {selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 min-w-[220px]">Narration</th>
                  <th className="py-3 px-3 text-right">Debit (Dr)</th>
                  <th className="py-3 px-3 text-right">Credit (Cr)</th>
                  <th className="py-3 px-3 text-center">Type</th>
                  <th className="py-3 px-3">Suggested Ledger</th>
                  <th className="py-3 px-3 min-w-[240px]">
                    <div className="flex items-center justify-between">
                      <span>Final Ledger</span>
                      <button
                        onClick={() => onOpenCreateLedger()}
                        className="text-[10px] text-indigo-600 hover:underline normal-case font-semibold"
                      >
                        + Create
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-2 text-center">Confidence</th>
                  <th className="py-3 px-2 text-center">Duplicate</th>
                  <th className="py-3 px-3 text-center">Review Status</th>
                  <th className="py-3 px-3 text-center">Tally Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((txn) => {
                  const isSelected = selectedIds.has(txn.id);
                  const isLowConf = txn.confidence < 75;

                  return (
                    <tr
                      key={txn.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      } ${txn.isDuplicate ? 'bg-purple-50/30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleSelect(txn.id)}
                          className="p-0.5 text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{txn.date}</td>

                      {/* Narration */}
                      <td className="py-3 px-3 font-medium text-slate-900 max-w-[260px]">
                        <div className="truncate" title={txn.narration}>
                          {txn.narration}
                        </div>
                        {txn.isDuplicate && (
                          <div className="text-[10px] text-purple-700 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-purple-600 shrink-0" />
                            <span className="truncate">{txn.duplicateReason || 'Duplicate detected'}</span>
                          </div>
                        )}
                      </td>

                      {/* Debit */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-rose-700 whitespace-nowrap">
                        {txn.debit ? `₹${txn.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      {/* Credit */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {txn.credit ? `₹${txn.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      {/* Transaction Type */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            txn.transactionType === 'RECEIPT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : txn.transactionType === 'CONTRA'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {txn.transactionType}
                        </span>
                      </td>

                      {/* Suggested Ledger */}
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                          {txn.suggestedLedger}
                        </span>
                      </td>

                      {/* Final Ledger (EDITABLE DROPDOWN + CREATE NEW) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <select
                            value={txn.finalLedger}
                            onChange={(e) => handleLedgerChange(txn, e.target.value)}
                            className="w-full text-xs font-semibold text-slate-900 border border-slate-300 rounded-lg p-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <optgroup label="Available Ledgers">
                              {activeLedgers.map((l) => (
                                <option key={l.id} value={l.name}>
                                  {l.name} ({l.parentGroup})
                                </option>
                              ))}
                            </optgroup>
                            <option value="__CREATE_NEW__" className="text-indigo-600 font-bold">
                              + Create New Ledger...
                            </option>
                          </select>
                        </div>
                      </td>

                      {/* Confidence Score */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            txn.confidence >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : txn.confidence >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                          title={`Confidence: ${txn.confidence}%`}
                        >
                          {txn.confidence}%
                        </span>
                      </td>

                      {/* Duplicate Badge & Actions */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        {txn.isDuplicate ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                              ⚠ Duplicate
                            </span>
                            <button
                              onClick={() => {
                                const updated = { ...txn, isDuplicate: false, duplicateReason: undefined };
                                onTransactionUpdated(updated);
                              }}
                              className="text-[10px] text-indigo-600 hover:underline"
                              title="Keep transaction despite duplicate match"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Review Status (Pending / Approved / Rejected) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                          <button
                            onClick={() => handleStatusChange(txn, 'APPROVED')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                              txn.reviewStatus === 'APPROVED'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700'
                            }`}
                            title="Approve transaction for Tally push"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(txn, 'PENDING')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                              txn.reviewStatus === 'PENDING'
                                ? 'bg-amber-500 text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-amber-700'
                            }`}
                            title="Mark as Pending Review"
                          >
                            Pending
                          </button>
                          <button
                            onClick={() => handleStatusChange(txn, 'REJECTED')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                              txn.reviewStatus === 'REJECTED'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700'
                            }`}
                            title="Reject transaction"
                          >
                            Reject
                          </button>
                        </div>
                      </td>

                      {/* Tally Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {txn.tallyStatus === 'SYNCED' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px] flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Synced</span>
                          </span>
                        ) : txn.tallyStatus === 'ALREADY_SYNCED' ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px]">
                            Already in Tally
                          </span>
                        ) : txn.tallyStatus === 'FAILED' ? (
                          <span
                            className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[10px] flex items-center justify-center gap-1"
                            title={txn.syncError}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Not Pushed</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => onOpenVoucherPreview(txn)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                          title="Preview Tally Accounting Voucher"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onPushToTallySingle(txn)}
                          disabled={txn.reviewStatus !== 'APPROVED' || txn.tallyStatus === 'SYNCED' || txn.tallyStatus === 'ALREADY_SYNCED'}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 disabled:opacity-30 rounded hover:bg-slate-100 transition-colors"
                          title="Push to Tally Prime"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
