import { useState } from 'react';
import { formatCurrency } from '../../utils/dateUtils';

export default function BucketItem({ bucket, onUpdate, onDelete, onAddFunds, onWithdraw }) {
  const [mode, setMode] = useState(null); // null | 'add' | 'withdraw' | 'edit' | 'delete'
  const [inputAmount, setInputAmount] = useState('');
  const [editName, setEditName] = useState(bucket.name);
  const [editTarget, setEditTarget] = useState(String(bucket.targetAmount));

  const current = bucket.currentAmount || 0;
  const pct = bucket.targetAmount > 0 ? current / bucket.targetAmount : 0;
  const isComplete = pct >= 1;
  const pctDisplay = Math.round(Math.min(pct * 100, 100));

  function reset() {
    setMode(null);
    setInputAmount('');
  }

  async function handleFunds() {
    const amount = Number(inputAmount);
    if (isNaN(amount) || amount <= 0) return;
    await onAddFunds(bucket.id, amount);
    reset();
  }

  async function handleWithdraw() {
    const amount = Number(inputAmount);
    if (isNaN(amount) || amount <= 0) return;
    await onWithdraw(bucket.id, amount, current);
    reset();
  }

  async function saveEdit() {
    const name = editName.trim();
    const targetAmount = Number(editTarget);
    if (!name || isNaN(targetAmount) || targetAmount < 0) return;
    await onUpdate(bucket.id, { name, targetAmount });
    setMode(null);
  }

  function amountKeyDown(handler) {
    return e => {
      if (e.key === 'Enter') handler();
      if (e.key === 'Escape') reset();
    };
  }

  function editKeyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setMode(null);
  }

  if (mode === 'edit') {
    return (
      <div className="flex items-center gap-2 py-3 px-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
        <input
          className="flex-1 min-w-0 bg-transparent border rounded-lg px-2 py-1.5 text-sm"
          style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={editKeyDown}
          placeholder="Name"
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
          placeholder="Target"
        />
        <button
          onClick={saveEdit}
          className="px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
        >
          Save
        </button>
        <button
          onClick={() => setMode(null)}
          className="px-3 py-1.5 rounded-lg text-sm border"
          style={{ borderColor: '#2a2d3e', color: '#64748b' }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (mode === 'delete') {
    return (
      <div className="flex items-center justify-between gap-2 py-3 px-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
        <span className="text-sm" style={{ color: '#f1f5f9' }}>
          Delete <span className="font-semibold">{bucket.name}</span>?
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onDelete(bucket.id)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}
          >
            Delete
          </button>
          <button
            onClick={() => setMode(null)}
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
      {/* Name row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>
            {bucket.name}
          </span>
          {isComplete && (
            <span
              className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}
            >
              ✓
            </span>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
          <button
            onClick={() => { setEditName(bucket.name); setEditTarget(String(bucket.targetAmount)); setMode('edit'); }}
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

      {/* Amount + percentage */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs tabular-nums" style={{ color: '#64748b' }}>
          {formatCurrency(current)} / {formatCurrency(bucket.targetAmount)}
        </span>
        <span
          className="text-xs font-semibold tabular-nums"
          style={{ color: isComplete ? '#22c55e' : '#64748b' }}
        >
          {pctDisplay}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#0f1117' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pctDisplay}%`,
            backgroundColor: isComplete ? '#22c55e' : '#6366f1',
          }}
        />
      </div>

      {/* Add / Withdraw buttons */}
      {mode === null && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('add')}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
          >
            Add funds
          </button>
          <button
            onClick={() => setMode('withdraw')}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-opacity hover:opacity-80"
            style={{ borderColor: '#2a2d3e', color: '#64748b' }}
          >
            Withdraw
          </button>
        </div>
      )}

      {/* Amount input */}
      {(mode === 'add' || mode === 'withdraw') && (
        <div className="flex gap-2">
          <input
            className="flex-1 bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums outline-none"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            type="number"
            min="0.01"
            step="0.01"
            placeholder={mode === 'add' ? 'Amount to add' : 'Amount to withdraw'}
            value={inputAmount}
            onChange={e => setInputAmount(e.target.value)}
            onKeyDown={amountKeyDown(mode === 'add' ? handleFunds : handleWithdraw)}
            autoFocus
          />
          <button
            onClick={mode === 'add' ? handleFunds : handleWithdraw}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: mode === 'add' ? '#6366f1' : '#374151',
              color: '#f1f5f9',
            }}
          >
            {mode === 'add' ? 'Add' : 'Withdraw'}
          </button>
          <button
            onClick={reset}
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
