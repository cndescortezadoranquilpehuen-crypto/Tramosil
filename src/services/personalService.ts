import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Personal } from '../types';

const COLLECTION_NAME = 'personal';

export async function fetchPersonal(): Promise<Personal[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (!snap.empty) {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Personal, 'id'>) }))
        .filter((p) => !p.id.startsWith('pers-')); // Exclude any legacy mock IDs
      localStorage.setItem('tramosil_personal_cache', JSON.stringify(list));
      return list;
    }
    // If database collection is empty, keep it empty! Do NOT re-seed fictitious people!
    localStorage.setItem('tramosil_personal_cache', JSON.stringify([]));
    return [];
  } catch (err) {
    console.warn('Error fetching personal, using cache:', err);
    const cached = localStorage.getItem('tramosil_personal_cache');
    if (cached) {
      try {
        const parsed: Personal[] = JSON.parse(cached);
        return parsed.filter((p) => !p.id.startsWith('pers-'));
      } catch {
        return [];
      }
    }
    return [];
  }
}

export function subscribePersonal(callback: (list: Personal[]) => void) {
  // Initial callback with cached data
  const cached = localStorage.getItem('tramosil_personal_cache');
  if (cached) {
    try {
      const parsed: Personal[] = JSON.parse(cached);
      callback(parsed.filter((p) => !p.id.startsWith('pers-')));
    } catch {
      callback([]);
    }
  } else {
    callback([]);
  }

  // Local window event listener
  const handleLocalUpdate = () => {
    const c = localStorage.getItem('tramosil_personal_cache');
    if (c) {
      try {
        const parsed: Personal[] = JSON.parse(c);
        callback(parsed.filter((p) => !p.id.startsWith('pers-')));
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('tramosil_personal_updated', handleLocalUpdate);

  // Firestore onSnapshot listener
  let unsubFirestore: (() => void) | null = null;
  try {
    unsubFirestore = onSnapshot(
      collection(db, COLLECTION_NAME),
      (snap) => {
        if (snap.empty) {
          localStorage.setItem('tramosil_personal_cache', JSON.stringify([]));
          callback([]);
        } else {
          const list = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Personal, 'id'>),
            }))
            .filter((p) => !p.id.startsWith('pers-'));
          localStorage.setItem('tramosil_personal_cache', JSON.stringify(list));
          callback(list);
        }
      },
      (error) => {
        console.warn('Personal onSnapshot error:', error);
      }
    );
  } catch (err) {
    console.warn('Error subscribing personal:', err);
  }

  return () => {
    window.removeEventListener('tramosil_personal_updated', handleLocalUpdate);
    if (unsubFirestore) unsubFirestore();
  };
}

export async function savePersonal(data: Omit<Personal, 'id'> & { id?: string }): Promise<Personal> {
  const id = data.id || `pers_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record: Personal = {
    id,
    nombre: data.nombre.trim(),
    rut: data.rut.trim(),
    cargo: data.cargo.trim(),
    activo: data.activo,
    fechaIngreso: data.fechaIngreso || new Date().toISOString().split('T')[0],
  };

  // 1. Update local cache immediately
  const cached = localStorage.getItem('tramosil_personal_cache');
  const list: Personal[] = cached ? JSON.parse(cached) : [];
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  localStorage.setItem('tramosil_personal_cache', JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('tramosil_personal_updated'));

  // 2. Sync with Firestore
  try {
    await setDoc(doc(db, COLLECTION_NAME, id), record, { merge: true });
  } catch (err) {
    console.warn('Warning: Could not sync personal to Firestore:', err);
  }

  return record;
}

export async function deletePersonal(personalId: string): Promise<void> {
  // 1. Update local cache immediately
  const cached = localStorage.getItem('tramosil_personal_cache');
  if (cached) {
    const list: Personal[] = JSON.parse(cached);
    const updated = list.filter((p) => p.id !== personalId);
    localStorage.setItem('tramosil_personal_cache', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tramosil_personal_updated'));
  }

  // 2. Sync with Firestore
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, personalId));
  } catch (err) {
    console.warn('Warning: Could not delete personal from Firestore:', err);
  }
}
