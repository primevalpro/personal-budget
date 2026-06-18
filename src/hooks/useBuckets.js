import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp, increment,
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
    await updateDoc(doc(db, 'users', uid, 'buckets', id), {
      currentAmount: increment(Number(amount)),
    });
  }

  async function withdraw(id, amount, currentAmount) {
    await updateDoc(doc(db, 'users', uid, 'buckets', id), {
      currentAmount: Math.max(0, currentAmount - Number(amount)),
    });
  }

  return { buckets, loading, addBucket, updateBucket, deleteBucket, addFunds, withdraw };
}
