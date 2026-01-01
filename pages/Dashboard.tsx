import React, { useMemo, useState } from 'react';
import { useFinance } from '../context';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';
import { TrendingUp, Wallet, PieChart as PieIcon, BarChart2, Calendar, Target } from 'lucide-react';

// Paleta de cores sóbrias e modernas (#11)
const COLORS = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  accent: '#6366f1',
  muted: '#475569',
  light: '#94a3b8',
  dark: '#1e293b',
};

// Paleta para gráficos de barras empilhadas - tons sóbrios (#11)
const STACKED_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc',
  '#64748b', '#475569', '#334155', '#1e293b', '#0f172a',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#0284c7',
  '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f',
];

// Metas de dividendos por ano
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
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Função para corrigir timezone da data - FIX #1
const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day || 1, 12, 0, 0);
};

const formatCurrency = (value: number, currency: string = 'BRL') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Tooltip customizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color || entry.fill }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export const Dashboard = () => {
  const { dividends, assets, trades } = useFinance();
  const [activeTab, setActiveTab] = useState<'dividends' | 'portfolio'>('dividends');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const getAssetType = (ticker: string): 'ACAO' | 'FII' | 'ETF' => {
    if (!ticker) return 'ACAO';
    const normalizedTicker = ticker.toUpperCase().trim();
    
    const etfs = ['BOVA11', 'IVVB11', 'SMAL11', 'HASH11', 'QBTC11', 'BOVV11', 'PIBB11', 'SPXI11', 'NASD11', 'TFLO'];
    if (etfs.includes(normalizedTicker)) return 'ETF';
    
    const units = ['TAEE11', 'SAPR11', 'ALUP11', 'ENGI11', 'RNEW11', 'TIET11', 'AESB11', 'CMIG11', 'ELET11', 'CPLE11', 'SANB11', 'BPAC11', 'SULA11', 'KLBN11', 'BIDI11', 'BMGB11'];
    if (units.includes(normalizedTicker)) return 'ACAO';
    
    const asset = assets.find(a => a.ticker?.toUpperCase() === normalizedTicker);
    if (asset?.type === 'FII') return 'FII';
    if (asset?.type === 'ETF') return 'ETF';
    
    if (normalizedTicker.endsWith('11') && normalizedTicker.length === 6) return 'FII';
    return 'ACAO';
  };

  // FIX #8 - Identificar moeda do ativo
  const getAssetCurrency = (ticker: string): string => {
    if (ticker?.toUpperCase() === 'TFLO') return 'USD';
    const asset = assets.find(a => a.ticker?.toUpperCase() === ticker?.toUpperCase());
    return asset?.currency || 'BRL';
  };

  // Processar dividendos com data corrigida (FIX #1)
  const processedDividends = useMemo(() => {
    return dividends
      .filter((d, idx, self) => idx === self.findIndex(t => t.id === d.id))
      .map(d => {
        const paymentDate = d.payment_date || d.paymentDate || '';
        const date = parseLocalDate(paymentDate);
        return {
          ...d,
          totalValue: Number(d.total_value || d.totalValue || 0),
          year: date.getFullYear(),
          month: date.getMonth(),
          monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          assetType: getAssetType(d.ticker),
          currency: getAssetCurrency(d.ticker)
        };
      })
      .filter(d => d.totalValue > 0 && d.year >= 2018);
  }, [dividends, assets]);

  // FIX #2 - Média mensal do ANO VIGENTE
  const totals = useMemo(() => {
    const totalAll = processedDividends.reduce((sum, d) => sum + d.totalValue, 0);
    
    const currentYearDividends = processedDividends.filter(d => d.year === currentYear);
    const monthsWithData = new Set(currentYearDividends.map(d => d.month)).size;
    const currentYearTotal = currentYearDividends.reduce((sum, d) => sum + d.totalValue, 0);
    const monthlyAvgCurrentYear = monthsWithData > 0 ? currentYearTotal / monthsWithData : 0;
    
    const goal = DIVIDEND_GOALS[currentYear] || { yearly: 0, monthly: 0 };
    const progressYearly = goal.yearly > 0 ? (currentYearTotal / goal.yearly) * 100 : 0;
    
    return { totalAll, monthlyAvgCurrentYear, currentYearTotal, goal, progressYearly };
  }, [processedDividends, currentYear]);

  // FIX #3 - Dividendo mensal real vs. meta - ÚLTIMOS 12 MESES
  const monthlyRealVsGoalData = useMemo(() => {
    const last12Months: { year: number; month: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      last12Months.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    
    return last12Months.map(({ year, month }) => {
      const real = processedDividends
        .filter(d => d.year === year && d.month === month)
        .reduce((sum, d) => sum + d.totalValue, 0);
      const goal = DIVIDEND_GOALS[year]?.monthly || 0;
      return {
        name: `${MONTH_NAMES[month]}/${String(year).slice(2)}`,
        real,
        meta: goal
      };
    });
  }, [processedDividends, currentYear, currentMonth]);

  // FIX #4 - Crescimento anual a partir de 2020
  const yearlyGrowthData = useMemo(() => {
    const byYear: Record<number, number> = {};
    processedDividends.forEach(d => {
      if (d.year >= 2020) {
        byYear[d.year] = (byYear[d.year] || 0) + d.totalValue;
      }
    });
    
    const years = Object.keys(byYear).map(Number).sort();
    return years.map((year, idx) => {
      const value = byYear[year];
      const prevValue = idx > 0 ? byYear[years[idx - 1]] : 0;
      const growth = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;
      const goal = DIVIDEND_GOALS[year]?.yearly || 0;
      return { year: String(year), value, growth: idx > 0 ? growth : null, meta: goal };
    });
  }, [processedDividends]);

  // FIX #5 - Distribuição mensal por ativo - BARRAS EMPILHADAS cronológicas
  const monthlyByAssetData = useMemo(() => {
    const last12Months: { year: number; month: number; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      last12Months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      });
    }
    
    const allTickers = new Set<string>();
    processedDividends.forEach(d => {
      if (last12Months.some(m => m.year === d.year && m.month === d.month)) {
        allTickers.add(d.ticker);
      }
    });
    
    const tickersList = Array.from(allTickers).sort();
    
    return last12Months.map(monthInfo => {
      const entry: any = { name: monthInfo.label };
      tickersList.forEach(ticker => {
        const value = processedDividends
          .filter(d => d.year === monthInfo.year && d.month === monthInfo.month && d.ticker === ticker)
          .reduce((sum, d) => sum + d.totalValue, 0);
        entry[ticker] = value || 0;
      });
      return entry;
    });
  }, [processedDividends, currentYear, currentMonth]);

  const stackedTickers = useMemo(() => {
    const tickers = new Set<string>();
    monthlyByAssetData.forEach(entry => {
      Object.keys(entry).forEach(key => {
        if (key !== 'name' && entry[key] > 0) tickers.add(key);
      });
    });
    return Array.from(tickers).sort();
  }, [monthlyByAssetData]);

  // FIX #6 - Carteira com TODOS os ativos
  const portfolioData = useMemo(() => {
    const holdings: Record<string, { ticker: string; quantity: number; avgPrice: number; type: string; currency: string }> = {};
    
    trades.forEach(trade => {
      const ticker = trade.ticker?.toUpperCase();
      if (!ticker) return;
      
      if (!holdings[ticker]) {
        holdings[ticker] = { 
          ticker, 
          quantity: 0, 
          avgPrice: 0, 
          type: getAssetType(ticker),
          currency: getAssetCurrency(ticker)
        };
      }
      
      const qty = Number(trade.quantity) || 0;
      const price = Number(trade.price) || 0;
      const tradeType = trade.type?.toUpperCase();
      
      if (tradeType === 'BUY' || tradeType === 'COMPRA') {
        const totalQty = holdings[ticker].quantity + qty;
        const totalCost = (holdings[ticker].avgPrice * holdings[ticker].quantity) + (price * qty);
        holdings[ticker].avgPrice = totalQty > 0 ? totalCost / totalQty : 0;
        holdings[ticker].quantity = totalQty;
      } else if (tradeType === 'SELL' || tradeType === 'VENDA') {
        holdings[ticker].quantity -= qty;
      }
    });
    
    const activeHoldings = Object.values(holdings)
      .filter(h => h.quantity > 0)
      .map(h => ({ ...h, totalValue: h.quantity * h.avgPrice }))
      .sort((a, b) => b.totalValue - a.totalValue);
    
    const byType = activeHoldings.reduce((acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + h.totalValue;
      return acc;
    }, {} as Record<string, number>);
    
    const typeData = [
      { name: 'Ações', value: byType['ACAO'] || 0, color: COLORS.primary },
      { name: 'FIIs', value: byType['FII'] || 0, color: COLORS.warning },
      { name: 'ETFs', value: byType['ETF'] || 0, color: COLORS.accent }
    ].filter(t => t.value > 0);
    
    const assetData = activeHoldings.map(h => ({
      ticker: h.ticker,
      value: h.totalValue,
      currency: h.currency
    }));
    
    return { typeData, assetData, totalValue: activeHoldings.reduce((sum, h) => sum + h.totalValue, 0) };
  }, [trades, assets]);

  // FIX #10 - TODOS os ativos por dividendos
  const dividendsByAsset = useMemo(() => {
    const byAsset: Record<string, number> = {};
    processedDividends.forEach(d => {
      byAsset[d.ticker] = (byAsset[d.ticker] || 0) + d.totalValue;
    });
    return Object.entries(byAsset)
      .map(([ticker, value]) => ({ ticker, value }))
      .sort((a, b) => b.value - a.value);
  }, [processedDividends]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="text-blue-500" /> Dashboard
          </h2>
          <p className="text-slate-400 text-sm">Visão geral dos seus investimentos</p>
        </div>
        
        <div className="flex gap-2 bg-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dividends')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dividends' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Dividendos
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'portfolio' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet size={16} className="inline mr-2" />
            Carteira
          </button>
        </div>
      </div>

      {activeTab === 'dividends' && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <TrendingUp className="text-blue-400" size={24} />
                </div>
                <div>
                  <p className="text-xs text-blue-300 font-semibold uppercase">Total Recebido</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totals.totalAll)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border border-emerald-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <Calendar className="text-emerald-400" size={24} />
                </div>
                <div>
                  <p className="text-xs text-emerald-300 font-semibold uppercase">Média Mensal {currentYear}</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totals.monthlyAvgCurrentYear)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Target className="text-amber-400" size={24} />
                </div>
                <div>
                  <p className="text-xs text-amber-300 font-semibold uppercase">Meta {currentYear}</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totals.goal.yearly)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-700/10 border border-indigo-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-indigo-500/20 rounded-xl">
                  <PieIcon className="text-indigo-400" size={24} />
                </div>
                <div>
                  <p className="text-xs text-indigo-300 font-semibold uppercase">Progresso Anual</p>
                  <p className="text-2xl font-bold text-white">{totals.progressYearly.toFixed(1)}%</p>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(totals.progressYearly, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* FIX #3 - Últimos 12 meses */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <BarChart2 size={20} className="text-blue-400" />
                Dividendo Mensal Real vs. Meta (12 meses)
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRealVsGoalData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="real" name="Recebido" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="meta" name="Meta" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FIX #4 - A partir de 2020 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-400" />
                Crescimento Anual dos Dividendos (2020+)
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={yearlyGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="value" name="Recebido" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="meta" name="Meta" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="growth" name="Crescimento %" stroke={COLORS.success} strokeWidth={3} dot={{ r: 5, fill: COLORS.success }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FIX #5 - Barras empilhadas cronológicas */}
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Calendar size={20} className="text-amber-400" />
                Distribuição Mensal por Ativo (Últimos 12 meses)
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyByAssetData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
                    {stackedTickers.map((ticker, idx) => (
                      <Bar key={ticker} dataKey={ticker} stackId="a" fill={STACKED_COLORS[idx % STACKED_COLORS.length]} name={ticker} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'portfolio' && (
        <>
          <div className="bg-gradient-to-br from-blue-600/20 to-indigo-700/10 border border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-4 bg-blue-500/20 rounded-xl">
                <Wallet className="text-blue-400" size={32} />
              </div>
              <div>
                <p className="text-sm text-blue-300 font-semibold uppercase">Valor Total da Carteira</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(portfolioData.totalValue)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <PieIcon size={20} className="text-blue-400" />
                Distribuição por Tipo
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioData.typeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      labelLine={{ stroke: '#64748b' }}
                    >
                      {portfolioData.typeData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FIX #6 - TODOS os ativos */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <BarChart2 size={20} className="text-emerald-400" />
                Todos os Ativos por Valor
              </h3>
              <div className="h-[300px] overflow-y-auto">
                <ResponsiveContainer width="100%" height={Math.max(300, portfolioData.assetData.length * 35)}>
                  <BarChart data={portfolioData.assetData} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={55} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl">
                          <p className="text-slate-400 text-xs mb-1">{data.ticker}</p>
                          <p className="text-sm font-semibold text-emerald-400">{formatCurrency(data.value, data.currency)}</p>
                        </div>
                      );
                    }} />
                    <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FIX #10 - TODOS ativos por dividendos */}
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-amber-400" />
                Todos os Ativos por Dividendos Recebidos
              </h3>
              <div className="h-[400px] overflow-y-auto">
                <ResponsiveContainer width="100%" height={Math.max(400, dividendsByAsset.length * 30)}>
                  <BarChart data={dividendsByAsset} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={55} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Dividendos" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
