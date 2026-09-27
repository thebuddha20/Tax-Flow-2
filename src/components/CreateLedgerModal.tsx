import React, { useState } from 'react';
import { PlusCircle, X, Check } from 'lucide-react';
import { Ledger, LedgerParentGroup } from '../types/index.ts';
import { Store } from '../services/store.ts';

interface CreateLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLedgerCreated: (newLedger: Ledger) => void;
  defaultName?: string;
}

const PARENT_GROUPS: LedgerParentGroup[] = [
  'Indirect Expenses',
  'Direct Expenses',
  'Bank Accounts',
  'Cash-in-hand',
  'Current Assets',
  'Current Liabilities',
  'Sundry Debtors',
  'Sundry Creditors',
  'Sales Accounts',
  'Purchase Accounts',
  'Duties & Taxes',
  'Capital Account',
  'Fixed Assets',
  'Suspense Account',
];

export const CreateLedgerModal: React.FC<CreateLedgerModalProps> = ({
  isOpen,
  onClose,
  onLedgerCreated,
  defaultName = '',
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(defaultName);
  const [parentGroup, setParentGroup] = useState<LedgerParentGroup>('Indirect Expenses');
  const [nature, setNature] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [gstApplicable, setGstApplicable] = useState(true);
  const [gstRate, setGstRate] = useState<number>(18);
  const [tallyLedgerId, setTallyLedgerId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ledger name is required.');
      return;
    }

    const newLedger: Ledger = {
      id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      parentGroup,
      nature,
      gstApplicable,
      gstRate: gstApplicable ? gstRate : 0,
      status: 'ACTIVE',
      tallyLedgerId: tallyLedgerId.trim() || undefined,
      isCustom: true,
    };

    Store.saveLedger(newLedger);
    onLedgerCreated(newLedger);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Create New Ledger Master</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ledger Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AWS Cloud Expenses, Swiggy Staff Meals"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parent Group <span className="text-rose-500">*</span>
              </label>
              <select
                value={parentGroup}
                onChange={(e) => setParentGroup(e.target.value as LedgerParentGroup)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {PARENT_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nature</label>
              <select
                value={nature}
                onChange={(e) => setNature(e.target.value as 'DEBIT' | 'CREDIT')}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="DEBIT">Debit (Dr)</option>
                <option value="CREDIT">Credit (Cr)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gstApplicable"
                checked={gstApplicable}
                onChange={(e) => setGstApplicable(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="gstApplicable" className="text-xs font-semibold text-slate-700 cursor-pointer">
                GST Applicable
              </label>
            </div>

            {gstApplicable && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tally Ledger ID (Optional)
            </label>
            <input
              type="text"
              value={tallyLedgerId}
              onChange={(e) => setTallyLedgerId(e.target.value)}
              placeholder="e.g. TL_AWS_EXPENSES"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Save & Use Ledger</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
