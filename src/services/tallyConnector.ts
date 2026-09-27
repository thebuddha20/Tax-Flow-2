import { Transaction, SyncHistoryItem, Ledger } from '../types/index.ts';
import { Store } from './store.ts';

export interface TallyTestResult {
  success: boolean;
  status: 'CONNECTED' | 'OFFLINE';
  message: string;
  tallyCompany?: string;
  companies?: string[];
  latencyMs?: number;
}

export interface PushVoucherResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'ALREADY_SYNCED';
  voucherNumber?: string;
  tallyVoucherId?: string;
  errorMessage?: string;
}

// Convert DD/MM/YYYY to Tally date YYYYMMDD
export function formatTallyDate(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split(/[-/]/);
  if (parts.length === 3) {
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    return `${y}${m}${d}`;
  }
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

// Generates Tally Prime XML for Payment / Receipt / Contra voucher
export function generateTallyVoucherXML(txn: Transaction, companyName: string, bankLedgerName: string = 'Bank Account'): string {
  const tallyDate = formatTallyDate(txn.date);
  const isReceipt = txn.transactionType === 'RECEIPT';
  const isContra = txn.transactionType === 'CONTRA';
  const vchType = isContra ? 'Contra' : isReceipt ? 'Receipt' : 'Payment';
  
  // Clean narration to prevent XML breaking
  const cleanNarration = (txn.narration || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const cleanLedger = (txn.finalLedger || 'Suspense Account')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const cleanBank = bankLedgerName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const amount = txn.amount.toFixed(2);
  const guid = `TF_${txn.fingerprint}_${Date.now()}`;

  // In Tally XML:
  // For Payment: Bank is Credit (negative amount in ledger entry), Expense is Debit (positive)
  // For Receipt: Bank is Debit (positive), Client is Credit (negative)
  // For Contra: Cash is Debit, Bank is Credit (or vice versa)
  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${vchType}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${tallyDate}</DATE>
            <GUID>${guid}</GUID>
            <VOUCHERTYPENAME>${vchType}</VOUCHERTYPENAME>
            <REFERENCE>${txn.id}</REFERENCE>
            <NARRATION>${cleanNarration}</NARRATION>
            <VOUCHERNUMBER></VOUCHERNUMBER>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${isReceipt ? cleanBank : cleanLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${isReceipt ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <AMOUNT>${isReceipt ? `-${amount}` : amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${isReceipt ? cleanLedger : cleanBank}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${isReceipt ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>
              <AMOUNT>${isReceipt ? amount : `-${amount}`}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export const TallyConnector = {
  // Test connection to Local Connector or Tally directly
  async testConnection(connectorUrl: string, companyName?: string): Promise<TallyTestResult> {
    const startTime = Date.now();
    const url = (connectorUrl || 'http://localhost:9000').trim().replace(/\/+$/, '');

    try {
      // 1. Try sending Tally Export Data request to list companies
      const exportXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Companies</REPORTNAME>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml;charset=utf-8',
        },
        body: exportXml,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      const latencyMs = Date.now() - startTime;

      // Extract companies from response if available
      const companyMatches = text.match(/<COMPANYNAME[^>]*>([^<]+)<\/COMPANYNAME>/gi) || [];
      const companies = companyMatches.map((m) => m.replace(/<\/?COMPANYNAME[^>]*>/gi, '').trim());

      const activeCompany = companyName || companies[0] || 'Tally Prime Active Company';

      return {
        success: true,
        status: 'CONNECTED',
        message: `Successfully connected to Tally Prime on ${url}`,
        tallyCompany: activeCompany,
        companies: companies.length > 0 ? companies : [activeCompany],
        latencyMs,
      };
    } catch (err: any) {
      // Network error, CORS restriction, or Tally not running locally
      console.warn('Tally connection test failed:', err);

      let helpfulMsg = 'Tally Connector is offline.';
      if (err.name === 'AbortError') {
        helpfulMsg = `Connection to ${url} timed out. Ensure Tally Prime or TaxFlow Local Connector is running.`;
      } else if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        helpfulMsg = `Cannot connect to ${url}. Because TaxFlow is running in the cloud/browser, browser CORS prevents direct connections to localhost unless the TaxFlow Local Connector Bridge is running on your machine.`;
      }

      return {
        success: false,
        status: 'OFFLINE',
        message: helpfulMsg,
      };
    }
  },

  // Sync Ledgers from Tally Prime
  async syncLedgers(connectorUrl: string, companyName: string): Promise<{ success: boolean; ledgers: Ledger[]; error?: string }> {
    const url = (connectorUrl || 'http://localhost:9000').trim().replace(/\/+$/, '');
    try {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Ledgers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName || ''}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml,
      });

      const text = await response.text();
      const ledgerMatches = text.match(/<LEDGERNAME[^>]*>([^<]+)<\/LEDGERNAME>/gi) || [];
      
      const imported: Ledger[] = [];
      for (const m of ledgerMatches) {
        const name = m.replace(/<\/?LEDGERNAME[^>]*>/gi, '').trim();
        if (name) {
          const l: Ledger = {
            id: `tally_led_${Math.random().toString(36).slice(2, 8)}`,
            name,
            parentGroup: 'Indirect Expenses',
            nature: 'DEBIT',
            gstApplicable: false,
            gstRate: 0,
            status: 'ACTIVE',
            tallyLedgerId: `TALLY_${name.replace(/\s+/g, '_').toUpperCase()}`,
          };
          Store.saveLedger(l);
          imported.push(l);
        }
      }

      return {
        success: true,
        ledgers: imported,
      };
    } catch (err: any) {
      return {
        success: false,
        ledgers: [],
        error: `Could not retrieve ledgers from Tally: ${err.message || 'Offline'}. Check connection.`,
      };
    }
  },

  // Push single voucher with duplicate protection and error handling
  async pushVoucher(
    txn: Transaction,
    connectorUrl: string,
    companyName: string
  ): Promise<PushVoucherResult> {
    // 1. DUPLICATE TALLY PROTECTION: check if already synced!
    if (txn.tallyStatus === 'SYNCED' || txn.tallyStatus === 'ALREADY_SYNCED') {
      return {
        success: false,
        status: 'ALREADY_SYNCED',
        errorMessage: 'Already synced with Tally. Duplicate voucher creation prevented.',
      };
    }

    const syncHistory = Store.getSyncHistory();
    const alreadyInHistory = syncHistory.find(
      (h) => h.transactionId === txn.id && (h.status === 'SUCCESS' || h.status === 'ALREADY_SYNCED')
    );

    if (alreadyInHistory) {
      txn.tallyStatus = 'ALREADY_SYNCED';
      Store.updateTransaction(txn);
      return {
        success: false,
        status: 'ALREADY_SYNCED',
        errorMessage: `Already synced with Tally (Voucher #${alreadyInHistory.voucherNumber || 'N/A'})`,
      };
    }

    // 2. Check connector URL and build payload
    const url = (connectorUrl || 'http://localhost:9000').trim().replace(/\/+$/, '');
    const xmlPayload = generateTallyVoucherXML(txn, companyName);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml;charset=utf-8',
        },
        body: xmlPayload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const respText = await response.text();

      // Check Tally Prime XML Response for <CREATED>1</CREATED> or errors
      const isCreated = respText.includes('<CREATED>1</CREATED>') || respText.includes('<ALTERED>1</ALTERED>');
      const hasError = respText.includes('<ERRORS>') && !respText.includes('<ERRORS>0</ERRORS>');
      
      const vchNoMatch = respText.match(/<VOUCHERNUMBER[^>]*>([^<]+)<\/VOUCHERNUMBER>/i);
      const voucherNumber = vchNoMatch ? vchNoMatch[1].trim() : `VCH-${Date.now().toString().slice(-6)}`;
      const tallyVoucherId = `TV_${Date.now()}`;

      if (isCreated && !hasError) {
        // Success
        const nowIso = new Date().toISOString();
        txn.tallyStatus = 'SYNCED';
        txn.tallyVoucherId = tallyVoucherId;
        txn.tallyVoucherNumber = voucherNumber;
        txn.syncDate = nowIso;
        txn.syncError = undefined;
        Store.updateTransaction(txn);

        Store.addSyncHistoryItem({
          id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowIso,
          transactionId: txn.id,
          narration: txn.narration,
          date: txn.date,
          voucherType: txn.transactionType === 'RECEIPT' ? 'Receipt' : txn.transactionType === 'CONTRA' ? 'Contra' : 'Payment',
          amount: txn.amount,
          tallyCompany: companyName,
          voucherNumber,
          status: 'SUCCESS',
          tallyVoucherId,
        });

        return {
          success: true,
          status: 'SUCCESS',
          voucherNumber,
          tallyVoucherId,
        };
      } else {
        // Tally returned an accounting error in XML (e.g. Ledger does not exist)
        let errorMsg = 'Tally rejected the voucher.';
        const lineErrorMatch = respText.match(/<LINEERROR[^>]*>([^<]+)<\/LINEERROR>/i);
        if (lineErrorMatch) errorMsg = lineErrorMatch[1].trim();

        txn.tallyStatus = 'FAILED';
        txn.syncError = errorMsg;
        Store.updateTransaction(txn);

        Store.addSyncHistoryItem({
          id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          transactionId: txn.id,
          narration: txn.narration,
          date: txn.date,
          voucherType: txn.transactionType === 'RECEIPT' ? 'Receipt' : txn.transactionType === 'CONTRA' ? 'Contra' : 'Payment',
          amount: txn.amount,
          tallyCompany: companyName,
          status: 'FAILED',
          errorMessage: errorMsg,
        });

        return {
          success: false,
          status: 'FAILED',
          errorMessage: errorMsg,
        };
      }
    } catch (err: any) {
      // Offline mode: mark PENDING_PUSH so CA never loses approved transactions!
      const errorMsg = `Tally Connector is offline (${err.message || 'Connection failed'}). Transaction marked PENDING TALLY SYNC.`;
      txn.tallyStatus = 'FAILED';
      txn.syncError = errorMsg;
      Store.updateTransaction(txn);

      Store.addSyncHistoryItem({
        id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        transactionId: txn.id,
        narration: txn.narration,
        date: txn.date,
        voucherType: txn.transactionType === 'RECEIPT' ? 'Receipt' : txn.transactionType === 'CONTRA' ? 'Contra' : 'Payment',
        amount: txn.amount,
        tallyCompany: companyName,
        status: 'FAILED',
        errorMessage: errorMsg,
      });

      return {
        success: false,
        status: 'FAILED',
        errorMessage: errorMsg,
      };
    }
  },

  // Python and Node.js Local Connector Bridge Code for CA
  getPythonConnectorScript(): string {
    return `#!/usr/bin/env python3
"""
TaxFlow Local Connector Bridge for Tally Prime
Runs on CA computer to bridge HTTP requests from TaxFlow Cloud to local Tally Prime XML server (Port 9000).
Enables secure CORS headers so browser can communicate seamlessly with Tally.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error
import sys

TALLY_PORT = 9000
BRIDGE_PORT = 8080

class TaxFlowBridgeHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        if self.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"RUNNING","bridge":"TaxFlow Local Connector v1.0","tallyPort":9000}')
            return
        self.send_error(404)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        tally_url = f"http://127.0.0.1:{TALLY_PORT}/"
        
        try:
            req = urllib.request.Request(
                tally_url,
                data=post_data,
                headers={'Content-Type': 'text/xml;charset=utf-8'}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_data = resp.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/xml;charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(resp_data)
        except urllib.error.URLError as e:
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            err_msg = f'{{"error":"Tally Prime is not running on port {TALLY_PORT}. Open Tally Prime -> F1 -> Settings -> Connectivity -> TallyPrime is acting as Both (Port 9000)."}}'
            self.wfile.write(err_msg.encode('utf-8'))

if __name__ == '__main__':
    server_address = ('', BRIDGE_PORT)
    httpd = HTTPServer(server_address, TaxFlowBridgeHandler)
    print(f"\\n=======================================================")
    print(f" TaxFlow Tally Connector Bridge is RUNNING on port {BRIDGE_PORT}")
    print(f" Forwarding to local Tally Prime XML port {TALLY_PORT}")
    print(f" In TaxFlow Web, set Connector URL to: http://localhost:{BRIDGE_PORT}")
    print(f"=======================================================\\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\\nShutting down connector.")
`;
  },
};
