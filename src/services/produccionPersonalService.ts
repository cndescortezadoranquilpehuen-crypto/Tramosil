import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ProduccionPersonal } from '../types';
import { getCurrentDateTimeFormatted } from './produccionDiaService';

const COLLECTION_NAME = 'produccion_personal';

const INITIAL_PRODUCCION_PERSONAL: ProduccionPersonal[] = [
  {
    id: 'prod-pers-201',
    fecha: '2026-11-05',
    fechaHoraIngreso: '2026-11-05 08:30:15',
    operadorId: 'pers-1',
    operador: 'Rodrigo Araya Silva',
    especie: 'Pino Radiata',
    calidad: 'Bosque',
    largoMadera: 3.20,
    volumenMR: 75.0,
    createdByName: 'Carlos Mendoza',
  },
  {
    id: 'prod-pers-202',
    fecha: '2026-11-05',
    fechaHoraIngreso: '2026-11-05 09:12:00',
    operadorId: 'pers-2',
    operador: 'Manuel Espinoza Castro',
    especie: 'Pino Radiata',
    calidad: 'Bosque',
    largoMadera: 3.20,
    volumenMR: 70.5,
    createdByName: 'Carlos Mendoza',
  },
  {
    id: 'prod-pers-203',
    fecha: '2026-11-05',
    fechaHoraIngreso: '2026-11-05 18:00:22',
    operadorId: 'pers-3',
    operador: 'Jorge Muñoz Valenzuela',
    especie: 'Euca GL',
    calidad: 'LOG',
    largoMadera: 2.44,
    volumenMR: 98.2,
    createdByName: 'Carlos Mendoza',
  },
  {
    id: 'prod-pers-204',
    fecha: '2026-11-06',
    fechaHoraIngreso: '2026-11-06 09:20:11',
    operadorId: 'pers-1',
    operador: 'Rodrigo Araya Silva',
    especie: 'Pino Radiata',
    calidad: 'LOG',
    largoMadera: 4.00,
    volumenMR: 60.0,
    createdByName: 'Juan Pérez',
  },
  {
    id: 'prod-pers-205',
    fecha: '2026-11-06',
    fechaHoraIngreso: '2026-11-06 09:45:00',
    operadorId: 'pers-4',
    operador: 'Héctor Carrasco Morales',
    especie: 'Pino Radiata',
    calidad: 'LOG',
    largoMadera: 4.00,
    volumenMR: 52.0, // Notice 60 + 52 = 112 MR vs Dia 120 MR (8 MR difference triggers reconciliation alert!)
    createdByName: 'Juan Pérez',
  },
];

export async function fetchProduccionPersonal(): Promise<ProduccionPersonal[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      for (const item of INITIAL_PRODUCCION_PERSONAL) {
        await setDoc(doc(db, COLLECTION_NAME, item.id), item);
      }
      return INITIAL_PRODUCCION_PERSONAL;
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProduccionPersonal, 'id'>) }));
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
    } catch {
      const cached = localStorage.getItem('tramosil_prod_pers_cache');
      if (cached) return JSON.parse(cached);
      return INITIAL_PRODUCCION_PERSONAL;
    }
    return INITIAL_PRODUCCION_PERSONAL;
  }
}

export function subscribeProduccionPersonal(callback: (list: ProduccionPersonal[]) => void) {
  try {
    return onSnapshot(
      collection(db, COLLECTION_NAME),
      (snap) => {
        if (snap.empty) {
          callback(INITIAL_PRODUCCION_PERSONAL);
        } else {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ProduccionPersonal, 'id'>),
          }));
          localStorage.setItem('tramosil_prod_pers_cache', JSON.stringify(list));
          callback(list);
        }
      },
      (error) => {
        console.warn('ProduccionPersonal onSnapshot error:', error);
        const cached = localStorage.getItem('tramosil_prod_pers_cache');
        callback(cached ? JSON.parse(cached) : INITIAL_PRODUCCION_PERSONAL);
      }
    );
  } catch (err) {
    console.warn('Error subscribing ProduccionPersonal:', err);
    callback(INITIAL_PRODUCCION_PERSONAL);
    return () => {};
  }
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
  const list: ProduccionPersonal[] = cached ? JSON.parse(cached) : [...INITIAL_PRODUCCION_PERSONAL];
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.unshift(record);
  }
  localStorage.setItem('tramosil_prod_pers_cache', JSON.stringify(list));

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
  }

  // 2. Sync with Firestore
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (err) {
    console.warn('Warning: Could not delete ProduccionPersonal from Firestore:', err);
  }
}
