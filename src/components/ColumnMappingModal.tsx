import React, { useState } from 'react';
import { SlidersHorizontal, Check, X } from 'lucide-react';
import { ColumnMapping } from '../types/index.ts';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  sampleRows: any[];
  fileName: string;
  initialMapping?: ColumnMapping;
  onApplyMapping: (mapping: ColumnMapping) => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  headers,
  sampleRows,
  fileName,
  initialMapping,
  onApplyMapping,
}) => {
  if (!isOpen) return null;

  const [dateCol, setDateCol] = useState(initialMapping?.dateCol || headers[0] || '');
  const [narrationCol, setNarrationCol] = useState(initialMapping?.narrationCol || headers[1] || '');
  const [debitCol, setDebitCol] = useState(initialMapping?.debitCol || '');
  const [creditCol, setCreditCol] = useState(initialMapping?.creditCol || '');
  const [amountCol, setAmountCol] = useState(initialMapping?.amountCol || '');
  const [balanceCol, setBalanceCol] = useState(initialMapping?.balanceCol || '');

  const handleApply = () => {
    onApplyMapping({
      dateCol,
      narrationCol,
      debitCol,
      creditCol,
      amountCol,
      balanceCol,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Map Statement Columns</h3>
              <p className="text-xs text-slate-500">File: {fileName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600">
            Please map the columns from your bank statement so TaxFlow can extract dates, narrations, and amounts accurately:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date Column <span className="text-rose-500">*</span>
              </label>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Select Date Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Narration / Description Column <span className="text-rose-500">*</span>
              </label>
              <select
                value={narrationCol}
                onChange={(e) => setNarrationCol(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Select Narration Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Debit / Withdrawal (Dr) Column
              </label>
              <select
                value={debitCol}
                onChange={(e) => setDebitCol(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- None / Use Single Amount Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Credit / Deposit (Cr) Column
              </label>
              <select
                value={creditCol}
                onChange={(e) => setCreditCol(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- None / Use Single Amount Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Single Amount Column (Optional)
              </label>
              <select
                value={amountCol}
                onChange={(e) => setAmountCol(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Optional if Debit/Credit mapped --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Closing Balance Column (Optional)
              </label>
              <select
                value={balanceCol}
                onChange={(e) => setBalanceCol(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- None --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sample Preview */}
          {sampleRows && sampleRows.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Sample Row 1 Preview:
              </div>
              <div className="text-xs font-mono text-slate-800 break-all">
                {JSON.stringify(sampleRows[0]).slice(0, 180)}...
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!dateCol || !narrationCol}
            className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Process Statement</span>
          </button>
        </div>
      </div>
    </div>
  );
};
