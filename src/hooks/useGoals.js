import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  query, where, getDocs, writeBatch, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { currentMonth, prevMonth } from '../utils/dateUtils';
import { deleteWithOrphanCleanup } from '../utils/categoryBatch';

export function useGoals(uid) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let unsub;

    async function initAndSubscribe() {
      const month = currentMonth();
      const colRef = collection(db, 'users', uid, 'goals');

      const currentSnap = await getDocs(query(colRef, where('month', '==', month)));

      if (currentSnap.empty) {
        const prevSnap = await getDocs(query(colRef, where('month', '==', prevMonth())));
        if (!prevSnap.empty) {
          const batch = writeBatch(db);
          prevSnap.docs.forEach(d => {
            const data = d.data();
            batch.set(doc(colRef), {
              category: data.category,
              targetAmount: data.targetAmount,
              subcategoryId: data.subcategoryId || '',
              assignedAmount: 0,
              spentAmount: 0,
              month,
              createdAt: serverTimestamp(),
            });
          });
          await batch.commit();
        }
      }

      unsub = onSnapshot(
        query(colRef, where('month', '==', month)),
        snap => {
          const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          console.log('[useGoals] snapshot fired —', loaded.length, 'goals:', loaded.map(g => ({ id: g.id, category: g.category, spentAmount: g.spentAmount, assignedAmount: g.assignedAmount, month: g.month })));
          setGoals(loaded);
          setLoading(false);
        },
      );
    }

    initAndSubscribe();
    return () => unsub?.();
  }, [uid]);

  async function addGoal(category, targetAmount, subcategoryId = '') {
    await addDoc(collection(db, 'users', uid, 'goals'), {
      category,
      targetAmount: Number(targetAmount),
      subcategoryId,
      assignedAmount: 0,
      spentAmount: 0,
      month: currentMonth(),
      createdAt: serverTimestamp(),
    });
  }

  async function updateGoal(id, fields) {
    await updateDoc(doc(db, 'users', uid, 'goals', id), fields);
  }

  async function deleteGoal(id) {
    await deleteWithOrphanCleanup(uid, 'goals', 'goal', id);
  }

  async function assignGoal(id, _currentAssigned, newAssigned) {
    await updateDoc(doc(db, 'users', uid, 'goals', id), {
      assignedAmount: Number(newAssigned),
    });
  }

  async function addSpend(id, amount) {
    await updateDoc(doc(db, 'users', uid, 'goals', id), {
      spentAmount: increment(Number(amount)),
    });
  }

  return { goals, loading, addGoal, updateGoal, deleteGoal, assignGoal, addSpend };
}
