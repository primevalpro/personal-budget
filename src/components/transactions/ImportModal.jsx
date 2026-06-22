import { useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { buildImportBatch } from '../../utils/categoryBatch';
import { monthLabel } from '../../utils/dateUtils';

// ── CSV parsing ────────────────────────────────────────────────

function parseCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

function parseCSVDate(raw) {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  const [, mo, dd, yyyy] = m;
  return `${yyyy}-${mo.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const descIdx = headers.indexOf('description');
  const origIdx = headers.indexOf('original description');
  const catIdx = headers.indexOf('category');
  const amtIdx = headers.indexOf('amount');

  if (dateIdx === -1 || amtIdx === -1) return [];

  return lines.slice(1).flatMap(line => {
    const cols = parseCSVLine(line);
    const date = parseCSVDate(cols[dateIdx] ?? '');
    if (!date) return [];
    const amount = parseFloat((cols[amtIdx] ?? '').trim());
    if (isNaN(amount)) return [];
    return [{
      date,
      month: date.slice(0, 7),
      description: cols[descIdx]?.trim() ?? '',
      originalDescription: cols[origIdx]?.trim() ?? cols[descIdx]?.trim() ?? '',
      category: cols[catIdx]?.trim() ?? '',
      amount,
    }];
  });
}

// ── Classification helpers ─────────────────────────────────────

function getSkipReason(row) {
  const desc = row.originalDescription.toUpperCase();
  if (desc.includes('USAA FUNDS TRANSFER')) return 'Internal transfer';
  if (desc.includes('BRANCHAPP')) return 'Income — already logged';
  if (row.category === 'Credit Card Payment') return 'Credit card payment';
  if (row.amount > 0) return 'Income / credit';
  return null;
}

function findRuleMatch(row, rules) {
  const desc = row.originalDescription.toLowerCase();
  for (const rule of rules) {
    if (desc.includes(rule.keyword.toLowerCase())) return rule;
  }
  return null;
}

// ── Component ──────────────────────────────────────────────────

export default function ImportModal({ uid, goals, obligations, buckets, categoryRules, onClose }) {
  const fileRef = useRef(null);
  const [stage, setStage] = useState('idle'); // idle | month-pick | importing
  const [error, setError] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    let text;
    try { text = await file.text(); }
    catch { setError('Could not read the file.'); return; }

    const rows = parseCSV(text);
    if (rows.length === 0) {
      setError('No valid rows found. Make sure this is a USAA CSV export.');
      return;
    }

    const months = [...new Set(rows.map(r => r.month))].filter(Boolean).sort();
    if (months.length === 0) {
      setError('Could not parse dates from this file.');
      return;
    }

    setParsedRows(rows);
    setAvailableMonths(months);

    if (months.length === 1) {
      await runImport(rows, months[0]);
    } else {
      setSelectedMonth(months[months.length - 1]);
      setStage('month-pick');
    }
  }

  async function runImport(rows, month) {
    setStage('importing');
    try {
      // Fetch existing transactions for this month to detect duplicates
      const existingSnap = await getDocs(
        query(collection(db, 'users', uid, 'transactions'), where('month', '==', month))
      );
      const existingKeys = new Set(
        existingSnap.docs.map(d => {
          const data = d.data();
          return `${data.date}|${data.originalDescription}|${data.amount}`;
        })
      );

      // Filter to selected month, remove duplicates
      let filtered = rows
        .filter(r => r.month === month)
        .filter(r => !existingKeys.has(`${r.date}|${r.originalDescription}|${r.amount}`));

      if (filtered.length === 0) {
        onClose();
        return;
      }

      // Classify each row
      const importRows = filtered.map(row => {
        const skipReason = getSkipReason(row);
        if (skipReason) {
          return { ...row, categoryType: 'skipped', categoryId: null, categoryName: null };
        }
        const match = findRuleMatch(row, categoryRules);
        if (match) {
          return {
            ...row,
            categoryType: match.categoryType,
            categoryId: match.categoryId,
            categoryName: match.categoryName,
          };
        }
        return { ...row, categoryType: null, categoryId: null, categoryName: null };
      });

      const batch = buildImportBatch(uid, importRows, obligations);
      await batch.commit();
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      setError('Import failed. Please try again.');
      setStage('idle');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>Import CSV</h2>
          <button
            onClick={onClose}
            className="text-lg leading-none hover:opacity-70"
            style={{ color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {stage === 'importing' && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
          </div>
        )}

        {stage === 'month-pick' && (
          <>
            <p className="text-sm" style={{ color: '#64748b' }}>
              This file spans {availableMonths.length} months. Select which month to import.
            </p>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f1f5f9' }}
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <button
              onClick={() => runImport(parsedRows, selectedMonth)}
              className="py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
            >
              Import {monthLabel(selectedMonth)}
            </button>
          </>
        )}

        {stage === 'idle' && (
          <>
            <p className="text-sm" style={{ color: '#64748b' }}>
              Select a USAA CSV export. Transactions are imported immediately — duplicates and auto-skip rules are applied automatically.
            </p>
            {error && (
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => { setError(null); fileRef.current?.click(); }}
              className="py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
            >
              Choose File
            </button>
          </>
        )}
      </div>
    </div>
  );
}
