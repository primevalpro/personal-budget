import { useRef, useState } from 'react';
import { collection, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { buildImportBatch, applyOne } from '../../utils/categoryBatch';
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

// Columns: Date,Description,Original Description,Category,Type,Amount
// Date format: YYYY-MM-DD  |  Amount: negative = debit
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const descIdx = headers.indexOf('description');
  const origIdx = headers.indexOf('original description');
  const catIdx  = headers.indexOf('category');
  const amtIdx  = headers.indexOf('amount');

  if (dateIdx === -1 || amtIdx === -1) return [];

  return lines.slice(1).flatMap(line => {
    const cols = parseCSVLine(line);
    const date = (cols[dateIdx] ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
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

// ── Helpers ────────────────────────────────────────────────────

function fmtAmt(n) {
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
}

// ── Component ──────────────────────────────────────────────────

export default function ImportModal({ uid, goals, obligations, buckets, categoryRules, onClose }) {
  const fileRef = useRef(null);
  const [stage, setStage] = useState('idle'); // idle | month-pick | importing | review | confirming
  const [error, setError] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [reviewData, setReviewData] = useState(null); // { importRows, nullExisting, duplicates, freshRules }
  const [dupOpen, setDupOpen] = useState(false);

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
    console.log('[Import] runImport called — month:', month);
    setStage('importing');
    try {
      const rulesSnap = await getDocs(collection(db, 'users', uid, 'categoryRules'));
      const freshRules = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log('[Import] fresh rules from Firestore:', freshRules.length, freshRules.map(r => r.keyword));

      const existingSnap = await getDocs(
        query(collection(db, 'users', uid, 'transactions'), where('month', '==', month))
      );
      // Amendment 14: match on date + amount only (drop originalDescription from key)
      const existingByKey = new Map(
        existingSnap.docs.map(d => {
          const data = d.data();
          return [`${data.date}|${data.amount}`, { id: d.id, ...data }];
        })
      );
      console.log('[Import] existing transactions this month:', existingByKey.size);

      const monthRows = rows.filter(r => r.month === month);
      const duplicates  = [];
      const newRows     = [];
      const nullExisting = [];

      for (const row of monthRows) {
        const existing = existingByKey.get(`${row.date}|${row.amount}`);
        if (existing) {
          duplicates.push({
            date: row.date,
            csvDescription: row.originalDescription,
            amount: row.amount,
            matchedDescription: existing.originalDescription ?? '',
          });
          if (existing.categoryType === null) {
            nullExisting.push({ ...row, existingId: existing.id });
          }
        } else {
          newRows.push(row);
        }
      }

      console.log('[Import] new rows:', newRows.length, '| nullExisting eligible for re-cat:', nullExisting.length, '| duplicates:', duplicates.length);

      if (newRows.length === 0 && nullExisting.length === 0 && duplicates.length === 0) {
        console.log('[Import] nothing to do — closing');
        onClose();
        return;
      }

      // Classify new rows
      const importRows = newRows.map(row => {
        const skipReason = getSkipReason(row);
        if (skipReason) {
          console.log('[Import] skip:', row.originalDescription, '—', skipReason);
          return { ...row, categoryType: 'skipped', categoryId: null, categoryName: null };
        }
        const match = findRuleMatch(row, freshRules);
        if (match && match.categoryType && match.categoryId) {
          console.log('[Import] rule match:', row.originalDescription, '→', match.categoryType, '/', match.categoryName);
          return { ...row, categoryType: match.categoryType, categoryId: match.categoryId, categoryName: match.categoryName || null };
        }
        console.log('[Import] no rule match for:', row.originalDescription);
        return { ...row, categoryType: null, categoryId: null, categoryName: null };
      });

      setReviewData({ importRows, nullExisting, duplicates, freshRules });
      setDupOpen(false);
      setStage('review');
    } catch (err) {
      console.error('[Import] classify failed:', err);
      setError('Import failed. Please try again.');
      setStage('idle');
    }
  }

  async function handleConfirm() {
    if (!reviewData) return;
    const { importRows, nullExisting, freshRules } = reviewData;
    setStage('confirming');
    try {
      const batch = buildImportBatch(uid, importRows, obligations);

      for (const row of nullExisting) {
        const match = findRuleMatch(row, freshRules);
        if (match && match.categoryType && match.categoryId) {
          console.log('[Import] re-categorizing existing null tx:', row.originalDescription, '→', match.categoryType, '/', match.categoryName);
          batch.update(doc(db, 'users', uid, 'transactions', row.existingId), {
            categoryType: match.categoryType,
            categoryId: match.categoryId,
            categoryName: match.categoryName || null,
          });
          applyOne(batch, uid, match.categoryType, match.categoryId, row.amount, obligations);
        }
      }

      console.log('[Import] committing batch…');
      await batch.commit();
      console.log('[Import] batch committed — done');
      onClose();
    } catch (err) {
      console.error('[Import] commit failed:', err);
      setError('Import failed. Please try again.');
      setStage('review');
    }
  }

  const hasWorkToCommit = reviewData && (reviewData.importRows.length > 0 || reviewData.nullExisting.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className={`w-full ${stage === 'review' ? 'max-w-lg' : 'max-w-sm'} rounded-2xl p-6 flex flex-col gap-4`}
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

        {(stage === 'importing' || stage === 'confirming') && (
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

        {stage === 'review' && reviewData && (
          <>
            {/* Summary */}
            <div className="flex flex-col gap-1">
              {reviewData.importRows.length > 0 && (
                <p className="text-sm" style={{ color: '#f1f5f9' }}>
                  {reviewData.importRows.filter(r => r.categoryType !== 'skipped').length} new transaction{reviewData.importRows.filter(r => r.categoryType !== 'skipped').length !== 1 ? 's' : ''} to import
                  {reviewData.importRows.filter(r => r.categoryType === 'skipped').length > 0 &&
                    `, ${reviewData.importRows.filter(r => r.categoryType === 'skipped').length} auto-skipped`}
                </p>
              )}
              {reviewData.nullExisting.length > 0 && (
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  {reviewData.nullExisting.length} existing transaction{reviewData.nullExisting.length !== 1 ? 's' : ''} eligible for re-categorization
                </p>
              )}
              {!hasWorkToCommit && (
                <p className="text-sm" style={{ color: '#94a3b8' }}>Nothing new to import.</p>
              )}
            </div>

            {/* Duplicates panel */}
            {reviewData.duplicates.length > 0 && (
              <div style={{ border: '1px solid #2a2d3e', borderRadius: 8 }}>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:opacity-80 transition-opacity"
                  style={{ color: '#94a3b8' }}
                  onClick={() => setDupOpen(o => !o)}
                >
                  <span style={{ fontSize: 10 }}>{dupOpen ? '▼' : '▶'}</span>
                  <span>
                    {reviewData.duplicates.length} possible duplicate{reviewData.duplicates.length !== 1 ? 's' : ''} skipped
                  </span>
                </button>
                {dupOpen && (
                  <div className="overflow-x-auto" style={{ borderTop: '1px solid #2a2d3e' }}>
                    <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: '#64748b' }}>
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Date</th>
                          <th className="text-left px-3 py-2 font-medium">CSV description</th>
                          <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Amount</th>
                          <th className="text-left px-3 py-2 font-medium">Matched against</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewData.duplicates.map((d, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #2a2d3e' }}>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#f1f5f9' }}>{d.date}</td>
                            <td className="px-3 py-2" style={{ color: '#f1f5f9', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.csvDescription}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap font-mono" style={{ color: '#f1f5f9' }}>
                              {fmtAmt(d.amount)}
                            </td>
                            <td className="px-3 py-2" style={{ color: '#94a3b8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.matchedDescription}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}

            {hasWorkToCommit ? (
              <button
                onClick={handleConfirm}
                className="py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
              >
                Confirm Import
              </button>
            ) : (
              <button
                onClick={onClose}
                className="py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
              >
                Done
              </button>
            )}
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
