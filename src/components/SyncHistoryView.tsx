import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  Check,
  Send,
  Building,
} from 'lucide-react';
import { SyncHistoryItem, Transaction } from '../types/index.ts';

interface SyncHistoryViewProps {
  history: SyncHistoryItem[];
  transactions: Transaction[];
  onRetrySync: (transactionId: string) => void;
}

export const SyncHistoryView: React.FC<SyncHistoryViewProps> = ({
  history,
  transactions,
  onRetrySync,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.narration.toLowerCase().includes(q) ||
        (item.voucherNumber && item.voucherNumber.toLowerCase().includes(q)) ||
        (item.tallyCompany && item.tallyCompany.toLowerCase().includes(q)) ||
        item.amount.toString().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tally Synchronization History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit record of every voucher push to Tally Prime with voucher numbers, status, and retry options.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          Total Sync Attempts: <span className="text-slate-900">{history.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sync history by narration, voucher #, or company..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Logs' },
            { key: 'SUCCESS', label: 'Success' },
            { key: 'FAILED', label: 'Failed' },
            { key: 'ALREADY_SYNCED', label: 'Already Synced' },
            { key: 'PENDING', label: 'Pending Sync' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Table or Empty State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No Tally synchronization history yet</div>
            <div className="text-xs text-slate-400 max-w-sm mx-auto">
              Once you review and approve bank transactions, click "Push to Tally" to see synchronization status and
              Tally voucher numbers here.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 min-w-[200px]">Transaction Narration</th>
                  <th className="py-3 px-4 text-center">Voucher Type</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Tally Company</th>
                  <th className="py-3 px-4 font-mono">Voucher #</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Error / Response</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-[240px] truncate" title={item.narration}>
                      {item.narration}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-[10px]">
                        {item.voucherType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.tallyCompany}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                      {item.voucherNumber || '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'ALREADY_SYNCED'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={item.errorMessage || ''}>
                      {item.errorMessage || (
                        <span className="text-emerald-600 font-medium">Successfully created in Tally</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {item.status === 'FAILED' ? (
                        <button
                          onClick={() => onRetrySync(item.transactionId)}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded transition-colors ml-auto"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
