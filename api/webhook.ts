// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

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

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_PIXEL_ID = '792797553335143'; 

async function trackFacebookEvent(eventName: string, userData: any, customData: any) {
  if (!FACEBOOK_ACCESS_TOKEN) return;

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      user_data: {
        fbp: userData.fbp,
        fbc: userData.fbc,
        em: userData.email ? [userData.email] : undefined,
      },
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
    console.log(`🎯 Pixel Facebook (${eventName}) disparado via Server-Side!`);
  } catch (e) {
    console.error('Erro ao disparar Pixel:', e);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
     return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body;
    console.log("🔔 Webhook recebido:", body);

    const transactionId = body.id;
    const status = body.status;

    if (!transactionId) {
      return res.status(400).json({ message: 'ID não fornecido' });
    }

    if (!db) {
        return res.status(500).json({ message: 'Database not initialized' });
    }

    const docRef = doc(db, "transactions", transactionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log("Transação não encontrada no banco:", transactionId);
      return res.status(200).json({ message: 'Transação desconhecida' });
    }

    const transactionData = docSnap.data();

    if (status === 'paid') {
        console.log(`💰 Pagamento Aprovado: ${transactionId}`);

        await updateDoc(docRef, { status: 'paid', paidAt: new Date().toISOString() });

        await trackFacebookEvent(
            'Purchase',
            { 
                fbp: transactionData.fbp, 
                fbc: transactionData.fbc,
                email: transactionData.email 
            }, 
            {
                currency: 'BRL',
                value: transactionData.price,
                transaction_id: transactionId
            }
        );
    } else {
        await updateDoc(docRef, { status: status });
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Erro no Webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}