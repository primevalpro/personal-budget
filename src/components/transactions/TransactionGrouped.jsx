import { useState } from 'react';
import TransactionRow from './TransactionRow';
import { formatCurrency } from '../../utils/dateUtils';

const DOT_COLOR = { goal: '#6366f1', obligation: '#14b8a6', skipped: '#64748b' };

export default function TransactionGrouped({ transactions, goals, obligations, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState({});

  const groups = {};
  for (const tx of transactions) {
    const key = tx.categoryName || 'Skipped';
    if (!groups[key]) groups[key] = { name: key, type: tx.categoryType, txs: [] };
    groups[key].txs.push(tx);
  }

  const sorted = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));

  function toggle(key) {
    setExpanded(p => ({ ...p, [key]: !p[key] }));
  }

  if (sorted.length === 0) {
    return (
      <div className="p-6 text-center text-sm" style={{ color: '#64748b' }}>
        No transactions for this month.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 md:p-6 max-w-3xl mx-auto w-full">
      {sorted.map(group => {
        const total = group.txs.reduce((s, t) => s + Math.abs(t.amount), 0);
        const isOpen = expanded[group.name];
        const color = DOT_COLOR[group.type] ?? '#64748b';
        return (
          <div
            key={group.name}
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-90 transition-opacity"
              onClick={() => toggle(group.name)}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="flex-1 text-sm font-medium" style={{ color: '#f1f5f9' }}>{group.name}</span>
              <span className="text-sm tabular-nums font-medium mr-2" style={{ color: '#f1f5f9' }}>
                {formatCurrency(total)}
              </span>
              <span className="text-xs" style={{ color: '#64748b' }}>{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="border-t" style={{ borderColor: '#2a2d3e' }}>
                {group.txs.map(tx => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    goals={goals}
                    obligations={obligations}
                    showCategory={false}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
