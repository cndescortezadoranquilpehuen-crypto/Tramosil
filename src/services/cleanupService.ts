import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProduccionDia, ProduccionPersonal, Personal, UserAccount } from '../types';

const MOCK_PERSONAL_IDS = ['pers-1', 'pers-2', 'pers-3', 'pers-4', 'pers-5'];
const MOCK_PROD_DIA_IDS = ['prod-dia-101', 'prod-dia-102', 'prod-dia-103'];
const MOCK_PROD_PERS_IDS = ['prod-pers-201', 'prod-pers-202', 'prod-pers-203', 'prod-pers-204', 'prod-pers-205'];
const MOCK_USER_IDS = ['supervisor-tramosil-2', 'usuario-tramosil-3'];
const MOCK_NAMES = ['Juan Pérez', 'Carlos Mendoza'];

export async function purgeMockData(): Promise<void> {
  // 1. Purge from localStorage
  try {
    // Users
    const usersStr = localStorage.getItem('tramosil_users_cache');
    if (usersStr) {
      const users: UserAccount[] = JSON.parse(usersStr);
      const cleaned = users.filter((u) => !MOCK_USER_IDS.includes(u.id) && !MOCK_NAMES.includes(u.name));
      localStorage.setItem('tramosil_users_cache', JSON.stringify(cleaned));
    }

    // Personal
    const persStr = localStorage.getItem('tramosil_personal_cache');
    if (persStr) {
      const personal: Personal[] = JSON.parse(persStr);
      const cleaned = personal.filter((p) => !MOCK_PERSONAL_IDS.includes(p.id));
      localStorage.setItem('tramosil_personal_cache', JSON.stringify(cleaned));
    }

    // Producción Día
    const diaStr = localStorage.getItem('tramosil_prod_dia_cache');
    if (diaStr) {
      const dia: ProduccionDia[] = JSON.parse(diaStr);
      const cleaned = dia.filter((d) => !MOCK_PROD_DIA_IDS.includes(d.id) && !MOCK_NAMES.includes(d.createdByName || ''));
      localStorage.setItem('tramosil_prod_dia_cache', JSON.stringify(cleaned));
    }

    // Producción Personal
    const persProdStr = localStorage.getItem('tramosil_prod_pers_cache');
    if (persProdStr) {
      const pProd: ProduccionPersonal[] = JSON.parse(persProdStr);
      const cleaned = pProd.filter((p) => !MOCK_PROD_PERS_IDS.includes(p.id) && !MOCK_NAMES.includes(p.createdByName || ''));
      localStorage.setItem('tramosil_prod_pers_cache', JSON.stringify(cleaned));
    }
  } catch (err) {
    console.warn('Error cleaning local storage mock data:', err);
  }

  // 2. Delete mock docs from Firestore if they were written
  try {
    const promises: Promise<void>[] = [];

    MOCK_USER_IDS.forEach((id) => {
      promises.push(deleteDoc(doc(db, 'users', id)).catch(() => {}));
    });

    MOCK_PERSONAL_IDS.forEach((id) => {
      promises.push(deleteDoc(doc(db, 'personal', id)).catch(() => {}));
    });

    MOCK_PROD_DIA_IDS.forEach((id) => {
      promises.push(deleteDoc(doc(db, 'produccion_dia', id)).catch(() => {}));
    });

    MOCK_PROD_PERS_IDS.forEach((id) => {
      promises.push(deleteDoc(doc(db, 'produccion_personal', id)).catch(() => {}));
    });

    await Promise.all(promises);
  } catch (err) {
    console.warn('Error deleting mock docs from Firestore:', err);
  }
}
