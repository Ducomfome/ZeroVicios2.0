// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import crypto from 'crypto';

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

    // Captura Localização via Headers da Vercel
    const city = req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : 'Desconhecido';
    const region = req.headers['x-vercel-ip-country-region'] || '';
    const userLocation = region ? `${city} - ${region}` : city;

    // Inicializar Firebase
    const app = initFirebase();
    const db = app ? getFirestore(app) : null;
    
    // Tenta pegar do ENV, se não tiver, usa chave de teste ou avisa
    const SECRET_KEY = process.env.PARADISE_SECRET_KEY;

    // 🎯 MAPEAMENTO DOS 3 PRODUTOS
    const productHashMap: { [key: string]: string } = {
      "Kit 3 Meses": "prod_d6a5ebe96b2eb490",  
      "Kit 5 Meses": "prod_9dc131fea65a345d",   
      "Kit 12 Meses": "prod_c5e1a25852bd498a", 
    };

    const productHash = productHashMap[plan];

    // Payload para Paradise
    const paradisePayload = {
      amount: Math.round(Number(price) * 100),
      description: `${plan} - Zero Vicios`,
      reference: transactionId,
      postback_url: `${(process.env.NEXT_PUBLIC_BASE_URL || 'https://' + process.env.VERCEL_URL).replace(/\/$/, '')}/api/webhook`,
      productHash: productHash || "prod_9dc131fea65a345d", // Fallback seguro
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

    // Se tiver chave da Paradise, chama a API, se não, simula sucesso (Modo Teste do Desenvolvedor)
    let data;
    if (SECRET_KEY) {
        const response = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-API-Key': SECRET_KEY
            },
            body: JSON.stringify(paradisePayload)
        });
        const responseText = await response.text();
        data = JSON.parse(responseText);
    } else {
        // MODO SIMULAÇÃO (Para não travar sem chave)
        console.warn("⚠️ API Key Paradise ausente. Usando modo simulação.");
        data = {
            status: "success",
            transaction_id: transactionId,
            qr_code: "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-42661417400052040000530398654041.005802BR5913Zero Vicios6008Brasilia62070503***6304E2CA",
            qr_code_base64: "", // Simulação não gera imagem real
            amount: Math.round(Number(price) * 100),
            expires_at: new Date(Date.now() + 10 * 60000).toISOString()
        };
    }

    if (data.status === "success" || data.transaction_id) {
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
            location: userLocation, // Salva Cidade - Estado
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
          message: "PIX gerado com sucesso!"
        });
    } else {
        return res.status(400).json({
          success: false,
          error: "Erro na API Paradise",
          details: data
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