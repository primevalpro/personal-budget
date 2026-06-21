import { useState } from 'react';
import { formatCurrency } from '../../utils/dateUtils';

export default function ImportReviewScreen({ rows, goals, obligations, onConfirm, onBack }) {
  const [assignments, setAssignments] = useState({});
  const [rulePrompt, setRulePrompt] = useState({});
  const [ruleSaved, setRuleSaved] = useState({});
  const [skippedOpen, setSkippedOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const matchedIdx = rows.reduce((a, r, i) => (r.matchedByRule ? [...a, i] : a), []);
  const needsIdx = rows.reduce((a, r, i) => (!r.matchedByRule && r.categoryType !== 'skipped' ? [...a, i] : a), []);
  const skippedIdx = rows.reduce((a, r, i) => (!r.matchedByRule && r.categoryType === 'skipped' ? [...a, i] : a), []);

  function getAssignment(i) {
    return assignments[i] ?? {
      categoryType: rows[i].categoryType,
      categoryId: rows[i].categoryId,
      categoryName: rows[i].categoryName,
    };
  }

  function selectValue(i) {
    const a = getAssignment(i);
    if (!a.categoryType || a.categoryType === 'skipped' || !a.categoryId) return '__skipped__';
    return `${a.categoryType}::${a.categoryId}`;
  }

  function handleChange(i, val, showPrompt) {
    let next;
    if (val === '__skipped__') {
      next = { categoryType: 'skipped', categoryId: null, categoryName: 'Skipped' };
    } else {
      const [type, id] = val.split('::');
      const match = type === 'goal'
        ? goals.find(g => g.id === id)
        : obligations.find(o => o.id === id);
      next = { categoryType: type, categoryId: id, categoryName: match ? (type === 'goal' ? match.category : match.name) : '' };
    }
    setAssignments(p => ({ ...p, [i]: next }));
    if (showPrompt && val !== '__skipped__') {
      setRulePrompt(p => ({ ...p, [i]: true }));
    } else {
      setRulePrompt(p => ({ ...p, [i]: false }));
      setRuleSaved(p => ({ ...p, [i]: false }));
    }
  }

  const allNeedsAssigned = needsIdx.every(i => {
    const a = getAssignment(i);
    return a.categoryType && a.categoryType !== 'skipped' && a.categoryId;
  });
  // also allow confirming if user explicitly chose skipped for a needs-assignment row
  const confirmReady = needsIdx.every(i => {
    const a = getAssignment(i);
    return a.categoryType != null;
  });

  async function handleConfirm() {
    setConfirming(true);
    try {
      const txDocs = [];
      const goalIncrements = {};
      const obligationUpdates = {};
      const newRules = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const a = getAssignment(i);
        txDocs.push({
          date: row.date,
          description: row.description,
          originalDescription: row.originalDescription,
          amount: row.amount,
          month: row.month,
          status: row.status,
          categoryType: a.categoryType ?? 'skipped',
          categoryId: a.categoryId ?? null,
          categoryName: a.categoryName ?? '',
        });

        if (a.categoryType === 'goal' && a.categoryId) {
          goalIncrements[a.categoryId] = (goalIncrements[a.categoryId] ?? 0) + Math.abs(row.amount);
        } else if (a.categoryType === 'obligation' && a.categoryId) {
          const obl = obligations.find(o => o.id === a.categoryId);
          if (obl) {
            if (!obligationUpdates[a.categoryId]) {
              obligationUpdates[a.categoryId] = {
                newAssigned: obl.assignedAmount ?? 0,
                total: obl.amount ?? 0,
                txMonth: row.month,
              };
            }
            obligationUpdates[a.categoryId].newAssigned += Math.abs(row.amount);
          }
        }

        if (ruleSaved[i] && a.categoryId && a.categoryType !== 'skipped') {
          newRules.push({
            keyword: row.originalDescription,
            categoryType: a.categoryType,
            categoryId: a.categoryId,
            categoryName: a.categoryName,
          });
        }
      }

      await onConfirm({ txDocs, goalIncrements, obligationUpdates, newRules });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Matched */}
        {matchedIdx.length > 0 && (
          <Section title={`Matched (${matchedIdx.length})`} color="#22c55e">
            {matchedIdx.map(i => (
              <ReviewRow
                key={i}
                row={rows[i]}
                goals={goals}
                obligations={obligations}
                selectValue={selectValue(i)}
                onChange={val => handleChange(i, val, true)}
                showRulePrompt={rulePrompt[i] && !ruleSaved[i]}
                ruleSaved={ruleSaved[i]}
                onSaveRule={() => setRuleSaved(p => ({ ...p, [i]: true }))}
                onDismissRule={() => setRulePrompt(p => ({ ...p, [i]: false }))}
                currentAssignment={getAssignment(i)}
              />
            ))}
          </Section>
        )}

        {/* Needs Assignment */}
        {needsIdx.length > 0 && (
          <Section title={`Needs assignment (${needsIdx.length})`} color="#f59e0b">
            {needsIdx.map(i => (
              <ReviewRow
                key={i}
                row={rows[i]}
                goals={goals}
                obligations={obligations}
                selectValue={selectValue(i)}
                onChange={val => handleChange(i, val, true)}
                showRulePrompt={rulePrompt[i] && !ruleSaved[i]}
                ruleSaved={ruleSaved[i]}
                onSaveRule={() => setRuleSaved(p => ({ ...p, [i]: true }))}
                onDismissRule={() => setRulePrompt(p => ({ ...p, [i]: false }))}
                currentAssignment={getAssignment(i)}
                required={!getAssignment(i).categoryType}
              />
            ))}
          </Section>
        )}

        {/* Skipped */}
        {skippedIdx.length > 0 && (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2a2d3e' }}>
            <button
              className="w-full flex items-center gap-2 px-4 py-3 text-left"
              onClick={() => setSkippedOpen(p => !p)}
            >
              <span className="text-sm font-semibold" style={{ color: '#64748b' }}>
                Skipped ({skippedIdx.length})
              </span>
              <span className="ml-auto text-xs" style={{ color: '#64748b' }}>{skippedOpen ? '▲' : '▼'}</span>
            </button>
            {skippedOpen && (
              <div className="border-t" style={{ borderColor: '#2a2d3e' }}>
                {skippedIdx.map(i => (
                  <ReviewRow
                    key={i}
                    row={rows[i]}
                    goals={goals}
                    obligations={obligations}
                    selectValue={selectValue(i)}
                    onChange={val => handleChange(i, val, false)}
                    currentAssignment={getAssignment(i)}
                    skipReason={rows[i].skipReason}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-between gap-3 px-4 py-4 border-t"
        style={{ borderColor: '#2a2d3e', backgroundColor: '#1a1d27' }}
      >
        <button
          onClick={onBack}
          className="text-sm px-4 py-2 rounded-lg border"
          style={{ borderColor: '#2a2d3e', color: '#64748b' }}
        >
          Back
        </button>
        {!confirmReady && (
          <span className="text-xs" style={{ color: '#f59e0b' }}>Assign all required rows first</span>
        )}
        <button
          onClick={handleConfirm}
          disabled={!confirmReady || confirming}
          className="text-sm px-5 py-2 rounded-lg font-medium transition-opacity"
          style={{
            backgroundColor: confirmReady ? '#6366f1' : '#2a2d3e',
            color: confirmReady ? '#fff' : '#64748b',
            opacity: confirming ? 0.6 : 1,
          }}
        >
          {confirming ? 'Importing…' : 'Confirm import'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${color}44` }}>
      <div className="px-4 py-2" style={{ backgroundColor: `${color}11` }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ReviewRow({ row, goals, obligations, selectValue, onChange, showRulePrompt, ruleSaved, onSaveRule, onDismissRule, currentAssignment, required, skipReason }) {
  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: '#2a2d3e' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs tabular-nums w-20 flex-shrink-0" style={{ color: '#64748b' }}>{row.date}</span>
        <span className="text-sm flex-1 min-w-0 truncate" style={{ color: '#f1f5f9' }} title={row.description}>
          {row.description}
        </span>
        <span className="text-sm tabular-nums font-medium flex-shrink-0" style={{ color: '#f1f5f9' }}>
          {formatCurrency(row.amount)}
        </span>
        <select
          className="text-sm px-2 py-1 rounded border flex-shrink-0"
          style={{ borderColor: '#2a2d3e', backgroundColor: '#0f1117', color: '#f1f5f9', minWidth: 160 }}
          value={selectValue}
          onChange={e => onChange(e.target.value)}
        >
          <option value="__skipped__">— Skipped —</option>
          <optgroup label="Monthly Budgets">
            {goals.map(g => <option key={g.id} value={`goal::${g.id}`}>{g.category}</option>)}
          </optgroup>
          <optgroup label="Obligations">
            {obligations.map(o => <option key={o.id} value={`obligation::${o.id}`}>{o.name}</option>)}
          </optgroup>
        </select>
      </div>

      {required && (
        <p className="text-xs mt-1 ml-20" style={{ color: '#f59e0b' }}>Required before confirming</p>
      )}
      {skipReason && selectValue === '__skipped__' && (
        <p className="text-xs mt-1 ml-20" style={{ color: '#64748b' }}>{skipReason}</p>
      )}
      {showRulePrompt && (
        <div className="flex items-center gap-2 mt-1 ml-20">
          <span className="text-xs" style={{ color: '#64748b' }}>
            Always match "{row.originalDescription}" to {currentAssignment.categoryName}?
          </span>
          <button
            onClick={onSaveRule}
            className="text-xs underline"
            style={{ color: '#6366f1' }}
          >
            Yes
          </button>
          <button
            onClick={onDismissRule}
            className="text-xs"
            style={{ color: '#64748b' }}
          >
            No
          </button>
        </div>
      )}
      {ruleSaved && (
        <p className="text-xs mt-1 ml-20" style={{ color: '#22c55e' }}>Rule will be saved ✓</p>
      )}
    </div>
  );
}
