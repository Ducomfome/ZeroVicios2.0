// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import crypto from 'crypto';

// CONFIGURAÇÃO DIRETA DO FIREBASE
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

// TOKEN FACEBOOK HARDCODED
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || "EAALT3yVJXDABQAWmBPC8iZBRGhuEadsOxCZA0CtB2IZBXqhAi7CZBNB5tvVkG1fPxttSZA49e7RfCTrgqo1zPGh4hs87UQFd61oAxtIYzcwbppG3lMTgNcQmDCag86XnsliYjZBqkeouG7J1VKOcLxhZCpFVDzCOeycwGpUNYmZCUk99KEyjQucdTGHFhaKWc883jgZDZD";
const FACEBOOK_PIXEL_ID = '1646006349697772'; 

const hashData = (data: string) => {
    if (!data) return null;
    return crypto.createHash('sha256').update(data).digest('hex');
};

async function trackFacebookEvent(eventName: string, userData: any, customData: any, eventId?: string) {
  if (!FACEBOOK_ACCESS_TOKEN) return;

  const fbUserData: any = {};
  if (userData.fbp) fbUserData.fbp = userData.fbp;
  if (userData.fbc) fbUserData.fbc = userData.fbc;
  if (userData.email) fbUserData.em = [hashData(userData.email.trim().toLowerCase())];
  if (userData.phone) fbUserData.ph = [hashData(userData.phone.replace(/\D/g, ''))];

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_id: eventId,
      user_data: fbUserData,
      custom_data: customData
    }],
    access_token: FACEBOOK_ACCESS_TOKEN
  };

  try {
    await fetch(`https://graph.facebook.com/v17.0/${FACEBOOK_PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`🎯 Pixel CAPI (${eventName}) disparado.`);
  } catch (e) {
    console.error('Erro CAPI:', e);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const body = req.body;
    console.log("🔔 Webhook Payload:", JSON.stringify(body));

    if (!db) return res.status(500).json({ message: 'DB init error' });

    // ESTRATÉGIA DE BUSCA "DETETIVE"
    let transactionDoc = null;
    let transactionRef = null;

    // 1. Tenta buscar direto pelo ID de Referência (Nosso UUID)
    const referenceId = body.reference || body.reference_id || (body.data && body.data.reference);
    
    if (referenceId) {
        console.log(`🔎 Buscando por Reference ID: ${referenceId}`);
        const ref = doc(db, "transactions", String(referenceId));
        const snap = await getDoc(ref);
        if (snap.exists()) {
            transactionDoc = snap;
            transactionRef = ref;
        }
    }

    // 2. Se não achou, tenta buscar pelo ID da Paradise (Query)
    if (!transactionDoc) {
        const paradiseId = body.id || (body.data && body.data.id);
        if (paradiseId) {
            console.log(`🔎 Buscando por Paradise ID: ${paradiseId}`);
            const q = query(collection(db, "transactions"), where("paradise_transaction_id", "==", paradiseId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                transactionDoc = querySnapshot.docs[0];
                transactionRef = transactionDoc.ref;
            }
        }
    }

    if (!transactionDoc || !transactionRef) {
        console.log("❌ Transação não encontrada no banco.");
        return res.status(200).json({ message: 'Transaction not found, skipping.' });
    }

    const transactionData = transactionDoc.data();
    
    // Normaliza o status (Paradise pode mandar 'PAID', 'paid', 'approved', etc)
    let incomingStatus = (body.status || (body.data && body.data.status) || '').toLowerCase();
    
    // Mapeamento de status da Paradise
    if (incomingStatus === 'approved' || incomingStatus === 'completed') incomingStatus = 'paid';

    if (incomingStatus === 'paid' && transactionData.status !== 'paid') {
        console.log(`💰 CONFIRMADO: Transação ${transactionDoc.id} paga!`);

        await updateDoc(transactionRef, { 
            status: 'paid', 
            paidAt: new Date().toISOString(),
            webhook_received: true
        });

        // Dispara Purchase no Facebook
        await trackFacebookEvent(
            'Purchase',
            { 
                fbp: transactionData.fbp, 
                fbc: transactionData.fbc,
                email: transactionData.email,
                phone: transactionData.phone
            }, 
            {
                currency: 'BRL',
                value: transactionData.price
            },
            String(transactionDoc.id)
        );
    } else if (incomingStatus && transactionData.status !== incomingStatus) {
        await updateDoc(transactionRef, { status: incomingStatus });
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Erro Fatal Webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}
