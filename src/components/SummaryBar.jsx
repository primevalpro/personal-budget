import { useState } from 'react';
import { formatCurrency } from '../utils/dateUtils';

export default function SummaryBar({
  balance, totalAssigned, readyToAssign,
  monthlyFundingGap, gapBreakdown,
  onEditBalance, onAddIncome,
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  function startEdit() {
    setInput(String(balance));
    setEditing(true);
  }

  async function saveEdit() {
    const val = Number(input);
    if (!isNaN(val) && val >= 0) await onEditBalance(val);
    setEditing(false);
  }

  function keyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  const rtaColor = readyToAssign < 0 ? '#ef4444' : '#22c55e';
  const gapFunded = monthlyFundingGap <= 0;

  return (
    <div
      className="flex items-center justify-between gap-6 px-6 py-4 border-b flex-wrap"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      <div className="flex items-center gap-8 flex-wrap">
        {/* Balance */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>
            Balance
          </span>
          {editing ? (
            <input
              className="text-xl font-bold tabular-nums w-36 bg-transparent border-b-2 outline-none"
              style={{ borderColor: '#6366f1', color: '#f1f5f9' }}
              type="number"
              min="0"
              step="0.01"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={keyDown}
              onBlur={saveEdit}
              autoFocus
            />
          ) : (
            <button
              onClick={startEdit}
              className="text-xl font-bold tabular-nums text-left hover:opacity-70 transition-opacity"
              style={{ color: '#f1f5f9' }}
              title="Click to edit balance"
            >
              {formatCurrency(balance)}
            </button>
          )}
        </div>

        {/* Assigned */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>
            Assigned
          </span>
          <span className="text-xl font-bold tabular-nums" style={{ color: '#f1f5f9' }}>
            {formatCurrency(totalAssigned)}
          </span>
        </div>

        {/* Ready to Assign */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>
            Ready to Assign
          </span>
          <span className="text-2xl font-bold tabular-nums" style={{ color: rtaColor }}>
            {formatCurrency(readyToAssign)}
          </span>
          {readyToAssign < 0 && (
            <span className="text-xs" style={{ color: '#ef4444' }}>Over-assigned</span>
          )}
        </div>

        {/* Monthly Funding Gap */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>
            Monthly Funding Gap
          </span>
          {gapFunded ? (
            <span className="text-xl font-bold tabular-nums" style={{ color: '#22c55e' }}>
              Fully funded ✓
            </span>
          ) : (
            <span className="text-xl font-bold tabular-nums" style={{ color: '#f59e0b' }}>
              {formatCurrency(monthlyFundingGap)} still needed
            </span>
          )}
          {!gapFunded && gapBreakdown && (
            <span className="text-xs tabular-nums mt-0.5" style={{ color: '#64748b' }}>
              {gapBreakdown.obligations > 0 && `Obligations ${formatCurrency(gapBreakdown.obligations)}`}
              {gapBreakdown.obligations > 0 && (gapBreakdown.goals > 0 || gapBreakdown.buckets > 0) && ' · '}
              {gapBreakdown.goals > 0 && `Goals ${formatCurrency(gapBreakdown.goals)}`}
              {gapBreakdown.goals > 0 && gapBreakdown.buckets > 0 && ' · '}
              {gapBreakdown.buckets > 0 && `Buckets ${formatCurrency(gapBreakdown.buckets)}`}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onAddIncome}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 flex-shrink-0"
        style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
      >
        + Add Income
      </button>
    </div>
  );
}
