import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { Shield, TrendingUp, Calendar, Activity } from 'lucide-react';
import { UserState, DailyStat } from '../types';

interface DashboardProps {
  user: UserState;
}

const mockData: DailyStat[] = [
  { day: 'Seg', cravings: 8, mood: 4 },
  { day: 'Ter', cravings: 6, mood: 5 },
  { day: 'Qua', cravings: 5, mood: 6 },
  { day: 'Qui', cravings: 3, mood: 8 },
  { day: 'Sex', cravings: 4, mood: 7 },
  { day: 'Sáb', cravings: 2, mood: 9 },
  { day: 'Dom', cravings: 1, mood: 9 },
];

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const daysSober = useMemo(() => {
    if (!user.soberDate) return 0;
    const start = new Date(user.soberDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [user.soberDate]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Shield size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium mb-1">Tempo Limpo</p>
            <h3 className="text-4xl font-bold text-white">{daysSober} <span className="text-lg text-slate-500 font-normal">dias</span></h3>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium mb-1">Economia Estimada</p>
            <h3 className="text-4xl font-bold text-green-400">R$ {daysSober * 20},00</h3>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium mb-1">Humor Médio</p>
            <h3 className="text-4xl font-bold text-blue-400">8.5 <span className="text-lg text-slate-500 font-normal">/ 10</span></h3>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
        <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Calendar size={20} className="text-blue-500" />
          Progresso Semanal
        </h4>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData}>
              <defs>
                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCravings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="mood" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMood)" name="Humor" />
              <Area type="monotone" dataKey="cravings" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCravings)" name="Vontades" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};