import { useState } from 'react';

function toDateInputValue(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : new Date());
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function EditIncomeModal({ entry, onClose, onSave }) {
  const [amount, setAmount] = useState(String(entry.amount || ''));
  const [note, setNote] = useState(entry.note || '');
  const [date, setDate] = useState(toDateInputValue(entry.createdAt));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const val = Number(amount);
    if (isNaN(val) || val <= 0 || !date) return;
    setSaving(true);
    await onSave(entry.id, val, note.trim(), date);
    setSaving(false);
    onClose();
  }

  function keyDown(e) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-xl border w-full max-w-sm p-6 flex flex-col gap-4"
        style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
      >
        <p className="text-base font-semibold" style={{ color: '#f1f5f9' }}>Edit income</p>

        <input
          className="w-full bg-transparent border rounded-lg px-3 py-2.5 text-sm tabular-nums outline-none"
          style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={keyDown}
          autoFocus
        />
        <input
          className="w-full bg-transparent border rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
          placeholder="Note (optional)"
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={keyDown}
        />
        <input
          className="w-full bg-transparent border rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: '#2a2d3e', color: '#f1f5f9', colorScheme: 'dark' }}
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          onKeyDown={keyDown}
        />

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm border transition-opacity hover:opacity-80"
            style={{ borderColor: '#2a2d3e', color: '#64748b' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
