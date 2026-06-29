import { useState, useEffect } from 'react';
import {
  collection, getDocs, writeBatch, doc, getDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { currentMonth, formatCurrency } from '../utils/dateUtils';

// ── Wipe helpers ────────────────────────────────────────────────

const WIPE_TARGETS = [
  { id: 'transactions', label: 'Transactions',    description: 'Clears all imported and manual transaction history' },
  { id: 'obligations',  label: 'Obligations',     description: 'Resets all obligation funding and paid state (names and amounts kept)' },
  { id: 'goals',        label: 'Monthly Budgets', description: 'Resets all budget assigned and spent amounts (names and targets kept)' },
  { id: 'buckets',      label: 'Buckets',         description: 'Resets all bucket balances and monthly assignments (names and targets kept)' },
  { id: 'balance',      label: 'Balance & RTA',   description: 'Resets checking account balance and imported income to zero' },
  { id: 'income',       label: 'Income Log',      description: 'Clears all legacy manual income entries' },
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

async function resetObligations(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'obligations'));
  const LIMIT = 499;
  for (let i = 0; i < snap.docs.length; i += LIMIT) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + LIMIT).forEach(d =>
      batch.update(d.ref, { assignedAmount: 0, assignedMonth: '', paidMonth: '' })
    );
    await batch.commit();
  }
}

async function resetGoals(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'goals'));
  const LIMIT = 499;
  for (let i = 0; i < snap.docs.length; i += LIMIT) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + LIMIT).forEach(d =>
      batch.update(d.ref, { assignedAmount: 0, spentAmount: 0 })
    );
    await batch.commit();
  }
}

async function resetBuckets(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'buckets'));
  const LIMIT = 499;
  for (let i = 0; i < snap.docs.length; i += LIMIT) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + LIMIT).forEach(d =>
      batch.update(d.ref, { currentAmount: 0, txSpend: 0, monthlyAssigned: 0, monthlyAssignedMonth: '' })
    );
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

async function executeWipe(uid, id) {
  switch (id) {
    case 'transactions': return deleteCollection(uid, 'transactions');
    case 'obligations':  return resetObligations(uid);
    case 'goals':        return resetGoals(uid);
    case 'buckets':      return resetBuckets(uid);
    case 'balance':      return resetBudget(uid);
    case 'income':       return deleteCollection(uid, 'income');
  }
}

// ── Clean Slate Modal ───────────────────────────────────────────

function CleanSlateModal({ uid, onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [obligations, setObligations] = useState([]);
  // nonObAssigned = goal + bucket portions; doesn't change during the modal
  const [nonObAssigned, setNonObAssigned] = useState(0);
  // totalAssigned at load time — used for "Calculate from assignments" quick fill
  const [loadedTotalAssigned, setLoadedTotalAssigned] = useState(0);

  const [balanceInput, setBalanceInput] = useState('');
  const [rtaInput, setRtaInput] = useState('');
  const [checkedObs, setCheckedObs] = useState(new Set());

  useEffect(() => {
    async function load() {
      const cm = currentMonth();
      const [budgetSnap, obSnap, goalSnap, bucketSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid, 'profile', 'budget')),
        getDocs(collection(db, 'users', uid, 'obligations')),
        getDocs(query(collection(db, 'users', uid, 'goals'), where('month', '==', cm))),
        getDocs(collection(db, 'users', uid, 'buckets')),
      ]);

      const bal = budgetSnap.data()?.balance ?? 0;
      setBalanceInput(String(bal));

      const obs = obSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setObligations(obs);

      const obAssigned = obs
        .filter(o => o.assignedMonth === cm)
        .reduce((s, o) => s + (o.assignedAmount || 0), 0);
      const goalAssigned = goalSnap.docs.reduce((s, d) => s + (d.data().assignedAmount || 0), 0);
      const bucketAssigned = bucketSnap.docs.reduce((s, d) => {
        const b = d.data();
        return s + (b.currentAmount || 0) + (b.txSpend || 0);
      }, 0);

      const nonOb = goalAssigned + bucketAssigned;
      setNonObAssigned(nonOb);
      setLoadedTotalAssigned(obAssigned + nonOb);
      setLoading(false);
    }
    load();
  }, [uid]);

  function toggleOb(id) {
    setCheckedObs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const allSelected = obligations.length > 0 && checkedObs.size === obligations.length;

  function toggleAll() {
    setCheckedObs(allSelected ? new Set() : new Set(obligations.map(o => o.id)));
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const cm = currentMonth();
      const balVal = Number(balanceInput) || 0;
      const rtaVal = Number(rtaInput) || 0;

      // Recompute obligation contribution using final state (checked obs at full amount)
      const obAssignedFinal = obligations.reduce((s, o) => {
        if (checkedObs.has(o.id)) return s + (o.amount || 0);
        if (o.assignedMonth === cm) return s + (o.assignedAmount || 0);
        return s;
      }, 0);
      const finalTotalAssigned = obAssignedFinal + nonObAssigned;

      const batch = writeBatch(db);

      batch.update(doc(db, 'users', uid, 'profile', 'budget'), {
        balance: balVal,
        totalImportedIncome: rtaVal + finalTotalAssigned,
        updatedAt: serverTimestamp(),
      });

      for (const ob of obligations) {
        if (checkedObs.has(ob.id)) {
          batch.update(doc(db, 'users', uid, 'obligations', ob.id), {
            assignedAmount: ob.amount,
            assignedMonth: cm,
            paidMonth: cm,
          });
        }
      }

      await batch.commit();
      setStep('done');
    } catch (err) {
      console.error('Clean slate setup failed:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 overflow-y-auto"
        style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e', maxHeight: '90vh' }}
      >
        {step === 'done' && (
          <>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>You're all set.</h2>
              <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
                Your balance, RTA, and paid obligations have been updated.
              </p>
            </div>
            <button
              onClick={onClose}
              className="py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
            >
              Done
            </button>
          </>
        )}

        {step !== 'done' && loading && (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
          </div>
        )}

        {step !== 'done' && !loading && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>Clean Slate Setup</h2>
              <span className="text-xs tabular-nums" style={{ color: '#64748b' }}>Step {step} of 3</span>
            </div>

            {/* Step 1 — Balance */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                    What is your current checking account balance?
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#64748b' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={balanceInput}
                      onChange={e => setBalanceInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && balanceInput) setStep(2); }}
                      autoFocus
                      className="w-full border rounded-xl pl-7 pr-3 py-2.5 text-sm tabular-nums outline-none"
                      style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f1f5f9' }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    Enter the exact amount shown in your USAA account right now.
                  </p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={balanceInput === '' || isNaN(Number(balanceInput))}
                  className="py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
                  style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
                >
                  Next
                </button>
              </div>
            )}

            {/* Step 2 — RTA */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                    How much of that balance is unallocated?
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#64748b' }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={rtaInput}
                      onChange={e => setRtaInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && rtaInput !== '') setStep(3); }}
                      autoFocus
                      className="w-full border rounded-xl pl-7 pr-3 py-2.5 text-sm tabular-nums outline-none"
                      style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f1f5f9' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRtaInput(balanceInput)}
                      className="flex-1 py-1.5 rounded-lg text-xs border hover:opacity-80 transition-opacity"
                      style={{ borderColor: '#2a2d3e', color: '#94a3b8' }}
                    >
                      Use full balance
                    </button>
                    <button
                      onClick={() => setRtaInput(String((Number(balanceInput) - loadedTotalAssigned).toFixed(2)))}
                      className="flex-1 py-1.5 rounded-lg text-xs border hover:opacity-80 transition-opacity"
                      style={{ borderColor: '#2a2d3e', color: '#94a3b8' }}
                    >
                      Calculate from assignments
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    This becomes your Ready to Assign starting point. If you've already assigned money to categories, use "Calculate from assignments" to account for that.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl text-sm border hover:opacity-80 transition-opacity"
                    style={{ borderColor: '#2a2d3e', color: '#64748b' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={rtaInput === '' || isNaN(Number(rtaInput))}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
                    style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — Paid obligations */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                    Which obligations have already been paid this month?
                  </label>
                  {obligations.length === 0 ? (
                    <p className="text-sm" style={{ color: '#64748b' }}>
                      No obligations set up yet — you can add them from the Budget tab.
                    </p>
                  ) : (
                    <>
                      <button
                        onClick={toggleAll}
                        className="self-start text-xs hover:opacity-70 transition-opacity"
                        style={{ color: '#6366f1' }}
                      >
                        {allSelected ? 'Clear all' : 'Select all'}
                      </button>
                      <div
                        className="flex flex-col rounded-xl overflow-hidden overflow-y-auto"
                        style={{ border: '1px solid #2a2d3e', maxHeight: '200px' }}
                      >
                        {obligations.map((ob, i) => (
                          <label
                            key={ob.id}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                            style={i > 0 ? { borderTop: '1px solid #2a2d3e' } : {}}
                          >
                            <input
                              type="checkbox"
                              checked={checkedObs.has(ob.id)}
                              onChange={() => toggleOb(ob.id)}
                              className="w-4 h-4 flex-shrink-0 accent-indigo-500"
                            />
                            <span className="flex-1 text-sm" style={{ color: '#f1f5f9' }}>{ob.name}</span>
                            <span className="text-sm tabular-nums flex-shrink-0" style={{ color: '#94a3b8' }}>
                              {formatCurrency(ob.amount || 0)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    Checked obligations will be fully funded and marked as paid for the current month.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(2)}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl text-sm border hover:opacity-80 transition-opacity disabled:opacity-50"
                    style={{ borderColor: '#2a2d3e', color: '#64748b' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
                  >
                    {saving ? 'Saving…' : 'Finish'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Settings Page ───────────────────────────────────────────────

export default function SettingsPage({ uid, onBack }) {
  const [selected, setSelected] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipeDone, setWipeDone] = useState(false);
  const [showCleanSlate, setShowCleanSlate] = useState(false);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setWipeDone(false);
  }

  async function handleWipe() {
    setWiping(true);
    try {
      for (const id of selected) {
        await executeWipe(uid, id);
      }
      setSelected(new Set());
      setWipeDone(true);
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

        {/* Clean Slate Setup */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2d3e' }}>
          <div className="px-5 py-4" style={{ backgroundColor: '#1a1d27' }}>
            <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>Clean Slate Setup</h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
              Use this after a data wipe to establish your starting balance and mark obligations already paid this month.
            </p>
          </div>
          <div className="px-5 py-4" style={{ borderTop: '1px solid #2a2d3e', backgroundColor: '#0f1117' }}>
            <button
              onClick={() => setShowCleanSlate(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
            >
              Run Setup
            </button>
          </div>
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
            {wipeDone && (
              <span className="text-sm" style={{ color: '#22c55e' }}>
                Done. Selected data has been wiped.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Wipe confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }}
          >
            <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>Are you sure?</h2>
            <div className="flex flex-col gap-2">
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                This will reset the selected data. Your categories, names, and targets will not be
                affected — only dollar amounts and history will be cleared. This cannot be undone.
              </p>
              <ul className="flex flex-col gap-0.5">
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

      {/* Clean Slate modal */}
      {showCleanSlate && (
        <CleanSlateModal uid={uid} onClose={() => setShowCleanSlate(false)} />
      )}
    </div>
  );
}
