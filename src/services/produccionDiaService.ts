import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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

const INITIAL_PRODUCCION_DIA: ProduccionDia[] = [
  {
    id: 'prod-dia-101',
    fecha: '2026-11-05',
    fechaHoraIngreso: '2026-11-05 08:14:22',
    especie: 'Pino Radiata',
    calidad: 'Bosque',
    largoMadera: 3.20,
    volumenMR: 145.5,
    createdByName: 'Juan Pérez',
  },
  {
    id: 'prod-dia-102',
    fecha: '2026-11-05',
    fechaHoraIngreso: '2026-11-05 17:30:10',
    especie: 'Euca GL',
    calidad: 'LOG',
    largoMadera: 2.44,
    volumenMR: 98.2,
    createdByName: 'Carlos Mendoza',
  },
  {
    id: 'prod-dia-103',
    fecha: '2026-11-06',
    fechaHoraIngreso: '2026-11-06 09:05:44',
    especie: 'Pino Radiata',
    calidad: 'LOG',
    largoMadera: 4.00,
    volumenMR: 120.0,
    createdByName: 'Juan Pérez',
  },
];

export async function fetchProduccionDia(): Promise<ProduccionDia[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      for (const item of INITIAL_PRODUCCION_DIA) {
        await setDoc(doc(db, COLLECTION_NAME, item.id), item);
      }
      return INITIAL_PRODUCCION_DIA;
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProduccionDia, 'id'>) }));
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
    } catch {
      const cached = localStorage.getItem('tramosil_prod_dia_cache');
      if (cached) return JSON.parse(cached);
      return INITIAL_PRODUCCION_DIA;
    }
    return INITIAL_PRODUCCION_DIA;
  }
}

export function subscribeProduccionDia(callback: (list: ProduccionDia[]) => void) {
  try {
    return onSnapshot(
      collection(db, COLLECTION_NAME),
      (snap) => {
        if (snap.empty) {
          callback(INITIAL_PRODUCCION_DIA);
        } else {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ProduccionDia, 'id'>),
          }));
          localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify(list));
          callback(list);
        }
      },
      (error) => {
        console.warn('ProduccionDia onSnapshot error:', error);
        const cached = localStorage.getItem('tramosil_prod_dia_cache');
        callback(cached ? JSON.parse(cached) : INITIAL_PRODUCCION_DIA);
      }
    );
  } catch (err) {
    console.warn('Error subscribing ProduccionDia:', err);
    callback(INITIAL_PRODUCCION_DIA);
    return () => {};
  }
}

export async function saveProduccionDia(
  data: Omit<ProduccionDia, 'id' | 'fechaHoraIngreso'> & { id?: string; fechaHoraIngreso?: string }
): Promise<ProduccionDia> {
  const id = data.id || `p_dia_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  // Note: App captures and records fechaHoraIngreso silently in the background
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

  try {
    await setDoc(doc(db, COLLECTION_NAME, id), record, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTION_NAME}/${id}`);
  }

  // Update local cache
  const cached = localStorage.getItem('tramosil_prod_dia_cache');
  const list: ProduccionDia[] = cached ? JSON.parse(cached) : INITIAL_PRODUCCION_DIA;
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.unshift(record);
  }
  localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify(list));

  return record;
}

export async function deleteProduccionDia(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }

  const cached = localStorage.getItem('tramosil_prod_dia_cache');
  if (cached) {
    const list: ProduccionDia[] = JSON.parse(cached);
    const updated = list.filter((p) => p.id !== id);
    localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify(updated));
  }
}
