// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';

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
  // Estrutura padrão zerada para não quebrar o frontend se o DB falhar
  const emptyStats = {
      financial: { revenue: 0, sales: 0, leads: 0, conversionRate: 0 },
      vsl: { 
        plays: 0, completes: 0, retention: 0, 
        funnel: [
          { name: 'Play', value: 0 },
          { name: '25%', value: 0 },
          { name: '50%', value: 0 },
          { name: '75%', value: 0 },
          { name: 'Fim', value: 0 }
        ] 
      },
      leads: [],
      dbStatus: "disconnected"
  };

  if (!db) {
    return res.status(200).json(emptyStats);
  }

  try {
    // 1. Buscar Transações (Leads e Vendas)
    const transactionsRef = collection(db, "transactions");
    const q = query(transactionsRef); 
    const snapshot = await getDocs(q);

    let totalRevenue = 0;
    let totalSales = 0;
    let totalLeads = 0;
    const leadsList: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      totalLeads++;

      // Lista para tabela (limitada a 100 para não estourar payload)
      if (leadsList.length < 100) {
        leadsList.push({
          id: doc.id,
          name: data.name || "Sem Nome",
          email: data.email || "Sem Email",
          phone: data.phone || "",
          status: data.status,
          plan: data.plan,
          price: data.price,
          date: data.created_at,
          city: data.location || "Brasil" // Lê a localização salva
        });
      }

      // Contabiliza Venda
      if (data.status === 'paid') {
        totalSales++;
        totalRevenue += Number(data.price);
      }
    });

    // 2. Buscar Analytics da VSL
    const vslRef = doc(db, "analytics", "vsl_stats");
    const vslSnap = await getDoc(vslRef);
    const vslData = vslSnap.exists() ? vslSnap.data()['vsl'] || {} : {};

    // Ordenar leads por data (recente primeiro)
    leadsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.status(200).json({
      financial: {
        revenue: totalRevenue,
        sales: totalSales,
        leads: totalLeads,
        conversionRate: totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(2) : 0
      },
      vsl: {
        plays: vslData.plays || 0,
        completes: vslData.completes || 0,
        retention: vslData.plays > 0 ? ((vslData.completes / vslData.plays) * 100).toFixed(2) : 0,
        funnel: [
          { name: 'Play', value: vslData.plays || 0 },
          { name: '25%', value: vslData.progress_25 || 0 },
          { name: '50%', value: vslData.progress_50 || 0 },
          { name: '75%', value: vslData.progress_75 || 0 },
          { name: 'Fim', value: vslData.completes || 0 },
        ]
      },
      leads: leadsList,
      dbStatus: "connected"
    });

  } catch (error: any) {
    console.error("Erro admin stats:", error);
    // Retorna vazio mas com mensagem de erro no console
    return res.status(200).json(emptyStats);
  }
}