import React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Send, X } from 'lucide-react';
import { Transaction } from '../types/index.ts';

export interface PushStepProgress {
  currentTxnIndex: number;
  totalTxns: number;
  step: 'PREPARING' | 'SENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  successCount: number;
  failedCount: number;
  alreadySyncedCount: number;
  currentNarration: string;
  errorMessage?: string;
  isComplete: boolean;
}

interface PushProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: PushStepProgress;
}

export const PushProgressModal: React.FC<PushProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
}) => {
  if (!isOpen) return null;

  const percentage = progress.totalTxns > 0
    ? Math.round(((progress.currentTxnIndex + 1) / progress.totalTxns) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Send className="w-4 h-4 text-emerald-600" />
            <span>Tally Prime Direct Push</span>
          </div>
          {progress.isComplete && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          {/* Status animation icon */}
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-inner transition-all">
            {progress.isComplete ? (
              progress.failedCount === 0 ? (
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )
            ) : (
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {progress.isComplete
                ? 'Tally Synchronization Finished'
                : `Pushing Voucher ${progress.currentTxnIndex + 1} of ${progress.totalTxns}`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto truncate">
              {progress.currentNarration || 'Processing accounting vouchers...'}
            </p>
          </div>

          {/* Step badges */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-bold uppercase tracking-wider py-1">
            <div
              className={`p-1.5 rounded ${
                progress.step === 'PREPARING'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              Preparing
            </div>
            <div
              className={`p-1.5 rounded ${
                progress.step === 'SENDING'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              Sending
            </div>
            <div
              className={`p-1.5 rounded ${
                progress.step === 'PROCESSING'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              Processing
            </div>
            <div
              className={`p-1.5 rounded ${
                progress.isComplete
                  ? progress.failedCount === 0
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {progress.failedCount === 0 ? 'Success' : 'Result'}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.isComplete && progress.failedCount > 0 ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Counts */}
          <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold">Success</div>
              <div className="font-bold text-emerald-600 text-base">{progress.successCount}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold">Already Synced</div>
              <div className="font-bold text-blue-600 text-base">{progress.alreadySyncedCount}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold">Failed / Offline</div>
              <div className="font-bold text-rose-600 text-base">{progress.failedCount}</div>
            </div>
          </div>

          {progress.errorMessage && (
            <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 text-left font-medium">
              <span className="font-bold block">Tally Notice:</span>
              {progress.errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        {progress.isComplete && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              View Sync History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
