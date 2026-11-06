import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Personal } from '../types';

const COLLECTION_NAME = 'personal';

const INITIAL_PERSONAL: Personal[] = [
  {
    id: 'pers-1',
    nombre: 'Rodrigo Araya Silva',
    rut: '15.482.910-4',
    cargo: 'Operador Cosechadora',
    activo: true,
    fechaIngreso: '2025-03-10',
  },
  {
    id: 'pers-2',
    nombre: 'Manuel Espinoza Castro',
    rut: '12.345.678-9',
    cargo: 'Operador Skidder',
    activo: true,
    fechaIngreso: '2024-11-15',
  },
  {
    id: 'pers-3',
    nombre: 'Jorge Muñoz Valenzuela',
    rut: '16.890.123-K',
    cargo: 'Operador Feller',
    activo: true,
    fechaIngreso: '2025-01-20',
  },
  {
    id: 'pers-4',
    nombre: 'Héctor Carrasco Morales',
    rut: '14.567.890-2',
    cargo: 'Huinchero Forestal',
    activo: true,
    fechaIngreso: '2024-08-01',
  },
  {
    id: 'pers-5',
    nombre: 'Claudio Vergara Soto',
    rut: '17.234.567-8',
    cargo: 'Clasificador de Madera',
    activo: true,
    fechaIngreso: '2025-05-12',
  },
];

export async function fetchPersonal(): Promise<Personal[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      // Seed initial staff
      for (const p of INITIAL_PERSONAL) {
        await setDoc(doc(db, COLLECTION_NAME, p.id), p);
      }
      return INITIAL_PERSONAL;
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Personal, 'id'>) }));
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
    } catch {
      const cached = localStorage.getItem('tramosil_personal_cache');
      if (cached) return JSON.parse(cached);
      return INITIAL_PERSONAL;
    }
    return INITIAL_PERSONAL;
  }
}

export function subscribePersonal(callback: (list: Personal[]) => void) {
  try {
    return onSnapshot(
      collection(db, COLLECTION_NAME),
      (snap) => {
        if (snap.empty) {
          callback(INITIAL_PERSONAL);
        } else {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Personal, 'id'>),
          }));
          localStorage.setItem('tramosil_personal_cache', JSON.stringify(list));
          callback(list);
        }
      },
      (error) => {
        console.warn('Personal onSnapshot error:', error);
        const cached = localStorage.getItem('tramosil_personal_cache');
        callback(cached ? JSON.parse(cached) : INITIAL_PERSONAL);
      }
    );
  } catch (err) {
    console.warn('Error subscribing personal:', err);
    callback(INITIAL_PERSONAL);
    return () => {};
  }
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
  const list: Personal[] = cached ? JSON.parse(cached) : [...INITIAL_PERSONAL];
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  localStorage.setItem('tramosil_personal_cache', JSON.stringify(list));

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
  }

  // 2. Sync with Firestore
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, personalId));
  } catch (err) {
    console.warn('Warning: Could not delete personal from Firestore:', err);
  }
}
