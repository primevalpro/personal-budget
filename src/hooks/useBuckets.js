import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp, increment, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useBuckets(uid) {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'buckets'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      setBuckets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  async function addBucket(name, targetAmount) {
    await addDoc(collection(db, 'users', uid, 'buckets'), {
      name,
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      createdAt: serverTimestamp(),
    });
  }

  async function updateBucket(id, fields) {
    await updateDoc(doc(db, 'users', uid, 'buckets', id), fields);
  }

  async function deleteBucket(id) {
    await deleteDoc(doc(db, 'users', uid, 'buckets', id));
  }

  async function addFunds(id, amount) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'buckets', id), {
      currentAmount: increment(Number(amount)),
    });
    batch.set(
      doc(db, 'users', uid, 'profile', 'budget'),
      { balance: increment(-Number(amount)), updatedAt: serverTimestamp() },
      { merge: true },
    );
    await batch.commit();
  }

  async function withdraw(id, amount, currentAmount) {
    const actual = Math.min(Number(amount), currentAmount);
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'buckets', id), {
      currentAmount: currentAmount - actual,
    });
    batch.set(
      doc(db, 'users', uid, 'profile', 'budget'),
      { balance: increment(actual), updatedAt: serverTimestamp() },
      { merge: true },
    );
    await batch.commit();
  }

  return { buckets, loading, addBucket, updateBucket, deleteBucket, addFunds, withdraw };
}
