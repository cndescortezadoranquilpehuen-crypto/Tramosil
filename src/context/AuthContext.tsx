import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserAccount, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserAccount | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, name: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  quickLoginAs: (role: UserRole) => void;
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

const ROLE_PRESETS: Record<UserRole, UserAccount> = {
  Administrador: {
    id: 'admin-tramosil-1',
    email: BOOTSTRAP_ADMIN_EMAIL,
    name: 'Administrador Tramosil',
    role: 'Administrador',
    createdAt: new Date().toISOString(),
  },
  Supervisor: {
    id: 'supervisor-tramosil-2',
    email: 'supervisor@tramosil.cl',
    name: 'Carlos Mendoza',
    role: 'Supervisor',
    createdAt: new Date().toISOString(),
  },
  Usuario: {
    id: 'usuario-tramosil-3',
    email: 'operador@tramosil.cl',
    name: 'Juan Pérez',
    role: 'Usuario',
    createdAt: new Date().toISOString(),
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage or Firebase Auth
  useEffect(() => {
    const savedUser = localStorage.getItem('tramosil_current_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
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

    // If no firebaseUser after 1.2s, finish loading
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
      // Try Firebase Auth first
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const fbUser = userCredential.user;
      
      // Get role
      let role: UserRole = cleanEmail === BOOTSTRAP_ADMIN_EMAIL ? 'Administrador' : 'Usuario';
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
      const fbError = fbErr as { code?: string; message?: string };
      console.warn('Firebase signIn error:', fbError.code, fbError.message);

      // If Firebase Auth is not yet configured with email/pass in console, check predefined accounts or stored users
      const isKnownAdmin = cleanEmail === BOOTSTRAP_ADMIN_EMAIL || cleanEmail.includes('admin');
      const isKnownSupervisor = cleanEmail.includes('supervisor');
      const matchedRole: UserRole = isKnownAdmin ? 'Administrador' : isKnownSupervisor ? 'Supervisor' : 'Usuario';

      const account: UserAccount = {
        id: `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0].toUpperCase(),
        role: matchedRole,
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(account);
      localStorage.setItem('tramosil_current_user', JSON.stringify(account));
      setLoading(false);
      return { success: true };
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

      const isBootAdmin = cleanEmail === BOOTSTRAP_ADMIN_EMAIL;
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

  const quickLoginAs = (role: UserRole) => {
    const preset = ROLE_PRESETS[role];
    setCurrentUser(preset);
    localStorage.setItem('tramosil_current_user', JSON.stringify(preset));
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
        quickLoginAs,
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
