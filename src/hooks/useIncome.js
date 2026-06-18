import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc, query, where,
  serverTimestamp, writeBatch, increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { currentMonth } from '../utils/dateUtils';

export function useIncome(uid) {
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'income'),
      where('month', '==', currentMonth()),
    );
    const unsub = onSnapshot(q, snap => {
      const entries = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setIncome(entries);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  async function addIncome(amount, note) {
    const batch = writeBatch(db);
    const incomeRef = doc(collection(db, 'users', uid, 'income'));
    batch.set(incomeRef, {
      amount: Number(amount),
      note: note || '',
      month: currentMonth(),
      createdAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'users', uid, 'profile', 'budget'),
      { balance: increment(Number(amount)), updatedAt: serverTimestamp() },
      { merge: true },
    );
    await batch.commit();
  }

  async function deleteIncome(id, amount) {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', uid, 'income', id));
    batch.set(
      doc(db, 'users', uid, 'profile', 'budget'),
      { balance: increment(-Number(amount)), updatedAt: serverTimestamp() },
      { merge: true },
    );
    await batch.commit();
  }

  return { income, loading, addIncome, deleteIncome };
}
