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
  // Estrutura padrão zerada
  const stats = {
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
    return res.status(200).json(stats);
  }

  stats.dbStatus = "connected";

  // BLOCO 1: Buscar Transações (Leads e Vendas)
  try {
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
          // Agora mostra exatamente o que foi salvo ou avisa que está pendente
          city: data.location || "Localização Pendente" 
        });
      }

      // Contabiliza Venda
      if (data.status === 'paid') {
        totalSales++;
        totalRevenue += Number(data.price);
      }
    });

    // Ordenar leads por data (recente primeiro)
    leadsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Atualiza estatísticas financeiras
    stats.financial.revenue = totalRevenue;
    stats.financial.sales = totalSales;
    stats.financial.leads = totalLeads;
    stats.financial.conversionRate = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(2) : 0;
    stats.leads = leadsList;

  } catch (error: any) {
    console.error("⚠️ Erro parcial ao buscar Transações:", error.message);
  }

  // BLOCO 2: Buscar Analytics da VSL
  try {
    const vslRef = doc(db, "analytics", "vsl_stats");
    const vslSnap = await getDoc(vslRef);
    
    if (vslSnap.exists()) {
        const dataToUse = vslSnap.data()['vsl'] || vslSnap.data(); 
        
        const plays = dataToUse.plays || 0;
        const completes = dataToUse.completes || 0;
        const p25 = dataToUse.progress_25 || 0;
        const p50 = dataToUse.progress_50 || 0;
        const p75 = dataToUse.progress_75 || 0;

        stats.vsl.plays = plays;
        stats.vsl.completes = completes;
        stats.vsl.retention = plays > 0 ? ((completes / plays) * 100).toFixed(2) : 0;
        stats.vsl.funnel = [
          { name: 'Play', value: plays },
          { name: '25%', value: p25 },
          { name: '50%', value: p50 },
          { name: '75%', value: p75 },
          { name: 'Fim', value: completes },
        ];
    }
  } catch (error: any) {
    console.error("⚠️ Erro parcial ao buscar VSL Stats:", error.message);
  }

  return res.status(200).json(stats);
}