import React, { useState } from 'react';
import { FileText, Send, X, Edit2, Check, ArrowRight } from 'lucide-react';
import { Transaction, Ledger } from '../types/index.ts';
import { generateTallyVoucherXML } from '../services/tallyConnector.ts';

interface VoucherPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  bankLedgerName?: string;
  tallyCompany: string;
  onConfirmPush: (updatedTxn: Transaction) => void;
}

export const VoucherPreviewModal: React.FC<VoucherPreviewModalProps> = ({
  isOpen,
  onClose,
  transaction,
  bankLedgerName = 'Bank Account (HDFC/ICICI/SBI)',
  tallyCompany,
  onConfirmPush,
}) => {
  if (!isOpen || !transaction) return null;

  const [date, setDate] = useState(transaction.date);
  const [narration, setNarration] = useState(transaction.narration);
  const [voucherType, setVoucherType] = useState<'Payment' | 'Receipt' | 'Contra'>(
    transaction.transactionType === 'RECEIPT'
      ? 'Receipt'
      : transaction.transactionType === 'CONTRA'
      ? 'Contra'
      : 'Payment'
  );
  const [finalLedger, setFinalLedger] = useState(transaction.finalLedger);
  const [debitLedger, setDebitLedger] = useState(
    voucherType === 'Payment'
      ? transaction.finalLedger
      : voucherType === 'Receipt'
      ? bankLedgerName
      : 'Cash A/c'
  );
  const [creditLedger, setCreditLedger] = useState(
    voucherType === 'Payment'
      ? bankLedgerName
      : voucherType === 'Receipt'
      ? transaction.finalLedger
      : bankLedgerName
  );
  const [reference, setReference] = useState(transaction.id);
  const [showXml, setShowXml] = useState(false);

  const handlePush = () => {
    const updated: Transaction = {
      ...transaction,
      date,
      narration,
      finalLedger,
      transactionType: voucherType === 'Receipt' ? 'RECEIPT' : voucherType === 'Contra' ? 'CONTRA' : 'PAYMENT',
    };
    onConfirmPush(updated);
    onClose();
  };

  const xmlPreview = generateTallyVoucherXML(
    {
      ...transaction,
      date,
      narration,
      finalLedger,
      transactionType: voucherType === 'Receipt' ? 'RECEIPT' : voucherType === 'Contra' ? 'CONTRA' : 'PAYMENT',
    },
    tallyCompany || 'ABC Enterprises'
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Voucher Preview (Tally Prime Format)</h3>
              <p className="text-xs text-slate-500">
                Target Company: <span className="font-semibold text-slate-700">{tallyCompany || 'Default Active Company'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voucher Preview Details */}
        <div className="p-6 space-y-5">
          {/* Double Entry Box */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-inner space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold">
                Tally Voucher Entry
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {voucherType} Voucher
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <div className="text-slate-400 uppercase text-[10px]">Debit (Dr) Ledger</div>
                <div className="text-emerald-400 font-bold text-sm truncate">{debitLedger}</div>
                <div className="text-slate-300">
                  Amount: ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="text-slate-400 uppercase text-[10px]">Credit (Cr) Ledger</div>
                <div className="text-amber-400 font-bold text-sm truncate">{creditLedger}</div>
                <div className="text-slate-300">
                  Amount: ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Editable Voucher Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher Type</label>
              <select
                value={voucherType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setVoucherType(val);
                  if (val === 'Payment') {
                    setDebitLedger(finalLedger);
                    setCreditLedger(bankLedgerName);
                  } else if (val === 'Receipt') {
                    setDebitLedger(bankLedgerName);
                    setCreditLedger(finalLedger);
                  } else {
                    setDebitLedger('Cash A/c');
                    setCreditLedger(bankLedgerName);
                  }
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Payment">Payment Voucher (Expense/Vendor)</option>
                <option value="Receipt">Receipt Voucher (Client/Income)</option>
                <option value="Contra">Contra Voucher (Bank/Cash)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date (DD/MM/YYYY)</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Narration</label>
            <input
              type="text"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
              <div className="text-xs font-mono font-bold text-slate-900 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference ID</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Toggle XML view */}
          <div>
            <button
              type="button"
              onClick={() => setShowXml(!showXml)}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              {showXml ? 'Hide Tally XML Payload' : 'Inspect Raw Tally Prime XML'}
            </button>
            {showXml && (
              <pre className="mt-2 p-3 bg-slate-950 text-slate-300 rounded-lg text-[10px] font-mono overflow-x-auto max-h-40 border border-slate-800">
                {xmlPreview}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {transaction.tallyStatus === 'SYNCED' ? (
              <span className="text-emerald-700 font-semibold">Already synced in Tally</span>
            ) : (
              <span>Verified & Approved for Tally</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePush}
              disabled={transaction.tallyStatus === 'SYNCED' || transaction.tallyStatus === 'ALREADY_SYNCED'}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>Confirm & Push to Tally</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
