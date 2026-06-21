import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc,
  query, where, orderBy, serverTimestamp, writeBatch, increment,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useTransactions(uid, month) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !month) return;
    setLoading(true);
    const q = query(
      collection(db, 'users', uid, 'transactions'),
      where('month', '==', month),
      orderBy('date', 'desc'),
    );
    return onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [uid, month]);

  async function importTransactions({ txDocs, goalIncrements, obligationUpdates, bucketUpdates, newRules }) {
    // goalIncrements: { [goalId]: positiveNumber }
    // obligationUpdates: { [oblId]: { newAssigned, total, txMonth } }
    // bucketUpdates: { [bucketId]: { newAmount } }
    const batch = writeBatch(db);

    for (const tx of txDocs) {
      const ref = doc(collection(db, 'users', uid, 'transactions'));
      batch.set(ref, { ...tx, importedAt: serverTimestamp() });
    }

    for (const [goalId, delta] of Object.entries(goalIncrements)) {
      batch.update(doc(db, 'users', uid, 'goals', goalId), {
        spentAmount: increment(delta),
      });
    }

    for (const [oblId, { newAssigned, total, txMonth }] of Object.entries(obligationUpdates)) {
      const fields = {
        assignedAmount: newAssigned,
        assignedMonth: newAssigned > 0 ? txMonth : '',
      };
      if (newAssigned >= total) fields.paidMonth = txMonth;
      batch.update(doc(db, 'users', uid, 'obligations', oblId), fields);
    }

    for (const [bucketId, { newAmount }] of Object.entries(bucketUpdates)) {
      batch.update(doc(db, 'users', uid, 'buckets', bucketId), { currentAmount: newAmount });
    }

    for (const rule of newRules) {
      const ref = doc(collection(db, 'users', uid, 'categoryRules'));
      batch.set(ref, { ...rule, createdAt: serverTimestamp() });
    }

    await batch.commit();
  }

  async function updateTransaction(tx, newFields, oldCategoryDoc, newCategoryDoc) {
    const batch = writeBatch(db);
    const absAmt = Math.abs(tx.amount);
    const categoryChanged =
      newFields.categoryId !== tx.categoryId || newFields.categoryType !== tx.categoryType;

    batch.update(doc(db, 'users', uid, 'transactions', tx.id), newFields);

    if (categoryChanged) {
      // Reverse old category
      if (tx.categoryType === 'goal' && oldCategoryDoc) {
        const newSpent = Math.max(0, (oldCategoryDoc.spentAmount ?? 0) - absAmt);
        batch.update(doc(db, 'users', uid, 'goals', tx.categoryId), { spentAmount: newSpent });
      } else if (tx.categoryType === 'obligation' && oldCategoryDoc) {
        const newAmt = Math.max(0, (oldCategoryDoc.assignedAmount ?? 0) - absAmt);
        const updates = { assignedAmount: newAmt, assignedMonth: newAmt > 0 ? tx.month : '' };
        if (newAmt < (oldCategoryDoc.amount ?? 0)) updates.paidMonth = '';
        batch.update(doc(db, 'users', uid, 'obligations', tx.categoryId), updates);
      } else if (tx.categoryType === 'bucket' && oldCategoryDoc) {
        // Reverse spend: add the amount back to currentAmount
        const newAmt = (oldCategoryDoc.currentAmount ?? 0) + absAmt;
        batch.update(doc(db, 'users', uid, 'buckets', tx.categoryId), { currentAmount: newAmt });
      }

      // Apply new category
      if (newFields.categoryType === 'goal' && newCategoryDoc) {
        const newSpent = (newCategoryDoc.spentAmount ?? 0) + absAmt;
        batch.update(doc(db, 'users', uid, 'goals', newFields.categoryId), { spentAmount: newSpent });
      } else if (newFields.categoryType === 'obligation' && newCategoryDoc) {
        const newAmt = (newCategoryDoc.assignedAmount ?? 0) + absAmt;
        const updates = { assignedAmount: newAmt, assignedMonth: tx.month };
        if (newAmt >= (newCategoryDoc.amount ?? 0)) updates.paidMonth = tx.month;
        batch.update(doc(db, 'users', uid, 'obligations', newFields.categoryId), updates);
      } else if (newFields.categoryType === 'bucket' && newCategoryDoc) {
        // Spend from bucket: subtract from currentAmount (no floor)
        const newAmt = (newCategoryDoc.currentAmount ?? 0) - absAmt;
        batch.update(doc(db, 'users', uid, 'buckets', newFields.categoryId), { currentAmount: newAmt });
      }
    }

    await batch.commit();
  }

  async function deleteTransaction(tx, categoryDoc) {
    const batch = writeBatch(db);
    const absAmt = Math.abs(tx.amount);

    batch.delete(doc(db, 'users', uid, 'transactions', tx.id));

    if (tx.categoryType === 'goal' && categoryDoc) {
      const newSpent = Math.max(0, (categoryDoc.spentAmount ?? 0) - absAmt);
      batch.update(doc(db, 'users', uid, 'goals', tx.categoryId), { spentAmount: newSpent });
    } else if (tx.categoryType === 'obligation' && categoryDoc) {
      const newAmt = Math.max(0, (categoryDoc.assignedAmount ?? 0) - absAmt);
      const updates = { assignedAmount: newAmt, assignedMonth: newAmt > 0 ? tx.month : '' };
      if (newAmt < (categoryDoc.amount ?? 0)) updates.paidMonth = '';
      batch.update(doc(db, 'users', uid, 'obligations', tx.categoryId), updates);
    } else if (tx.categoryType === 'bucket' && categoryDoc) {
      // Reverse spend: add the amount back
      const newAmt = (categoryDoc.currentAmount ?? 0) + absAmt;
      batch.update(doc(db, 'users', uid, 'buckets', tx.categoryId), { currentAmount: newAmt });
    }

    await batch.commit();
  }

  return { transactions, loading, importTransactions, updateTransaction, deleteTransaction };
}
