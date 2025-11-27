// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';

const initFirebase = () => {
    const configStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
    if (!configStr) return null;
    try {
      const firebaseConfig = JSON.parse(configStr);
      return !getApps().length ? initializeApp(firebaseConfig) : getApp();
    } catch (e) { 
      return null; 
    }
};

const app = initFirebase();
const db = app ? getFirestore(app) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { eventType, videoId } = req.body; // eventType: 'play', '25%', '50%', '75%', 'complete'

  if (!db || !eventType || !videoId) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  try {
    const statsRef = doc(db, "analytics", "vsl_stats");
    const docSnap = await getDoc(statsRef);

    if (!docSnap.exists()) {
      await setDoc(statsRef, {
        [videoId]: {
          plays: 0,
          progress_25: 0,
          progress_50: 0,
          progress_75: 0,
          completes: 0
        }
      });
    }

    const fieldMap: Record<string, string> = {
      'play': 'plays',
      '25%': 'progress_25',
      '50%': 'progress_50',
      '75%': 'progress_75',
      'complete': 'completes'
    };

    const field = fieldMap[eventType];
    if (field) {
      await updateDoc(statsRef, {
        [`${videoId}.${field}`]: increment(1)
      });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Erro tracking video:", error);
    return res.status(500).json({ error: error.message });
  }
}