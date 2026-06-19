import { useState } from 'react';
import { formatCurrency } from '../../utils/dateUtils';

function barColor(pct) {
  if (pct >= 1) return '#ef4444';
  if (pct >= 0.8) return '#f59e0b';
  return '#6366f1';
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function GoalItem({ goal, onUpdate, onDelete, onAssign, onAddSpend, subcategories }) {
  const [mode, setMode] = useState(null); // null | 'assign' | 'spend' | 'edit' | 'delete'
  const [assignInput, setAssignInput] = useState('');
  const [spendInput, setSpendInput] = useState('');
  const [editCategory, setEditCategory] = useState(goal.category);
  const [editTarget, setEditTarget] = useState(String(goal.targetAmount));
  const [editSubcategoryId, setEditSubcategoryId] = useState(goal.subcategoryId || '');

  const assigned = goal.assignedAmount || 0;
  const spent = goal.spentAmount || 0;
  const denominator = assigned > 0 ? assigned : goal.targetAmount;
  const pct = denominator > 0 ? spent / denominator : 0;
  const fillColor = barColor(pct);

  function reset() {
    setMode(null);
    setAssignInput('');
    setSpendInput('');
  }

  async function handleAssign() {
    const val = Number(assignInput);
    if (isNaN(val) || val < 0) return;
    await onAssign(goal.id, assigned, val);
    reset();
  }

  async function handleSpend() {
    const val = Number(spendInput);
    if (isNaN(val) || val <= 0) return;
    await onAddSpend(goal.id, val);
    reset();
  }

  async function saveEdit() {
    const category = editCategory.trim();
    const targetAmount = Number(editTarget);
    if (!category || isNaN(targetAmount) || targetAmount < 0) return;
    await onUpdate(goal.id, { category, targetAmount, subcategoryId: editSubcategoryId });
    setMode(null);
  }

  function assignKeyDown(e) {
    if (e.key === 'Enter') handleAssign();
    if (e.key === 'Escape') reset();
  }

  function spendKeyDown(e) {
    if (e.key === 'Enter') handleSpend();
    if (e.key === 'Escape') reset();
  }

  function editKeyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setMode(null);
  }

  if (mode === 'edit') {
    return (
      <div className="flex flex-col gap-2 py-3 px-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 min-w-0 bg-transparent border rounded-lg px-2 py-1.5 text-sm"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            value={editCategory}
            onChange={e => setEditCategory(e.target.value)}
            onKeyDown={editKeyDown}
            placeholder="Category"
            autoFocus
          />
          <input
            className="w-28 bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            type="number"
            min="0"
            step="0.01"
            value={editTarget}
            onChange={e => setEditTarget(e.target.value)}
            onKeyDown={editKeyDown}
            placeholder="Budget"
          />
        </div>
        {subcategories && subcategories.length > 0 && (
          <select
            value={editSubcategoryId}
            onChange={e => setEditSubcategoryId(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 text-sm"
            style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f1f5f9' }}
          >
            <option value="">— Uncategorized —</option>
            {subcategories.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button onClick={saveEdit} className="flex-1 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}>Save</button>
          <button onClick={() => setMode(null)} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === 'delete') {
    return (
      <div className="flex items-center justify-between gap-2 py-3 px-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
        <span className="text-sm" style={{ color: '#f1f5f9' }}>
          Delete <span className="font-semibold">{goal.category}</span>?
        </span>
        <div className="flex gap-2">
          <button onClick={() => onDelete(goal.id)} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}>Delete</button>
          <button onClick={() => setMode(null)} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 px-2 group">
      {/* Name + actions */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{goal.category}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setAssignInput(String(assigned)); setMode('assign'); }}
            className="px-2 py-0.5 rounded text-xs font-semibold hover:opacity-80"
            style={{ color: '#6366f1' }}
            title="Assign funds"
          >
            $
          </button>
          <button
            onClick={() => setMode('spend')}
            className="px-2 py-0.5 rounded text-xs font-semibold hover:opacity-80"
            style={{ color: '#f59e0b' }}
            title="Log spend"
          >
            +
          </button>
          <button
            onClick={() => { setEditCategory(goal.category); setEditTarget(String(goal.targetAmount)); setMode('edit'); }}
            className="p-1 rounded hover:opacity-70"
            style={{ color: '#64748b' }}
            title="Edit"
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => setMode('delete')}
            className="p-1 rounded hover:opacity-70"
            style={{ color: '#ef4444' }}
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Amounts row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs tabular-nums" style={{ color: '#64748b' }}>
          Assigned:{' '}
          <span style={{ color: assigned > 0 ? '#f1f5f9' : '#64748b' }}>{formatCurrency(assigned)}</span>
        </span>
        <span
          className="text-xs tabular-nums"
          style={{ color: pct >= 1 ? '#ef4444' : pct >= 0.8 ? '#f59e0b' : '#64748b' }}
        >
          {formatCurrency(spent)}{assigned > 0 ? ` / ${formatCurrency(assigned)}` : ''}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#0f1117' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(pct * 100, 100)}%`, backgroundColor: fillColor }}
        />
      </div>

      {/* Assign input */}
      {mode === 'assign' && (
        <div className="flex gap-2 mt-2">
          <input
            className="flex-1 bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums outline-none"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            type="number"
            min="0"
            step="0.01"
            placeholder={`Currently ${formatCurrency(assigned)}`}
            value={assignInput}
            onChange={e => setAssignInput(e.target.value)}
            onKeyDown={assignKeyDown}
            autoFocus
          />
          <button onClick={handleAssign} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}>Assign</button>
          <button onClick={reset} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
        </div>
      )}

      {/* Spend input */}
      {mode === 'spend' && (
        <div className="flex gap-2 mt-2">
          <input
            className="flex-1 bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums outline-none"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount spent"
            value={spendInput}
            onChange={e => setSpendInput(e.target.value)}
            onKeyDown={spendKeyDown}
            autoFocus
          />
          <button onClick={handleSpend} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#f59e0b', color: '#0f1117' }}>Log</button>
          <button onClick={reset} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
