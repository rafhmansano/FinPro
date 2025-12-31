import React, { useMemo, useState } from 'react';
import { useFinance } from '../context';
import { Card } from '../components/ui';
import { 
  Wallet, TrendingUp, DollarSign, Activity, 
  Calendar, Target, Layers, PieChart as PieChartIcon,
  BarChart3, LineChart as LineChartIcon, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar, ComposedChart, Line, ReferenceLine
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

// Cores do tema
const COLORS = {
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  secondary: '#10b981',
  secondaryLight: '#34d399',
  accent: '#f59e0b',
  accentLight: '#fbbf24',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  gray: '#475569',
  grayLight: '#64748b',
  grayDark: '#334155',
  background: '#0f172a',
  cardBg: '#1e293b',
};

const ASSET_COLORS: Record<string, string> = {
  'ACAO': COLORS.primary,
  'FII': COLORS.accent,
  'ETF': COLORS.purple,
  'RENDA_FIXA': COLORS.secondary,
  'CRIPT': COLORS.pink,
};

// Formatador de moeda
const formatCurrency = (val: number) => {
  if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

const formatPercent = (val: number) => {
  if (val === null || val === undefined || isNaN(val)) return '0,00%';
  return `${val >= 0 ? '+' : ''}${val.toFixed(2).replace('.', ',')}%`;
};

// Tooltip customizado
const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl">
      <p className="text-slate-400 text-xs font-medium mb-2 border-b border-slate-700 pb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-300 text-xs">{entry.name}</span>
            </div>
            <span className="text-white font-mono text-sm font-semibold">
              {valuePrefix}{typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}{valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Tooltip para porcentagem
const PercentTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl">
      <p className="text-slate-400 text-xs font-medium mb-2 border-b border-slate-700 pb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-300 text-xs">{entry.name}</span>
            </div>
            <span className="text-white font-mono text-sm font-semibold">
              {entry.dataKey === 'growth' || entry.dataKey === 'crescimento' 
                ? formatPercent(entry.value) 
                : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { portfolio, dividends, assets, trades } = useFinance();
  const [activeTab, setActiveTab] = useState<'dividendos' | 'carteira'>('dividendos');

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
  
  // Calcula total de dividendos
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
    const byType: Record<string, Record<string, number>> = {};
    const quarters: Record<string, Record<string, number>> = {};
    const semesters: Record<string, Record<string, number>> = {};
    
    if (!dividends || dividends.length === 0) {
      return { 
        monthlyArray: [], 
        yearlyArray: [], 
        growthArray: [], 
        stackedMonthlyArray: [],
        byTypeArray: [],
        quarterlyArray: [],
        semesterArray: [],
        allTickers: []
      };
    }

    const allTickers = new Set<string>();

    dividends.forEach(d => {
      const paymentDate = d.payment_date || d.paymentDate;
      if (!paymentDate) return;
      
      const date = new Date(paymentDate);
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthName = monthNames[monthIdx];
      const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const quarterNum = Math.ceil((monthIdx + 1) / 3);
      const quarter = `Q${quarterNum}`;
      const semester = monthIdx < 6 ? 'S1' : 'S2';
      const type = getAssetType(d.ticker);
      
      const val = d.total_value !== undefined ? Number(d.total_value) : Number(d.totalValue || 0);
      if (isNaN(val)) return;

      allTickers.add(d.ticker);

      const yearGoals = DIVIDEND_GOALS[year] || { yearly: 0, monthly: 0 };
      
      // Mensal
      if (!months[monthKey]) months[monthKey] = { 
        name: monthKey, 
        label: `${monthName}/${String(year).slice(2)}`, 
        fullLabel: `${monthName}/${year}`,
        value: 0, 
        meta: yearGoals.monthly 
      };
      months[monthKey].value += val;

      // Contribuição por ativo por mês
      if (!assetContribution[monthKey]) assetContribution[monthKey] = { 
        name: `${monthName}/${String(year).slice(2)}`,
        fullName: `${monthName}/${year}`
      };
      assetContribution[monthKey][d.ticker] = (assetContribution[monthKey][d.ticker] || 0) + val;

      // Anual
      if (!years[year]) years[year] = { 
        year, 
        value: 0, 
        meta: yearGoals.yearly,
        Q1: 0, Q2: 0, Q3: 0, Q4: 0,
        S1: 0, S2: 0,
        ACAO: 0, FII: 0, ETF: 0
      };
      years[year].value += val;
      years[year][quarter] += val;
      years[year][semester] += val;
      years[year][type] = (years[year][type] || 0) + val;

      // Por tipo por ano
      if (!byType[year]) byType[year] = { year: year, FII: 0, ACAO: 0, ETF: 0 };
      byType[year][type] = (byType[year][type] || 0) + val;

      // Trimestral
      const quarterKey = `${year}-${quarter}`;
      if (!quarters[quarterKey]) quarters[quarterKey] = { name: quarter, year: year };
      if (!quarters[quarterKey][year]) quarters[quarterKey][year] = 0;
      quarters[quarterKey][year] += val;

      // Semestral
      const semesterKey = `${year}-${semester}`;
      if (!semesters[semesterKey]) semesters[semesterKey] = { name: semester, year: year };
      if (!semesters[semesterKey][year]) semesters[semesterKey][year] = 0;
      semesters[semesterKey][year] += val;
    });

    const monthlyArray = Object.values(months).sort((a: any, b: any) => a.name.localeCompare(b.name));
    const yearlyArray = Object.values(years).sort((a: any, b: any) => a.year - b.year);
    const stackedMonthlyArray = Object.values(assetContribution);
    const byTypeArray = Object.values(byType).sort((a: any, b: any) => a.year - b.year);

    // Crescimento anual
    const growthArray = yearlyArray.map((curr: any, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1].value : 0;
      const growth = prev > 0 ? ((curr.value - prev) / prev) * 100 : 0;
      const metaAchievement = curr.meta > 0 ? ((curr.value / curr.meta) * 100) : 0;
      return { 
        ...curr, 
        growth: Number(growth.toFixed(2)),
        crescimento: Number(growth.toFixed(2)),
        metaAchievement: Number(metaAchievement.toFixed(1))
      };
    });

    // Trimestral formatado
    const quarterlyData: Record<string, any> = { Q1: {}, Q2: {}, Q3: {}, Q4: {} };
    yearlyArray.forEach((y: any) => {
      quarterlyData.Q1[y.year] = y.Q1;
      quarterlyData.Q2[y.year] = y.Q2;
      quarterlyData.Q3[y.year] = y.Q3;
      quarterlyData.Q4[y.year] = y.Q4;
    });
    
    const years_list = yearlyArray.map((y: any) => y.year);
    const quarterlyArray = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
      const obj: any = { name: q };
      years_list.forEach(y => {
        obj[y] = quarterlyData[q][y] || 0;
      });
      return obj;
    });

    // Semestral formatado
    const semesterData: Record<string, any> = { S1: {}, S2: {} };
    yearlyArray.forEach((y: any) => {
      semesterData.S1[y.year] = y.S1;
      semesterData.S2[y.year] = y.S2;
    });
    
    const semesterArray = ['S1', 'S2'].map(s => {
      const obj: any = { name: s };
      years_list.forEach(y => {
        obj[y] = semesterData[s][y] || 0;
      });
      return obj;
    });

    return { 
      monthlyArray, 
      yearlyArray, 
      growthArray, 
      stackedMonthlyArray,
      byTypeArray,
      quarterlyArray,
      semesterArray,
      allTickers: Array.from(allTickers),
      years: years_list
    };
  }, [dividends, assets]);

  // Dados da carteira por tipo
  const portfolioByType = useMemo(() => {
    const byType: Record<string, { value: number; count: number }> = {};
    
    portfolioData.forEach(asset => {
      const type = asset.type || 'ACAO';
      if (!byType[type]) byType[type] = { value: 0, count: 0 };
      byType[type].value += asset.marketValue;
      byType[type].count += 1;
    });

    return Object.entries(byType).map(([type, data]) => ({
      name: type === 'ACAO' ? 'Ações' : type === 'FII' ? 'FIIs' : type === 'ETF' ? 'ETFs' : type === 'RENDA_FIXA' ? 'Renda Fixa' : type,
      value: data.value,
      count: data.count,
      color: ASSET_COLORS[type] || COLORS.gray,
      percent: totalEquity > 0 ? (data.value / totalEquity * 100) : 0
    })).filter(t => t.value > 0);
  }, [portfolioData, totalEquity]);

  // Dados da carteira por setor
  const portfolioBySector = useMemo(() => {
    const bySector: Record<string, number> = {};
    
    portfolioData.forEach(asset => {
      const sector = asset.sector || 'Outros';
      bySector[sector] = (bySector[sector] || 0) + asset.marketValue;
    });

    const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.purple, COLORS.pink, COLORS.cyan, COLORS.grayLight];
    
    return Object.entries(bySector)
      .map(([sector, value], idx) => ({
        name: sector,
        value,
        color: colors[idx % colors.length],
        percent: totalEquity > 0 ? (value / totalEquity * 100) : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [portfolioData, totalEquity]);

  // Top 10 ativos
  const topAssets = useMemo(() => {
    return [...portfolioData]
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 10)
      .map(a => ({
        ticker: a.ticker,
        value: a.marketValue,
        percent: totalEquity > 0 ? (a.marketValue / totalEquity * 100) : 0
      }));
  }, [portfolioData, totalEquity]);

  // Anos únicos para gráficos
  const uniqueYears = analytics.years || [];
  const yearColors = [
    COLORS.grayDark, COLORS.gray, COLORS.primary, COLORS.primaryLight, 
    COLORS.secondary, COLORS.secondaryLight, COLORS.accent, COLORS.purple
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-8">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-2">
            Dashboard <span className="text-blue-500">Financeiro</span>
          </h2>
          <p className="text-slate-400 font-medium">Visão completa de dividendos e patrimônio.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
            <Calendar size={18} className="text-blue-400" />
            <span className="text-sm font-bold text-slate-300 uppercase">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card 
          title="Patrimônio Total" 
          value={formatCurrency(totalEquity)} 
          icon={Wallet} 
          trend={totalGainLoss >= 0 ? 'up' : 'down'}
          subtext={`${formatPercent(totalGainLossPerc)} vs custo`}
        />
        <Card 
          title="Dividendos Acumulados" 
          value={formatCurrency(totalDividends)} 
          icon={DollarSign} 
          trend="up" 
          className="bg-emerald-500/5 border-emerald-500/20"
          subtext={`${dividends.length} pagamentos`}
        />
        <Card 
          title="Média Mensal" 
          value={formatCurrency(analytics.monthlyArray.length > 0 ? totalDividends / analytics.monthlyArray.length : 0)} 
          icon={Activity}
          subtext={`${analytics.monthlyArray.length} meses`}
        />
        <Card 
          title="Yield on Cost" 
          value={`${totalCost > 0 ? ((totalDividends / totalCost) * 100).toFixed(2) : '0.00'}%`} 
          icon={TrendingUp} 
          trend="up"
          subtext="Retorno sobre investimento"
        />
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('dividendos')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'dividendos'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DollarSign size={16} className="inline mr-2" />
          Dividendos
        </button>
        <button
          onClick={() => setActiveTab('carteira')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'carteira'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PieChartIcon size={16} className="inline mr-2" />
          Carteira
        </button>
      </div>

      {activeTab === 'dividendos' && (
        <div className="space-y-8">
          {/* ROW 1: Mensal vs Meta + Anual vs Meta */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dividendo Mensal Real vs Meta */}
            <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-400" />
                  Dividendo mensal real vs. meta
                </h4>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlyArray.slice(-24)} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Realizado" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="meta" name="Meta" fill={COLORS.grayDark} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dividendo Anual Realizado vs Meta */}
            <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target size={18} className="text-emerald-400" />
                  Dividendo anual realizado vs. meta
                </h4>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.yearlyArray} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="year" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      iconType="circle" 
                      iconSize={8}
                      wrapperStyle={{ paddingTop: '10px' }}
                    />
                    <Bar dataKey="value" name="Realizado" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="meta" name="Meta" fill={COLORS.grayDark} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROW 2: Evolução Anual + Crescimento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução Anual */}
            <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-cyan-400" />
                  Evolução anual
                </h4>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.yearlyArray}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="year" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="value" 
                      name="Total" 
                      fill={COLORS.primary}
                      radius={[4, 4, 0, 0]}
                    >
                      {analytics.yearlyArray.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`rgba(59, 130, 246, ${0.4 + (index / analytics.yearlyArray.length) * 0.6})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Crescimento Anual */}
            <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <LineChartIcon size={18} className="text-rose-400" />
                  Crescimento anual dos dividendos
                </h4>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.growthArray}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="year" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<PercentTooltip />} />
                    <Legend iconType="circle" iconSize={8} />
                    <Bar 
                      yAxisId="left"
                      dataKey="value" 
                      name="Valor" 
                      fill={COLORS.primaryLight}
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="crescimento" 
                      name="Crescimento"
                      stroke="#f43f5e" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROW 3: Semestral + Trimestral */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução Semestral */}
            <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-amber-400" />
                  Evolução semestral
                </h4>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.semesterArray} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="square" iconSize={10} />
                    {uniqueYears.slice(-6).map((year, idx) => (
                      <Bar 
                        key={year} 
                        dataKey={year} 
                        name={String(year)}
                        fill={yearColors[idx % yearColors.length]}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolução Trimestral */}
            <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-purple-400" />
                  Evolução trimestral
                </h4>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.quarterlyArray} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="square" iconSize={10} />
                    {uniqueYears.slice(-6).map((year, idx) => (
                      <Bar 
                        key={year} 
                        dataKey={year} 
                        name={String(year)}
                        fill={yearColors[idx % yearColors.length]}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROW 4: Por Tipo de Ativo */}
          <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChartIcon size={18} className="text-amber-400" />
                Recebidos por tipo de ativo
              </h4>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byTypeArray} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="year" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={10} />
                  <Bar dataKey="FII" name="FIIs" fill={COLORS.accent} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="ACAO" name="Ações" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="ETF" name="ETFs" fill={COLORS.purple} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROW 5: Distribuição por Ativo (Stacked) */}
          <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-indigo-400" />
                Distribuição mensal por ativo
              </h4>
              <span className="text-xs text-slate-500">Últimos 24 meses</span>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.stackedMonthlyArray.slice(-24)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => `${(v/1000).toFixed(1)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} />
                  {analytics.allTickers.slice(0, 10).map((ticker, idx) => (
                    <Area 
                      key={ticker}
                      type="monotone"
                      dataKey={ticker}
                      stackId="1"
                      stroke={[COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.purple, COLORS.pink, COLORS.cyan, COLORS.grayLight, '#ef4444', '#84cc16', '#14b8a6'][idx % 10]}
                      fill={[COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.purple, COLORS.pink, COLORS.cyan, COLORS.grayLight, '#ef4444', '#84cc16', '#14b8a6'][idx % 10]}
                      fillOpacity={0.6}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'carteira' && (
        <div className="space-y-8">
          {/* ROW 1: Por Tipo + Por Setor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por Tipo de Ativo */}
            <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieChartIcon size={18} className="text-blue-400" />
                  Distribuição por tipo
                </h4>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${percent.toFixed(1)}%`}
                      labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                    >
                      {portfolioByType.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl">
                            <p className="text-white font-semibold mb-2">{data.name}</p>
                            <p className="text-slate-300 text-sm">{formatCurrency(data.value)}</p>
                            <p className="text-slate-400 text-xs mt-1">{data.count} ativos • {data.percent.toFixed(1)}%</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {portfolioByType.map((type, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: type.color }}
                    />
                    <div className="flex-1">
                      <p className="text-xs text-slate-400">{type.name}</p>
                      <p className="text-sm font-bold text-white">{formatCurrency(type.value)}</p>
                    </div>
                    <span className="text-xs text-slate-500">{type.percent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Por Setor */}
            <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-emerald-400" />
                  Distribuição por setor
                </h4>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioBySector}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name.substring(0, 10)}${name.length > 10 ? '...' : ''} ${percent.toFixed(1)}%`}
                      labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                    >
                      {portfolioBySector.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl">
                            <p className="text-white font-semibold mb-2">{data.name}</p>
                            <p className="text-slate-300 text-sm">{formatCurrency(data.value)}</p>
                            <p className="text-slate-400 text-xs mt-1">{data.percent.toFixed(1)}% do portfólio</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {portfolioBySector.slice(0, 5).map((sector, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: sector.color }}
                    />
                    <span className="text-sm text-slate-300 flex-1">{sector.name}</span>
                    <span className="text-sm font-mono text-white">{formatCurrency(sector.value)}</span>
                    <span className="text-xs text-slate-500 w-12 text-right">{sector.percent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 2: Top Ativos */}
          <div className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-purple-400" />
                Top 10 ativos por valor
              </h4>
              <span className="text-xs text-slate-500">Ordenado por valor de mercado</span>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAssets} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                  <XAxis 
                    type="number" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="ticker" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }}
                    width={70}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl">
                          <p className="text-white font-bold mb-2">{data.ticker}</p>
                          <p className="text-slate-300 text-sm">{formatCurrency(data.value)}</p>
                          <p className="text-slate-400 text-xs mt-1">{data.percent.toFixed(2)}% do portfólio</p>
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill={COLORS.primary}
                    radius={[0, 6, 6, 0]}
                    background={{ fill: '#1e293b', radius: [0, 6, 6, 0] }}
                  >
                    {topAssets.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`rgba(59, 130, 246, ${1 - (index * 0.08)})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROW 3: Resumo Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Total Ações</p>
              <p className="text-xl font-bold text-blue-400">{formatCurrency(portfolioByType.find(t => t.name === 'Ações')?.value || 0)}</p>
              <p className="text-xs text-slate-500 mt-1">{portfolioByType.find(t => t.name === 'Ações')?.count || 0} ativos</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Total FIIs</p>
              <p className="text-xl font-bold text-amber-400">{formatCurrency(portfolioByType.find(t => t.name === 'FIIs')?.value || 0)}</p>
              <p className="text-xs text-slate-500 mt-1">{portfolioByType.find(t => t.name === 'FIIs')?.count || 0} fundos</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Total ETFs</p>
              <p className="text-xl font-bold text-purple-400">{formatCurrency(portfolioByType.find(t => t.name === 'ETFs')?.value || 0)}</p>
              <p className="text-xs text-slate-500 mt-1">{portfolioByType.find(t => t.name === 'ETFs')?.count || 0} fundos</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Setores</p>
              <p className="text-xl font-bold text-emerald-400">{portfolioBySector.length}</p>
              <p className="text-xs text-slate-500 mt-1">diversificação</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
