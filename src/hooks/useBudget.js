import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export function useBudget(uid) {
  const [balance, setBalance] = useState(0);
  const [totalImportedIncome, setTotalImportedIncome] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'profile', 'budget');
    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) {
        setDoc(ref, { balance: 0, totalImportedIncome: 0, updatedAt: serverTimestamp() });
        return;
      }
      const data = snap.data();
      setBalance(data.balance ?? 0);
      if (data.totalImportedIncome === undefined) {
        updateDoc(ref, { totalImportedIncome: 0 });
        setTotalImportedIncome(0);
      } else {
        setTotalImportedIncome(data.totalImportedIncome);
      }
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  async function updateBalance(newBalance) {
    await setDoc(
      doc(db, 'users', uid, 'profile', 'budget'),
      { balance: Number(newBalance), updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  return { balance, totalImportedIncome, loading, updateBalance };
}
