// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, email, cpf, price, plan, phone, fbc, fbp, cep, street, number, district, city, state } = body;
    
    // Gera UUID seguro usando crypto global (funciona em Node e Vercel)
    const transactionId = crypto.randomUUID();

    let userLocation = "Desconhecido";
    try {
        const rawCity = req.headers['x-vercel-ip-city'];
        const cityHeader = rawCity ? decodeURIComponent(rawCity) : null;
        const region = req.headers['x-vercel-ip-country-region']; 
        const country = req.headers['x-vercel-ip-country'];

        if (cityHeader && region) {
            userLocation = `${cityHeader} - ${region}`;
        } else if (cityHeader) {
            userLocation = cityHeader;
        } else if (region && country) {
            userLocation = `${region}, ${country}`;
        } else if (country) {
            userLocation = country;
        }
    } catch (e) {
        console.error("Erro ao decodificar cidade:", e);
    }

    const app = initFirebase();
    const db = app ? getFirestore(app) : null;
    const SECRET_KEY = process.env.PARADISE_SECRET_KEY;

    const productHashMap: { [key: string]: string } = {
      "Kit 3 Meses": "prod_d6a5ebe96b2eb490",  
      "Kit 5 Meses": "prod_9dc131fea65a345d",   
      "Kit 12 Meses": "prod_c5e1a25852bd498a", 
    };

    const productHash = productHashMap[plan] || "prod_9dc131fea65a345d";

    const paradisePayload = {
      amount: Math.round(Number(price) * 100),
      description: `${plan} - Zero Vicios`,
      reference: transactionId, // UUID NOSSO
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
        console.warn("⚠️ API Key Paradise ausente. Usando modo simulação.");
        data = {
            status: "success",
            transaction_id: transactionId, // Em simulação, ID é o mesmo
            qr_code: "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-42661417400052040000530398654041.005802BR5913Zero Vicios6008Brasilia62070503***6304E2CA",
            qr_code_base64: "", 
            amount: Math.round(Number(price) * 100),
            expires_at: new Date(Date.now() + 10 * 60000).toISOString()
        };
    }

    if (data.status === "success" || data.transaction_id) {
        if (db) {
          await safeSaveToFirestore(db, String(transactionId), {
            status: 'pending',
            provider: 'paradise',
            plan: plan,
            email: email,
            name: name,
            price: price,
            phone: phone,
            cpf: cpf,
            address_cep: cep || '',
            address_street: street || '',
            address_number: number || '',
            address_district: district || '',
            address_city: city || '',
            address_state: state || '',
            location: userLocation,
            fbc: fbc || null,
            fbp: fbp || null,
            paradise_transaction_id: data.transaction_id, // SALVA ID DA PARADISE PARA O WEBHOOK ACHAR
            product_hash: productHash,
            created_at: new Date().toISOString(),
            pix_code: data.qr_code,
            expires_at: data.expires_at
          });
        }

        return res.status(200).json({
          success: true,
          id: transactionId, // Retorna NOSSO UUID para o frontend monitorar
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
