import { useState } from 'react';
import { formatCurrency } from '../../utils/dateUtils';

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

export default function BucketItem({ bucket, onUpdate, onDelete, onAddFunds, onFullyFund, onSetMonthlyAssigned, subcategories }) {
  const [mode, setMode] = useState(null); // null | 'addFunds' | 'pencil' | 'edit' | 'delete'
  const [input, setInput] = useState('');
  const [editName, setEditName] = useState(bucket.name);
  const [editTarget, setEditTarget] = useState(String(bucket.targetAmount));
  const [editMonthlyTarget, setEditMonthlyTarget] = useState(
    bucket.monthlyTarget ? String(bucket.monthlyTarget) : ''
  );
  const [editSubcategoryId, setEditSubcategoryId] = useState(bucket.subcategoryId || '');

  const current = bucket.currentAmount || 0;
  const targetAmount = bucket.targetAmount || 0;
  const overallPct = targetAmount > 0 ? Math.min(current / targetAmount, 1) : 0;

  const monthlyTarget = bucket.monthlyTarget || 0;
  const monthlyAssigned = bucket.monthlyAssigned || 0;
  const hasMonthly = monthlyTarget > 0;

  const isMonthlyUnfunded = monthlyAssigned === 0;
  const isMonthlyFull = monthlyAssigned >= monthlyTarget;
  const isMonthlyPartial = !isMonthlyUnfunded && !isMonthlyFull;
  const isMonthlyOver = monthlyAssigned > monthlyTarget;
  const monthlyPct = monthlyTarget > 0 ? Math.min(monthlyAssigned / monthlyTarget, 1) : 0;
  const monthlyBarColor = isMonthlyUnfunded ? '#ef4444' : isMonthlyPartial ? '#f59e0b' : '#22c55e';

  let monthlyAmountLabel;
  if (isMonthlyOver) {
    const overage = monthlyAssigned - monthlyTarget;
    monthlyAmountLabel = (
      <span style={{ color: '#22c55e' }}>
        {formatCurrency(monthlyAssigned)} / {formatCurrency(monthlyTarget)}{' '}
        <span>(+{formatCurrency(overage)})</span>
      </span>
    );
  } else {
    monthlyAmountLabel = (
      <span style={{ color: isMonthlyFull ? '#22c55e' : '#64748b' }}>
        {formatCurrency(monthlyAssigned)} / {formatCurrency(monthlyTarget)}
      </span>
    );
  }

  let monthlyStatusLabel;
  if (isMonthlyUnfunded) {
    monthlyStatusLabel = <span style={{ color: '#ef4444' }}>Unfunded</span>;
  } else if (isMonthlyOver) {
    const overage = monthlyAssigned - monthlyTarget;
    monthlyStatusLabel = <span style={{ color: '#22c55e' }}>{formatCurrency(overage)} over monthly goal</span>;
  } else if (isMonthlyFull) {
    monthlyStatusLabel = <span style={{ color: '#22c55e' }}>Fully funded</span>;
  } else {
    monthlyStatusLabel = (
      <span style={{ color: '#f59e0b' }}>
        {formatCurrency(monthlyAssigned)} of {formatCurrency(monthlyTarget)} assigned
      </span>
    );
  }

  function reset() {
    setMode(null);
    setInput('');
  }

  async function handleFullyFund() {
    await onFullyFund(bucket.id, monthlyTarget, monthlyAssigned, current);
  }

  async function handleAddFunds() {
    const amount = Number(input);
    if (isNaN(amount) || amount <= 0) return;
    await onAddFunds(bucket.id, amount, monthlyAssigned);
    reset();
  }

  async function handlePencil() {
    const val = Number(input);
    if (isNaN(val) || val < 0) return;
    await onSetMonthlyAssigned(bucket.id, val, monthlyAssigned, current);
    reset();
  }

  async function saveEdit() {
    const name = editName.trim();
    const targetAmount = Number(editTarget);
    if (!name || isNaN(targetAmount) || targetAmount < 0) return;
    await onUpdate(bucket.id, {
      name,
      targetAmount,
      monthlyTarget: Number(editMonthlyTarget) || 0,
      subcategoryId: editSubcategoryId,
    });
    setMode(null);
  }

  function inputKeyDown(handler) {
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
      <div className="flex flex-col gap-2 py-3 px-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
        <div className="flex items-center gap-2">
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
            type="number" min="0" step="0.01"
            value={editTarget}
            onChange={e => setEditTarget(e.target.value)}
            onKeyDown={editKeyDown}
            placeholder="Savings goal"
          />
        </div>
        <input
          className="w-full bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums"
          style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
          type="number" min="0" step="0.01"
          value={editMonthlyTarget}
          onChange={e => setEditMonthlyTarget(e.target.value)}
          onKeyDown={editKeyDown}
          placeholder="Monthly target (optional)"
        />
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
          Delete <span className="font-semibold">{bucket.name}</span>?
        </span>
        <div className="flex gap-2">
          <button onClick={() => onDelete(bucket.id)} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}>Delete</button>
          <button onClick={() => setMode(null)} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 px-2">
      {/* Bucket name + hover edit/delete */}
      <div className="flex items-center justify-between mb-3 group">
        <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{bucket.name}</span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setEditName(bucket.name); setEditTarget(String(bucket.targetAmount)); setEditMonthlyTarget(bucket.monthlyTarget ? String(bucket.monthlyTarget) : ''); setMode('edit'); }}
            className="p-1 rounded hover:opacity-70"
            style={{ color: '#64748b' }}
            title="Edit"
          >
            <PencilIcon />
          </button>
          <button onClick={() => setMode('delete')} className="p-1 rounded hover:opacity-70" style={{ color: '#ef4444' }} title="Delete">
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Monthly section — only when monthlyTarget > 0 */}
      {hasMonthly && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: '#64748b' }}>This month</span>
            <span className="text-xs tabular-nums">{monthlyAmountLabel}</span>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ backgroundColor: '#2a2d3e' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${monthlyPct * 100}%`, backgroundColor: monthlyBarColor }}
            />
          </div>

          <p className="text-xs mb-2">{monthlyStatusLabel}</p>

          {mode === null && (
            <div className="flex gap-1.5">
              <button
                onClick={handleFullyFund}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}
              >
                Fully fund
              </button>
              <button
                onClick={() => { setInput(''); setMode('addFunds'); }}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-opacity hover:opacity-80 border"
                style={{ borderColor: '#2a2d3e', color: '#64748b' }}
              >
                Add funds
              </button>
              <button
                onClick={() => { setInput(String(monthlyAssigned)); setMode('pencil'); }}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity hover:opacity-80 border text-xs"
                style={{ borderColor: '#2a2d3e', color: '#64748b' }}
                title="Set monthly assigned amount"
              >
                ✏
              </button>
            </div>
          )}

          {mode === 'addFunds' && (
            <div className="flex gap-2">
              <input
                className="flex-1 bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums outline-none"
                style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
                type="number" min="0.01" step="0.01"
                placeholder="Amount to add"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={inputKeyDown(handleAddFunds)}
                autoFocus
              />
              <button onClick={handleAddFunds} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}>Add</button>
              <button onClick={reset} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
            </div>
          )}

          {mode === 'pencil' && (
            <div className="flex gap-2">
              <input
                className="flex-1 bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums outline-none"
                style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
                type="number" min="0" step="0.01"
                placeholder={formatCurrency(monthlyAssigned)}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={inputKeyDown(handlePencil)}
                autoFocus
              />
              <button onClick={handlePencil} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}>Set</button>
              <button onClick={reset} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
            </div>
          )}

          {/* Divider between monthly and overall */}
          <div className="mt-3 border-t" style={{ borderColor: '#2a2d3e' }} />
        </div>
      )}

      {/* Overall section — read-only blue bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: '#64748b' }}>Overall</span>
          <span className="text-xs tabular-nums" style={{ color: overallPct >= 1 ? '#22c55e' : '#64748b' }}>
            {formatCurrency(current)} / {formatCurrency(targetAmount)}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#2a2d3e' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${overallPct * 100}%`, backgroundColor: '#3b82f6' }}
          />
        </div>
      </div>
    </div>
  );
}
