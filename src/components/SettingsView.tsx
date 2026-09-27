import React, { useState } from 'react';
import {
  Settings,
  Shield,
  History,
  UserCheck,
  Building,
  Key,
  Database,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { User, AuditLog, UserRole } from '../types/index.ts';
import { Store } from '../services/store.ts';

interface SettingsViewProps {
  currentUser: User | null;
  onUpdateUserRole: (role: UserRole) => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUpdateUserRole,
  onClearAllData,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(Store.getAuditLogs());
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settings & CA Audit Trail</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Role-based permissions, accounting audit log, and application data management.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Role Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Active CA User Profile</span>
          </div>

          {currentUser && (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Name:</span>
                <span className="font-semibold text-slate-800 text-sm">{currentUser.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Email:</span>
                <span className="font-mono text-slate-700">{currentUser.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CA Firm:</span>
                <span className="font-medium text-slate-800">{currentUser.firmName}</span>
              </div>
              <div className="pt-2">
                <label className="text-slate-700 font-semibold block mb-1">Switch Active Role:</label>
                <select
                  value={currentUser.role}
                  onChange={(e) => onUpdateUserRole(e.target.value as UserRole)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-semibold text-indigo-700 outline-none"
                >
                  <option value="CA_OWNER">CA / OWNER (Full Permissions)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (Edit Ledgers & Review)</option>
                  <option value="REVIEWER">REVIEWER (Read & Suggest Only)</option>
                </select>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
            <div className="font-semibold text-slate-700">Role Permissions:</div>
            <div>• CA / OWNER: Approve, Push to Tally, Edit Ledgers</div>
            <div>• ACCOUNTANT: Edit Ledgers, Review Transactions</div>
            <div>• REVIEWER: Read-only ledger verification</div>
          </div>
        </div>

        {/* Database & Storage Management */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Database & Storage</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            All bank statements, transactions, review decisions, ledger mappings, and audit history are stored
            persistently in the local database.
          </p>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="text-xs font-semibold text-slate-700">Reset Data:</div>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="w-full px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition-colors"
              >
                Clear All Statements & Transactions
              </button>
            ) : (
              <div className="space-y-2 bg-rose-50 p-3 rounded-lg border border-rose-200 text-xs">
                <span className="font-semibold text-rose-900">Are you sure? This cannot be undone.</span>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      onClearAllData();
                      setConfirmClear(false);
                      setAuditLogs(Store.getAuditLogs());
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Application Compliance Details */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>CA Compliance Architecture</span>
          </div>

          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>No Silent Accounting:</strong> AI only suggests; CA must explicitly review and approve.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Duplicate Protection:</strong> Fingerprint checks prevent duplicate Tally vouchers.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Audit Logged:</strong> Every ledger modification and voucher push is timestamped.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Audit Trail Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <History className="w-4 h-4 text-indigo-600" />
            <span>Audit Trail ({auditLogs.length} events logged)</span>
          </div>
          <span className="text-[11px] text-slate-400">Chronological System Events</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">No audit events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{log.user}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{log.details}</td>
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
