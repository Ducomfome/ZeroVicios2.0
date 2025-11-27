// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import crypto from 'crypto';

const initFirebase = () => {
  const configStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!configStr) return null;
  try {
    const firebaseConfig = JSON.parse(configStr);
    return !getApps().length ? initializeApp(firebaseConfig) : getApp();
  } catch (e) { 
    console.error('❌ Erro Firebase config:', e);
    return null; 
  }
};

const safeSaveToFirestore = async (db: any, transactionId: string, data: any) => {
  try {
    await setDoc(doc(db, "transactions", transactionId), data);
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao salvar no Firestore:', error.message);
    return false;
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // Garante que o body seja um objeto
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, email, cpf, price, plan, phone, fbc, fbp } = body;
    const transactionId = crypto.randomUUID();

    // Inicializar Firebase
    const app = initFirebase();
    const db = app ? getFirestore(app) : null;
    
    const SECRET_KEY = process.env.PARADISE_SECRET_KEY;

    if (!SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: "Chave API não configurada",
        message: "Configure PARADISE_SECRET_KEY no .env"
      });
    }

    // 🎯 MAPEAMENTO DOS 3 PRODUTOS
    const productHashMap: { [key: string]: string } = {
      "Kit 3 Meses": "prod_d6a5ebe96b2eb490",  
      "Kit 5 Meses": "prod_9dc131fea65a345d",   
      "Kit 12 Meses": "prod_c5e1a25852bd498a", 
    };

    const productHash = productHashMap[plan];

    if (!productHash) {
      return res.status(400).json({
        success: false,
        error: "Produto não encontrado",
        message: `Hash não configurado para o plano: ${plan}`
      });
    }

    const paradisePayload = {
      amount: Math.round(Number(price) * 100),
      description: `${plan} - Zero Vicios`,
      reference: transactionId,
      postback_url: `${(process.env.NEXT_PUBLIC_BASE_URL || 'https://' + process.env.VERCEL_URL).replace(/\/$/, '')}/api/webhook`,
      productHash: productHash,
      customer: {
        name: name.substring(0, 100),
        email: email,
        document: cpf.replace(/\D/g, ''),
        phone: phone ? phone.replace(/\D/g, '') : "11999999999"
      },
      tracking: {
        utm_source: "site",
        utm_medium: "direct",
        utm_campaign: "zero_vicios"
      }
    };

    const response = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-API-Key': SECRET_KEY
      },
      body: JSON.stringify(paradisePayload)
    });

    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      
      if (response.ok && data.status === "success") {
        if (db) {
          await safeSaveToFirestore(db, String(data.transaction_id), {
            status: 'pending',
            provider: 'paradise',
            plan: plan,
            email: email,
            name: name,
            price: price,
            phone: phone,
            cpf: cpf,
            fbc: fbc || null, // Pixel Cookie
            fbp: fbp || null, // Pixel Cookie
            paradise_transaction_id: data.transaction_id,
            product_hash: productHash,
            created_at: new Date().toISOString(),
            pix_code: data.qr_code,
            expires_at: data.expires_at
          });
        }

        return res.status(200).json({
          success: true,
          id: data.transaction_id,
          qrCodeBase64: data.qr_code_base64,
          copiaECola: data.qr_code,
          provider: "Paradise",
          amount: data.amount / 100,
          expires_at: data.expires_at,
          message: "PIX real gerado com sucesso!"
        });
      } else {
        return res.status(400).json({
          success: false,
          error: "Erro na API Paradise",
          details: data
        });
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: "Erro de comunicação com a Paradise",
        rawResponse: responseText
      });
    }

  } catch (error: any) {
    console.error("💥 ERRO GRAVE:", error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno no servidor',
      message: error.message 
    });
  }
}