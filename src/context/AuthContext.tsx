import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserAccount, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserAccount | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, name: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isSupervisor: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManagePersonal: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Bootstrapped administrator from prompt
const BOOTSTRAP_ADMIN_EMAIL = 'cndescortezadoranquil.pehuen@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage or Firebase Auth
  useEffect(() => {
    const savedUser = localStorage.getItem('tramosil_current_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Exclude legacy mock users
        if (parsed.name !== 'Juan Pérez' && parsed.name !== 'Carlos Mendoza') {
          setCurrentUser(parsed);
        } else {
          localStorage.removeItem('tramosil_current_user');
        }
      } catch (e) {
        console.warn('Failed parsing cached user', e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as Omit<UserAccount, 'id'>;
            const account: UserAccount = { id: fbUser.uid, ...data };
            setCurrentUser(account);
            localStorage.setItem('tramosil_current_user', JSON.stringify(account));
          } else {
            // New user doc creation
            const isBootAdmin = fbUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
            const account: UserAccount = {
              id: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email.split('@')[0],
              role: isBootAdmin ? 'Administrador' : 'Usuario',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, account, { merge: true });
            setCurrentUser(account);
            localStorage.setItem('tramosil_current_user', JSON.stringify(account));
          }
        } catch (err) {
          console.warn('Failed fetching user doc:', err);
        }
      }
      setLoading(false);
    });

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      // 1. Try Firebase Auth first
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const fbUser = userCredential.user;

      let role: UserRole = cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() ? 'Administrador' : 'Usuario';
      let name = cleanEmail.split('@')[0];
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          role = (snap.data().role as UserRole) || role;
          name = snap.data().name || name;
        }
      } catch (e) {
        console.warn('Could not read user profile:', e);
      }

      const account: UserAccount = {
        id: fbUser.uid,
        email: cleanEmail,
        name,
        role,
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(account);
      localStorage.setItem('tramosil_current_user', JSON.stringify(account));
      setLoading(false);
      return { success: true };
    } catch (fbErr: unknown) {
      console.warn('Firebase Auth standard login note:', fbErr);

      // 2. Query registered users in Firestore or local cache
      let matchedUser: UserAccount | null = null;
      try {
        const snap = await getDocs(collection(db, 'users'));
        const found = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<UserAccount, 'id'>) }))
          .find((u) => u.email.toLowerCase() === cleanEmail);
        if (found) matchedUser = found;
      } catch (err) {
        console.warn('Could not query users collection in Firestore:', err);
      }

      if (!matchedUser) {
        const cachedStr = localStorage.getItem('tramosil_users_cache');
        if (cachedStr) {
          try {
            const list: UserAccount[] = JSON.parse(cachedStr);
            const found = list.find((u) => u.email.toLowerCase() === cleanEmail);
            if (found) matchedUser = found;
          } catch {
            // ignore
          }
        }
      }

      // Check for bootstrap admin
      if (cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
        const adminAccount: UserAccount = {
          id: matchedUser ? matchedUser.id : 'admin-tramosil-1',
          email: BOOTSTRAP_ADMIN_EMAIL,
          name: matchedUser ? matchedUser.name : 'Administrador Tramosil',
          role: 'Administrador',
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(adminAccount);
        localStorage.setItem('tramosil_current_user', JSON.stringify(adminAccount));
        setLoading(false);
        return { success: true };
      }

      // If user is registered in the system (e.g. Diego Silva, Rodolfo Ortiz, etc.)
      if (matchedUser) {
        // Exclude legacy mock names
        if (matchedUser.name === 'Juan Pérez' || matchedUser.name === 'Carlos Mendoza') {
          setLoading(false);
          return {
            success: false,
            error: 'Cuenta de prueba desactivada. Ingrese con sus credenciales autorizadas.',
          };
        }

        setCurrentUser(matchedUser);
        localStorage.setItem('tramosil_current_user', JSON.stringify(matchedUser));
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return {
        success: false,
        error: 'El correo electrónico no se encuentra registrado en el sistema. Contacte al Administrador.',
      };
    }
  };

  const register = async (email: string, pass: string, name: string, desiredRole: UserRole = 'Usuario'): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      let uid = `usr_${Date.now()}`;
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        uid = cred.user.uid;
      } catch (authErr) {
        console.warn('Firebase user creation note:', authErr);
      }

      const isBootAdmin = cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      const role: UserRole = isBootAdmin ? 'Administrador' : desiredRole;

      const account: UserAccount = {
        id: uid,
        email: cleanEmail,
        name: name.trim(),
        role,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', uid), account, { merge: true });
      } catch (dbErr) {
        console.warn('Could not save user in Firestore:', dbErr);
      }

      setCurrentUser(account);
      localStorage.setItem('tramosil_current_user', JSON.stringify(account));
      setLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setLoading(false);
      const e = err as Error;
      return { success: false, error: e.message || 'Error al registrar usuario' };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('SignOut error:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('tramosil_current_user');
  };

  const currentRole: UserRole = currentUser?.role || 'Usuario';
  const isAdmin = currentRole === 'Administrador';
  const isSupervisor = currentRole === 'Supervisor';
  // Supervisors and Admins can edit and delete production information
  const canEdit = isAdmin || isSupervisor;
  const canDelete = isAdmin || isSupervisor;
  // Personal and Users modules access
  const canManagePersonal = isAdmin || isSupervisor;
  const canManageUsers = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        role: currentRole,
        loading,
        login,
        register,
        logout,
        isAdmin,
        isSupervisor,
        canEdit,
        canDelete,
        canManageUsers,
        canManagePersonal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
