export type UserRole = 'CA_OWNER' | 'ACCOUNTANT' | 'REVIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  firmName: string;
}

export type StatementStatus = 'PARSING' | 'COMPLETED' | 'ERROR';

export interface BankStatement {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  status: StatementStatus;
  bankName: string;
  accountNumber?: string;
  transactionCount: number;
  duplicateCount: number;
  reviewCount: number;
  errorMessage?: string;
}

export type TransactionType = 'PAYMENT' | 'RECEIPT' | 'CONTRA';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TallyStatus = 'NOT_PUSHED' | 'PENDING_PUSH' | 'SYNCED' | 'FAILED' | 'ALREADY_SYNCED';

export interface Transaction {
  id: string;
  statementId: string;
  date: string; // DD/MM/YYYY
  narration: string;
  debit: number | null;
  credit: number | null;
  amount: number;
  balance?: number | null;
  transactionType: TransactionType;
  suggestedLedger: string;
  finalLedger: string;
  confidence: number; // 0 - 100
  isDuplicate: boolean;
  duplicateReason?: string;
  reviewStatus: ReviewStatus;
  tallyStatus: TallyStatus;
  tallyVoucherId?: string;
  tallyVoucherNumber?: string;
  syncDate?: string;
  syncError?: string;
  fingerprint: string;
  notes?: string;
}

export type LedgerParentGroup =
  | 'Indirect Expenses'
  | 'Direct Expenses'
  | 'Bank Accounts'
  | 'Cash-in-hand'
  | 'Current Assets'
  | 'Current Liabilities'
  | 'Sundry Debtors'
  | 'Sundry Creditors'
  | 'Sales Accounts'
  | 'Purchase Accounts'
  | 'Duties & Taxes'
  | 'Capital Account'
  | 'Fixed Assets'
  | 'Suspense Account';

export interface Ledger {
  id: string;
  name: string;
  parentGroup: LedgerParentGroup;
  nature: 'DEBIT' | 'CREDIT';
  gstApplicable: boolean;
  gstRate: number; // 0, 5, 12, 18, 28
  status: 'ACTIVE' | 'INACTIVE';
  tallyLedgerId?: string;
  isCustom?: boolean;
}

export interface LearningRule {
  id: string;
  keyword: string;
  targetLedger: string;
  confidence: number;
  matchCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TallyConnectionConfig {
  connectorUrl: string; // e.g. http://localhost:9000 or http://localhost:8080
  isConnected: boolean;
  status: 'CONNECTED' | 'OFFLINE';
  lastTestedAt?: string;
  lastSyncAt?: string;
  taxflowCompany: string;
  tallyCompany: string;
  errorMessage?: string;
}

export interface SyncHistoryItem {
  id: string;
  timestamp: string;
  transactionId: string;
  narration: string;
  date: string;
  voucherType: 'Payment' | 'Receipt' | 'Contra';
  amount: number;
  tallyCompany: string;
  voucherNumber?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'ALREADY_SYNCED';
  errorMessage?: string;
  tallyVoucherId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  recordId?: string;
}

export interface ColumnMapping {
  dateCol: string;
  narrationCol: string;
  debitCol: string;
  creditCol: string;
  amountCol?: string;
  balanceCol?: string;
  typeCol?: string;
}
