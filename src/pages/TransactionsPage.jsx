import { useState } from 'react';
import { doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTransactions } from '../hooks/useTransactions';
import { formatCurrency, monthLabel, currentMonth } from '../utils/dateUtils';
import { applyOne, reverseOne } from '../utils/categoryBatch';
import { AssignableRow, CategorizedRow } from '../components/transactions/TransactionRow';
import ImportModal from '../components/transactions/ImportModal';
import AddTransactionModal from '../components/transactions/AddTransactionModal';

// Generate up to 12 month options (current + 11 previous)
function buildMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: monthLabel(value) });
  }
  return options;
}

const MONTH_OPTIONS = buildMonthOptions();

function ChevronIcon({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function formatLastImport(transactions) {
  let max = 0;
  for (const tx of transactions) {
    const ms = tx.importedAt?.toMillis?.() ?? 0;
    if (ms > max) max = ms;
  }
  if (!max) return null;
  return new Date(max).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Groups categorized transactions by categoryType:categoryId
function groupByCategory(txs) {
  const map = new Map();
  for (const tx of txs) {
    if (!tx.categoryType || tx.categoryType === 'skipped') continue;
    const key = `${tx.categoryType}:${tx.categoryId}`;
    if (!map.has(key)) {
      map.set(key, { categoryType: tx.categoryType, categoryId: tx.categoryId, categoryName: tx.categoryName, txs: [] });
    }
    map.get(key).txs.push(tx);
  }
  return [...map.values()].sort((a, b) => (a.categoryName || '').localeCompare(b.categoryName || ''));
}

function CollapsibleGroup({ title, totalAmount, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2d3e' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-3 text-left hover:opacity-80 transition-opacity"
        style={{ backgroundColor: '#1a1d27' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: '#64748b' }}><ChevronIcon open={open} /></span>
          <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{title}</span>
        </div>
        {totalAmount != null && (
          <span className="text-sm tabular-nums font-medium" style={{ color: '#94a3b8' }}>
            {formatCurrency(totalAmount)}
          </span>
        )}
      </button>
      {open && (
        <div style={{ backgroundColor: '#0f1117' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage({ uid, goals, obligations, buckets, categoryRules }) {
  const [month, setMonth] = useState(currentMonth());
  const [view, setView] = useState('category'); // 'category' | 'date'
  const [showImport, setShowImport] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const { transactions, loading } = useTransactions(uid, month);

  // Detect orphaned transactions — category no longer exists in loaded data
  const goalIds = new Set(goals.map(g => g.id));
  const obIds = new Set(obligations.map(o => o.id));
  const bucketIds = new Set(buckets.map(b => b.id));
  function isOrphaned(tx) {
    if (!tx.categoryType || tx.categoryType === 'skipped') return false;
    if (tx.categoryType === 'goal') return !goalIds.has(tx.categoryId);
    if (tx.categoryType === 'obligation') return !obIds.has(tx.categoryId);
    if (tx.categoryType === 'bucket') return !bucketIds.has(tx.categoryId);
    return false;
  }

  const uncategorized = transactions.filter(tx => tx.categoryType === null || isOrphaned(tx));
  const skipped = transactions.filter(tx => tx.categoryType === 'skipped');
  const categorized = transactions.filter(tx => tx.categoryType && tx.categoryType !== 'skipped' && !isOrphaned(tx));

  const nonSkipped = transactions.filter(tx => tx.categoryType !== 'skipped');
  const totalSpent = nonSkipped.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const lastImport = formatLastImport(transactions);

  // ── Write helpers ──────────────────────────────────────────

  async function handleSaveCategory(tx, category) {
    console.log('[Assign] tx.id:', tx.id, 'amount:', tx.amount, 'category:', category);
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'transactions', tx.id), {
      categoryType: category.categoryType,
      categoryId: category.categoryId,
      categoryName: category.categoryName,
    });
    applyOne(batch, uid, category.categoryType, category.categoryId, tx.amount, obligations);
    try {
      await batch.commit();
      console.log('[Assign] batch committed ok');
    } catch (err) {
      console.error('[Assign] batch commit FAILED:', err);
    }
  }

  async function handleEdit(tx, newDescription, newCategory) {
    const batch = writeBatch(db);
    await reverseOne(batch, uid, tx);
    batch.update(doc(db, 'users', uid, 'transactions', tx.id), {
      description: newDescription,
      categoryType: newCategory?.categoryType ?? null,
      categoryId: newCategory?.categoryId ?? null,
      categoryName: newCategory?.categoryName ?? null,
    });
    if (newCategory) {
      applyOne(batch, uid, newCategory.categoryType, newCategory.categoryId, tx.amount, obligations);
    }
    await batch.commit();
  }

  async function handleDelete(tx) {
    const batch = writeBatch(db);
    await reverseOne(batch, uid, tx);
    batch.delete(doc(db, 'users', uid, 'transactions', tx.id));
    await batch.commit();
  }

  // ── Render ─────────────────────────────────────────────────

  const groups = view === 'category' ? groupByCategory(transactions) : [];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-4">

        {/* Topbar */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e', color: '#f1f5f9' }}
          >
            {MONTH_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#2a2d3e' }}>
            <button
              onClick={() => setView('category')}
              className="px-3 py-2 text-xs font-medium transition-colors"
              style={{
                backgroundColor: view === 'category' ? '#6366f1' : '#1a1d27',
                color: view === 'category' ? '#f1f5f9' : '#64748b',
              }}
            >
              By category
            </button>
            <button
              onClick={() => setView('date')}
              className="px-3 py-2 text-xs font-medium transition-colors border-l"
              style={{
                borderColor: '#2a2d3e',
                backgroundColor: view === 'date' ? '#6366f1' : '#1a1d27',
                color: view === 'date' ? '#f1f5f9' : '#64748b',
              }}
            >
              By date
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowAddTx(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium border hover:opacity-80 transition-opacity"
              style={{ borderColor: '#2a2d3e', color: '#94a3b8', backgroundColor: 'transparent' }}
            >
              + Add transaction
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
            >
              Import CSV
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {transactions.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }}
          >
            <span style={{ color: '#f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Total spent </span>
              <span className="font-semibold tabular-nums">{formatCurrency(totalSpent)}</span>
            </span>
            <span style={{ color: '#64748b' }}>·</span>
            <span style={{ color: '#64748b' }}>{nonSkipped.length} transaction{nonSkipped.length !== 1 ? 's' : ''}</span>
            {lastImport && (
              <>
                <span style={{ color: '#64748b' }}>·</span>
                <span style={{ color: '#64748b' }}>Last import {lastImport}</span>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: '#64748b' }}>No transactions for {monthLabel(month)}.</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>Import a CSV to get started.</p>
          </div>
        )}

        {/* Uncategorized section */}
        {!loading && uncategorized.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-1 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#f59e0b' }}>
                Needs categorization · {uncategorized.length} transaction{uncategorized.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #f59e0b33', backgroundColor: '#1a1d27' }}>
              {uncategorized.map((tx, i) => (
                <div key={tx.id} style={i > 0 ? { borderTop: '1px solid #2a2d3e' } : {}}>
                  <AssignableRow
                    tx={tx}
                    goals={goals}
                    obligations={obligations}
                    buckets={buckets}
                    onSave={handleSaveCategory}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categorized content */}
        {!loading && categorized.length > 0 && (
          <div className="flex flex-col gap-3">
            {view === 'category' && groups.map(group => (
              <CollapsibleGroup
                key={`${group.categoryType}:${group.categoryId}`}
                title={group.categoryName || 'Unknown'}
                totalAmount={group.txs.reduce((s, tx) => s + Math.abs(tx.amount), 0)}
              >
                {group.txs.map((tx, i) => (
                  <div key={tx.id} style={i > 0 ? { borderTop: '1px solid #2a2d3e' } : {}}>
                    <CategorizedRow
                      tx={tx}
                      goals={goals}
                      obligations={obligations}
                      buckets={buckets}
                      showCategory={false}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </CollapsibleGroup>
            ))}

            {view === 'date' && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2d3e', backgroundColor: '#1a1d27' }}>
                {categorized.map((tx, i) => (
                  <div key={tx.id} style={i > 0 ? { borderTop: '1px solid #2a2d3e' } : {}}>
                    <CategorizedRow
                      tx={tx}
                      goals={goals}
                      obligations={obligations}
                      buckets={buckets}
                      showCategory
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skipped section */}
        {!loading && skipped.length > 0 && (
          <CollapsibleGroup
            title={`Skipped · ${skipped.length}`}
            totalAmount={null}
          >
            {skipped.map((tx, i) => (
              <div key={tx.id} style={i > 0 ? { borderTop: '1px solid #2a2d3e' } : {}}>
                <AssignableRow
                  tx={tx}
                  goals={goals}
                  obligations={obligations}
                  buckets={buckets}
                  onSave={handleSaveCategory}
                />
              </div>
            ))}
          </CollapsibleGroup>
        )}
      </div>

      {showImport && (
        <ImportModal
          uid={uid}
          goals={goals}
          obligations={obligations}
          buckets={buckets}
          categoryRules={categoryRules}
          onClose={() => setShowImport(false)}
        />
      )}

      {showAddTx && (
        <AddTransactionModal
          uid={uid}
          goals={goals}
          obligations={obligations}
          buckets={buckets}
          onClose={() => setShowAddTx(false)}
        />
      )}
    </div>
  );
}
