import { Transaction, TransactionType, Ledger } from '../types/index.ts';
import { Store } from './store.ts';

export interface ClassificationResult {
  suggestedLedger: string;
  confidence: number;
  transactionType: TransactionType;
}

export function classifyNarration(
  narration: string,
  debit: number | null,
  credit: number | null,
  ledgers: Ledger[]
): ClassificationResult {
  const norm = narration.toUpperCase().trim();
  const activeLedgerNames = new Set(ledgers.filter((l) => l.status === 'ACTIVE').map((l) => l.name));

  // Determine transaction type
  let transactionType: TransactionType = 'PAYMENT';
  if (
    norm.includes('ATM') ||
    norm.includes('CASH WDL') ||
    norm.includes('CASH WITHDRAW') ||
    norm.includes('SELF WDL') ||
    norm.includes('CONTRA')
  ) {
    transactionType = 'CONTRA';
  } else if ((credit && credit > 0) || norm.includes('CR/') || norm.includes('RECEIVED FROM') || norm.includes('CREDIT')) {
    transactionType = 'RECEIPT';
  } else {
    transactionType = 'PAYMENT';
  }

  // 1. Check CA Learned Rules first!
  const learnedRules = Store.getRules().filter((r) => r.isActive);
  for (const rule of learnedRules) {
    const kw = rule.keyword.toUpperCase().trim();
    if (kw && norm.includes(kw)) {
      // Find matching ledger in current master
      const matched = ledgers.find((l) => l.name.toLowerCase() === rule.targetLedger.toLowerCase());
      const finalName = matched ? matched.name : rule.targetLedger;
      return {
        suggestedLedger: finalName,
        confidence: rule.confidence || 98,
        transactionType,
      };
    }
  }

  // 2. Built-in Indian Accounting Heuristics
  const rulesMap: Array<{ pattern: RegExp; ledger: string; conf: number; typeOverride?: TransactionType }> = [
    { pattern: /(SWIGGY|ZOMATO|MCDONALD|DOMINO|EATCLUB|KFC|RESTAURANT|SWEETS|CAFE|BAKERY|FOOD)/i, ledger: 'Food Expenses', conf: 95 },
    { pattern: /(ELECTRICITY|BESCOM|MSEB|TNEB|UPPCL|DISCOM|POWER CORP|TATA POWER|ADANI ELECTRICITY)/i, ledger: 'Electricity Expenses', conf: 95 },
    { pattern: /(ATM|CASH WDL|CASH WITHDRAWAL|SELF CHEQUE|ATM WDL)/i, ledger: 'Cash A/c', conf: 98, typeOverride: 'CONTRA' },
    { pattern: /(BANK CHARGES|SMS CHG|MIN BAL|CONSOLIDATED CHG|CHG FOR|ANNUAL FEE|DEBIT CARD FEE)/i, ledger: 'Bank Charges', conf: 98 },
    { pattern: /(OFFICE RENT|RENT EXPENSE|COMMERCIAL LEASE|RENTAL|MAINTENANCE DEPOSIT)/i, ledger: 'Rent Expense', conf: 95 },
    { pattern: /(AWS|AMAZON WEB SERVICES|GOOGLE CLOUD|AZURE|DIGITALOCEAN|MICROSOFT|GITHUB|GSUITE|ZOOM|SLACK|CANVA|NOTION|CHATGPT|OPENAI)/i, ledger: 'Cloud & Software Expenses', conf: 92 },
    { pattern: /(AIRTEL|JIO|VODAFONE|VI INDIA|BSNL|ACT FIBERNET|HATHWAY|BROADBAND|TATA TELE|TELEPHONE)/i, ledger: 'Telephone & Internet Expenses', conf: 95 },
    { pattern: /(PETROL|DIESEL|FUEL|HPCL|BPCL|IOCL|SHELL PUMP|INDIAN OIL|BHARAT PETRO)/i, ledger: 'Travelling Expenses', conf: 90 },
    { pattern: /(UBER|OLA|RAPIDO|IRCTC|RAILWAY|INDIGO|AIR INDIA|VISTARA|MAKEMYTRIP|RED BUS|CAB|AUTO)/i, ledger: 'Travelling Expenses', conf: 90 },
    { pattern: /(SALARY|SALARIES|PAYROLL|STIPEND|WAGES|STAFF SALARY)/i, ledger: 'Salaries & Wages', conf: 95 },
    { pattern: /(GST|GOODS AND SERVICES TAX|TDS|ADVANCE TAX|INCOME TAX|CBDT|CBIC|CHALLAN)/i, ledger: 'Duties & Taxes (GST/TDS)', conf: 95 },
    { pattern: /(STAFF TEA|PANTRY|SNACKS|LUNCH|TEA STALL|REFRESHMENTS)/i, ledger: 'Staff Welfare Expenses', conf: 92 },
    { pattern: /(REPAIR|SERVICING|HARDWARE|PLUMBING|AMC|CARPENTER|ELECTRIC WORK)/i, ledger: 'Repairs & Maintenance', conf: 90 },
    { pattern: /(LEGAL|ADVOCATE|CONSULTING|AUDIT FEE|CERTIFICATION|PROFESSIONAL FEE)/i, ledger: 'Professional Fees', conf: 92 },
    { pattern: /(STATIONERY|PAPER|PRINTING|CARTRIDGE|COURIER|POSTAGE|SPEED POST|BLUEDART)/i, ledger: 'Office Expenses', conf: 90 },
    { pattern: /(CLIENT PAYMENT|RECEIPT|INVOICE PAYMENT|NEFT CR|IMPS CR|SETTLEMENT|PAYMENT FROM)/i, ledger: 'Client Receivable / Sundry Debtors', conf: 90, typeOverride: 'RECEIPT' },
  ];

  for (const r of rulesMap) {
    if (r.pattern.test(norm)) {
      // Check if ledger exists in active ledgers
      const exists = activeLedgerNames.has(r.ledger);
      return {
        suggestedLedger: exists ? r.ledger : 'Miscellaneous Expenses',
        confidence: r.conf,
        transactionType: r.typeOverride || transactionType,
      };
    }
  }

  // Fallback: Low confidence suggestion
  if (transactionType === 'RECEIPT') {
    return {
      suggestedLedger: 'Client Receivable / Sundry Debtors',
      confidence: 45,
      transactionType,
    };
  }

  return {
    suggestedLedger: 'Suspense Account',
    confidence: 40,
    transactionType,
  };
}

export function generateFingerprint(date: string, amount: number, narration: string): string {
  const cleanNarration = narration.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return `${date}_${amount.toFixed(2)}_${cleanNarration}`;
}

export function detectDuplicates(
  newTxns: Array<Omit<Transaction, 'isDuplicate' | 'duplicateReason'>>,
  existingTxns: Transaction[]
): Array<Transaction> {
  const existingFingerprints = new Map<string, Transaction>();
  for (const t of existingTxns) {
    existingFingerprints.set(t.fingerprint, t);
  }

  const seenInBatch = new Set<string>();

  return newTxns.map((t) => {
    let isDuplicate = false;
    let duplicateReason = '';

    if (existingFingerprints.has(t.fingerprint)) {
      const match = existingFingerprints.get(t.fingerprint)!;
      isDuplicate = true;
      duplicateReason = `Already present in database from statement (${match.date}, ₹${match.amount.toLocaleString('en-IN')})`;
    } else if (seenInBatch.has(t.fingerprint)) {
      isDuplicate = true;
      duplicateReason = `Duplicate row detected within this uploaded statement (${t.date}, ₹${t.amount.toLocaleString('en-IN')})`;
    } else {
      seenInBatch.add(t.fingerprint);
    }

    return {
      ...t,
      isDuplicate,
      duplicateReason,
    } as Transaction;
  });
}
