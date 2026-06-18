import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, where, getDocs, serverTimestamp, writeBatch, increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { currentMonth, prevMonth } from '../utils/dateUtils';

export function useObligations(uid) {
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let unsub;

    async function cleanupAndSubscribe() {
      const month = currentMonth();
      const prev = prevMonth();
      const cleanupKey = `obCleanup_${uid}`;

      // Run once per month: delete one-time obligations, refund if they were assigned
      if (localStorage.getItem(cleanupKey) !== month) {
        const oblRef = collection(db, 'users', uid, 'obligations');
        const snap = await getDocs(query(oblRef, where('recurring', '==', false)));

        if (!snap.empty) {
          const batch = writeBatch(db);
          const budgetRef = doc(db, 'users', uid, 'profile', 'budget');
          let refund = 0;
          snap.docs.forEach(d => {
            const data = d.data();
            if (data.assignedMonth === prev) refund += data.amount || 0;
            batch.delete(doc(db, 'users', uid, 'obligations', d.id));
          });
          if (refund > 0) {
            batch.set(budgetRef, { balance: increment(refund) }, { merge: true });
          }
          await batch.commit();
        }

        localStorage.setItem(cleanupKey, month);
      }

      const q = query(
        collection(db, 'users', uid, 'obligations'),
        orderBy('dueDay', 'asc'),
      );
      unsub = onSnapshot(q, s => {
        setObligations(s.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    }

    cleanupAndSubscribe();
    return () => unsub?.();
  }, [uid]);

  async function addObligation(name, amount, dueDay, recurring = true) {
    await addDoc(collection(db, 'users', uid, 'obligations'), {
      name,
      amount: Number(amount),
      dueDay: Number(dueDay),
      assignedMonth: '',
      paidMonth: '',
      recurring,
      createdAt: serverTimestamp(),
    });
  }

  async function updateObligation(id, fields) {
    await updateDoc(doc(db, 'users', uid, 'obligations', id), fields);
  }

  async function deleteObligation(id) {
    await deleteDoc(doc(db, 'users', uid, 'obligations', id));
  }

  async function assignObligation(id, amount, isAssigned) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'obligations', id), {
      assignedMonth: isAssigned ? '' : currentMonth(),
    });
    const delta = isAssigned ? Number(amount) : -Number(amount);
    batch.set(
      doc(db, 'users', uid, 'profile', 'budget'),
      { balance: increment(delta), updatedAt: serverTimestamp() },
      { merge: true },
    );
    await batch.commit();
  }

  async function togglePaid(id, isPaid) {
    await updateDoc(doc(db, 'users', uid, 'obligations', id), {
      paidMonth: isPaid ? '' : currentMonth(),
    });
  }

  return { obligations, loading, addObligation, updateObligation, deleteObligation, assignObligation, togglePaid };
}
