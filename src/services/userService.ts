import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
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
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserAccount, 'id'>) }));
      localStorage.setItem('tramosil_users_cache', JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Could not fetch users from Firestore, using cache:', err);
  }

  // Fallback to local storage cache if offline
  const cached = localStorage.getItem('tramosil_users_cache');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fallback
    }
  }
  return DEFAULT_USERS;
}

export function subscribeUsers(callback: (users: UserAccount[]) => void) {
  // 1. Initial callback with cached or default data
  const cached = localStorage.getItem('tramosil_users_cache');
  if (cached) {
    try {
      callback(JSON.parse(cached));
    } catch {
      callback(DEFAULT_USERS);
    }
  } else {
    callback(DEFAULT_USERS);
  }

  // 2. Listen for local storage/in-memory update events
  const handleLocalUpdate = () => {
    const current = localStorage.getItem('tramosil_users_cache');
    if (current) {
      try {
        callback(JSON.parse(current));
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('tramosil_users_updated', handleLocalUpdate);

  // 3. Attach Firestore onSnapshot listener
  let unsubFirestore: (() => void) | null = null;
  try {
    unsubFirestore = onSnapshot(
      collection(db, COLLECTION_NAME),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<UserAccount, 'id'>),
          }));
          localStorage.setItem('tramosil_users_cache', JSON.stringify(list));
          callback(list);
        }
      },
      (error) => {
        console.warn('Users onSnapshot error (using cache):', error);
      }
    );
  } catch (error) {
    console.warn('Could not attach users snapshot:', error);
  }

  return () => {
    window.removeEventListener('tramosil_users_updated', handleLocalUpdate);
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
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

  // 1. Sync local cache first so UI responds immediately
  try {
    const cached = localStorage.getItem('tramosil_users_cache');
    const list: UserAccount[] = cached ? JSON.parse(cached) : [...DEFAULT_USERS];
    const idx = list.findIndex((u) => u.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push(record);
    }
    localStorage.setItem('tramosil_users_cache', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('tramosil_users_updated'));
  } catch (e) {
    console.warn('Error updating local users cache:', e);
  }

  // 2. Sync with Firestore
  try {
    await setDoc(doc(db, COLLECTION_NAME, id), record, { merge: true });
  } catch (err) {
    console.warn('Warning: Could not sync user to Firestore directly:', err);
  }

  return record;
}

export async function deleteUser(userId: string): Promise<void> {
  // 1. Sync local cache first
  try {
    const cached = localStorage.getItem('tramosil_users_cache');
    const list: UserAccount[] = cached ? JSON.parse(cached) : [...DEFAULT_USERS];
    const updated = list.filter((u) => u.id !== userId);
    localStorage.setItem('tramosil_users_cache', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tramosil_users_updated'));
  } catch (e) {
    console.warn('Error deleting from local users cache:', e);
  }

  // 2. Sync with Firestore
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, userId));
  } catch (err) {
    console.warn('Warning: Could not delete user from Firestore directly:', err);
  }
}
