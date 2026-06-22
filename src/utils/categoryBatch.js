import { doc, collection, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { currentMonth } from './dateUtils';

// Apply a single category effect to an existing batch
export function applyOne(batch, uid, categoryType, categoryId, amount, obligations) {
  if (!categoryType || categoryType === 'skipped' || !categoryId) return;
  const abs = Math.abs(amount);
  if (categoryType === 'goal') {
    batch.update(doc(db, 'users', uid, 'goals', categoryId), {
      spentAmount: increment(abs),
    });
  } else if (categoryType === 'obligation') {
    const ob = obligations?.find(o => o.id === categoryId);
    const newAssigned = (ob?.assignedAmount || 0) + abs;
    const updates = { assignedAmount: increment(abs), assignedMonth: currentMonth() };
    if (ob && newAssigned >= ob.amount) updates.paidMonth = currentMonth();
    batch.update(doc(db, 'users', uid, 'obligations', categoryId), updates);
  } else if (categoryType === 'bucket') {
    batch.update(doc(db, 'users', uid, 'buckets', categoryId), {
      currentAmount: increment(-abs),
    });
  }
}

// Reverse a category effect on an existing batch (for edit/delete)
export function reverseOne(batch, uid, tx) {
  if (!tx.categoryType || tx.categoryType === 'skipped' || !tx.categoryId) return;
  const abs = Math.abs(tx.amount);
  if (tx.categoryType === 'goal') {
    batch.update(doc(db, 'users', uid, 'goals', tx.categoryId), {
      spentAmount: increment(-abs),
    });
  } else if (tx.categoryType === 'obligation') {
    batch.update(doc(db, 'users', uid, 'obligations', tx.categoryId), {
      assignedAmount: increment(-abs),
      paidMonth: '',
    });
  } else if (tx.categoryType === 'bucket') {
    batch.update(doc(db, 'users', uid, 'buckets', tx.categoryId), {
      currentAmount: increment(abs),
    });
  }
}

// Build and return a batch for a full CSV import
// importRows: array of { date, description, originalDescription, amount, month,
//                        categoryType, categoryId, categoryName }
export function buildImportBatch(uid, importRows, obligations) {
  const batch = writeBatch(db);

  // Accumulate category totals so each doc is updated once per batch
  const goalTotals = new Map();
  const bucketTotals = new Map();
  const obligationTotals = new Map();

  for (const row of importRows) {
    const txRef = doc(collection(db, 'users', uid, 'transactions'));
    batch.set(txRef, {
      date: row.date,
      description: row.description || row.originalDescription,
      originalDescription: row.originalDescription,
      amount: row.amount,
      month: row.month,
      categoryType: row.categoryType,
      categoryId: row.categoryId || null,
      categoryName: row.categoryName || null,
      importedAt: serverTimestamp(),
    });

    if (row.categoryType === 'goal' && row.categoryId) {
      goalTotals.set(row.categoryId, (goalTotals.get(row.categoryId) || 0) + Math.abs(row.amount));
    } else if (row.categoryType === 'bucket' && row.categoryId) {
      bucketTotals.set(row.categoryId, (bucketTotals.get(row.categoryId) || 0) + Math.abs(row.amount));
    } else if (row.categoryType === 'obligation' && row.categoryId) {
      obligationTotals.set(row.categoryId, (obligationTotals.get(row.categoryId) || 0) + Math.abs(row.amount));
    }
  }

  for (const [id, total] of goalTotals) {
    batch.update(doc(db, 'users', uid, 'goals', id), { spentAmount: increment(total) });
  }
  for (const [id, total] of bucketTotals) {
    batch.update(doc(db, 'users', uid, 'buckets', id), { currentAmount: increment(-total) });
  }
  for (const [id, total] of obligationTotals) {
    const ob = obligations.find(o => o.id === id);
    const newAssigned = (ob?.assignedAmount || 0) + total;
    const updates = { assignedAmount: increment(total), assignedMonth: currentMonth() };
    if (ob && newAssigned >= ob.amount) updates.paidMonth = currentMonth();
    batch.update(doc(db, 'users', uid, 'obligations', id), updates);
  }

  return batch;
}
