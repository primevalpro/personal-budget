import { useState } from 'react';
import BucketItem from '../buckets/BucketItem';
import { formatCurrency } from '../../utils/dateUtils';

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function SubcategoryBlock({
  uid, subcat, items, allSubcats,
  onAdd, onUpdateItem, onDeleteItem, onAddFunds, onUnassign, onWithdraw, onFullyFund, onSetMonthlyAssigned,
  onUpdateSubcat, onDeleteSubcat,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newMonthlyTarget, setNewMonthlyTarget] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState(subcat?.name || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isUncategorized = !subcat;
  const totalSaved = items.reduce((s, b) => s + (b.currentAmount || 0), 0);

  function cancelAdd() {
    setShowAdd(false);
    setNewName(''); setNewTarget(''); setNewMonthlyTarget('');
  }

  async function handleAdd() {
    const name = newName.trim();
    const target = Number(newTarget);
    if (!name || isNaN(target) || target < 0) return;
    await onAdd(name, target, Number(newMonthlyTarget) || 0);
    cancelAdd();
  }

  function addKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') cancelAdd();
  }

  async function saveSubcatName() {
    const name = editNameInput.trim();
    if (!name) return;
    await onUpdateSubcat(name);
    setEditingName(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 group/hdr">
        <div className="flex items-center gap-2 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                className="bg-transparent border rounded px-2 py-1 text-sm outline-none"
                style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
                value={editNameInput}
                onChange={e => setEditNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveSubcatName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <button onClick={saveSubcatName} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}>Save</button>
              <button onClick={() => setEditingName(false)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
            </div>
          ) : (
            <>
              <span className="text-sm font-semibold" style={{ color: isUncategorized ? '#475569' : '#94a3b8' }}>
                {isUncategorized ? 'Uncategorized' : subcat.name}
              </span>
              {!isUncategorized && !confirmDelete && (
                <div className="opacity-0 group-hover/hdr:opacity-100 flex gap-1 transition-opacity">
                  <button onClick={() => { setEditNameInput(subcat.name); setEditingName(true); }} className="p-1 rounded hover:opacity-70" style={{ color: '#64748b' }} title="Rename"><PencilIcon /></button>
                  <button onClick={() => setConfirmDelete(true)} className="p-1 rounded hover:opacity-70" style={{ color: '#ef4444' }} title="Delete subcategory"><TrashIcon /></button>
                </div>
              )}
            </>
          )}
        </div>
        {items.length > 0 && (
          <span className="text-xs tabular-nums flex-shrink-0 ml-2" style={{ color: '#64748b' }}>
            {formatCurrency(totalSaved)} saved
          </span>
        )}
      </div>

      {confirmDelete && (
        <div className="flex items-center gap-3 p-3 rounded-lg mb-2" style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }}>
          <span className="text-sm flex-1" style={{ color: '#f1f5f9' }}>
            Delete <span className="font-semibold">"{subcat?.name}"</span>? Items move to Uncategorized.
          </span>
          <button onClick={onDeleteSubcat} className="px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0" style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}>Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-sm border flex-shrink-0" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2d3e', backgroundColor: '#1a1d27' }}>
        {items.length === 0 && !showAdd && (
          <p className="py-3 text-center text-xs" style={{ color: '#475569' }}>No items yet</p>
        )}
        {items.map((b, i) => (
          <div key={b.id} style={i > 0 ? { borderTop: '1px solid #2a2d3e' } : {}}>
            <BucketItem
              uid={uid}
              bucket={b}
              onUpdate={onUpdateItem}
              onDelete={onDeleteItem}
              onAddFunds={onAddFunds}
              onUnassign={onUnassign}
              onWithdraw={onWithdraw}
              onFullyFund={onFullyFund}
              onSetMonthlyAssigned={onSetMonthlyAssigned}
              subcategories={allSubcats}
            />
          </div>
        ))}

        {showAdd ? (
          <div className="p-3 flex flex-col gap-2" style={items.length > 0 ? { borderTop: '1px solid #2a2d3e' } : {}}>
            <input
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
              placeholder="Bucket name (e.g. Emergency Fund)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={addKeyDown}
              autoFocus
            />
            <input
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm tabular-nums outline-none"
              style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
              type="number" min="0" step="0.01"
              placeholder="Savings goal"
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              onKeyDown={addKeyDown}
            />
            <input
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm tabular-nums outline-none"
              style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
              type="number" min="0" step="0.01"
              placeholder="Monthly target (optional)"
              value={newMonthlyTarget}
              onChange={e => setNewMonthlyTarget(e.target.value)}
              onKeyDown={addKeyDown}
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}>Add</button>
              <button onClick={cancelAdd} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-2.5 text-sm transition-opacity hover:opacity-80"
            style={{ borderTop: items.length > 0 ? '1px solid #2a2d3e' : 'none', color: '#64748b' }}
          >
            + Add bucket
          </button>
        )}
      </div>
    </div>
  );
}

export default function BucketsSection({
  uid, buckets, subcategories,
  addBucket, updateBucket, deleteBucket, addFunds, unassignFunds, withdraw, fullyFundBucket, setMonthlyAssigned,
  addSubcategory, updateSubcategory, deleteSubcategory,
}) {
  const [showNewSubcat, setShowNewSubcat] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');

  const totalSaved = buckets.reduce((s, b) => s + (b.currentAmount || 0), 0);
  const totalTarget = buckets.reduce((s, b) => s + (b.targetAmount || 0), 0);

  const subcatIds = new Set(subcategories.map(s => s.id));
  const uncategorized = buckets.filter(b => !b.subcategoryId || !subcatIds.has(b.subcategoryId));

  async function handleAddSubcat() {
    if (!newSubcatName.trim()) return;
    await addSubcategory(newSubcatName.trim());
    setNewSubcatName('');
    setShowNewSubcat(false);
  }

  return (
    <section>
      <div className="flex items-center gap-4 pb-3 mb-5" style={{ borderBottom: '1px solid #2a2d3e' }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
          Buckets
        </span>
        {buckets.length > 0 && (
          <span className="text-xs tabular-nums" style={{ color: '#64748b' }}>
            {formatCurrency(totalSaved)} saved of {formatCurrency(totalTarget)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {subcategories.map(subcat => (
          <SubcategoryBlock
            key={subcat.id}
            uid={uid}
            subcat={subcat}
            items={buckets.filter(b => b.subcategoryId === subcat.id)}
            allSubcats={subcategories}
            onAdd={(name, target, monthlyTarget) => addBucket(name, target, monthlyTarget, subcat.id)}
            onUpdateItem={updateBucket}
            onDeleteItem={deleteBucket}
            onAddFunds={addFunds}
            onUnassign={unassignFunds}
            onWithdraw={withdraw}
            onFullyFund={fullyFundBucket}
            onSetMonthlyAssigned={setMonthlyAssigned}
            onUpdateSubcat={name => updateSubcategory(subcat.id, name)}
            onDeleteSubcat={() => deleteSubcategory(subcat.id)}
          />
        ))}

        {(uncategorized.length > 0 || subcategories.length === 0) && (
          <SubcategoryBlock
            key="__uncat__"
            uid={uid}
            subcat={null}
            items={uncategorized}
            allSubcats={subcategories}
            onAdd={(name, target, monthlyTarget) => addBucket(name, target, monthlyTarget, '')}
            onUpdateItem={updateBucket}
            onDeleteItem={deleteBucket}
            onAddFunds={addFunds}
            onUnassign={unassignFunds}
            onWithdraw={withdraw}
            onFullyFund={fullyFundBucket}
            onSetMonthlyAssigned={setMonthlyAssigned}
            onUpdateSubcat={null}
            onDeleteSubcat={null}
          />
        )}

        {showNewSubcat ? (
          <div className="flex gap-2">
            <input
              className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
              placeholder="Subcategory name (e.g. Emergency, Travel)"
              value={newSubcatName}
              onChange={e => setNewSubcatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSubcat(); if (e.key === 'Escape') { setShowNewSubcat(false); setNewSubcatName(''); } }}
              autoFocus
            />
            <button onClick={handleAddSubcat} className="px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0" style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}>Add</button>
            <button onClick={() => { setShowNewSubcat(false); setNewSubcatName(''); }} className="px-4 py-2 rounded-lg text-sm border flex-shrink-0" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewSubcat(true)}
            className="self-start text-sm py-2 px-4 rounded-lg border border-dashed transition-opacity hover:opacity-80"
            style={{ borderColor: '#2a2d3e', color: '#64748b' }}
          >
            + New Subcategory
          </button>
        )}
      </div>
    </section>
  );
}
