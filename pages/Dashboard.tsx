import React, { useMemo } from 'react';
import { useFinance } from '../context';
import { Card } from '../components/ui';
import { 
  Wallet, TrendingUp, DollarSign, Activity, 
  BarChart3, PieChart as PieChartIcon, Calendar, ArrowUpRight, 
  Target, Layers, Briefcase, TrendingDown, LayoutPanelLeft
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar, ComposedChart, Line
} from 'recharts';

// Metas de dividendos por ano (valores reais do planejamento)
const DIVIDEND_GOALS: Record<number, { yearly: number; monthly: number }> = {
  2018: { yearly: 1.00, monthly: 0.08 },
  2019: { yearly: 500.00, monthly: 41.67 },
  2020: { yearly: 1000.00, monthly: 83.33 },
  2021: { yearly: 4305.89, monthly: 358.82 },
  2022: { yearly: 15649.39, monthly: 1304.12 },
  2023: { yearly: 20031.22, monthly: 1669.27 },
  2024: { yearly: 25039.03, monthly: 2086.59 },
  2025: { yearly: 28794.88, monthly: 2399.57 },
  2026: { yearly: 33114.11, monthly: 2759.51 },
  2027: { yearly: 36425.52, monthly: 3035.46 },
  2028: { yearly: 40068.08, monthly: 3339.01 },
  2029: { yearly: 44074.89, monthly: 3672.91 },
  2030: { yearly: 48482.37, monthly: 4040.20 },
  2031: { yearly: 53330.61, monthly: 4444.22 },
  2032: { yearly: 58663.67, monthly: 4888.64 },
  2033: { yearly: 64530.04, monthly: 5377.50 },
  2034: { yearly: 70983.04, monthly: 5915.25 },
  2035: { yearly: 78081.35, monthly: 6506.78 },
  2036: { yearly: 85889.48, monthly: 7157.46 },
  2037: { yearly: 94478.43, monthly: 7873.20 },
  2038: { yearly: 103926.27, monthly: 8660.52 },
  2039: { yearly: 114318.90, monthly: 9526.58 },
  2040: { yearly: 125750.79, monthly: 10479.23 },
  2041: { yearly: 138325.87, monthly: 11527.16 },
  2042: { yearly: 152158.46, monthly: 12679.87 },
  2043: { yearly: 167374.30, monthly: 13947.86 },
  2044: { yearly: 184111.73, monthly: 15342.64 },
  2045: { yearly: 202522.91, monthly: 16876.91 },
};

export const Dashboard = () => {
  const { portfolio, dividends, assets, trades } = useFinance();

  // --- PREPARAÇÃO DE DADOS ---
  const formatCurrency = (val: number) => {
    if (isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Identifica tipo do ativo
  const getAssetType = (ticker: string) => {
    const asset = assets.find(a => a.ticker === ticker);
    if (asset) {
      if (asset.type === 'FII') return 'FII';
      if (asset.type === 'ETF') return 'ETF';
      return 'ACAO';
    }
    if (ticker.endsWith('11') && ticker.length === 6) return 'FII';
    if (['BOVA11', 'IVVB11', 'SMAL11'].includes(ticker)) return 'ETF';
    return 'ACAO';
  };

  // Calcula patrimônio real baseado em trades
  const portfolioData = useMemo(() => {
    return assets.map(asset => {
      const assetTrades = trades.filter(t => t.assetId === asset.id);
      
      let quantity = 0;
      let totalCost = 0;
      
      assetTrades
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach(trade => {
          const qty = Number(trade.quantity) || 0;
          const price = Number(trade.price) || 0;
          const fees = Number(trade.fees) || 0;
          
          if (trade.type === 'COMPRA') {
            totalCost += (qty * price) + fees;
            quantity += qty;
          } else if (trade.type === 'VENDA') {
            if (quantity > 0) {
              const avgPrice = totalCost / quantity;
              totalCost -= (qty * avgPrice);
              quantity -= qty;
            }
          }
        });
      
      if (assetTrades.length === 0) {
        quantity = Number(asset.quantity) || 0;
        totalCost = quantity * (Number(asset.avg_price) || 0);
      }
      
      const avgPrice = quantity > 0 ? totalCost / quantity : 0;
      const currentPrice = asset.lastPrice || avgPrice;
      const marketValue = quantity * currentPrice;
      
      return {
        ...asset,
        quantity,
        avgPrice,
        currentPrice,
        marketValue,
        totalCost
      };
    }).filter(p => p.quantity > 0);
  }, [assets, trades]);

  const totalEquity = portfolioData.reduce((acc, p) => acc + (p.marketValue || 0), 0);
  const totalCost = portfolioData.reduce((acc, p) => acc + (p.totalCost || 0), 0);
  
  // Calcula total de dividendos com tratamento robusto
  const totalDividends = useMemo(() => {
    if (!dividends || dividends.length === 0) return 0;
    
    return dividends.reduce((acc, d) => {
      const value = d.total_value !== undefined 
        ? Number(d.total_value) 
        : Number(d.totalValue || 0);
      
      if (isNaN(value)) return acc;
      return acc + value;
    }, 0);
  }, [dividends]);

  const totalGainLoss = totalEquity - totalCost;
  const totalGainLossPerc = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  // --- MOTOR ANALÍTICO DE DIVIDENDOS ---
  const analytics = useMemo(() => {
    const months: Record<string, any> = {};
    const years: Record<string, any> = {};
    const assetContribution: Record<string, any> = {};
    
    if (!dividends || dividends.length === 0) {
      return { monthlyArray: [], yearlyArray: [], growthArray: [], stackedMonthlyArray: [] };
    }

    dividends.forEach(d => {
      const paymentDate = d.payment_date || d.paymentDate;
      if (!paymentDate) return;
      
      const date = new Date(paymentDate);
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthName = monthNames[monthIdx];
      const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const quarter = `Q${Math.ceil((monthIdx + 1) / 3)}`;
      const semester = monthIdx < 6 ? 'S1' : 'S2';
      const type = getAssetType(d.ticker);
      
      const val = d.total_value !== undefined ? Number(d.total_value) : Number(d.totalValue || 0);
      if (isNaN(val)) return;

      // Usa meta real do ano ou calcula interpolação
      const yearGoals = DIVIDEND_GOALS[year] || { yearly: 0, monthly: 0 };
      
      if (!months[monthKey]) months[monthKey] = { 
        name: monthKey, 
        label: `${monthName}/${String(year).slice(2)}`, 
        value: 0, 
        meta: yearGoals.monthly 
      };
      months[monthKey].value += val;

      if (!assetContribution[monthKey]) assetContribution[monthKey] = { name: `${monthName}/${String(year).slice(2)}` };
      assetContribution[monthKey][d.ticker] = (assetContribution[monthKey][d.ticker] || 0) + val;

      if (!years[year]) years[year] = { 
        year, 
        value: 0, 
        meta: yearGoals.yearly,
        Q1: 0, Q2: 0, Q3: 0, Q4: 0,
        S1: 0, S2: 0,
        ACAO: 0, FII: 0, OUTROS: 0
      };
      years[year].value += val;
      years[year][quarter] += val;
      years[year][semester] += val;
      years[year][type] = (years[year][type] || 0) + val;
    });

    const monthlyArray = Object.values(months).sort((a: any, b: any) => a.name.localeCompare(b.name));
    const yearlyArray = Object.values(years).sort((a: any, b: any) => a.year - b.year);
    const stackedMonthlyArray = Object.values(assetContribution).slice(-12);

    const growthArray = yearlyArray.map((curr: any, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1].value : 0;
      const growth = prev > 0 ? ((curr.value - prev) / prev) * 100 : 0;
      const metaAchievement = curr.meta > 0 ? ((curr.value / curr.meta) * 100) : 0;
      return { 
        ...curr, 
        growth: Number(growth.toFixed(2)),
        metaAchievement: Number(metaAchievement.toFixed(1))
      };
    });

    return { monthlyArray, yearlyArray, growthArray, stackedMonthlyArray };
  }, [dividends, assets]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#f97316'];

  return (
    <div className="space-y-10 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-800 pb-8">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter mb-2">Terminal <span className="text-blue-500">Dividend Intelligence</span></h2>
          <p className="text-slate-400 font-medium">Análise visual de proventos e evolução patrimonial.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
            <Calendar size={18} className="text-blue-400" />
            <span className="text-sm font-bold text-slate-300 uppercase">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Patrimônio" value={formatCurrency(totalEquity)} icon={Wallet} trend="up" />
        <Card title="Renda Acumulada" value={formatCurrency(totalDividends)} icon={DollarSign} trend="up" className="bg-emerald-500/5 border-emerald-500/20" />
        <Card 
          title="Média Mensal" 
          value={formatCurrency(analytics.monthlyArray.length > 0 ? totalDividends / analytics.monthlyArray.length : 0)} 
          icon={Activity} 
        />
        <Card 
          title="Yield on Cost" 
          value={`${totalCost > 0 ? ((totalDividends / totalCost) * 100).toFixed(2) : '0.00'}%`} 
          icon={TrendingUp} 
          trend="up" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Dividendos Mensais vs Meta */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500" /> Dividendos: Realizado vs Meta (Mensal)
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthlyArray.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip contentStyle={{backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px'}} />
                <Bar dataKey="value" name="Realizado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meta" name="Meta" fill="#334155" radius={[4, 4, 0, 0]} />
                <Legend iconType="circle" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dividendos Anuais vs Meta */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target size={16} className="text-emerald-500" /> Dividendos: Realizado vs Meta (Anual)
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.yearlyArray}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip contentStyle={{backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px'}} />
                <Bar dataKey="value" name="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meta" name="Meta" fill="#334155" radius={[4, 4, 0, 0]} />
                <Legend iconType="circle" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recebidos por Ativo por Mês */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Layers size={16} className="text-indigo-500" /> Distribuição Mensal por Ativo
          </h4>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.stackedMonthlyArray}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip contentStyle={{backgroundColor: '#020617', borderColor: '#1e293b'}} />
                {dividends && Array.from(new Set(dividends.map(d => d.ticker))).map((ticker, idx) => (
                  <Bar key={ticker} dataKey={ticker} stackId="a" fill={COLORS[idx % COLORS.length]} />
                ))}
                <Legend iconType="circle" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};