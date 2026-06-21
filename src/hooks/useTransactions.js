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

  async function importTransactions({ txDocs, goalIncrements, obligationUpdates, newRules }) {
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
      if (tx.categoryType === 'goal' && oldCategoryDoc) {
        const newSpent = Math.max(0, (oldCategoryDoc.spentAmount ?? 0) - absAmt);
        batch.update(doc(db, 'users', uid, 'goals', tx.categoryId), { spentAmount: newSpent });
      } else if (tx.categoryType === 'obligation' && oldCategoryDoc) {
        const newAmt = Math.max(0, (oldCategoryDoc.assignedAmount ?? 0) - absAmt);
        const updates = { assignedAmount: newAmt, assignedMonth: newAmt > 0 ? tx.month : '' };
        if (newAmt < (oldCategoryDoc.amount ?? 0)) updates.paidMonth = '';
        batch.update(doc(db, 'users', uid, 'obligations', tx.categoryId), updates);
      }

      if (newFields.categoryType === 'goal' && newCategoryDoc) {
        const newSpent = (newCategoryDoc.spentAmount ?? 0) + absAmt;
        batch.update(doc(db, 'users', uid, 'goals', newFields.categoryId), { spentAmount: newSpent });
      } else if (newFields.categoryType === 'obligation' && newCategoryDoc) {
        const newAmt = (newCategoryDoc.assignedAmount ?? 0) + absAmt;
        const updates = { assignedAmount: newAmt, assignedMonth: tx.month };
        if (newAmt >= (newCategoryDoc.amount ?? 0)) updates.paidMonth = tx.month;
        batch.update(doc(db, 'users', uid, 'obligations', newFields.categoryId), updates);
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
    }

    await batch.commit();
  }

  return { transactions, loading, importTransactions, updateTransaction, deleteTransaction };
}
