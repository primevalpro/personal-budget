import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  query, orderBy, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { currentMonth } from '../utils/dateUtils';
import { deleteWithOrphanCleanup } from '../utils/categoryBatch';

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
      const cm = currentMonth();
      setBuckets(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Lazily reset monthlyAssigned when month changes
          monthlyAssigned: data.monthlyAssignedMonth === cm ? (data.monthlyAssigned || 0) : 0,
        };
      }));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  async function addBucket(name, targetAmount, monthlyTarget = 0, subcategoryId = '') {
    await addDoc(collection(db, 'users', uid, 'buckets'), {
      name,
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      monthlyTarget: Number(monthlyTarget) || 0,
      monthlyAssigned: 0,
      monthlyAssignedMonth: '',
      subcategoryId,
      createdAt: serverTimestamp(),
    });
  }

  async function updateBucket(id, fields) {
    await updateDoc(doc(db, 'users', uid, 'buckets', id), fields);
  }

  async function deleteBucket(id) {
    await deleteWithOrphanCleanup(uid, 'buckets', 'bucket', id);
  }

  // No balance change — currentAmount increase is subtracted from RTA via the formula
  async function addFunds(id, amount, currentMonthlyAssigned) {
    await updateDoc(doc(db, 'users', uid, 'buckets', id), {
      currentAmount: increment(Number(amount)),
      monthlyAssigned: (currentMonthlyAssigned || 0) + Number(amount),
      monthlyAssignedMonth: currentMonth(),
    });
  }

  // Remove previously assigned funds; currentAmount can go negative, monthlyAssigned floors at 0
  async function unassignFunds(id, amount, currentMonthlyAssigned) {
    const capped = Math.min(Number(amount), Math.max(0, currentMonthlyAssigned || 0));
    if (capped <= 0) return;
    await updateDoc(doc(db, 'users', uid, 'buckets', id), {
      currentAmount: increment(-capped),
      monthlyAssigned: Math.max(0, (currentMonthlyAssigned || 0) - capped),
      monthlyAssignedMonth: currentMonth(),
    });
  }

  // No balance change — currentAmount decrease is reflected in RTA via the formula
  async function withdraw(id, amount, currentAmount, currentMonthlyAssigned) {
    const actual = Math.min(Number(amount), currentAmount);
    await updateDoc(doc(db, 'users', uid, 'buckets', id), {
      currentAmount: currentAmount - actual,
      monthlyAssigned: Math.max(0, (currentMonthlyAssigned || 0) - actual),
      monthlyAssignedMonth: currentMonth(),
    });
  }

  async function fullyFundBucket(id, monthlyTarget, monthlyAssigned, currentAmount) {
    const delta = monthlyTarget - monthlyAssigned;
    await updateDoc(doc(db, 'users', uid, 'buckets', id), {
      monthlyAssigned: monthlyTarget,
      monthlyAssignedMonth: currentMonth(),
      currentAmount: currentAmount + delta,
    });
  }

  async function setMonthlyAssigned(id, newValue, oldMonthlyAssigned, currentAmount) {
    const delta = newValue - oldMonthlyAssigned;
    await updateDoc(doc(db, 'users', uid, 'buckets', id), {
      monthlyAssigned: newValue,
      monthlyAssignedMonth: currentMonth(),
      currentAmount: Math.max(0, currentAmount + delta),
    });
  }

  return {
    buckets, loading,
    addBucket, updateBucket, deleteBucket,
    addFunds, unassignFunds, withdraw, fullyFundBucket, setMonthlyAssigned,
  };
}
