import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '../utils/dateUtils';

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function QuickAssignPopover({
  anchor, anchorRef, rta,
  obligations, goals, buckets,
  // currentMonth prop accepted per spec; batch write happens in parent
  onClose, onConfirm,
}) {
  const popoverRef = useRef(null);
  const inputRefs = useRef({});
  const [selected, setSelected] = useState({});    // { id: number }
  const [inputs, setInputs] = useState({});         // { id: string }
  const [lastSelectedId, setLastSelectedId] = useState(null);

  // Build underfunded lists — sorted to match dashboard panel order
  const underfundedObs = obligations
    .filter(o => (o.assignedAmount || 0) < (o.amount || 0))
    // obligations are already sorted by dueDay from the hook
    .map(o => ({ type: 'obligation', id: o.id, name: o.name, need: o.amount - (o.assignedAmount || 0) }));

  const underfundedGoals = [...goals]
    .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0))
    .filter(g => (g.assignedAmount || 0) < (g.targetAmount || 0))
    .map(g => ({ type: 'goal', id: g.id, name: g.category, need: g.targetAmount - (g.assignedAmount || 0) }));

  const underfundedBuckets = buckets
    // already sorted by createdAt from hook
    .filter(b => (b.monthlyTarget || 0) > 0 && (b.monthlyAssigned || 0) < b.monthlyTarget)
    .map(b => ({ type: 'bucket', id: b.id, name: b.name, need: b.monthlyTarget - (b.monthlyAssigned || 0) }));

  const allItems = [...underfundedObs, ...underfundedGoals, ...underfundedBuckets];
  const allEmpty = allItems.length === 0;

  const totalQueued = Object.values(selected).reduce((s, a) => s + a, 0);
  const remaining = rta - totalQueued;

  // Per-item over-budget: amount > what's available excluding other items
  const overBudget = {};
  for (const [id, amount] of Object.entries(selected)) {
    const otherTotal = Object.entries(selected)
      .filter(([k]) => k !== id)
      .reduce((s, [, v]) => s + v, 0);
    overBudget[id] = amount > rta - otherTotal + 0.001;
  }
  const anyOverBudget = Object.values(overBudget).some(Boolean);
  const canConfirm = Object.keys(selected).length > 0 && !anyOverBudget;

  // Click outside — exclude anchor element to allow toggle behavior on the trigger button
  useEffect(() => {
    function onMouseDown(e) {
      const insidePopover = popoverRef.current?.contains(e.target);
      const insideAnchor = anchorRef?.current?.contains(e.target);
      if (!insidePopover && !insideAnchor) onClose();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [onClose, anchorRef]);

  // Escape key
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Focus the input of a newly selected item
  useEffect(() => {
    if (lastSelectedId && inputRefs.current[lastSelectedId]) {
      inputRefs.current[lastSelectedId].focus();
      inputRefs.current[lastSelectedId].select();
      setLastSelectedId(null);
    }
  }, [lastSelectedId]);

  function currentRemaining() {
    return rta - Object.values(selected).reduce((s, a) => s + a, 0);
  }

  function toggleItem(item) {
    if (selected[item.id] !== undefined) {
      setSelected(s => { const n = { ...s }; delete n[item.id]; return n; });
      setInputs(s => { const n = { ...s }; delete n[item.id]; return n; });
    } else {
      const avail = currentRemaining();
      const auto = Math.round(Math.min(Math.max(0, avail), item.need) * 100) / 100;
      setSelected(s => ({ ...s, [item.id]: auto }));
      setInputs(s => ({ ...s, [item.id]: String(auto) }));
      setLastSelectedId(item.id);
    }
  }

  function handleInputChange(item, value) {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      if (num > item.need) {
        // Auto-cap at item need — no overfunding
        const capped = Math.round(item.need * 100) / 100;
        setInputs(s => ({ ...s, [item.id]: String(capped) }));
        setSelected(s => ({ ...s, [item.id]: capped }));
      } else {
        setInputs(s => ({ ...s, [item.id]: value }));
        setSelected(s => ({ ...s, [item.id]: Math.round(num * 100) / 100 }));
      }
    } else {
      setInputs(s => ({ ...s, [item.id]: value }));
    }
  }

  function focusInput(id) {
    const el = inputRefs.current[id];
    if (el) { el.focus(); el.select(); }
  }

  function handleConfirm() {
    const assignments = Object.entries(selected).map(([id, amount]) => {
      const item = allItems.find(i => i.id === id);
      return { type: item.type, id, amount };
    });
    onConfirm(assignments);
    onClose();
  }

  function renderGroup(title, items) {
    if (items.length === 0) return null;
    return (
      <div>
        <div
          className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest border-b"
          style={{ color: '#64748b', borderColor: '#2a2d3e' }}
        >
          {title}
        </div>
        {items.map(item => {
          const isSelected = selected[item.id] !== undefined;
          const isOver = isSelected && overBudget[item.id];
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
              style={{ borderBottom: '1px solid #2a2d3e55' }}
              onClick={() => toggleItem(item)}
            >
              {/* Checkbox */}
              <div
                className="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center"
                style={{
                  borderColor: isSelected ? '#6366f1' : '#64748b',
                  backgroundColor: isSelected ? '#6366f1' : 'transparent',
                }}
              >
                {isSelected && (
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Name */}
              <span className="flex-1 min-w-0 truncate text-sm" style={{ color: '#f1f5f9' }}>
                {item.name}
              </span>

              {/* Right side: "needed" label or amount input + pencil */}
              {!isSelected ? (
                <span className="text-xs tabular-nums flex-shrink-0" style={{ color: '#64748b' }}>
                  {formatCurrency(item.need)} needed
                </span>
              ) : (
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <input
                    ref={el => { if (el) inputRefs.current[item.id] = el; }}
                    type="number"
                    min="0"
                    max={item.need}
                    step="0.01"
                    value={inputs[item.id] ?? ''}
                    onChange={e => handleInputChange(item, e.target.value)}
                    className="w-20 bg-transparent border rounded text-sm tabular-nums text-right outline-none px-1.5 py-0.5"
                    style={{
                      borderColor: isOver ? '#ef4444' : '#2a2d3e',
                      color: isOver ? '#ef4444' : '#f1f5f9',
                    }}
                  />
                  <button
                    onClick={() => focusInput(item.id)}
                    className="p-1 rounded hover:opacity-70 flex-shrink-0"
                    style={{ color: '#64748b' }}
                    title="Edit amount"
                  >
                    <PencilIcon />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const popoverEl = (
    <div
      ref={popoverRef}
      className="rounded-xl border shadow-2xl overflow-hidden"
      style={{
        position: 'fixed',
        top: anchor.bottom + 4,
        left: anchor.left,
        zIndex: 1000,
        width: 360,
        backgroundColor: '#1a1d27',
        borderColor: '#2a2d3e',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#2a2d3e' }}>
        <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Assign funds</span>
        <span className="text-sm tabular-nums" style={{ color: remaining < 0 ? '#ef4444' : '#22c55e' }}>
          Remaining: {formatCurrency(remaining)}
        </span>
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto">
        {allEmpty ? (
          <div className="px-4 py-6 text-sm text-center" style={{ color: '#64748b' }}>
            All items funded ✓
          </div>
        ) : (
          <>
            {renderGroup('OBLIGATIONS', underfundedObs)}
            {renderGroup('MONTHLY BUDGETS', underfundedGoals)}
            {renderGroup('FUNDS', underfundedBuckets)}
          </>
        )}
      </div>

      {/* Footer */}
      {!allEmpty && (
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#2a2d3e' }}>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-lg border"
            style={{ borderColor: '#2a2d3e', color: '#64748b' }}
          >
            Cancel
          </button>
          <button
            onClick={canConfirm ? handleConfirm : undefined}
            className="text-sm px-4 py-1.5 rounded-lg font-medium"
            style={{
              backgroundColor: canConfirm ? '#6366f1' : '#6366f133',
              color: canConfirm ? '#f1f5f9' : '#475569',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(popoverEl, document.body);
}
