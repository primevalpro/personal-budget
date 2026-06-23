import { useState } from 'react';
import { formatCurrency } from '../../utils/dateUtils';
import EditIncomeModal from './EditIncomeModal';

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

export default function IncomeLog({ income, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [editEntry, setEditEntry] = useState(null);

  const monthlyTotal = income.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="border-t flex-shrink-0" style={{ borderColor: '#2a2d3e', backgroundColor: '#1a1d27' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-3 transition-opacity hover:opacity-80"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
            Income Log
          </span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: '#22c55e' }}>
            {formatCurrency(monthlyTotal)} this month
          </span>
        </div>
        <span className="text-xs" style={{ color: '#64748b' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-6 pb-4 max-h-52 overflow-y-auto flex flex-col gap-0.5">
          {income.length === 0 ? (
            <p className="text-sm py-2" style={{ color: '#64748b' }}>No income logged this month.</p>
          ) : (
            income.map(entry => (
              confirmId === entry.id ? (
                <div key={entry.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm" style={{ color: '#f1f5f9' }}>
                    Delete {formatCurrency(entry.amount)}?
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onDelete(entry.id, entry.amount); setConfirmId(null); }}
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-3 py-1 rounded-lg text-xs border"
                      style={{ borderColor: '#2a2d3e', color: '#64748b' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={entry.id} className="flex items-center justify-between py-1.5 group">
                  <div className="flex items-center gap-3">
                    <span className="text-xs tabular-nums w-14 flex-shrink-0" style={{ color: '#64748b' }}>
                      {formatDate(entry.createdAt)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: '#f1f5f9' }}>
                      {formatCurrency(entry.amount)}
                    </span>
                    {entry.note && (
                      <span className="text-xs truncate" style={{ color: '#64748b' }}>"{entry.note}"</span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditEntry(entry); setConfirmId(null); }}
                      className="p-1 rounded hover:opacity-70"
                      style={{ color: '#64748b' }}
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => setConfirmId(entry.id)}
                      className="p-1 rounded hover:opacity-70"
                      style={{ color: '#ef4444' }}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )
            ))
          )}
        </div>
      )}

      {editEntry && (
        <EditIncomeModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSave={async (id, amount, note, date) => {
            await onEdit(id, amount, note, date);
            setEditEntry(null);
          }}
        />
      )}
    </div>
  );
}
