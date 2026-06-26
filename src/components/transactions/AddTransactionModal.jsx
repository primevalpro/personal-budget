import { useState } from 'react';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { applyOne } from '../../utils/categoryBatch';

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function resolveCategory(val, goals, obligations, buckets) {
  if (!val) return null;
  const idx = val.indexOf(':');
  const type = val.slice(0, idx);
  const id = val.slice(idx + 1) || null;
  if (type === 'skipped') return { categoryType: 'skipped', categoryId: null, categoryName: null };
  let name = '';
  if (type === 'goal') name = goals.find(g => g.id === id)?.category || '';
  else if (type === 'obligation') name = obligations.find(o => o.id === id)?.name || '';
  else if (type === 'bucket') name = buckets.find(b => b.id === id)?.name || '';
  return { categoryType: type, categoryId: id, categoryName: name };
}

export default function AddTransactionModal({ uid, goals, obligations, buckets, onClose }) {
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [catVal, setCatVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSave = description.trim() && Number(amount) > 0 && catVal && date;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const category = resolveCategory(catVal, goals, obligations, buckets);
      const negativeAmount = -Math.abs(Number(amount));
      const month = date.slice(0, 7);
      const batch = writeBatch(db);
      const txRef = doc(collection(db, 'users', uid, 'transactions'));
      batch.set(txRef, {
        date,
        description: description.trim(),
        originalDescription: description.trim(),
        amount: negativeAmount,
        month,
        categoryType: category?.categoryType ?? null,
        categoryId: category?.categoryId ?? null,
        categoryName: category?.categoryName ?? null,
        importedAt: serverTimestamp(),
      });
      if (category) {
        applyOne(batch, uid, category.categoryType, category.categoryId, negativeAmount);
      }
      await batch.commit();
      onClose();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  function keyDown(e) {
    if (e.key === 'Enter' && canSave) handleSave();
    if (e.key === 'Escape') onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>Add Transaction</h2>
          <button onClick={onClose} className="text-lg leading-none hover:opacity-70" style={{ color: '#64748b' }}>✕</button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#64748b' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              onKeyDown={keyDown}
              className="border rounded-xl px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f1f5f9', colorScheme: 'dark' }}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#64748b' }}>Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={keyDown}
              placeholder="e.g. Grocery run"
              autoFocus
              className="border rounded-xl px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f1f5f9' }}
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#64748b' }}>Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#64748b' }}>$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={keyDown}
                placeholder="0.00"
                className="w-full border rounded-xl pl-7 pr-3 py-2 text-sm tabular-nums outline-none"
                style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f1f5f9' }}
              />
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#64748b' }}>Category</label>
            <select
              value={catVal}
              onChange={e => setCatVal(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: catVal ? '#f1f5f9' : '#64748b' }}
            >
              <option value="">— Select category —</option>
              {goals.length > 0 && (
                <optgroup label="Monthly Budgets">
                  {goals.map(g => (
                    <option key={g.id} value={`goal:${g.id}`}>{g.category}</option>
                  ))}
                </optgroup>
              )}
              {obligations.length > 0 && (
                <optgroup label="Obligations">
                  {obligations.map(o => (
                    <option key={o.id} value={`obligation:${o.id}`}>{o.name}</option>
                  ))}
                </optgroup>
              )}
              {buckets.length > 0 && (
                <optgroup label="Funds">
                  {buckets.map(b => (
                    <option key={b.id} value={`bucket:${b.id}`}>{b.name}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Other">
                <option value="skipped:">Skip / ignore</option>
              </optgroup>
            </select>
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity"
            style={{
              backgroundColor: canSave && !saving ? '#6366f1' : '#2a2d3e',
              color: canSave && !saving ? '#f1f5f9' : '#475569',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm border"
            style={{ borderColor: '#2a2d3e', color: '#64748b' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
