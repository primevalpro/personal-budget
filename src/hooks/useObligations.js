import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  query, orderBy, getDocs, getDoc, setDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { currentMonth } from '../utils/dateUtils';
import { deleteWithOrphanCleanup } from '../utils/categoryBatch';

export function useObligations(uid) {
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let unsub;

    async function cleanupAndSubscribe() {
      const month = currentMonth();
      const profileRef = doc(db, 'users', uid, 'profile', 'budget');
      const profileSnap = await getDoc(profileRef);
      const lastCleanupMonth = profileSnap.data()?.lastObCleanupMonth ?? '';

      // On first load of a new month: delete one-time obligations, reset assignedAmount for recurring
      if (lastCleanupMonth !== month) {
        const oblRef = collection(db, 'users', uid, 'obligations');
        const snap = await getDocs(query(oblRef));

        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => {
            const data = d.data();
            if (data.recurring === false) {
              batch.delete(doc(db, 'users', uid, 'obligations', d.id));
            } else {
              batch.update(doc(db, 'users', uid, 'obligations', d.id), {
                assignedAmount: 0,
                assignedMonth: '',
              });
            }
          });
          await batch.commit();
        }

        await setDoc(profileRef, { lastObCleanupMonth: month }, { merge: true });
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

  async function addObligation(name, amount, dueDay, recurring = true, subcategoryId = '') {
    await addDoc(collection(db, 'users', uid, 'obligations'), {
      name,
      amount: Number(amount),
      dueDay: Number(dueDay),
      assignedAmount: 0,
      assignedMonth: '',
      paidMonth: '',
      recurring,
      subcategoryId,
      createdAt: serverTimestamp(),
    });
  }

  async function updateObligation(id, fields) {
    await updateDoc(doc(db, 'users', uid, 'obligations', id), fields);
  }

  async function deleteObligation(id) {
    await deleteWithOrphanCleanup(uid, 'obligations', 'obligation', id);
  }

  // Sets absolute assignedAmount; clears assignedMonth if amount is 0
  async function assignObligation(id, newAmount) {
    const val = Number(newAmount);
    await updateDoc(doc(db, 'users', uid, 'obligations', id), {
      assignedAmount: val,
      assignedMonth: val > 0 ? currentMonth() : '',
    });
  }

  // Paid toggle auto-funds any shortfall without touching balance
  async function togglePaid(id, isPaid, obligation) {
    if (isPaid) {
      await updateDoc(doc(db, 'users', uid, 'obligations', id), { paidMonth: '' });
    } else {
      const shortfall = (obligation.amount || 0) - (obligation.assignedAmount || 0);
      const updates = { paidMonth: currentMonth() };
      if (shortfall > 0) {
        updates.assignedAmount = obligation.amount;
        updates.assignedMonth = currentMonth();
      }
      await updateDoc(doc(db, 'users', uid, 'obligations', id), updates);
    }
  }

  return { obligations, loading, addObligation, updateObligation, deleteObligation, assignObligation, togglePaid };
}
