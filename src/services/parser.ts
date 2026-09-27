import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { ColumnMapping, Transaction, TransactionType } from '../types/index.ts';
import { classifyNarration, generateFingerprint } from './classifier.ts';
import { Store } from './store.ts';

// Set up pdfjs worker safely
try {
  // Use unpkg or cdn fallback if local worker url is not configured
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
} catch (e) {
  console.warn('PDF worker setup warning:', e);
}

export interface ParseResult {
  transactions: Array<Omit<Transaction, 'isDuplicate' | 'duplicateReason'>>;
  needsColumnMapping: boolean;
  detectedHeaders: string[];
  rawRows: Array<Record<string, any>>;
  suggestedMapping?: ColumnMapping;
  error?: string;
}

// Normalize date to DD/MM/YYYY
export function normalizeDate(raw: any): string {
  if (!raw) return new Date().toLocaleDateString('en-GB');

  if (typeof raw === 'number') {
    // Excel date serial number
    const dateObj = XLSX.SSF.parse_date_code(raw);
    if (dateObj) {
      const d = String(dateObj.d).padStart(2, '0');
      const m = String(dateObj.m).padStart(2, '0');
      const y = String(dateObj.y);
      return `${d}/${m}/${y}`;
    }
  }

  const str = String(raw).trim();
  // Check DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    let y = dmyMatch[3];
    if (y.length === 2) y = '20' + y;
    return `${d}/${m}/${y}`;
  }

  // Check YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Check DD-MMM-YYYY (e.g. 01-Apr-2026)
  const mmmMatch = str.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{2,4})/);
  if (mmmMatch) {
    const d = mmmMatch[1].padStart(2, '0');
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const monthKey = mmmMatch[2].slice(0, 3).toLowerCase();
    const m = monthNames[monthKey] || '01';
    let y = mmmMatch[3];
    if (y.length === 2) y = '20' + y;
    return `${d}/${m}/${y}`;
  }

  return str;
}

export function parseAmount(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.abs(val);
  const clean = String(val).replace(/[^\d.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
}

// Find best matching columns from headers
export function detectColumnMapping(headers: string[]): { mapping: ColumnMapping; confident: boolean } {
  let dateCol = '';
  let narrationCol = '';
  let debitCol = '';
  let creditCol = '';
  let amountCol = '';
  let balanceCol = '';

  const dateKeywords = ['date', 'txn date', 'txndate', 'value date', 'trans date', 'posting date'];
  const descKeywords = ['narration', 'description', 'particulars', 'remarks', 'transaction details', 'details'];
  const debitKeywords = ['debit', 'withdrawal', 'dr', 'withdrawals', 'dr amount', 'debit (dr)'];
  const creditKeywords = ['credit', 'deposit', 'cr', 'deposits', 'cr amount', 'credit (cr)'];
  const amountKeywords = ['amount', 'trans amount', 'txn amount'];
  const balanceKeywords = ['balance', 'closing balance', 'avail bal', 'balance amount'];

  for (const h of headers) {
    const norm = h.toLowerCase().trim();
    if (!dateCol && dateKeywords.some((k) => norm.includes(k))) dateCol = h;
    if (!narrationCol && descKeywords.some((k) => norm.includes(k))) narrationCol = h;
    if (!debitCol && debitKeywords.some((k) => norm.includes(k) && !norm.includes('credit'))) debitCol = h;
    if (!creditCol && creditKeywords.some((k) => norm.includes(k) && !norm.includes('debit'))) creditCol = h;
    if (!amountCol && amountKeywords.some((k) => norm === k || norm.includes(k))) amountCol = h;
    if (!balanceCol && balanceKeywords.some((k) => norm.includes(k))) balanceCol = h;
  }

  const confident = Boolean(dateCol && narrationCol && (debitCol || creditCol || amountCol));

  return {
    mapping: {
      dateCol: dateCol || headers[0] || '',
      narrationCol: narrationCol || headers[1] || '',
      debitCol: debitCol || '',
      creditCol: creditCol || '',
      amountCol: amountCol || '',
      balanceCol: balanceCol || '',
    },
    confident,
  };
}

// Process raw rows with given column mapping
export function buildTransactionsFromRows(
  rows: Array<Record<string, any>>,
  mapping: ColumnMapping,
  statementId: string
): Array<Omit<Transaction, 'isDuplicate' | 'duplicateReason'>> {
  const ledgers = Store.getLedgers();
  const txns: Array<Omit<Transaction, 'isDuplicate' | 'duplicateReason'>> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[mapping.dateCol];
    const rawNarration = row[mapping.narrationCol];

    if (!rawDate && !rawNarration) continue;

    const date = normalizeDate(rawDate);
    const narration = String(rawNarration || 'Bank Transaction').trim();

    let debit: number | null = null;
    let credit: number | null = null;

    if (mapping.debitCol && row[mapping.debitCol] !== undefined && row[mapping.debitCol] !== '') {
      debit = parseAmount(row[mapping.debitCol]);
    }
    if (mapping.creditCol && row[mapping.creditCol] !== undefined && row[mapping.creditCol] !== '') {
      credit = parseAmount(row[mapping.creditCol]);
    }

    if (debit === 0) debit = null;
    if (credit === 0) credit = null;

    if (debit === null && credit === null && mapping.amountCol && row[mapping.amountCol]) {
      const amt = parseAmount(row[mapping.amountCol]);
      // If there's a type column or narration clue
      const typeStr = String(row['Type'] || row['Dr/Cr'] || '').toLowerCase();
      if (typeStr.includes('cr') || typeStr.includes('credit') || typeStr.includes('deposit')) {
        credit = amt;
      } else {
        debit = amt;
      }
    }

    const amount = debit || credit || 0;
    if (amount <= 0 && !narration) continue;

    const balance = mapping.balanceCol ? parseAmount(row[mapping.balanceCol]) : null;

    // AI Classification
    const { suggestedLedger, confidence, transactionType } = classifyNarration(
      narration,
      debit,
      credit,
      ledgers
    );

    const fingerprint = generateFingerprint(date, amount, narration);

    txns.push({
      id: `txn_${statementId}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      statementId,
      date,
      narration,
      debit,
      credit,
      amount,
      balance,
      transactionType,
      suggestedLedger,
      finalLedger: suggestedLedger,
      confidence,
      reviewStatus: 'PENDING',
      tallyStatus: 'NOT_PUSHED',
      fingerprint,
    });
  }

  return txns;
}

// Process Excel (XLS, XLSX)
export async function parseExcel(file: File, statementId: string): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      transactions: [],
      needsColumnMapping: false,
      detectedHeaders: [],
      rawRows: [],
      error: 'Workbook contains no sheets.',
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

  if (jsonData.length < 2) {
    return {
      transactions: [],
      needsColumnMapping: false,
      detectedHeaders: [],
      rawRows: [],
      error: 'Could not find sufficient data rows in sheet.',
    };
  }

  // Find header row: look for row containing Date or Narration
  let headerIndex = -1;
  for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
    const row = jsonData[r] as any[];
    if (Array.isArray(row)) {
      const lineStr = row.map((c) => String(c || '').toLowerCase()).join(' ');
      if (
        (lineStr.includes('date') || lineStr.includes('txn')) &&
        (lineStr.includes('particular') || lineStr.includes('narration') || lineStr.includes('description') || lineStr.includes('amount'))
      ) {
        headerIndex = r;
        break;
      }
    }
  }

  if (headerIndex === -1) headerIndex = 0;

  const headerRow = (jsonData[headerIndex] as any[]).map((c, i) => (c ? String(c).trim() : `Col_${i + 1}`));
  const rawRows: Array<Record<string, any>> = [];

  for (let r = headerIndex + 1; r < jsonData.length; r++) {
    const row = jsonData[r] as any[];
    if (!row || row.length === 0) continue;
    const obj: Record<string, any> = {};
    let hasValue = false;
    headerRow.forEach((col, idx) => {
      const val = row[idx];
      obj[col] = val !== undefined ? val : '';
      if (val !== undefined && val !== '') hasValue = true;
    });
    if (hasValue) rawRows.push(obj);
  }

  const { mapping, confident } = detectColumnMapping(headerRow);

  if (!confident) {
    return {
      transactions: [],
      needsColumnMapping: true,
      detectedHeaders: headerRow,
      rawRows,
      suggestedMapping: mapping,
    };
  }

  const transactions = buildTransactionsFromRows(rawRows, mapping, statementId);

  return {
    transactions,
    needsColumnMapping: false,
    detectedHeaders: headerRow,
    rawRows,
    suggestedMapping: mapping,
  };
}

// Process CSV
export async function parseCSV(file: File, statementId: string): Promise<ParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      transactions: [],
      needsColumnMapping: false,
      detectedHeaders: [],
      rawRows: [],
      error: 'CSV file is empty or contains no transaction rows.',
    };
  }

  // Detect delimiter
  const firstLine = lines[0];
  let delimiter = ',';
  if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) delimiter = ';';
  if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) delimiter = '\t';

  // Read with XLSX for robust CSV quote and newline handling
  const workbook = XLSX.read(text, { type: 'string', raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

  // Locate header row
  let headerIndex = -1;
  for (let r = 0; r < Math.min(jsonData.length, 10); r++) {
    const row = jsonData[r] as any[];
    if (Array.isArray(row)) {
      const lineStr = row.map((c) => String(c || '').toLowerCase()).join(' ');
      if (lineStr.includes('date') && (lineStr.includes('particular') || lineStr.includes('narration') || lineStr.includes('amount') || lineStr.includes('debit'))) {
        headerIndex = r;
        break;
      }
    }
  }

  if (headerIndex === -1) headerIndex = 0;

  const headerRow = (jsonData[headerIndex] as any[]).map((c, i) => (c ? String(c).trim() : `Col_${i + 1}`));
  const rawRows: Array<Record<string, any>> = [];

  for (let r = headerIndex + 1; r < jsonData.length; r++) {
    const row = jsonData[r] as any[];
    if (!row || row.length === 0) continue;
    const obj: Record<string, any> = {};
    let hasValue = false;
    headerRow.forEach((col, idx) => {
      const val = row[idx];
      obj[col] = val !== undefined ? val : '';
      if (val !== undefined && val !== '') hasValue = true;
    });
    if (hasValue) rawRows.push(obj);
  }

  const { mapping, confident } = detectColumnMapping(headerRow);

  if (!confident) {
    return {
      transactions: [],
      needsColumnMapping: true,
      detectedHeaders: headerRow,
      rawRows,
      suggestedMapping: mapping,
    };
  }

  const transactions = buildTransactionsFromRows(rawRows, mapping, statementId);

  return {
    transactions,
    needsColumnMapping: false,
    detectedHeaders: headerRow,
    rawRows,
    suggestedMapping: mapping,
  };
}

// Process PDF Bank Statement
export async function parsePDF(file: File, statementId: string): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group text items by vertical position (Y-coordinate) to rebuild rows
      const items = textContent.items as Array<{ str: string; transform: number[] }>;
      const rowMap = new Map<number, Array<{ x: number; text: string }>>();

      for (const item of items) {
        if (!item.str || item.str.trim() === '') continue;
        const y = Math.round(item.transform[5]); // Y coordinate
        const x = Math.round(item.transform[4]); // X coordinate
        
        // Find existing row within 4px tolerance
        let matchedY = y;
        for (const existingY of rowMap.keys()) {
          if (Math.abs(existingY - y) <= 4) {
            matchedY = existingY;
            break;
          }
        }

        if (!rowMap.has(matchedY)) {
          rowMap.set(matchedY, []);
        }
        rowMap.get(matchedY)!.push({ x, text: item.str });
      }

      // Sort rows by descending Y (top of page to bottom)
      const sortedYs = Array.from(rowMap.keys()).sort((a, b) => b - a);
      for (const y of sortedYs) {
        const rowItems = rowMap.get(y)!.sort((a, b) => a.x - b.x);
        const lineText = rowItems.map((i) => i.text.trim()).join('   ');
        if (lineText.length > 0) {
          allLines.push(lineText);
        }
      }
    }

    // Now scan lines for date-started transaction rows
    // Standard formats: DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY
    const dateRegex = /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[-/\s][A-Za-z]{3}[-/\s]\d{2,4})\b/;
    const amountRegex = /[\d,]+\.\d{2}/g;

    const detectedTxns: Array<Omit<Transaction, 'isDuplicate' | 'duplicateReason'>> = [];
    const ledgers = Store.getLedgers();

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const dateMatch = line.match(dateRegex);

      if (!dateMatch) continue;

      const dateStr = normalizeDate(dateMatch[1]);
      
      // Look for numbers with decimal in line
      const amounts = line.match(amountRegex);
      if (!amounts || amounts.length === 0) continue;

      // Extract narration: part between date and amounts
      const dateIndex = line.indexOf(dateMatch[0]);
      let narrationPart = line.slice(dateIndex + dateMatch[0].length).trim();
      
      // Remove amounts from narration
      for (const amt of amounts) {
        narrationPart = narrationPart.replace(amt, '');
      }
      narrationPart = narrationPart.replace(/[|#]/g, ' ').trim();
      if (!narrationPart) narrationPart = 'Bank Transfer / POS';

      // Parse amounts (Debit, Credit, Balance)
      const parsedAmounts = amounts.map((a) => parseAmount(a));
      let debit: number | null = null;
      let credit: number | null = null;
      let balance: number | null = null;

      const lineLower = line.toLowerCase();
      const isCr = lineLower.includes(' cr') || lineLower.includes('/cr') || lineLower.includes('credit') || lineLower.includes('deposit');

      if (parsedAmounts.length === 1) {
        if (isCr) credit = parsedAmounts[0];
        else debit = parsedAmounts[0];
      } else if (parsedAmounts.length >= 2) {
        // Typically Amount + Balance OR Debit + Credit + Balance
        if (parsedAmounts.length === 2) {
          if (isCr) credit = parsedAmounts[0];
          else debit = parsedAmounts[0];
          balance = parsedAmounts[1];
        } else {
          // 3 amounts: debit, credit, balance
          debit = parsedAmounts[0] > 0 ? parsedAmounts[0] : null;
          credit = parsedAmounts[1] > 0 ? parsedAmounts[1] : null;
          balance = parsedAmounts[2];
        }
      }

      const amount = debit || credit || 0;
      if (amount <= 0) continue;

      const { suggestedLedger, confidence, transactionType } = classifyNarration(
        narrationPart,
        debit,
        credit,
        ledgers
      );

      detectedTxns.push({
        id: `txn_${statementId}_${detectedTxns.length}_${Math.random().toString(36).slice(2, 7)}`,
        statementId,
        date: dateStr,
        narration: narrationPart,
        debit,
        credit,
        amount,
        balance,
        transactionType,
        suggestedLedger,
        finalLedger: suggestedLedger,
        confidence,
        reviewStatus: 'PENDING',
        tallyStatus: 'NOT_PUSHED',
        fingerprint: generateFingerprint(dateStr, amount, narrationPart),
      });
    }

    if (detectedTxns.length === 0) {
      return {
        transactions: [],
        needsColumnMapping: false,
        detectedHeaders: [],
        rawRows: [],
        error: 'Could not automatically identify transaction rows in this PDF statement. Please ensure it is not scanned/image-only or try exporting as Excel / CSV.',
      };
    }

    return {
      transactions: detectedTxns,
      needsColumnMapping: false,
      detectedHeaders: ['Date', 'Narration', 'Debit', 'Credit', 'Balance'],
      rawRows: [],
    };
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    return {
      transactions: [],
      needsColumnMapping: false,
      detectedHeaders: [],
      rawRows: [],
      error: `Could not read this statement: ${err.message || 'Unknown PDF error'}. Please try Excel or CSV format.`,
    };
  }
}
