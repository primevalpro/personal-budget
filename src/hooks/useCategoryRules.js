import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useCategoryRules(uid) {
  const [rules, setRules] = useState([]);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, 'users', uid, 'categoryRules'),
      snap => setRules(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
  }, [uid]);

  async function addRule(keyword, categoryType, categoryId, categoryName) {
    await addDoc(collection(db, 'users', uid, 'categoryRules'), {
      keyword,
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
