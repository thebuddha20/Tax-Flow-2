import React from 'react';
import {
  FileSpreadsheet,
  CheckSquare,
  Clock,
  CheckCircle2,
  Send,
  Check,
  AlertTriangle,
  Copy,
  ArrowRight,
  UploadCloud,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { BankStatement, Transaction, TallyConnectionConfig } from '../types/index.ts';

interface DashboardViewProps {
  stats: {
    statementsProcessed: number;
    totalTransactions: number;
    pendingReview: number;
    approved: number;
    pendingTallyPush: number;
    successfullySynced: number;
    failedSync: number;
    duplicates: number;
    tallyStatus: 'CONNECTED' | 'OFFLINE';
    tallyCompany: string;
  };
  statements: BankStatement[];
  recentTransactions: Transaction[];
  tallyConfig: TallyConnectionConfig;
  onNavigate: (view: string) => void;
  onUploadClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  statements,
  recentTransactions,
  tallyConfig,
  onNavigate,
  onUploadClick,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner with Tally status & Upload action */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CA Bank Automation Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated statement extraction, intelligent ledger classification, CA review, and direct Tally Prime sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
              stats.tallyStatus === 'CONNECTED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                stats.tallyStatus === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span>Tally: {stats.tallyStatus === 'CONNECTED' ? '🟢 Connected' : '🔴 Offline'}</span>
            {stats.tallyCompany && stats.tallyCompany !== 'Not Configured' && (
              <span className="font-normal text-slate-600">({stats.tallyCompany})</span>
            )}
          </div>

          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Bank Statement</span>
          </button>
        </div>
      </div>

      {/* 8 Real Database Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Statements Processed */}
        <div
          onClick={() => onNavigate('statements')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Statements Processed</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.statementsProcessed}</div>
          <div className="mt-1 text-[11px] text-slate-400">PDF, Excel & CSV files</div>
        </div>

        {/* Card 2: Total Transactions */}
        <div
          onClick={() => onNavigate('transactions')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Transactions</span>
            <CheckSquare className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.totalTransactions}</div>
          <div className="mt-1 text-[11px] text-slate-400">Extracted from statements</div>
        </div>

        {/* Card 3: Pending Review */}
        <div
          onClick={() => onNavigate('transactions')}
          className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm hover:border-amber-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{stats.pendingReview}</div>
          <div className="mt-1 text-[11px] text-amber-600">Requires CA approval</div>
        </div>

        {/* Card 4: Approved */}
        <div
          onClick={() => onNavigate('transactions')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
            <span>Approved by CA</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.approved}</div>
          <div className="mt-1 text-[11px] text-slate-400">Ledger confirmed</div>
        </div>

        {/* Card 5: Pending Tally Push */}
        <div
          onClick={() => onNavigate('tally')}
          className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm hover:border-blue-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
            <span>Pending Tally Push</span>
            <Send className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{stats.pendingTallyPush}</div>
          <div className="mt-1 text-[11px] text-blue-600">Approved vouchers ready</div>
        </div>

        {/* Card 6: Successfully Synced */}
        <div
          onClick={() => onNavigate('sync-history')}
          className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Successfully Synced</span>
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{stats.successfullySynced}</div>
          <div className="mt-1 text-[11px] text-emerald-600">Active vouchers in Tally</div>
        </div>

        {/* Card 7: Failed Sync */}
        <div
          onClick={() => onNavigate('sync-history')}
          className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm hover:border-rose-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
            <span>Failed Sync</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900">{stats.failedSync}</div>
          <div className="mt-1 text-[11px] text-rose-600">Offline or ledger mismatch</div>
        </div>

        {/* Card 8: Duplicates */}
        <div
          onClick={() => onNavigate('transactions')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-purple-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium">
            <span>Duplicates Flagged</span>
            <Copy className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.duplicates}</div>
          <div className="mt-1 text-[11px] text-slate-400">Cross-checked by fingerprint</div>
        </div>
      </div>

      {/* Main Working Section or Empty State */}
      {statements.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-dashed border-slate-300 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No bank statements yet</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Upload your first bank statement in PDF, Excel (XLS/XLSX), or CSV format. TaxFlow will automatically extract
            transactions and suggest ledgers for your review.
          </p>
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Bank Statement</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Statements */}
          <div className="lg:col-span-1 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Uploaded Statements</h3>
              <button
                onClick={() => onNavigate('statements')}
                className="text-xs text-indigo-600 hover:underline font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {statements.slice(0, 4).map((stmt) => (
                <div
                  key={stmt.id}
                  onClick={() => onNavigate('transactions')}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-lg border border-slate-200/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between font-medium text-xs text-slate-900">
                    <span className="truncate max-w-[180px]">{stmt.fileName}</span>
                    <span className="text-[10px] text-slate-400">
                      {(stmt.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>{stmt.transactionCount} txns detected</span>
                    <span className="text-emerald-700 font-medium">Ready for review</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Review Action Area */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Pending Transactions Review</h3>
                <p className="text-xs text-slate-500">Latest extracted bank entries awaiting CA ledger approval</p>
              </div>
              <button
                onClick={() => onNavigate('transactions')}
                className="text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
              >
                Open Full Review Table
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                All uploaded transactions have been reviewed and approved!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-medium">
                      <th className="py-2">Date</th>
                      <th className="py-2">Narration</th>
                      <th className="py-2 text-right">Amount (₹)</th>
                      <th className="py-2">Suggested Ledger</th>
                      <th className="py-2 text-center">Confidence</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.slice(0, 5).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 font-mono text-slate-600">{t.date}</td>
                        <td className="py-2.5 font-medium text-slate-900 max-w-[200px] truncate" title={t.narration}>
                          {t.narration}
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-slate-800">
                          ₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 text-indigo-700 font-medium">{t.suggestedLedger}</td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.confidence >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.confidence >= 75
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {t.confidence}%
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              t.reviewStatus === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {t.reviewStatus}
                          </span>
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
