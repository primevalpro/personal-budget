import { useState } from 'react';
import { collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const WIPE_TARGETS = [
  { id: 'transactions',  label: 'Transactions',    description: 'All imported and manual transactions' },
  { id: 'obligations',   label: 'Obligations',      description: 'All monthly obligations' },
  { id: 'goals',         label: 'Monthly Budgets',  description: 'All monthly budget categories' },
  { id: 'buckets',       label: 'Buckets',          description: 'All savings buckets' },
  { id: 'balance',       label: 'Balance & RTA',    description: 'Resets balance and totalImportedIncome to 0' },
  { id: 'income',        label: 'Income Log',       description: 'All manual income entries (legacy)' },
];

async function deleteCollection(uid, collectionName) {
  const snap = await getDocs(collection(db, 'users', uid, collectionName));
  const LIMIT = 499;
  for (let i = 0; i < snap.docs.length; i += LIMIT) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + LIMIT).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

async function resetBudget(uid) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid, 'profile', 'budget'), {
    balance: 0,
    totalImportedIncome: 0,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export default function SettingsPage({ uid, onBack }) {
  const [selected, setSelected] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [done, setDone] = useState(false);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setDone(false);
  }

  async function handleWipe() {
    setWiping(true);
    try {
      for (const id of selected) {
        if (id === 'balance') await resetBudget(uid);
        else await deleteCollection(uid, id);
      }
      setSelected(new Set());
      setDone(true);
    } finally {
      setWiping(false);
      setShowConfirm(false);
    }
  }

  const selectedTargets = WIPE_TARGETS.filter(t => selected.has(t.id));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col gap-8">

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: '#64748b' }}
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold" style={{ color: '#f1f5f9' }}>Settings</h1>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ef4444' }}>
          <div className="px-5 py-4" style={{ backgroundColor: '#1a1d27' }}>
            <h2 className="text-base font-semibold" style={{ color: '#ef4444' }}>Danger Zone</h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
              These actions are permanent and cannot be undone.
            </p>
          </div>

          <div style={{ borderTop: '1px solid #ef4444', backgroundColor: '#0f1117' }}>
            {WIPE_TARGETS.map((target, i) => (
              <label
                key={target.id}
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:opacity-80 transition-opacity"
                style={i > 0 ? { borderTop: '1px solid #2a2d3e' } : {}}
              >
                <input
                  type="checkbox"
                  checked={selected.has(target.id)}
                  onChange={() => toggle(target.id)}
                  className="w-4 h-4 flex-shrink-0 accent-red-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{target.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{target.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="px-5 py-4 flex items-center gap-4" style={{ borderTop: '1px solid #2a2d3e', backgroundColor: '#1a1d27' }}>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-30"
              style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}
            >
              Wipe Selected Data
            </button>
            {done && (
              <span className="text-sm" style={{ color: '#22c55e' }}>
                Done. Selected data has been wiped.
              </span>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }}
          >
            <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>Are you sure?</h2>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm" style={{ color: '#94a3b8' }}>The following will be permanently deleted:</p>
              <ul className="flex flex-col gap-0.5 mt-1">
                {selectedTargets.map(t => (
                  <li key={t.id} className="text-sm font-medium" style={{ color: '#ef4444' }}>
                    · {t.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleWipe}
                disabled={wiping}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#ef4444', color: '#f1f5f9' }}
              >
                {wiping ? 'Wiping…' : 'Yes, wipe it'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={wiping}
                className="px-4 py-2.5 rounded-xl text-sm border transition-opacity disabled:opacity-50 hover:opacity-80"
                style={{ borderColor: '#2a2d3e', color: '#64748b' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
