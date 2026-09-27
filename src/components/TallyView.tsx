import React, { useState } from 'react';
import {
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Building,
  Terminal,
  Download,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { TallyConnectionConfig, Transaction, Ledger } from '../types/index.ts';
import { TallyConnector } from '../services/tallyConnector.ts';
import { Store } from '../services/store.ts';

interface TallyViewProps {
  tallyConfig: TallyConnectionConfig;
  approvedTransactions: Transaction[];
  onConfigUpdated: (cfg: TallyConnectionConfig) => void;
  onPushApprovedToTally: (txnsToPush: Transaction[]) => void;
  onLedgersSynced: (imported: Ledger[]) => void;
}

export const TallyView: React.FC<TallyViewProps> = ({
  tallyConfig,
  approvedTransactions,
  onConfigUpdated,
  onPushApprovedToTally,
  onLedgersSynced,
}) => {
  const [connectorUrl, setConnectorUrl] = useState(tallyConfig.connectorUrl || 'http://localhost:9000');
  const [taxflowCompany, setTaxflowCompany] = useState(tallyConfig.taxflowCompany || '');
  const [tallyCompany, setTallyCompany] = useState(tallyConfig.tallyCompany || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingLedgers, setIsSyncingLedgers] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showBridgeCode, setShowBridgeCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Ready to push count
  const readyToPush = approvedTransactions.filter(
    (t) => t.tallyStatus !== 'SYNCED' && t.tallyStatus !== 'ALREADY_SYNCED'
  );

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const res = await TallyConnector.testConnection(connectorUrl, tallyCompany);
    setIsTesting(false);

    setTestResult({
      success: res.success,
      message: res.message,
    });

    const updated: TallyConnectionConfig = {
      ...tallyConfig,
      connectorUrl,
      isConnected: res.success,
      status: res.status,
      lastTestedAt: new Date().toISOString(),
      tallyCompany: res.tallyCompany || tallyCompany,
    };
    onConfigUpdated(updated);
  };

  const handleSaveMapping = () => {
    const updated: TallyConnectionConfig = {
      ...tallyConfig,
      connectorUrl,
      taxflowCompany: taxflowCompany.trim(),
      tallyCompany: tallyCompany.trim(),
    };
    onConfigUpdated(updated);
    setTestResult({
      success: true,
      message: 'Company mapping saved successfully.',
    });
  };

  const handleDisconnect = () => {
    const updated: TallyConnectionConfig = {
      ...tallyConfig,
      isConnected: false,
      status: 'OFFLINE',
    };
    onConfigUpdated(updated);
    setTestResult({
      success: false,
      message: 'Disconnected from Tally Prime.',
    });
  };

  const handleSyncLedgers = async () => {
    setIsSyncingLedgers(true);
    const res = await TallyConnector.syncLedgers(connectorUrl, tallyCompany);
    setIsSyncingLedgers(false);

    if (res.success && res.ledgers.length > 0) {
      onLedgersSynced(res.ledgers);
      setTestResult({
        success: true,
        message: `Successfully synchronized ${res.ledgers.length} ledgers from Tally Prime!`,
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Failed to retrieve ledgers from Tally. Check connection.',
      });
    }
  };

  const handleCopyBridgeScript = () => {
    const script = TallyConnector.getPythonConnectorScript();
    navigator.clipboard.writeText(script);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadBridgeScript = () => {
    const script = TallyConnector.getPythonConnectorScript();
    const blob = new Blob([script], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taxflow-tally-bridge.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tally Prime Direct Connector</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                tallyConfig.status === 'CONNECTED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  tallyConfig.status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {tallyConfig.status === 'CONNECTED' ? '🟢 Connected' : '🔴 Offline'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Push approved accounting vouchers directly into Tally Prime without manual data entry.
          </p>
        </div>

        {/* Push Approved CTA */}
        <button
          onClick={() => onPushApprovedToTally(readyToPush)}
          disabled={readyToPush.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow transition-all"
        >
          <Send className="w-4 h-4" />
          <span>Push Approved to Tally ({readyToPush.length})</span>
        </button>
      </div>

      {/* Grid: Connection & Company Mapping */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Connection Settings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Connector & Bridge Settings</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {tallyConfig.lastTestedAt
                ? `Last test: ${new Date(tallyConfig.lastTestedAt).toLocaleTimeString()}`
                : 'Not tested yet'}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tally Connector URL / Bridge Port
              </label>
              <input
                type="text"
                value={connectorUrl}
                onChange={(e) => setConnectorUrl(e.target.value)}
                placeholder="http://localhost:9000 or http://localhost:8080"
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Default Tally Prime XML port is 9000. When using the TaxFlow Bridge, port is 8080.
              </p>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-medium border flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>{testResult.message}</div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
              </button>

              {tallyConfig.isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Disconnect
                </button>
              )}

              <button
                onClick={handleSyncLedgers}
                disabled={isSyncingLedgers}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                title="Sync and import ledger masters directly from Tally"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isSyncingLedgers ? 'Syncing...' : 'Sync Ledgers from Tally'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Company Mapping */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Tally Company Mapping</span>
            </div>
            <span className="text-[11px] text-slate-400">Exact Match</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                TaxFlow Company Name
              </label>
              <input
                type="text"
                value={taxflowCompany}
                onChange={(e) => setTaxflowCompany(e.target.value)}
                placeholder="e.g. ABC Enterprises"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Tally Prime Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={tallyCompany}
                onChange={(e) => setTallyCompany(e.target.value)}
                placeholder="e.g. ABC Enterprises Pvt Ltd (as named in Tally)"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Must match the active open company in Tally Prime so vouchers post to the correct ledger book.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveMapping}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Save Company Mapping
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Protection & Architecture Guarantee */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Strict Duplicate Tally Voucher Protection</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          TaxFlow computes an immutable transaction fingerprint for every bank row (`date + amount + normalized narration`).
          Before any voucher is pushed to Tally, the connector checks whether it has already been synchronized.
          If already synced, TaxFlow blocks duplicate creation and notifies you with "Already synced with Tally".
        </p>
      </div>

      {/* TaxFlow Local Connector Bridge Guide */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">TaxFlow Local Connector Bridge</h3>
              <p className="text-xs text-slate-500">
                Run this lightweight 1-click bridge script on the CA workstation running Tally Prime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyBridgeScript}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Script'}</span>
            </button>
            <button
              onClick={handleDownloadBridgeScript}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Bridge (.py)</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-2 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="font-semibold text-slate-800">Why is the local bridge needed?</div>
          <div>
            Because TaxFlow runs as a secure web application, browser security (CORS) prevents web pages from directly
            talking to desktop background ports without headers. The TaxFlow Local Connector Bridge runs locally on your
            computer, listens on port 8080, and forwards XML requests directly into Tally Prime (port 9000).
          </div>
          <div className="pt-2 font-mono text-[11px] text-indigo-800 font-semibold">
            How to run: <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-900">python taxflow-tally-bridge.py</span>
          </div>
        </div>
      </div>
    </div>
  );
};
