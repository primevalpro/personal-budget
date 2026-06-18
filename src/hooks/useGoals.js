import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, where, getDocs, writeBatch, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { currentMonth, prevMonth } from '../utils/dateUtils';

export function useGoals(uid) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let unsub;

    async function initAndSubscribe() {
      const month = currentMonth();
      const colRef = collection(db, 'users', uid, 'goals');

      // Check if this month already has goals
      const currentSnap = await getDocs(query(colRef, where('month', '==', month)));

      if (currentSnap.empty) {
        // Try to carry over from previous month
        const prevSnap = await getDocs(query(colRef, where('month', '==', prevMonth())));
        if (!prevSnap.empty) {
          const batch = writeBatch(db);
          prevSnap.docs.forEach(d => {
            const data = d.data();
            batch.set(doc(colRef), {
              category: data.category,
              targetAmount: data.targetAmount,
              spentAmount: 0,
              month,
              createdAt: serverTimestamp(),
            });
          });
          await batch.commit();
        }
      }

      // Real-time listener for this month's goals
      unsub = onSnapshot(
        query(colRef, where('month', '==', month)),
        snap => {
          setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
      );
    }

    initAndSubscribe();
    return () => unsub?.();
  }, [uid]);

  async function addGoal(category, targetAmount) {
    await addDoc(collection(db, 'users', uid, 'goals'), {
      category,
      targetAmount: Number(targetAmount),
      spentAmount: 0,
      month: currentMonth(),
      createdAt: serverTimestamp(),
    });
  }

  async function updateGoal(id, fields) {
    await updateDoc(doc(db, 'users', uid, 'goals', id), fields);
  }

  async function deleteGoal(id) {
    await deleteDoc(doc(db, 'users', uid, 'goals', id));
  }

  async function addSpend(id, amount) {
    await updateDoc(doc(db, 'users', uid, 'goals', id), {
      spentAmount: increment(Number(amount)),
    });
  }

  return { goals, loading, addGoal, updateGoal, deleteGoal, addSpend };
}
