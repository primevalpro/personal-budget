import { useState, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import ImportReviewScreen from './ImportReviewScreen';
import { monthLabel } from '../../utils/dateUtils';

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = parseCSVRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]));
  });
}

function toISODate(mmddyyyy) {
  const [m, d, y] = mmddyyyy.split('/');
  if (!y) return mmddyyyy;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toMonth(isoDate) {
  return isoDate.slice(0, 7);
}

const AUTO_SKIP = [
  { test: r => r.originalDescription.toUpperCase().includes('USAA FUNDS TRANSFER'), reason: 'Internal transfer' },
  { test: r => r.originalDescription.toUpperCase().includes('BRANCHAPP'), reason: 'Income — already logged' },
  { test: r => r.category === 'Credit Card Payment', reason: 'Credit card payment' },
  { test: r => r.amount > 0, reason: 'Income / credit' },
];

export default function ImportModal({ uid, goals, obligations, categoryRules, onImport, onClose }) {
  const [step, setStep] = useState('upload');
  const [parsedRows, setParsedRows] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [reviewRows, setReviewRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  async function processFile(file) {
    setError('');
    if (!file?.name.endsWith('.csv')) { setError('Please select a .csv file.'); return; }
    const text = await file.text();
    const raw = parseCSV(text);
    const normalized = raw
      .filter(r => r['Date'] && r['Amount'])
      .map(r => ({
        date: toISODate((r['Date'] || '').trim()),
        description: (r['Description'] || r['Original Description'] || '').trim(),
        originalDescription: (r['Original Description'] || r['Description'] || '').trim(),
        category: (r['Category'] || '').trim(),
        amount: parseFloat((r['Amount'] || '0').replace(/[^0-9.\-]/g, '')),
        status: (r['Status'] || 'Posted').trim(),
      }))
      .filter(r => !isNaN(r.amount));

    if (normalized.length === 0) { setError('No valid transactions found in file.'); return; }

    const months = [...new Set(normalized.map(r => toMonth(r.date)))].sort();
    setParsedRows(normalized);
    setAvailableMonths(months);

    if (months.length > 1) {
      setSelectedMonth(months[months.length - 1]);
      setStep('month-select');
    } else {
      await buildReview(months[0], normalized);
    }
  }

  async function buildReview(month, rows = parsedRows) {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'transactions'), where('month', '==', month))
      );
      const existing = snap.docs.map(d => d.data());
      const monthRows = rows.filter(r => toMonth(r.date) === month);
      const deduped = monthRows.filter(r =>
        !existing.some(e => e.date === r.date && e.originalDescription === r.originalDescription && e.amount === r.amount)
      );

      const processed = deduped.map(row => {
        const skip = AUTO_SKIP.find(s => s.test(row));
        if (skip) {
          return { ...row, month, categoryType: 'skipped', categoryId: null, categoryName: 'Skipped', matchedByRule: false, skipReason: skip.reason };
        }
        const rule = categoryRules.find(r =>
          row.originalDescription.toLowerCase().includes(r.keyword.toLowerCase())
        );
        if (rule) {
          return { ...row, month, categoryType: rule.categoryType, categoryId: rule.categoryId, categoryName: rule.categoryName, matchedByRule: true, skipReason: null };
        }
        return { ...row, month, categoryType: null, categoryId: null, categoryName: '', matchedByRule: false, skipReason: null };
      });

      setSelectedMonth(month);
      setReviewRows(processed);
      setStep('review');
    } catch (e) {
      setError('Failed to check for duplicates: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(data) {
    await onImport(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div
        className="flex flex-col w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: '#2a2d3e' }}>
          <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
            {step === 'upload' && 'Import CSV'}
            {step === 'month-select' && 'Select month'}
            {step === 'review' && `Review — ${monthLabel(selectedMonth)}`}
          </h2>
          <button onClick={onClose} className="text-lg hover:opacity-60" style={{ color: '#64748b' }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {step === 'upload' && (
            <div className="p-6 flex flex-col items-center gap-4">
              <div
                className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-12 gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: '#2a2d3e' }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); processFile(e.dataTransfer.files[0]); }}
              >
                <span className="text-3xl">📂</span>
                <span className="text-sm" style={{ color: '#f1f5f9' }}>Click or drag a USAA CSV file here</span>
                <span className="text-xs" style={{ color: '#64748b' }}>Accepts .csv only</span>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => processFile(e.target.files[0])} />
              {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
              {loading && <p className="text-sm" style={{ color: '#64748b' }}>Processing…</p>}
            </div>
          )}

          {step === 'month-select' && (
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm" style={{ color: '#64748b' }}>
                This file contains transactions from multiple months. Which month would you like to import?
              </p>
              <div className="flex flex-col gap-2">
                {availableMonths.map(m => (
                  <label key={m} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="month"
                      value={m}
                      checked={selectedMonth === m}
                      onChange={() => setSelectedMonth(m)}
                      className="accent-indigo-500"
                    />
                    <span className="text-sm" style={{ color: '#f1f5f9' }}>{monthLabel(m)}</span>
                  </label>
                ))}
              </div>
              {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setStep('upload')}
                  className="text-sm px-4 py-2 rounded-lg border"
                  style={{ borderColor: '#2a2d3e', color: '#64748b' }}
                >
                  Back
                </button>
                <button
                  onClick={() => buildReview(selectedMonth)}
                  disabled={loading}
                  className="text-sm px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: '#6366f1', color: '#fff', opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? 'Loading…' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <ImportReviewScreen
              rows={reviewRows}
              goals={goals}
              obligations={obligations}
              onConfirm={handleConfirm}
              onBack={() => setStep(availableMonths.length > 1 ? 'month-select' : 'upload')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
