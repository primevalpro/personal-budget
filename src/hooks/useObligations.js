import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp, writeBatch, increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { currentMonth } from '../utils/dateUtils';

export function useObligations(uid) {
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'obligations'),
      orderBy('dueDay', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      setObligations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  async function addObligation(name, amount, dueDay) {
    await addDoc(collection(db, 'users', uid, 'obligations'), {
      name,
      amount: Number(amount),
      dueDay: Number(dueDay),
      assignedMonth: '',
      paidMonth: '',
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
