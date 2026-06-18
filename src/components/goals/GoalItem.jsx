import { useState } from 'react';
import { formatCurrency } from '../../utils/dateUtils';

function barColor(pct) {
  if (pct >= 1) return '#ef4444';
  if (pct >= 0.8) return '#f59e0b';
  return '#6366f1';
}

export default function GoalItem({ goal, onUpdate, onDelete, onAddSpend }) {
  const [spendMode, setSpendMode] = useState(false);
  const [spendAmount, setSpendAmount] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editCategory, setEditCategory] = useState(goal.category);
  const [editTarget, setEditTarget] = useState(String(goal.targetAmount));

  const pct = goal.targetAmount > 0 ? (goal.spentAmount || 0) / goal.targetAmount : 0;
  const fillColor = barColor(pct);
  const barWidth = `${Math.min(pct * 100, 100)}%`;

  async function handleAddSpend() {
    const amount = Number(spendAmount);
    if (isNaN(amount) || amount <= 0) return;
    await onAddSpend(goal.id, amount);
    setSpendAmount('');
    setSpendMode(false);
  }

  function spendKeyDown(e) {
    if (e.key === 'Enter') handleAddSpend();
    if (e.key === 'Escape') { setSpendMode(false); setSpendAmount(''); }
  }

  async function saveEdit() {
    const category = editCategory.trim();
    const targetAmount = Number(editTarget);
    if (!category || isNaN(targetAmount) || targetAmount < 0) return;
    await onUpdate(goal.id, { category, targetAmount });
    setEditing(false);
  }

  function editKeyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-3 px-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
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
        <button
          onClick={saveEdit}
          className="px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-1.5 rounded-lg text-sm border"
          style={{ borderColor: '#2a2d3e', color: '#64748b' }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center justify-between gap-2 py-3 px-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
        <span className="text-sm" style={{ color: '#f1f5f9' }}>
          Delete <span className="font-semibold">{goal.category}</span>?
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onDelete(goal.id)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-3 py-1.5 rounded-lg text-sm border"
            style={{ borderColor: '#2a2d3e', color: '#64748b' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 px-2 rounded-lg group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
          {goal.category}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs tabular-nums mr-1" style={{ color: '#64748b' }}>
            {formatCurrency(goal.spentAmount || 0)} / {formatCurrency(goal.targetAmount)}
          </span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => { setSpendMode(true); setConfirmDelete(false); setEditing(false); }}
              className="px-2 py-0.5 rounded text-xs font-semibold hover:opacity-80"
              style={{ color: '#6366f1' }}
              title="Log spending"
            >
              +$
            </button>
            <button
              onClick={() => { setEditCategory(goal.category); setEditTarget(String(goal.targetAmount)); setEditing(true); setConfirmDelete(false); }}
              className="p-1 rounded hover:opacity-70"
              style={{ color: '#64748b' }}
              title="Edit"
            >
              <PencilIcon />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded hover:opacity-70"
              style={{ color: '#ef4444' }}
              title="Delete"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#0f1117' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: barWidth, backgroundColor: fillColor }}
        />
      </div>

      {/* Spend input */}
      {spendMode && (
        <div className="flex gap-2 mt-2">
          <input
            className="flex-1 bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums outline-none"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount spent"
            value={spendAmount}
            onChange={e => setSpendAmount(e.target.value)}
            onKeyDown={spendKeyDown}
            autoFocus
          />
          <button
            onClick={handleAddSpend}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
          >
            Add
          </button>
          <button
            onClick={() => { setSpendMode(false); setSpendAmount(''); }}
            className="px-3 py-1.5 rounded-lg text-sm border"
            style={{ borderColor: '#2a2d3e', color: '#64748b' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
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
