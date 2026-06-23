import { useState, useRef } from 'react';
import { formatCurrency } from '../utils/dateUtils';
import QuickAssignPopover from './QuickAssignPopover';

export default function SummaryBar({
  balance, totalAssigned, readyToAssign,
  monthlyFundingGap, gapBreakdown,
  onEditBalance, onAddIncome,
  obligations, goals, buckets, currentMonth, onConfirm,
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [showPopover, setShowPopover] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const rtaRef = useRef(null);

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

  function togglePopover() {
    if (showPopover) {
      setShowPopover(false);
    } else if (rtaRef.current) {
      setPopoverAnchor(rtaRef.current.getBoundingClientRect());
      setShowPopover(true);
    }
  }

  const rtaColor = readyToAssign < 0 ? '#ef4444' : '#22c55e';
  const gapFunded = monthlyFundingGap <= 0;

  const divider = <div className="self-stretch w-px flex-shrink-0" style={{ backgroundColor: '#2a2d3e' }} />;

  const labelClass = 'text-[10px] font-semibold uppercase tracking-widest mb-0.5';
  const labelColor = '#64748b';
  const valueClass = 'text-base font-medium tabular-nums';

  return (
    <div
      className="flex items-stretch border-b flex-shrink-0 overflow-x-auto"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      {/* Balance */}
      <div className="flex flex-col justify-center px-4 py-[6px] flex-shrink-0">
        <span className={labelClass} style={{ color: labelColor }}>Balance</span>
        {editing ? (
          <input
            className="text-base font-medium tabular-nums w-28 bg-transparent border-b outline-none"
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
            className={`${valueClass} text-left hover:opacity-70 transition-opacity`}
            style={{ color: '#f1f5f9' }}
            title="Click to edit balance"
          >
            {formatCurrency(balance)}
          </button>
        )}
      </div>

      {divider}

      {/* Assigned */}
      <div className="flex flex-col justify-center px-4 py-[6px] flex-shrink-0">
        <span className={labelClass} style={{ color: labelColor }}>Assigned</span>
        <span className={valueClass} style={{ color: '#f1f5f9' }}>{formatCurrency(totalAssigned)}</span>
      </div>

      {divider}

      {/* Ready to Assign */}
      <div ref={rtaRef} className="flex flex-col justify-center px-4 py-[6px] flex-shrink-0">
        <span className={labelClass} style={{ color: labelColor }}>Ready to Assign</span>
        {readyToAssign > 0 ? (
          <button
            onClick={togglePopover}
            className={`${valueClass} text-left`}
            style={{
              color: rtaColor,
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: rtaColor,
            }}
          >
            {formatCurrency(readyToAssign)}
          </button>
        ) : (
          <span className={valueClass} style={{ color: rtaColor }}>{formatCurrency(readyToAssign)}</span>
        )}
        {readyToAssign < 0 && (
          <span className="text-[10px]" style={{ color: '#ef4444' }}>Over-assigned</span>
        )}
      </div>

      {showPopover && popoverAnchor && (
        <QuickAssignPopover
          anchor={popoverAnchor}
          anchorRef={rtaRef}
          rta={readyToAssign}
          obligations={obligations}
          goals={goals}
          buckets={buckets}
          currentMonth={currentMonth}
          onClose={() => setShowPopover(false)}
          onConfirm={onConfirm}
        />
      )}

      {divider}

      {/* Monthly Gap — flex-1 */}
      <div className="flex flex-col justify-center px-4 py-[6px] flex-1 min-w-0">
        <span className={labelClass} style={{ color: labelColor }}>Monthly Gap</span>
        {gapFunded ? (
          <span className="text-[13px] font-medium tabular-nums" style={{ color: '#22c55e' }}>
            Fully funded ✓
          </span>
        ) : (
          <>
            <span className="text-[13px] font-medium tabular-nums" style={{ color: '#f59e0b' }}>
              {formatCurrency(monthlyFundingGap)} still needed
            </span>
            {gapBreakdown && (
              <span className="text-[11px] tabular-nums truncate" style={{ color: '#64748b' }}>
                {[
                  gapBreakdown.obligations > 0 && `Obligations ${formatCurrency(gapBreakdown.obligations)}`,
                  gapBreakdown.goals > 0 && `Budgets ${formatCurrency(gapBreakdown.goals)}`,
                  gapBreakdown.buckets > 0 && `Funds ${formatCurrency(gapBreakdown.buckets)}`,
                ].filter(Boolean).join(' · ')}
              </span>
            )}
          </>
        )}
      </div>

      {/* Add Income */}
      <div className="flex items-center px-4 py-[6px] flex-shrink-0">
        <button
          onClick={onAddIncome}
          className="text-xs px-3 py-[5px] rounded-lg font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
          style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
        >
          + Add Income
        </button>
      </div>
    </div>
  );
}
