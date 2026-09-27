import {
  BankStatement,
  Transaction,
  Ledger,
  LearningRule,
  TallyConnectionConfig,
  SyncHistoryItem,
  AuditLog,
  User,
} from '../types/index.ts';

const STORAGE_KEYS = {
  USER: 'taxflow_user',
  STATEMENTS: 'taxflow_statements',
  TRANSACTIONS: 'taxflow_transactions',
  LEDGERS: 'taxflow_ledgers',
  RULES: 'taxflow_rules',
  TALLY_CONFIG: 'taxflow_tally_config',
  SYNC_HISTORY: 'taxflow_sync_history',
  AUDIT_LOGS: 'taxflow_audit_logs',
};

// Initial standard accounting ledgers available in any CA practice
const INITIAL_LEDGERS: Ledger[] = [
  {
    id: 'led-1',
    name: 'Bank Account (HDFC/ICICI/SBI)',
    parentGroup: 'Bank Accounts',
    nature: 'DEBIT',
    gstApplicable: false,
    gstRate: 0,
    status: 'ACTIVE',
    tallyLedgerId: 'TL_BANK_01',
  },
  {
    id: 'led-2',
    name: 'Cash A/c',
    parentGroup: 'Cash-in-hand',
    nature: 'DEBIT',
    gstApplicable: false,
    gstRate: 0,
    status: 'ACTIVE',
    tallyLedgerId: 'TL_CASH_01',
  },
  {
    id: 'led-3',
    name: 'Food Expenses',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 5,
    status: 'ACTIVE',
    tallyLedgerId: 'TL_FOOD_01',
  },
  {
    id: 'led-4',
    name: 'Office Expenses',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
    tallyLedgerId: 'TL_OFFICE_01',
  },
  {
    id: 'led-5',
    name: 'Staff Welfare Expenses',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-6',
    name: 'Travelling Expenses',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-7',
    name: 'Telephone & Internet Expenses',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-8',
    name: 'Electricity Expenses',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: false,
    gstRate: 0,
    status: 'ACTIVE',
  },
  {
    id: 'led-9',
    name: 'Repairs & Maintenance',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-10',
    name: 'Professional Fees',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-11',
    name: 'Rent Expense',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-12',
    name: 'Bank Charges',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-13',
    name: 'Cloud & Software Expenses',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-14',
    name: 'Client Receivable / Sundry Debtors',
    parentGroup: 'Sundry Debtors',
    nature: 'DEBIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-15',
    name: 'Vendor Payable / Sundry Creditors',
    parentGroup: 'Sundry Creditors',
    nature: 'CREDIT',
    gstApplicable: true,
    gstRate: 18,
    status: 'ACTIVE',
  },
  {
    id: 'led-16',
    name: 'Salaries & Wages',
    parentGroup: 'Direct Expenses',
    nature: 'DEBIT',
    gstApplicable: false,
    gstRate: 0,
    status: 'ACTIVE',
  },
  {
    id: 'led-17',
    name: 'Duties & Taxes (GST/TDS)',
    parentGroup: 'Duties & Taxes',
    nature: 'CREDIT',
    gstApplicable: false,
    gstRate: 0,
    status: 'ACTIVE',
  },
  {
    id: 'led-18',
    name: 'Miscellaneous Expenses',
    parentGroup: 'Indirect Expenses',
    nature: 'DEBIT',
    gstApplicable: false,
    gstRate: 0,
    status: 'ACTIVE',
  },
  {
    id: 'led-19',
    name: 'Suspense Account',
    parentGroup: 'Suspense Account',
    nature: 'DEBIT',
    gstApplicable: false,
    gstRate: 0,
    status: 'ACTIVE',
  },
];

// Initial classification learning rules
const INITIAL_RULES: LearningRule[] = [
  {
    id: 'rule-1',
    keyword: 'SWIGGY',
    targetLedger: 'Food Expenses',
    confidence: 95,
    matchCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-2',
    keyword: 'ZOMATO',
    targetLedger: 'Food Expenses',
    confidence: 95,
    matchCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-3',
    keyword: 'ELECTRICITY',
    targetLedger: 'Electricity Expenses',
    confidence: 95,
    matchCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-4',
    keyword: 'ATM CASH',
    targetLedger: 'Cash A/c',
    confidence: 98,
    matchCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-5',
    keyword: 'BANK CHARGES',
    targetLedger: 'Bank Charges',
    confidence: 98,
    matchCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-6',
    keyword: 'OFFICE RENT',
    targetLedger: 'Rent Expense',
    confidence: 95,
    matchCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-7',
    keyword: 'AWS',
    targetLedger: 'Cloud & Software Expenses',
    confidence: 92,
    matchCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-8',
    keyword: 'CLIENT PAYMENT',
    targetLedger: 'Client Receivable / Sundry Debtors',
    confidence: 90,
    matchCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_TALLY_CONFIG: TallyConnectionConfig = {
  connectorUrl: 'http://localhost:9000',
  isConnected: false,
  status: 'OFFLINE',
  taxflowCompany: '',
  tallyCompany: '',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

function safeSet<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

export const Store = {
  // Authentication & Current User
  getCurrentUser(): User | null {
    return safeGet<User | null>(STORAGE_KEYS.USER, null);
  },

  setCurrentUser(user: User | null): void {
    safeSet(STORAGE_KEYS.USER, user);
    if (user) {
      this.logAudit(user.name, 'USER_LOGIN', `Logged in as ${user.role}`);
    }
  },

  // Bank Statements (Starts EMPTY)
  getStatements(): BankStatement[] {
    return safeGet<BankStatement[]>(STORAGE_KEYS.STATEMENTS, []);
  },

  saveStatement(stmt: BankStatement): void {
    const list = this.getStatements();
    const existingIndex = list.findIndex((s) => s.id === stmt.id);
    if (existingIndex >= 0) {
      list[existingIndex] = stmt;
    } else {
      list.unshift(stmt);
    }
    safeSet(STORAGE_KEYS.STATEMENTS, list);
    this.logAudit('CA User', 'STATEMENT_UPLOADED', `Uploaded statement ${stmt.fileName}`, stmt.id);
  },

  deleteStatement(id: string): void {
    const list = this.getStatements().filter((s) => s.id !== id);
    safeSet(STORAGE_KEYS.STATEMENTS, list);
    // Also remove associated transactions
    const txns = this.getTransactions().filter((t) => t.statementId !== id);
    safeSet(STORAGE_KEYS.TRANSACTIONS, txns);
    this.logAudit('CA User', 'STATEMENT_DELETED', `Deleted statement ${id}`, id);
  },

  // Transactions (Starts EMPTY)
  getTransactions(): Transaction[] {
    return safeGet<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  },

  saveTransactions(newTxns: Transaction[]): void {
    const existing = this.getTransactions();
    const updated = [...newTxns, ...existing];
    safeSet(STORAGE_KEYS.TRANSACTIONS, updated);
  },

  updateTransaction(updated: Transaction): void {
    const list = this.getTransactions();
    const idx = list.findIndex((t) => t.id === updated.id);
    if (idx >= 0) {
      const old = list[idx];
      list[idx] = updated;
      safeSet(STORAGE_KEYS.TRANSACTIONS, list);

      if (old.finalLedger !== updated.finalLedger) {
        this.logAudit(
          'CA User',
          'LEDGER_CHANGED',
          `Changed ledger for txn "${updated.narration.slice(0, 30)}" from "${old.finalLedger}" to "${updated.finalLedger}"`,
          updated.id
        );
      }
      if (old.reviewStatus !== updated.reviewStatus) {
        this.logAudit(
          'CA User',
          updated.reviewStatus === 'APPROVED' ? 'TRANSACTION_APPROVED' : 'TRANSACTION_REJECTED',
          `Status changed to ${updated.reviewStatus} for txn "${updated.narration.slice(0, 30)}"`,
          updated.id
        );
      }
    }
  },

  bulkUpdateTransactions(txns: Transaction[]): void {
    const map = new Map(txns.map((t) => [t.id, t]));
    const current = this.getTransactions();
    const merged = current.map((item) => map.get(item.id) || item);
    safeSet(STORAGE_KEYS.TRANSACTIONS, merged);
  },

  // Ledgers (Editable Master)
  getLedgers(): Ledger[] {
    const list = safeGet<Ledger[]>(STORAGE_KEYS.LEDGERS, []);
    if (list.length === 0) {
      safeSet(STORAGE_KEYS.LEDGERS, INITIAL_LEDGERS);
      return INITIAL_LEDGERS;
    }
    return list;
  },

  saveLedger(ledger: Ledger): Ledger {
    const list = this.getLedgers();
    const idx = list.findIndex((l) => l.id === ledger.id);
    if (idx >= 0) {
      list[idx] = ledger;
      this.logAudit('CA User', 'LEDGER_EDITED', `Updated ledger ${ledger.name}`, ledger.id);
    } else {
      list.push(ledger);
      this.logAudit('CA User', 'LEDGER_CREATED', `Created new ledger ${ledger.name}`, ledger.id);
    }
    safeSet(STORAGE_KEYS.LEDGERS, list);
    return ledger;
  },

  // Learning Rules
  getRules(): LearningRule[] {
    const rules = safeGet<LearningRule[]>(STORAGE_KEYS.RULES, []);
    if (rules.length === 0) {
      safeSet(STORAGE_KEYS.RULES, INITIAL_RULES);
      return INITIAL_RULES;
    }
    return rules;
  },

  saveRule(rule: LearningRule): void {
    const list = this.getRules();
    const idx = list.findIndex((r) => r.id === rule.id || r.keyword.toLowerCase() === rule.keyword.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...rule, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(rule);
    }
    safeSet(STORAGE_KEYS.RULES, list);
    this.logAudit('CA User', 'RULE_LEARNED', `Learned rule: "${rule.keyword}" -> "${rule.targetLedger}"`);
  },

  deleteRule(id: string): void {
    const list = this.getRules().filter((r) => r.id !== id);
    safeSet(STORAGE_KEYS.RULES, list);
    this.logAudit('CA User', 'RULE_DELETED', `Deleted rule ${id}`);
  },

  toggleRule(id: string): void {
    const list = this.getRules();
    const r = list.find((item) => item.id === id);
    if (r) {
      r.isActive = !r.isActive;
      r.updatedAt = new Date().toISOString();
      safeSet(STORAGE_KEYS.RULES, list);
    }
  },

  // Tally Config
  getTallyConfig(): TallyConnectionConfig {
    return safeGet<TallyConnectionConfig>(STORAGE_KEYS.TALLY_CONFIG, DEFAULT_TALLY_CONFIG);
  },

  saveTallyConfig(cfg: TallyConnectionConfig): void {
    safeSet(STORAGE_KEYS.TALLY_CONFIG, cfg);
    this.logAudit('CA User', 'TALLY_CONFIG_UPDATED', `Updated Tally status to ${cfg.status} (${cfg.connectorUrl})`);
  },

  // Sync History (Starts EMPTY)
  getSyncHistory(): SyncHistoryItem[] {
    return safeGet<SyncHistoryItem[]>(STORAGE_KEYS.SYNC_HISTORY, []);
  },

  addSyncHistoryItem(item: SyncHistoryItem): void {
    const list = this.getSyncHistory();
    list.unshift(item);
    safeSet(STORAGE_KEYS.SYNC_HISTORY, list);
    this.logAudit(
      'CA User',
      item.status === 'SUCCESS' ? 'VOUCHER_PUSHED' : 'TALLY_SYNC_FAILED',
      `Tally sync for "${item.narration.slice(0, 30)}": ${item.status}`,
      item.transactionId
    );
  },

  updateSyncHistoryItem(id: string, updates: Partial<SyncHistoryItem>): void {
    const list = this.getSyncHistory();
    const idx = list.findIndex((h) => h.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      safeSet(STORAGE_KEYS.SYNC_HISTORY, list);
    }
  },

  // Audit Logs (Real actions)
  getAuditLogs(): AuditLog[] {
    return safeGet<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  },

  logAudit(user: string, action: string, details: string, recordId?: string): void {
    const logs = this.getAuditLogs();
    logs.unshift({
      id: 'audit_' + Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toISOString(),
      user: user || 'CA User',
      action,
      details,
      recordId,
    });
    // Keep max 500 audit logs
    if (logs.length > 500) logs.pop();
    safeSet(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  // Dashboard Stats (Calculated dynamically from real database values!)
  getDashboardStats() {
    const statements = this.getStatements();
    const transactions = this.getTransactions();
    const tallyConfig = this.getTallyConfig();

    const pendingReview = transactions.filter((t) => t.reviewStatus === 'PENDING').length;
    const approved = transactions.filter((t) => t.reviewStatus === 'APPROVED').length;
    const pendingTallyPush = transactions.filter(
      (t) => t.reviewStatus === 'APPROVED' && t.tallyStatus !== 'SYNCED' && t.tallyStatus !== 'ALREADY_SYNCED'
    ).length;
    const successfullySynced = transactions.filter((t) => t.tallyStatus === 'SYNCED').length;
    const failedSync = transactions.filter((t) => t.tallyStatus === 'FAILED').length;
    const duplicates = transactions.filter((t) => t.isDuplicate).length;

    return {
      statementsProcessed: statements.length,
      totalTransactions: transactions.length,
      pendingReview,
      approved,
      pendingTallyPush,
      successfullySynced,
      failedSync,
      duplicates,
      tallyStatus: tallyConfig.status,
      tallyCompany: tallyConfig.tallyCompany || 'Not Configured',
    };
  },
};
