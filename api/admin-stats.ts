// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';

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

export default async function handler(req: any, res: any) {
  // Simples verificação de segurança via query param ou header (opcional)
  // Em produção, use autenticação robusta.
  
  if (!db) {
    return res.status(500).json({ error: "Database not connected" });
  }

  try {
    // 1. Buscar Transações (Leads e Vendas)
    // Nota: Em escala, usar paginação ou contadores agregados.
    const transactionsRef = collection(db, "transactions");
    const q = query(transactionsRef); // Pega tudo (cuidado com custos em grande escala)
    const snapshot = await getDocs(q);

    let totalRevenue = 0;
    let totalSales = 0;
    let totalLeads = 0;
    const leadsList: any[] = [];
    
    // Processamento de dados de localização/idade (simulados ou extraídos se disponíveis)
    const cityStats: Record<string, number> = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Contabiliza Lead (Gerou Pix)
      totalLeads++;

      // Lista para tabela (últimos 50)
      if (leadsList.length < 50) {
        leadsList.push({
          id: doc.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: data.status, // pending, paid
          plan: data.plan,
          price: data.price,
          date: data.created_at,
          city: "Desconhecido" // O formulário atual não pede cidade, precisaria de uma API de CEP ou IP
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
      leads: leadsList
    });

  } catch (error: any) {
    console.error("Erro admin stats:", error);
    return res.status(500).json({ error: error.message });
  }
}