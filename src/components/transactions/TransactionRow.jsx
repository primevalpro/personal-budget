import { useState } from 'react';
import { formatCurrency } from '../../utils/dateUtils';

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function txDateShort(dateStr) {
  const [, m, d] = (dateStr || '').split('-');
  if (!m) return dateStr || '';
  return `${m}/${d}`;
}

function CategorySelect({ goals, obligations, buckets, value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 border rounded-lg px-2 py-1.5 text-xs outline-none min-w-0"
      style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: value ? '#f1f5f9' : '#64748b' }}
    >
      <option value="">— Select category —</option>
      <optgroup label="Monthly Budgets">
        {goals.map(g => (
          <option key={g.id} value={`goal:${g.id}`}>{g.category}</option>
        ))}
      </optgroup>
      <optgroup label="Obligations">
        {obligations.map(o => (
          <option key={o.id} value={`obligation:${o.id}`}>{o.name}</option>
        ))}
      </optgroup>
      <optgroup label="Funds">
        {buckets.map(b => (
          <option key={b.id} value={`bucket:${b.id}`}>{b.name}</option>
        ))}
      </optgroup>
      <option value="skipped:">Skipped</option>
    </select>
  );
}

function resolveCategoryValue(val, goals, obligations, buckets) {
  if (!val) return null;
  const colonIdx = val.indexOf(':');
  const type = val.slice(0, colonIdx);
  const id = val.slice(colonIdx + 1) || null;
  if (type === 'skipped') return { categoryType: 'skipped', categoryId: null, categoryName: null };
  let name = '';
  if (type === 'goal') name = goals.find(g => g.id === id)?.category || '';
  else if (type === 'obligation') name = obligations.find(o => o.id === id)?.name || '';
  else if (type === 'bucket') name = buckets.find(b => b.id === id)?.name || '';
  return { categoryType: type, categoryId: id, categoryName: name };
}

function encodeCategoryValue(tx) {
  if (!tx.categoryType) return '';
  return `${tx.categoryType}:${tx.categoryId || ''}`;
}

// ── Uncategorized / Skipped row (dropdown shown by default) ───

export function AssignableRow({ tx, goals, obligations, buckets, onSave }) {
  const [catVal, setCatVal] = useState(encodeCategoryValue(tx));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const category = resolveCategoryValue(catVal, goals, obligations, buckets);
    if (!category) return;
    setSaving(true);
    await onSave(tx, category);
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-2 py-3 px-3">
      <div className="flex items-center gap-3">
        <span className="text-xs tabular-nums flex-shrink-0 w-10" style={{ color: '#64748b' }}>
          {txDateShort(tx.date)}
        </span>
        <span className="flex-1 text-sm truncate" style={{ color: '#f1f5f9' }}>
          {tx.description}
        </span>
        <span className="text-sm tabular-nums flex-shrink-0 font-medium" style={{ color: '#f1f5f9' }}>
          {formatCurrency(Math.abs(tx.amount))}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <CategorySelect
          goals={goals}
          obligations={obligations}
          buckets={buckets}
          value={catVal}
          onChange={setCatVal}
        />
        <button
          onClick={handleSave}
          disabled={!catVal || saving}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold disabled:opacity-30 hover:opacity-80 transition-opacity"
          style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
        >
          ✓
        </button>
      </div>
    </div>
  );
}

// ── Categorized row (display + edit/delete) ───────────────────

export function CategorizedRow({ tx, goals, obligations, buckets, onEdit, onDelete, showCategory }) {
  const [mode, setMode] = useState('display'); // display | edit | delete
  const [editDesc, setEditDesc] = useState(tx.description || '');
  const [editCatVal, setEditCatVal] = useState(encodeCategoryValue(tx));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSaveEdit() {
    const category = resolveCategoryValue(editCatVal, goals, obligations, buckets);
    setSaving(true);
    setError(null);
    try {
      await onEdit(tx, editDesc.trim() || tx.description, category);
      setMode('display');
    } catch (err) {
      console.error('Edit failed:', err);
      setError('Save failed — try again');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await onDelete(tx);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Delete failed — try again');
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditDesc(tx.description || '');
    setEditCatVal(encodeCategoryValue(tx));
    setMode('display');
  }

  if (mode === 'delete') {
    return (
      <div className="flex flex-col gap-1 py-3 px-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm flex-1 min-w-0 truncate" style={{ color: '#f1f5f9' }}>
            Delete <span className="font-semibold">{tx.description}</span>?
          </span>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}
          >
            Delete
          </button>
          <button
            onClick={() => { setMode('display'); setError(null); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs border"
            style={{ borderColor: '#2a2d3e', color: '#64748b' }}
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      </div>
    );
  }

  if (mode === 'edit') {
    return (
      <div className="flex flex-col gap-2 py-3 px-3">
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums flex-shrink-0 w-10" style={{ color: '#64748b' }}>
            {txDateShort(tx.date)}
          </span>
          <input
            className="flex-1 min-w-0 bg-transparent border rounded-lg px-2 py-1 text-sm outline-none"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
          />
          <span className="text-sm tabular-nums flex-shrink-0 font-medium" style={{ color: '#f1f5f9' }}>
            {formatCurrency(Math.abs(tx.amount))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CategorySelect
            goals={goals}
            obligations={obligations}
            buckets={buckets}
            value={editCatVal}
            onChange={setEditCatVal}
          />
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold disabled:opacity-30 hover:opacity-80"
            style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
          >
            ✓
          </button>
          <button
            onClick={cancelEdit}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-sm border hover:opacity-80"
            style={{ borderColor: '#2a2d3e', color: '#64748b' }}
          >
            ✕
          </button>
        </div>
        {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 px-3 group">
      <span className="text-xs tabular-nums flex-shrink-0 w-10" style={{ color: '#64748b' }}>
        {txDateShort(tx.date)}
      </span>
      <span className="flex-1 text-sm truncate" style={{ color: '#f1f5f9' }}>
        {tx.description}
      </span>
      {showCategory && tx.categoryName && (
        <span
          className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded truncate max-w-[6rem]"
          style={{ backgroundColor: '#1e2030', color: '#94a3b8', border: '1px solid #2a2d3e' }}
          title={tx.categoryName}
        >
          {tx.categoryName}
        </span>
      )}
      <span className="text-sm tabular-nums flex-shrink-0 font-medium" style={{ color: '#f1f5f9' }}>
        {formatCurrency(Math.abs(tx.amount))}
      </span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => setMode('edit')}
          className="p-1.5 rounded hover:opacity-70"
          style={{ color: '#64748b' }}
          title="Edit"
        >
          <PencilIcon />
        </button>
        <button
          onClick={() => setMode('delete')}
          className="p-1.5 rounded hover:opacity-70"
          style={{ color: '#ef4444' }}
          title="Delete"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
