import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const CONFIG_DOC_PATH = 'config/faena_settings';
const DEFAULT_GOAL = 500;

export async function fetchFaenaGoal(): Promise<number> {
  // 1. Try local cache first for instant UI response
  const cached = localStorage.getItem('tramosil_meta_faena');
  let initial = cached ? parseFloat(cached) : DEFAULT_GOAL;
  if (isNaN(initial) || initial <= 0) initial = DEFAULT_GOAL;

  // 2. Try Firestore
  try {
    const snap = await getDoc(doc(db, 'config', 'faena_settings'));
    if (snap.exists()) {
      const data = snap.data();
      const val = Number(data?.metaMensualMR);
      if (!isNaN(val) && val > 0) {
        localStorage.setItem('tramosil_meta_faena', String(val));
        return val;
      }
    }
  } catch (err) {
    console.warn('Could not read faena goal from Firestore, using cache:', err);
  }

  return initial;
}

export function subscribeFaenaGoal(callback: (metaMR: number) => void) {
  // Initial callback with cached value
  const cached = localStorage.getItem('tramosil_meta_faena');
  const val = cached ? parseFloat(cached) : DEFAULT_GOAL;
  callback(isNaN(val) || val <= 0 ? DEFAULT_GOAL : val);

  // Local window event listener
  const handleLocalEvent = () => {
    const c = localStorage.getItem('tramosil_meta_faena');
    const v = c ? parseFloat(c) : DEFAULT_GOAL;
    callback(isNaN(v) || v <= 0 ? DEFAULT_GOAL : v);
  };
  window.addEventListener('tramosil_goal_updated', handleLocalEvent);

  // Firestore onSnapshot listener
  let unsubFirestore: (() => void) | null = null;
  try {
    unsubFirestore = onSnapshot(
      doc(db, 'config', 'faena_settings'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const goal = Number(data?.metaMensualMR);
          if (!isNaN(goal) && goal > 0) {
            localStorage.setItem('tramosil_meta_faena', String(goal));
            callback(goal);
          }
        }
      },
      (err) => {
        console.warn('onSnapshot faena_settings error:', err);
      }
    );
  } catch (err) {
    console.warn('Error attaching faena_settings snapshot:', err);
  }

  return () => {
    window.removeEventListener('tramosil_goal_updated', handleLocalEvent);
    if (unsubFirestore) unsubFirestore();
  };
}

export async function saveFaenaGoal(metaMR: number): Promise<void> {
  const cleanVal = Math.round(Number(metaMR));
  if (isNaN(cleanVal) || cleanVal <= 0) return;

  // 1. Sync local cache immediately
  localStorage.setItem('tramosil_meta_faena', String(cleanVal));
  window.dispatchEvent(new CustomEvent('tramosil_goal_updated'));

  // 2. Sync with Firestore
  try {
    await setDoc(
      doc(db, 'config', 'faena_settings'),
      {
        metaMensualMR: cleanVal,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Warning: Could not save faena goal to Firestore:', err);
  }
}
