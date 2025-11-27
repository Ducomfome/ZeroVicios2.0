import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DollarSign, Users, PlayCircle, ShoppingCart, Loader2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin-stats');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-green-500" />
        <span className="ml-3">Carregando dados da operação...</span>
      </div>
    );
  }

  if (!data) return <div className="text-white">Erro ao carregar dados.</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <header className="mb-8 flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Painel Admin <span className="text-green-500">Zero Vícios</span></h1>
          <p className="text-slate-400 text-sm">Visão geral em tempo real</p>
        </div>
        <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
           <span className="text-green-500 font-bold text-xs uppercase">Status:</span> Online
        </div>
      </header>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={60} /></div>
          <p className="text-slate-400 text-xs uppercase font-bold mb-1">Faturamento Total</p>
          <h3 className="text-3xl font-bold text-green-400">R$ {data.financial.revenue.toFixed(2)}</h3>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><ShoppingCart size={60} /></div>
          <p className="text-slate-400 text-xs uppercase font-bold mb-1">Vendas Aprovadas</p>
          <h3 className="text-3xl font-bold text-white">{data.financial.sales}</h3>
          <p className="text-xs text-slate-500 mt-2">Taxa de Conversão: <span className="text-green-400">{data.financial.conversionRate}%</span></p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={60} /></div>
          <p className="text-slate-400 text-xs uppercase font-bold mb-1">Leads (Checkout Iniciado)</p>
          <h3 className="text-3xl font-bold text-blue-400">{data.financial.leads}</h3>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><PlayCircle size={60} /></div>
          <p className="text-slate-400 text-xs uppercase font-bold mb-1">VSL Retenção (Fim)</p>
          <h3 className="text-3xl font-bold text-purple-400">{data.vsl.retention}%</h3>
          <p className="text-xs text-slate-500 mt-2">{data.vsl.completes} pessoas assistiram até o fim</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO DO FUNIL DA VSL */}
        <div className="lg:col-span-1 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
          <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <PlayCircle className="text-purple-500" size={20} /> Funil da VSL
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.vsl.funnel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={40} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                  cursor={{fill: '#334155', opacity: 0.4}}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {data.vsl.funnel.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 4 ? '#10b981' : '#8b5cf6'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABELA DE LEADS */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
          <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <Users className="text-blue-500" size={20} /> Últimos Leads & Vendas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-400">
              <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Email/Tel</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map((lead: any) => (
                  <tr key={lead.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(lead.date).toLocaleDateString('pt-BR')} <br/>
                        <span className="text-xs opacity-50">{new Date(lead.date).toLocaleTimeString('pt-BR')}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white truncate max-w-[150px]">{lead.name}</td>
                    <td className="px-4 py-3">
                        <div className="truncate max-w-[150px]">{lead.email}</div>
                        <div className="text-xs opacity-50">{lead.phone}</div>
                    </td>
                    <td className="px-4 py-3">{lead.plan}</td>
                    <td className="px-4 py-3">
                      {lead.status === 'paid' ? (
                        <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs font-bold border border-green-500/20">Pago</span>
                      ) : (
                        <span className="bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded text-xs font-bold border border-yellow-500/20">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};