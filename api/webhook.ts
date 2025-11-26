import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

// Config Firebase
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

// Config Facebook CAPI
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_PIXEL_ID = '792797553335143'; // Seu ID do Pixel

// Função auxiliar para enviar evento ao Facebook
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
        em: userData.email ? [userData.email] : undefined, // Email hasheado (idealmente)
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

    // A PushinPay envia o ID da transação e o status
    const transactionId = body.id;
    const status = body.status;

    if (!transactionId) {
      return res.status(400).json({ message: 'ID não fornecido' });
    }

    if (!db) {
        return res.status(500).json({ message: 'Database not initialized' });
    }

    // 1. Buscar a transação no banco de dados para pegar o fbp/fbc que salvamos antes
    const docRef = doc(db, "transactions", transactionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log("Transação não encontrada no banco:", transactionId);
      return res.status(200).json({ message: 'Transação desconhecida' });
    }

    const transactionData = docSnap.data();

    // 2. Se o pagamento for APROVADO
    if (status === 'paid') {
        console.log(`💰 Pagamento Aprovado: ${transactionId}`);

        // Atualiza status no banco
        await updateDoc(docRef, { status: 'paid', paidAt: new Date().toISOString() });

        // 3. Dispara o evento de Purchase Server-Side (CAPI)
        await trackFacebookEvent(
            'Purchase',
            { 
                fbp: transactionData.fbp, 
                fbc: transactionData.fbc,
                email: transactionData.email // O Facebook usa isso para matching avançado
            }, 
            {
                currency: 'BRL',
                value: transactionData.price,
                transaction_id: transactionId
            }
        );
    } else {
        // Atualiza outros status (ex: pending, failed)
        await updateDoc(docRef, { status: status });
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Erro no Webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}