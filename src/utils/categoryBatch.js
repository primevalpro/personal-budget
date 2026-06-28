import {
  doc, collection, increment, serverTimestamp, writeBatch,
  getDoc, getDocs, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';

function isExcluded(categoryType) {
  return categoryType === 'excluded' || categoryType === 'skipped';
}

// Apply a single category effect to an existing batch
export function applyOne(batch, uid, categoryType, categoryId, amount) {
  if (!categoryType || isExcluded(categoryType) || !categoryId) return;
  const abs = Math.abs(amount);
  if (categoryType === 'goal') {
    batch.update(doc(db, 'users', uid, 'goals', categoryId), {
      spentAmount: increment(abs),
    });
  } else if (categoryType === 'bucket') {
    batch.update(doc(db, 'users', uid, 'buckets', categoryId), {
      currentAmount: increment(-abs),
      txSpend: increment(abs),
    });
  }
}

// Reverse a category effect on an existing batch — checks existence to skip stale refs
export async function reverseOne(batch, uid, tx) {
  if (!tx.categoryType || isExcluded(tx.categoryType) || !tx.categoryId) return;

  let docRef;
  if (tx.categoryType === 'goal') docRef = doc(db, 'users', uid, 'goals', tx.categoryId);
  else if (tx.categoryType === 'bucket') docRef = doc(db, 'users', uid, 'buckets', tx.categoryId);
  else return;

  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const abs = Math.abs(tx.amount);
  if (tx.categoryType === 'goal') {
    batch.update(docRef, { spentAmount: increment(-abs) });
  } else if (tx.categoryType === 'bucket') {
    batch.update(docRef, { currentAmount: increment(abs), txSpend: increment(-abs) });
  }
}

// Build and return a batch for a full CSV import
export function buildImportBatch(uid, importRows) {
  const batch = writeBatch(db);

  const goalTotals = new Map();
  const bucketTotals = new Map();
  let balanceDelta = 0;
  let incomeDelta = 0;

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

    balanceDelta += row.amount;
    if (row.amount > 0) {
      incomeDelta += row.amount;
    }

    if (row.categoryType === 'goal' && row.categoryId) {
      goalTotals.set(row.categoryId, (goalTotals.get(row.categoryId) || 0) + Math.abs(row.amount));
    } else if (row.categoryType === 'bucket' && row.categoryId) {
      bucketTotals.set(row.categoryId, (bucketTotals.get(row.categoryId) || 0) + Math.abs(row.amount));
    }
  }

  for (const [id, total] of goalTotals) {
    batch.update(doc(db, 'users', uid, 'goals', id), { spentAmount: increment(total) });
  }
  for (const [id, total] of bucketTotals) {
    batch.update(doc(db, 'users', uid, 'buckets', id), { currentAmount: increment(-total), txSpend: increment(total) });
  }

  if (importRows.length > 0) {
    batch.set(
      doc(db, 'users', uid, 'profile', 'budget'),
      {
        balance: increment(balanceDelta),
        totalImportedIncome: increment(incomeDelta),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  return batch;
}

// Delete a category document and null-out all its orphaned transactions.
// Splits into multiple 499-op batches if needed.
export async function deleteWithOrphanCleanup(uid, collectionName, categoryType, id) {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'transactions'), where('categoryId', '==', id))
  );
  const orphans = snap.docs.filter(d => d.data().categoryType === categoryType);

  const BATCH_LIMIT = 499;
  let currentBatch = writeBatch(db);
  let opsInBatch = 0;
  const batches = [currentBatch];

  currentBatch.delete(doc(db, 'users', uid, collectionName, id));
  opsInBatch++;

  for (const orphanDoc of orphans) {
    if (opsInBatch >= BATCH_LIMIT) {
      currentBatch = writeBatch(db);
      opsInBatch = 0;
      batches.push(currentBatch);
    }
    currentBatch.update(doc(db, 'users', uid, 'transactions', orphanDoc.id), {
      categoryType: null,
      categoryId: null,
      categoryName: null,
    });
    opsInBatch++;
  }

  for (const batch of batches) {
    await batch.commit();
  }
}
