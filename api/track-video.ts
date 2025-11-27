// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';

// CONFIGURAÇÃO DIRETA DO FIREBASE (FALLBACK)
const firebaseConfig = {
  apiKey: "AIzaSyC1PSUlYQ8cliInVq9Nak-_HbmWLl7oBc0",
  authDomain: "zero-vicios-tracker.firebaseapp.com",
  projectId: "zero-vicios-tracker",
  storageBucket: "zero-vicios-tracker.firebasestorage.app",
  messagingSenderId: "363015306292",
  appId: "1:363015306292:web:52e53d1fd0e5ec599ade61",
  measurementId: "G-R22SS7H418"
};

const initFirebase = () => {
    try {
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
    return res.status(400).json({ error: 'Dados inválidos ou DB desconectado' });
  }

  try {
    const statsRef = doc(db, "analytics", "vsl_stats");
    const docSnap = await getDoc(statsRef);

    // Se o documento não existir, cria a estrutura inicial
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