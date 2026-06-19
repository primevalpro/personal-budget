import { useState } from 'react';
import { currentMonth, formatCurrency, ordinalSuffix } from '../../utils/dateUtils';

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

export default function ObligationItem({ obligation, onUpdate, onDelete, onAssign, onTogglePaid }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustInput, setAdjustInput] = useState('');
  const [editName, setEditName] = useState(obligation.name);
  const [editAmount, setEditAmount] = useState(String(obligation.amount));
  const [editDueDay, setEditDueDay] = useState(String(obligation.dueDay));
  const [editRecurring, setEditRecurring] = useState(obligation.recurring !== false);

  const month = currentMonth();
  const assignedAmount = obligation.assignedAmount || 0;
  const isFull = obligation.assignedMonth === month && assignedAmount >= obligation.amount && obligation.amount > 0;
  const isPartial = obligation.assignedMonth === month && assignedAmount > 0 && assignedAmount < obligation.amount;
  const isPaid = obligation.paidMonth === month;
  const isOneTime = obligation.recurring === false;

  const aStyle = isFull
    ? { backgroundColor: '#6366f1', borderColor: '#6366f1', color: '#f1f5f9' }
    : isPartial
    ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#0f1117' }
    : { backgroundColor: 'transparent', borderColor: '#2a2d3e', color: '#64748b' };

  async function handleToggleAssign() {
    if (obligation.amount > 0 && assignedAmount >= obligation.amount) {
      await onAssign(obligation.id, 0);
    } else {
      await onAssign(obligation.id, obligation.amount);
    }
  }

  function openAdjust() {
    setAdjustInput(String(assignedAmount));
    setAdjustMode(true);
    setEditing(false);
    setConfirmDelete(false);
  }

  function closeAdjust() {
    setAdjustMode(false);
    setAdjustInput('');
  }

  async function submitAdjustAdd() {
    const val = Number(adjustInput);
    if (isNaN(val) || val <= 0) return;
    await onAssign(obligation.id, assignedAmount + val);
    closeAdjust();
  }

  async function submitAdjustSub() {
    const val = Number(adjustInput);
    if (isNaN(val) || val <= 0) return;
    await onAssign(obligation.id, Math.max(0, assignedAmount - val));
    closeAdjust();
  }

  function adjustKeyDown(e) {
    if (e.key === 'Escape') closeAdjust();
  }

  function startEdit() {
    setEditName(obligation.name);
    setEditAmount(String(obligation.amount));
    setEditDueDay(String(obligation.dueDay));
    setEditRecurring(obligation.recurring !== false);
    setEditing(true);
    setAdjustMode(false);
    setConfirmDelete(false);
  }

  async function saveEdit() {
    const name = editName.trim();
    const amount = Number(editAmount);
    const dueDay = Number(editDueDay);
    if (!name || isNaN(amount) || amount < 0 || isNaN(dueDay) || dueDay < 1 || dueDay > 31) return;
    await onUpdate(obligation.id, { name, amount, dueDay, recurring: editRecurring });
    setEditing(false);
  }

  function editKeyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 py-2 px-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
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
            className="w-24 bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            type="number" min="0" step="0.01"
            value={editAmount}
            onChange={e => setEditAmount(e.target.value)}
            onKeyDown={editKeyDown}
            placeholder="Amount"
          />
          <input
            className="w-16 bg-transparent border rounded-lg px-2 py-1.5 text-sm"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            type="number" min="1" max="31"
            value={editDueDay}
            onChange={e => setEditDueDay(e.target.value)}
            onKeyDown={editKeyDown}
            placeholder="Day"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border flex-1" style={{ borderColor: '#2a2d3e' }}>
            <button type="button" onClick={() => setEditRecurring(true)}
              className="flex-1 py-1 text-xs font-semibold transition-colors"
              style={{ backgroundColor: editRecurring ? '#6366f1' : 'transparent', color: editRecurring ? '#f1f5f9' : '#64748b' }}>
              Recurring
            </button>
            <button type="button" onClick={() => setEditRecurring(false)}
              className="flex-1 py-1 text-xs font-semibold transition-colors border-l"
              style={{ borderColor: '#2a2d3e', backgroundColor: !editRecurring ? '#6366f1' : 'transparent', color: !editRecurring ? '#f1f5f9' : '#64748b' }}>
              One-time
            </button>
          </div>
          <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}>Save</button>
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
        </div>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center justify-between gap-2 py-2 px-2 rounded-lg" style={{ backgroundColor: '#0f1117' }}>
        <span className="text-sm" style={{ color: '#f1f5f9' }}>
          Delete <span className="font-semibold">{obligation.name}</span>?
        </span>
        <div className="flex gap-2">
          <button onClick={() => onDelete(obligation.id)} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}>Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg transition-opacity ${isPaid ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-2 py-2 px-2 group">
        {/* A — full/zero toggle */}
        <button
          onClick={handleToggleAssign}
          className="flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold transition-colors"
          style={aStyle}
          title={isFull ? 'Fully assigned — click to unassign' : 'Click to assign full amount'}
        >
          A
        </button>

        {/* Pencil — open inline +/− adjuster */}
        <button
          onClick={adjustMode ? closeAdjust : openAdjust}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors"
          style={{ color: adjustMode ? '#6366f1' : '#475569' }}
          title="Adjust assigned amount"
        >
          <PencilIcon />
        </button>

        {/* P — paid toggle */}
        <button
          onClick={() => onTogglePaid(obligation.id, isPaid, obligation)}
          className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
          style={{ borderColor: isPaid ? '#22c55e' : '#64748b', backgroundColor: isPaid ? '#22c55e' : 'transparent' }}
          title={isPaid ? 'Mark unpaid' : 'Mark paid'}
        >
          {isPaid && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6l3 3 5-5" stroke="#0f1117" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{obligation.name}</span>
          {isPartial && (
            <p className="text-xs tabular-nums" style={{ color: '#f59e0b' }}>
              Assigned {formatCurrency(assignedAmount)} of {formatCurrency(obligation.amount)}
            </p>
          )}
        </div>

        {isOneTime && (
          <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide" style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }}>
            one-time
          </span>
        )}

        <span className="text-sm font-semibold tabular-nums flex-shrink-0" style={{ color: '#f1f5f9' }}>
          {formatCurrency(obligation.amount)}
        </span>

        <span className="text-xs w-12 text-right flex-shrink-0" style={{ color: '#64748b' }}>
          {ordinalSuffix(obligation.dueDay)}
        </span>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={startEdit} className="p-1 rounded hover:opacity-70" style={{ color: '#64748b' }} title="Edit"><PencilIcon /></button>
          <button onClick={() => setConfirmDelete(true)} className="p-1 rounded hover:opacity-70" style={{ color: '#ef4444' }} title="Delete"><TrashIcon /></button>
        </div>
      </div>

      {/* Inline +/− adjuster */}
      {adjustMode && (
        <div className="flex gap-2 pb-2 px-2">
          <input
            className="flex-1 bg-transparent border rounded-lg px-2 py-1.5 text-sm tabular-nums outline-none"
            style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={adjustInput}
            onChange={e => setAdjustInput(e.target.value)}
            onKeyDown={adjustKeyDown}
            autoFocus
          />
          <button
            onClick={submitAdjustAdd}
            className="px-3 py-1.5 rounded-lg text-sm font-bold"
            style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
            title="Add to assigned amount"
          >
            +
          </button>
          <button
            onClick={submitAdjustSub}
            className="px-3 py-1.5 rounded-lg text-sm font-bold"
            style={{ backgroundColor: '#374151', color: '#f1f5f9' }}
            title="Subtract from assigned amount"
          >
            −
          </button>
          <button
            onClick={closeAdjust}
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
