import { useState } from 'react';
import { formatCurrency } from '../../utils/dateUtils';

const CATEGORY_COLOR = {
  goal: '#6366f1',
  obligation: '#14b8a6',
  bucket: '#3b82f6',
  skipped: '#64748b',
};

export default function TransactionRow({ tx, goals, obligations, buckets, showCategory, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState('');
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setEditDesc(tx.description);
    setEditType(tx.categoryType ?? 'skipped');
    setEditId(tx.categoryId ?? '');
    setEditName(tx.categoryName ?? '');
    setEditing(true);
    setDeleting(false);
  }

  function findCategoryDoc(type, id) {
    if (type === 'goal') return goals.find(g => g.id === id) ?? null;
    if (type === 'obligation') return obligations.find(o => o.id === id) ?? null;
    if (type === 'bucket') return buckets.find(b => b.id === id) ?? null;
    return null;
  }

  function handleCategoryChange(e) {
    const val = e.target.value;
    if (val === '__skipped__') {
      setEditType('skipped');
      setEditId('');
      setEditName('Skipped');
    } else {
      const [type, id] = val.split('::');
      const match = findCategoryDoc(type, id);
      setEditType(type);
      setEditId(id);
      setEditName(match ? (type === 'goal' ? match.category : match.name) : '');
    }
  }

  function selectValue() {
    if (editType === 'skipped' || !editId) return '__skipped__';
    return `${editType}::${editId}`;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const newFields = {
        description: editDesc,
        categoryType: editType,
        categoryId: editId || null,
        categoryName: editName,
      };
      const oldDoc = findCategoryDoc(tx.categoryType, tx.categoryId);
      const newDoc = findCategoryDoc(editType, editId);
      await onUpdate(tx, newFields, oldDoc, newDoc);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const categoryDoc = findCategoryDoc(tx.categoryType, tx.categoryId);
      await onDelete(tx, categoryDoc);
    } finally {
      setSaving(false);
    }
  }

  const dotColor = CATEGORY_COLOR[tx.categoryType] ?? '#64748b';

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: '#2a2d3e' }}>
        <span className="text-xs tabular-nums w-20 flex-shrink-0" style={{ color: '#64748b' }}>{tx.date}</span>
        <input
          className="flex-1 text-sm px-2 py-1 rounded border bg-transparent outline-none min-w-0"
          style={{ borderColor: '#6366f1', color: '#f1f5f9' }}
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
        />
        <select
          className="text-sm px-2 py-1 rounded border flex-shrink-0"
          style={{ borderColor: '#2a2d3e', backgroundColor: '#1a1d27', color: '#f1f5f9' }}
          value={selectValue()}
          onChange={handleCategoryChange}
        >
          <option value="__skipped__">— Skipped —</option>
          <optgroup label="Monthly Budgets">
            {goals.map(g => <option key={g.id} value={`goal::${g.id}`}>{g.category}</option>)}
          </optgroup>
          <optgroup label="Obligations">
            {obligations.map(o => <option key={o.id} value={`obligation::${o.id}`}>{o.name}</option>)}
          </optgroup>
          <optgroup label="Funds">
            {buckets.map(b => <option key={b.id} value={`bucket::${b.id}`}>{b.name}</option>)}
          </optgroup>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-3 py-1 rounded font-medium flex-shrink-0"
          style={{ backgroundColor: '#22c55e', color: '#fff' }}
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs px-3 py-1 rounded flex-shrink-0"
          style={{ backgroundColor: '#2a2d3e', color: '#f1f5f9' }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (deleting) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#2a2d3e' }}>
        <span className="text-sm flex-1" style={{ color: '#ef4444' }}>Delete this transaction?</span>
        <button
          onClick={handleDelete}
          disabled={saving}
          className="text-xs px-3 py-1 rounded font-medium"
          style={{ backgroundColor: '#ef4444', color: '#fff' }}
        >
          Delete
        </button>
        <button
          onClick={() => setDeleting(false)}
          className="text-xs px-3 py-1 rounded"
          style={{ backgroundColor: '#2a2d3e', color: '#f1f5f9' }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#2a2d3e' }}>
      <span className="text-xs tabular-nums w-20 flex-shrink-0" style={{ color: '#64748b' }}>{tx.date}</span>
      <span className="text-sm flex-1 min-w-0 truncate" style={{ color: '#f1f5f9' }} title={tx.description}>
        {tx.description}
      </span>
      {showCategory && (
        <span
          className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline"
          style={{ backgroundColor: `${dotColor}22`, color: dotColor }}
        >
          {tx.categoryName || 'Skipped'}
        </span>
      )}
      <span
        className="text-sm tabular-nums flex-shrink-0 font-medium"
        style={{ color: tx.amount >= 0 ? '#22c55e' : '#f1f5f9' }}
      >
        {formatCurrency(tx.amount)}
      </span>
      <button
        onClick={startEdit}
        className="text-sm hover:opacity-60 flex-shrink-0 transition-opacity"
        style={{ color: '#64748b' }}
        title="Edit"
      >
        ✎
      </button>
      <button
        onClick={() => { setDeleting(true); setEditing(false); }}
        className="text-sm hover:opacity-60 flex-shrink-0 transition-opacity"
        style={{ color: '#64748b' }}
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}
