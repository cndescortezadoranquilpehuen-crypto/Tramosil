import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProduccionPersonal } from '../types';
import { getCurrentDateTimeFormatted } from './produccionDiaService';

const COLLECTION_NAME = 'produccion_personal';
const MOCK_NAMES = ['Juan Pérez', 'Carlos Mendoza'];

export async function fetchProduccionPersonal(): Promise<ProduccionPersonal[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (!snap.empty) {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ProduccionPersonal, 'id'>) }))
        .filter((d) => !d.id.startsWith('prod-pers-') && !MOCK_NAMES.includes(d.createdByName || ''));
      localStorage.setItem('tramosil_prod_pers_cache', JSON.stringify(list));
      return list;
    }
    localStorage.setItem('tramosil_prod_pers_cache', JSON.stringify([]));
    return [];
  } catch (err) {
    console.warn('Could not fetch produccion_personal, using cache:', err);
    const cached = localStorage.getItem('tramosil_prod_pers_cache');
    if (cached) {
      try {
        const parsed: ProduccionPersonal[] = JSON.parse(cached);
        return parsed.filter((d) => !d.id.startsWith('prod-pers-') && !MOCK_NAMES.includes(d.createdByName || ''));
      } catch {
        return [];
      }
    }
    return [];
  }
}

export function subscribeProduccionPersonal(callback: (list: ProduccionPersonal[]) => void) {
  const cached = localStorage.getItem('tramosil_prod_pers_cache');
  if (cached) {
    try {
      const parsed: ProduccionPersonal[] = JSON.parse(cached);
      callback(parsed.filter((d) => !d.id.startsWith('prod-pers-') && !MOCK_NAMES.includes(d.createdByName || '')));
    } catch {
      callback([]);
    }
  } else {
    callback([]);
  }

  const handleLocalUpdate = () => {
    const c = localStorage.getItem('tramosil_prod_pers_cache');
    if (c) {
      try {
        const parsed: ProduccionPersonal[] = JSON.parse(c);
        callback(parsed.filter((d) => !d.id.startsWith('prod-pers-') && !MOCK_NAMES.includes(d.createdByName || '')));
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('tramosil_prod_pers_updated', handleLocalUpdate);

  let unsubFirestore: (() => void) | null = null;
  try {
    unsubFirestore = onSnapshot(
      collection(db, COLLECTION_NAME),
      (snap) => {
        if (snap.empty) {
          localStorage.setItem('tramosil_prod_pers_cache', JSON.stringify([]));
          callback([]);
        } else {
          const list = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<ProduccionPersonal, 'id'>),
            }))
            .filter((d) => !d.id.startsWith('prod-pers-') && !MOCK_NAMES.includes(d.createdByName || ''));
          localStorage.setItem('tramosil_prod_pers_cache', JSON.stringify(list));
          callback(list);
        }
      },
      (error) => {
        console.warn('ProduccionPersonal onSnapshot error:', error);
      }
    );
  } catch (err) {
    console.warn('Error subscribing ProduccionPersonal:', err);
  }

  return () => {
    window.removeEventListener('tramosil_prod_pers_updated', handleLocalUpdate);
    if (unsubFirestore) unsubFirestore();
  };
}

export async function saveProduccionPersonal(
  data: Omit<ProduccionPersonal, 'id' | 'fechaHoraIngreso'> & { id?: string; fechaHoraIngreso?: string }
): Promise<ProduccionPersonal> {
  const id = data.id || `p_pers_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fechaHoraIngreso = data.fechaHoraIngreso || getCurrentDateTimeFormatted();

  const record: ProduccionPersonal = {
    id,
    fecha: data.fecha,
    fechaHoraIngreso,
    operadorId: data.operadorId,
    operador: data.operador.trim(),
    especie: data.especie,
    calidad: data.calidad,
    largoMadera: Number(data.largoMadera) || 0,
    volumenMR: Number(data.volumenMR) || 0,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
  };

  // 1. Update local cache immediately
  const cached = localStorage.getItem('tramosil_prod_pers_cache');
  const list: ProduccionPersonal[] = cached ? JSON.parse(cached) : [];
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.unshift(record);
  }
  localStorage.setItem('tramosil_prod_pers_cache', JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('tramosil_prod_pers_updated'));

  // 2. Sync with Firestore
  try {
    await setDoc(doc(db, COLLECTION_NAME, id), record, { merge: true });
  } catch (err) {
    console.warn('Warning: Could not sync ProduccionPersonal to Firestore:', err);
  }

  return record;
}

export async function deleteProduccionPersonal(id: string): Promise<void> {
  // 1. Update local cache immediately
  const cached = localStorage.getItem('tramosil_prod_pers_cache');
  if (cached) {
    const list: ProduccionPersonal[] = JSON.parse(cached);
    const updated = list.filter((p) => p.id !== id);
    localStorage.setItem('tramosil_prod_pers_cache', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tramosil_prod_pers_updated'));
  }

  // 2. Sync with Firestore
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (err) {
    console.warn('Warning: Could not delete ProduccionPersonal from Firestore:', err);
  }
}
