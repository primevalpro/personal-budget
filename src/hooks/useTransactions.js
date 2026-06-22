import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export function useTransactions(uid, month) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !month) return;
    const q = query(
      collection(db, 'users', uid, 'transactions'),
      where('month', '==', month),
    );
    const unsub = onSnapshot(q, snap => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      txs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setTransactions(txs);
      setLoading(false);
    });
    return unsub;
  }, [uid, month]);

  return { transactions, loading };
}
