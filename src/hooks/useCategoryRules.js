import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useCategoryRules(uid) {
  const [rules, setRules] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'categoryRules'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, snap => {
      setRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  async function addRule(keyword, categoryType, categoryId, categoryName) {
    await addDoc(collection(db, 'users', uid, 'categoryRules'), {
      keyword: keyword.toLowerCase().trim(),
      categoryType,
      categoryId,
      categoryName,
      createdAt: serverTimestamp(),
    });
  }

  async function deleteRule(id) {
    await deleteDoc(doc(db, 'users', uid, 'categoryRules', id));
  }

  return { rules, addRule, deleteRule };
}
