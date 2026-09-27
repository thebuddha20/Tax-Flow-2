import React, { useState, useEffect, useMemo } from 'react';
import {
  BankStatement,
  Transaction,
  Ledger,
  TallyConnectionConfig,
  User,
  ColumnMapping,
} from './types/index.ts';
import { Store } from './services/store.ts';
import { TallyConnector } from './services/tallyConnector.ts';
import { buildTransactionsFromRows } from './services/parser.ts';
import { detectDuplicates } from './services/classifier.ts';

// Components
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { StatementsView } from './components/StatementsView.tsx';
import { TransactionsView } from './components/TransactionsView.tsx';
import { LedgersView } from './components/LedgersView.tsx';
import { TallyView } from './components/TallyView.tsx';
import { SyncHistoryView } from './components/SyncHistoryView.tsx';
import { SettingsView } from './components/SettingsView.tsx';

// Modals
import { LoginModal } from './components/LoginModal.tsx';
import { CreateLedgerModal } from './components/CreateLedgerModal.tsx';
import { VoucherPreviewModal } from './components/VoucherPreviewModal.tsx';
import { ColumnMappingModal } from './components/ColumnMappingModal.tsx';
import { PushProgressModal, PushStepProgress } from './components/PushProgressModal.tsx';

export default function App() {
  // Global Application State
  const [currentUser, setCurrentUser] = useState<User | null>(() => Store.getCurrentUser());
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [statements, setStatements] = useState<BankStatement[]>(() => Store.getStatements());
  const [transactions, setTransactions] = useState<Transaction[]>(() => Store.getTransactions());
  const [ledgers, setLedgers] = useState<Ledger[]>(() => Store.getLedgers());
  const [tallyConfig, setTallyConfig] = useState<TallyConnectionConfig>(() => Store.getTallyConfig());
  const [syncHistory, setSyncHistory] = useState(() => Store.getSyncHistory());

  // Modal States
  const [isCreateLedgerOpen, setIsCreateLedgerOpen] = useState(false);
  const [createLedgerDefaultName, setCreateLedgerDefaultName] = useState('');
  const [createLedgerTargetTxnId, setCreateLedgerTargetTxnId] = useState<string | null>(null);

  const [previewTxn, setPreviewTxn] = useState<Transaction | null>(null);

  const [columnMappingData, setColumnMappingData] = useState<{
    isOpen: boolean;
    rawRows: any[];
    headers: string[];
    statementId: string;
    fileName: string;
  }>({
    isOpen: false,
    rawRows: [],
    headers: [],
    statementId: '',
    fileName: '',
  });

  const [pushProgress, setPushProgress] = useState<PushStepProgress>({
    currentTxnIndex: 0,
    totalTxns: 0,
    step: 'PREPARING',
    successCount: 0,
    failedCount: 0,
    alreadySyncedCount: 0,
    currentNarration: '',
    isComplete: false,
  });
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);

  // Sync state with storage on changes
  const refreshState = () => {
    setStatements(Store.getStatements());
    setTransactions(Store.getTransactions());
    setLedgers(Store.getLedgers());
    setTallyConfig(Store.getTallyConfig());
    setSyncHistory(Store.getSyncHistory());
  };

  // Metrics
  const stats = useMemo(() => Store.getDashboardStats(), [statements, transactions, tallyConfig]);
  const pendingReviewCount = stats.pendingReview;
  const pendingPushCount = stats.pendingTallyPush;

  // Handlers: Authentication
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    refreshState();
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    Store.setCurrentUser(null);
    setCurrentUser(null);
  };

  // Handlers: Statements
  const handleStatementAdded = (newStmt: BankStatement, newTxns: Transaction[]) => {
    Store.saveStatement(newStmt);
    Store.saveTransactions(newTxns);
    refreshState();
  };

  const handleStatementDeleted = (id: string) => {
    Store.deleteStatement(id);
    refreshState();
  };

  // Handlers: Manual Column Mapping Apply
  const handleApplyColumnMapping = (mapping: ColumnMapping) => {
    const { statementId, fileName, rawRows } = columnMappingData;
    const extracted = buildTransactionsFromRows(rawRows, mapping, statementId);
    const existing = Store.getTransactions();
    const txnsWithDuplicates = detectDuplicates(extracted, existing);

    const dupCount = txnsWithDuplicates.filter((t) => t.isDuplicate).length;
    const revCount = txnsWithDuplicates.filter((t) => t.confidence < 80 || t.isDuplicate).length;

    const newStmt: BankStatement = {
      id: statementId,
      fileName,
      fileSize: 1024 * 50,
      fileType: fileName.split('.').pop()?.toUpperCase() || 'FILE',
      uploadDate: new Date().toISOString(),
      status: 'COMPLETED',
      bankName: 'Bank Account',
      transactionCount: txnsWithDuplicates.length,
      duplicateCount: dupCount,
      reviewCount: revCount,
    };

    Store.saveStatement(newStmt);
    Store.saveTransactions(txnsWithDuplicates);
    refreshState();
    setColumnMappingData((prev) => ({ ...prev, isOpen: false }));
    setCurrentView('transactions');
  };

  // Handlers: Transactions Review
  const handleTransactionUpdated = (updated: Transaction) => {
    Store.updateTransaction(updated);
    refreshState();
  };

  const handleBulkUpdate = (updatedList: Transaction[]) => {
    Store.bulkUpdateTransactions(updatedList);
    refreshState();
  };

  // Handlers: Ledgers
  const handleOpenCreateLedger = (defaultName: string = '', forTxnId?: string) => {
    setCreateLedgerDefaultName(defaultName);
    setCreateLedgerTargetTxnId(forTxnId || null);
    setIsCreateLedgerOpen(true);
  };

  const handleLedgerCreated = (newLedger: Ledger) => {
    setLedgers(Store.getLedgers());
    if (createLedgerTargetTxnId) {
      const txn = transactions.find((t) => t.id === createLedgerTargetTxnId);
      if (txn) {
        handleTransactionUpdated({
          ...txn,
          finalLedger: newLedger.name,
        });
      }
    }
  };

  // Handlers: Push Approved to Tally
  const executePushToTally = async (txnsToPush: Transaction[]) => {
    if (txnsToPush.length === 0) return;

    setIsPushModalOpen(true);
    let success = 0;
    let failed = 0;
    let alreadySynced = 0;

    for (let i = 0; i < txnsToPush.length; i++) {
      const txn = txnsToPush[i];

      setPushProgress({
        currentTxnIndex: i,
        totalTxns: txnsToPush.length,
        step: 'SENDING',
        successCount: success,
        failedCount: failed,
        alreadySyncedCount: alreadySynced,
        currentNarration: txn.narration,
        isComplete: false,
      });

      const res = await TallyConnector.pushVoucher(
        txn,
        tallyConfig.connectorUrl,
        tallyConfig.tallyCompany || 'ABC Enterprises'
      );

      if (res.status === 'SUCCESS') success++;
      else if (res.status === 'ALREADY_SYNCED') alreadySynced++;
      else failed++;

      setPushProgress((prev) => ({
        ...prev,
        step: res.success ? 'SUCCESS' : 'FAILED',
        successCount: success,
        failedCount: failed,
        alreadySyncedCount: alreadySynced,
        errorMessage: res.errorMessage,
      }));
    }

    refreshState();

    setPushProgress((prev) => ({
      ...prev,
      isComplete: true,
      currentNarration: 'Push cycle complete.',
    }));
  };

  // If not authenticated, require login first!
  if (!currentUser) {
    return <LoginModal onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        tallyConfig={tallyConfig}
        onLogout={handleLogout}
        onUploadClick={() => setCurrentView('statements')}
        onNavigate={setCurrentView}
        pendingReviewCount={pendingReviewCount}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          pendingReviewCount={pendingReviewCount}
          pendingPushCount={pendingPushCount}
          statementCount={statements.length}
        />

        {/* View Workspace */}
        <main className="flex-1 p-6 overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              statements={statements}
              recentTransactions={transactions}
              tallyConfig={tallyConfig}
              onNavigate={setCurrentView}
              onUploadClick={() => setCurrentView('statements')}
            />
          )}

          {currentView === 'statements' && (
            <StatementsView
              statements={statements}
              onStatementAdded={handleStatementAdded}
              onStatementDeleted={handleStatementDeleted}
              onNavigateToReview={() => setCurrentView('transactions')}
              onOpenColumnMapping={(rawRows, headers, statementId, fileName) => {
                setColumnMappingData({
                  isOpen: true,
                  rawRows,
                  headers,
                  statementId,
                  fileName,
                });
              }}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              ledgers={ledgers}
              tallyStatus={tallyConfig.status}
              onTransactionUpdated={handleTransactionUpdated}
              onBulkUpdate={handleBulkUpdate}
              onOpenCreateLedger={handleOpenCreateLedger}
              onOpenVoucherPreview={(txn) => setPreviewTxn(txn)}
              onPushToTallySingle={(txn) => executePushToTally([txn])}
              onPushApprovedToTally={executePushToTally}
            />
          )}

          {currentView === 'ledgers' && (
            <LedgersView
              ledgers={ledgers}
              onOpenCreateLedger={() => handleOpenCreateLedger()}
              onLedgerUpdated={() => refreshState()}
            />
          )}

          {currentView === 'tally' && (
            <TallyView
              tallyConfig={tallyConfig}
              approvedTransactions={transactions.filter((t) => t.reviewStatus === 'APPROVED')}
              onConfigUpdated={(cfg) => {
                Store.saveTallyConfig(cfg);
                refreshState();
              }}
              onPushApprovedToTally={executePushToTally}
              onLedgersSynced={(newLedgers) => {
                setLedgers(Store.getLedgers());
                refreshState();
              }}
            />
          )}

          {currentView === 'sync-history' && (
            <SyncHistoryView
              history={syncHistory}
              transactions={transactions}
              onRetrySync={(txnId) => {
                const txn = transactions.find((t) => t.id === txnId);
                if (txn) executePushToTally([txn]);
              }}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onUpdateUserRole={(role) => {
                if (currentUser) {
                  const updated = { ...currentUser, role };
                  Store.setCurrentUser(updated);
                  setCurrentUser(updated);
                }
              }}
              onClearAllData={() => {
                localStorage.clear();
                refreshState();
              }}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CreateLedgerModal
        isOpen={isCreateLedgerOpen}
        onClose={() => setIsCreateLedgerOpen(false)}
        onLedgerCreated={handleLedgerCreated}
        defaultName={createLedgerDefaultName}
      />

      <VoucherPreviewModal
        isOpen={Boolean(previewTxn)}
        onClose={() => setPreviewTxn(null)}
        transaction={previewTxn}
        tallyCompany={tallyConfig.tallyCompany}
        onConfirmPush={(updatedTxn) => {
          handleTransactionUpdated(updatedTxn);
          executePushToTally([updatedTxn]);
        }}
      />

      <ColumnMappingModal
        isOpen={columnMappingData.isOpen}
        onClose={() => setColumnMappingData((prev) => ({ ...prev, isOpen: false }))}
        headers={columnMappingData.headers}
        sampleRows={columnMappingData.rawRows.slice(0, 3)}
        fileName={columnMappingData.fileName}
        onApplyMapping={handleApplyColumnMapping}
      />

      <PushProgressModal
        isOpen={isPushModalOpen}
        onClose={() => {
          setIsPushModalOpen(false);
          setCurrentView('sync-history');
        }}
        progress={pushProgress}
      />
    </div>
  );
}
