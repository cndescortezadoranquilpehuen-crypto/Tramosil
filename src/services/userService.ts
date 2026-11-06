import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserAccount, UserRole } from '../types';

const COLLECTION_NAME = 'users';

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'admin-tramosil-1',
    email: 'cndescortezadoranquil.pehuen@gmail.com',
    name: 'Administrador Tramosil',
    role: 'Administrador',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'supervisor-tramosil-2',
    email: 'supervisor@tramosil.cl',
    name: 'Carlos Mendoza',
    role: 'Supervisor',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usuario-tramosil-3',
    email: 'operador@tramosil.cl',
    name: 'Juan Pérez',
    role: 'Usuario',
    createdAt: new Date().toISOString(),
  },
];

export async function fetchUsers(): Promise<UserAccount[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      // Seed default users if empty
      for (const u of DEFAULT_USERS) {
        await setDoc(doc(db, COLLECTION_NAME, u.id), u);
      }
      return DEFAULT_USERS;
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserAccount, 'id'>) }));
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
    } catch {
      // Fallback to local storage cache if offline
      const cached = localStorage.getItem('tramosil_users_cache');
      if (cached) return JSON.parse(cached);
      return DEFAULT_USERS;
    }
    return DEFAULT_USERS;
  }
}

export function subscribeUsers(callback: (users: UserAccount[]) => void) {
  try {
    return onSnapshot(
      collection(db, COLLECTION_NAME),
      (snap) => {
        if (snap.empty) {
          callback(DEFAULT_USERS);
        } else {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<UserAccount, 'id'>),
          }));
          localStorage.setItem('tramosil_users_cache', JSON.stringify(list));
          callback(list);
        }
      },
      (error) => {
        console.warn('Users onSnapshot error:', error);
        const cached = localStorage.getItem('tramosil_users_cache');
        callback(cached ? JSON.parse(cached) : DEFAULT_USERS);
      }
    );
  } catch (error) {
    console.warn('Could not attach users snapshot:', error);
    callback(DEFAULT_USERS);
    return () => {};
  }
}

export async function saveUser(
  user: { id?: string; email: string; name: string; role: UserRole; password?: string }
): Promise<UserAccount> {
  const id = user.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: UserAccount = {
    id,
    email: user.email.toLowerCase().trim(),
    name: user.name.trim(),
    role: user.role,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, id), record, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTION_NAME}/${id}`);
  }

  // Update local cache
  const cached = localStorage.getItem('tramosil_users_cache');
  const list: UserAccount[] = cached ? JSON.parse(cached) : DEFAULT_USERS;
  const idx = list.findIndex((u) => u.id === id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  localStorage.setItem('tramosil_users_cache', JSON.stringify(list));

  return record;
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, userId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${userId}`);
  }

  // Update local cache
  const cached = localStorage.getItem('tramosil_users_cache');
  if (cached) {
    const list: UserAccount[] = JSON.parse(cached);
    const updated = list.filter((u) => u.id !== userId);
    localStorage.setItem('tramosil_users_cache', JSON.stringify(updated));
  }
}
