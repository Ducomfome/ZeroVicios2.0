// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import crypto from 'crypto';

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

// Função auxiliar para criar Hash SHA256 (Exigência do Facebook para CAPI)
const hashData = (data: string) => {
    if (!data) return null;
    return crypto.createHash('sha256').update(data).digest('hex');
};

async function trackFacebookEvent(eventName: string, userData: any, customData: any, eventId?: string) {
  if (!FACEBOOK_ACCESS_TOKEN) {
    console.log("⚠️ FACEBOOK_ACCESS_TOKEN não configurado. Pulei o evento.");
    return;
  }

  // Prepara user_data com HASH SHA256 (Padrão Ouro do Facebook)
  const fbUserData: any = {};
  
  if (userData.fbp) fbUserData.fbp = userData.fbp;
  if (userData.fbc) fbUserData.fbc = userData.fbc;
  
  if (userData.email) {
      // Normaliza e Hash
      const normalizedEmail = userData.email.trim().toLowerCase();
      fbUserData.em = [hashData(normalizedEmail)]; 
  }
  
  if (userData.phone) {
      // Normaliza e Hash (remove tudo que não for número)
      const normalizedPhone = userData.phone.replace(/\D/g, '');
      fbUserData.ph = [hashData(normalizedPhone)];
  }

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_id: eventId, // ID crucial para deduplicação
      user_data: fbUserData,
      custom_data: customData
    }],
    access_token: FACEBOOK_ACCESS_TOKEN
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${FACEBOOK_PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    console.log(`🎯 Pixel Facebook (${eventName}) disparado via Server-Side!`, result);
  } catch (e) {
    console.error('Erro ao disparar Pixel CAPI:', e);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
     return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body;
    console.log("🔔 Webhook recebido:", body);

    // Adaptação para diferentes formatos de webhook
    const transactionId = body.id || body.reference_id || body.transaction_id;
    const status = body.status;

    if (!transactionId) {
      return res.status(400).json({ message: 'ID não fornecido' });
    }

    if (!db) {
        return res.status(500).json({ message: 'Database not initialized' });
    }

    // Busca a transação original para pegar os cookies do Pixel
    const docRef = doc(db, "transactions", String(transactionId));
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log("Transação não encontrada no banco:", transactionId);
      return res.status(200).json({ message: 'Transação desconhecida' });
    }

    const transactionData = docSnap.data();

    if (status === 'paid' && transactionData.status !== 'paid') {
        console.log(`💰 Pagamento Aprovado: ${transactionId}`);

        await updateDoc(docRef, { status: 'paid', paidAt: new Date().toISOString() });

        // Dispara o evento Purchase Server-Side (CAPI)
        // O event_id DEVE ser o mesmo que foi usado no frontend (transactionId)
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
            String(transactionId) 
        );
    } else {
        // Apenas atualiza status se mudou
        if (transactionData.status !== status) {
            await updateDoc(docRef, { status: status });
        }
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Erro no Webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}