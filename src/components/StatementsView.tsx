import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  Info,
} from 'lucide-react';
import { BankStatement, ColumnMapping, Transaction } from '../types/index.ts';
import { parsePDF, parseExcel, parseCSV, buildTransactionsFromRows } from '../services/parser.ts';
import { detectDuplicates } from '../services/classifier.ts';
import { Store } from '../services/store.ts';

interface StatementsViewProps {
  statements: BankStatement[];
  onStatementAdded: (stmt: BankStatement, newTxns: Transaction[]) => void;
  onStatementDeleted: (id: string) => void;
  onNavigateToReview: (statementId?: string) => void;
  onOpenColumnMapping: (rawRows: any[], headers: string[], stmtId: string, fileName: string) => void;
}

export const StatementsView: React.FC<StatementsViewProps> = ({
  statements,
  onStatementAdded,
  onStatementDeleted,
  onNavigateToReview,
  onOpenColumnMapping,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState<number>(25);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    setErrorMsg(null);
    const maxBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMsg(`File size exceeds maximum allowed size of ${maxFileSizeMB}MB.`);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'xls', 'xlsx', 'csv'].includes(ext || '')) {
      setErrorMsg('Unsupported file format. Please upload PDF, Excel (XLS, XLSX), or CSV.');
      return;
    }

    setIsProcessing(true);
    setProgress(20);
    setStatusMessage('Reading file data...');

    const statementId = `stmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const bankName = file.name.toUpperCase().includes('HDFC')
      ? 'HDFC Bank'
      : file.name.toUpperCase().includes('ICICI')
      ? 'ICICI Bank'
      : file.name.toUpperCase().includes('SBI')
      ? 'State Bank of India'
      : file.name.toUpperCase().includes('AXIS')
      ? 'Axis Bank'
      : file.name.toUpperCase().includes('KOTAK')
      ? 'Kotak Mahindra Bank'
      : 'Bank Account';

    try {
      setProgress(40);
      setStatusMessage(`Parsing ${ext?.toUpperCase()} structure...`);

      let parseResult;
      if (ext === 'pdf') {
        parseResult = await parsePDF(file, statementId);
      } else if (ext === 'csv') {
        parseResult = await parseCSV(file, statementId);
      } else {
        parseResult = await parseExcel(file, statementId);
      }

      setProgress(70);
      setStatusMessage('Extracting transactions and detecting columns...');

      if (parseResult.error && parseResult.transactions.length === 0) {
        setIsProcessing(false);
        setErrorMsg(parseResult.error);
        return;
      }

      // If column detection was ambiguous for Excel or CSV, open manual column mapping!
      if (parseResult.needsColumnMapping && parseResult.rawRows.length > 0) {
        setIsProcessing(false);
        onOpenColumnMapping(parseResult.rawRows, parseResult.detectedHeaders, statementId, file.name);
        return;
      }

      setProgress(85);
      setStatusMessage('Checking for duplicate bank entries...');

      const existingTxns = Store.getTransactions();
      const txnsWithDuplicates = detectDuplicates(parseResult.transactions, existingTxns);

      const duplicatesCount = txnsWithDuplicates.filter((t) => t.isDuplicate).length;
      const reviewRequired = txnsWithDuplicates.filter((t) => t.confidence < 80 || t.isDuplicate).length;

      const newStatement: BankStatement = {
        id: statementId,
        fileName: file.name,
        fileSize: file.size,
        fileType: ext?.toUpperCase() || 'FILE',
        uploadDate: new Date().toISOString(),
        status: 'COMPLETED',
        bankName,
        transactionCount: txnsWithDuplicates.length,
        duplicateCount: duplicatesCount,
        reviewCount: reviewRequired,
      };

      setProgress(100);
      setStatusMessage('Transactions ready for CA review!');

      onStatementAdded(newStatement, txnsWithDuplicates);

      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setStatusMessage('');
        onNavigateToReview(statementId);
      }, 500);
    } catch (err: any) {
      console.error('Statement processing error:', err);
      setIsProcessing(false);
      setErrorMsg(`Could not read this statement: ${err.message || 'Unknown parsing failure'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Bank Statements</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload PDF, Excel, or CSV bank statements for automated transaction extraction and ledger mapping.
          </p>
        </div>

        {/* Max file size setting */}
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <span>Max File Size:</span>
          <select
            value={maxFileSizeMB}
            onChange={(e) => setMaxFileSizeMB(Number(e.target.value))}
            className="font-semibold text-slate-900 bg-transparent outline-none cursor-pointer"
          >
            <option value={10}>10 MB</option>
            <option value={25}>25 MB</option>
            <option value={50}>50 MB</option>
          </select>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
            : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xls,.xlsx,.csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">Upload Bank Statement</h3>
            <p className="text-xs text-slate-500 mt-1">
              Drag & drop your statement file here, or click to browse
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 text-xs font-semibold text-slate-600 pt-1">
            <span className="px-2.5 py-1 bg-slate-100 rounded text-slate-700">PDF</span>
            <span className="px-2.5 py-1 bg-slate-100 rounded text-slate-700">XLS</span>
            <span className="px-2.5 py-1 bg-slate-100 rounded text-slate-700">XLSX</span>
            <span className="px-2.5 py-1 bg-slate-100 rounded text-slate-700">CSV</span>
          </div>

          <div className="text-[11px] text-slate-400">
            Supported banks: HDFC, ICICI, SBI, Axis, Kotak, PNB, Bank of Baroda & all standard formats
          </div>
        </div>
      </div>

      {/* Progress or Processing Indicator */}
      {isProcessing && (
        <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              {statusMessage || 'Processing statement...'}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Statement Processing Notice</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Uploaded Statements Table or Empty State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Processed Bank Statements</h3>
          <span className="text-xs text-slate-500">{statements.length} statements</span>
        </div>

        {statements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-medium text-slate-600">No statements uploaded yet</div>
            <div className="text-xs text-slate-400">
              Upload your bank statement above to extract transactions and start Tally automation.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">File Name</th>
                  <th className="py-3 px-4 font-semibold">Format</th>
                  <th className="py-3 px-4 font-semibold">Size</th>
                  <th className="py-3 px-4 font-semibold">Upload Date</th>
                  <th className="py-3 px-4 font-semibold text-center">Transactions</th>
                  <th className="py-3 px-4 font-semibold text-center">Duplicates</th>
                  <th className="py-3 px-4 font-semibold text-center">Needs Review</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statements.map((stmt) => (
                  <tr key={stmt.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="truncate max-w-[220px]" title={stmt.fileName}>
                        {stmt.fileName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700">
                        {stmt.fileType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {(stmt.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(stmt.uploadDate).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-900">
                      {stmt.transactionCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {stmt.duplicateCount > 0 ? (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                          {stmt.duplicateCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {stmt.reviewCount > 0 ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                          {stmt.reviewCount}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onNavigateToReview(stmt.id)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-semibold transition-colors"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => onStatementDeleted(stmt.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                        title="Delete statement and extracted transactions"
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
  );
};
