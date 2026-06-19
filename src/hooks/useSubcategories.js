import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useSubcategories(uid) {
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'subcategories'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, snap => {
      setSubcategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  async function addSubcategory(name, metaCategory) {
    await addDoc(collection(db, 'users', uid, 'subcategories'), {
      name: name.trim(),
      metaCategory,
      createdAt: serverTimestamp(),
    });
  }

  async function updateSubcategory(id, name) {
    await updateDoc(doc(db, 'users', uid, 'subcategories', id), { name: name.trim() });
  }

  async function deleteSubcategory(id) {
    await deleteDoc(doc(db, 'users', uid, 'subcategories', id));
  }

  return { subcategories, addSubcategory, updateSubcategory, deleteSubcategory };
}
