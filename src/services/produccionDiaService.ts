import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProduccionDia } from '../types';

const COLLECTION_NAME = 'produccion_dia';

// Formatted current date and time: YYYY-MM-DD HH:mm:ss
export function getCurrentDateTimeFormatted(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

const MOCK_NAMES = ['Juan Pérez', 'Carlos Mendoza'];

export async function fetchProduccionDia(): Promise<ProduccionDia[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (!snap.empty) {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ProduccionDia, 'id'>) }))
        .filter((d) => !d.id.startsWith('prod-dia-') && !MOCK_NAMES.includes(d.createdByName || ''));
      localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify(list));
      return list;
    }
    // If empty, keep empty!
    localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify([]));
    return [];
  } catch (err) {
    console.warn('Could not fetch produccion_dia, using cache:', err);
    const cached = localStorage.getItem('tramosil_prod_dia_cache');
    if (cached) {
      try {
        const parsed: ProduccionDia[] = JSON.parse(cached);
        return parsed.filter((d) => !d.id.startsWith('prod-dia-') && !MOCK_NAMES.includes(d.createdByName || ''));
      } catch {
        return [];
      }
    }
    return [];
  }
}

export function subscribeProduccionDia(callback: (list: ProduccionDia[]) => void) {
  // Initial callback with cached data
  const cached = localStorage.getItem('tramosil_prod_dia_cache');
  if (cached) {
    try {
      const parsed: ProduccionDia[] = JSON.parse(cached);
      callback(parsed.filter((d) => !d.id.startsWith('prod-dia-') && !MOCK_NAMES.includes(d.createdByName || '')));
    } catch {
      callback([]);
    }
  } else {
    callback([]);
  }

  // Local window event listener
  const handleLocalUpdate = () => {
    const c = localStorage.getItem('tramosil_prod_dia_cache');
    if (c) {
      try {
        const parsed: ProduccionDia[] = JSON.parse(c);
        callback(parsed.filter((d) => !d.id.startsWith('prod-dia-') && !MOCK_NAMES.includes(d.createdByName || '')));
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('tramosil_prod_dia_updated', handleLocalUpdate);

  let unsubFirestore: (() => void) | null = null;
  try {
    unsubFirestore = onSnapshot(
      collection(db, COLLECTION_NAME),
      (snap) => {
        if (snap.empty) {
          localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify([]));
          callback([]);
        } else {
          const list = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<ProduccionDia, 'id'>),
            }))
            .filter((d) => !d.id.startsWith('prod-dia-') && !MOCK_NAMES.includes(d.createdByName || ''));
          localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify(list));
          callback(list);
        }
      },
      (error) => {
        console.warn('ProduccionDia onSnapshot error:', error);
      }
    );
  } catch (err) {
    console.warn('Error subscribing ProduccionDia:', err);
  }

  return () => {
    window.removeEventListener('tramosil_prod_dia_updated', handleLocalUpdate);
    if (unsubFirestore) unsubFirestore();
  };
}

export async function saveProduccionDia(
  data: Omit<ProduccionDia, 'id' | 'fechaHoraIngreso'> & { id?: string; fechaHoraIngreso?: string }
): Promise<ProduccionDia> {
  const id = data.id || `p_dia_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fechaHoraIngreso = data.fechaHoraIngreso || getCurrentDateTimeFormatted();

  const record: ProduccionDia = {
    id,
    fecha: data.fecha,
    fechaHoraIngreso,
    especie: data.especie,
    calidad: data.calidad,
    largoMadera: Number(data.largoMadera) || 0,
    volumenMR: Number(data.volumenMR) || 0,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
  };

  // 1. Update local cache immediately
  const cached = localStorage.getItem('tramosil_prod_dia_cache');
  const list: ProduccionDia[] = cached ? JSON.parse(cached) : [];
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.unshift(record);
  }
  localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('tramosil_prod_dia_updated'));

  // 2. Sync with Firestore
  try {
    await setDoc(doc(db, COLLECTION_NAME, id), record, { merge: true });
  } catch (err) {
    console.warn('Warning: Could not sync ProduccionDia to Firestore:', err);
  }

  return record;
}

export async function deleteProduccionDia(id: string): Promise<void> {
  // 1. Update local cache immediately
  const cached = localStorage.getItem('tramosil_prod_dia_cache');
  if (cached) {
    const list: ProduccionDia[] = JSON.parse(cached);
    const updated = list.filter((p) => p.id !== id);
    localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tramosil_prod_dia_updated'));
  }

  // 2. Sync with Firestore
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (err) {
    console.warn('Warning: Could not delete ProduccionDia from Firestore:', err);
  }
}
