import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
import { usePrivacy } from '../contexts/PrivacyContext';
import { Button, Modal, Input, Select } from '../components/ui';
import { Plus, Trash2, BarChart2, PieChart as PieIcon, Calendar, TrendingUp, Edit2, Save, Upload, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type FilterType = 'ALL' | 'ACAO' | 'FII' | 'ETF';
type ViewMode = 'TABLE' | 'MONTHLY' | 'YEARLY' | 'BY_ASSET';
type SortField = 'paymentDate' | 'ticker' | 'type' | 'assetType' | 'totalValue';
type SortOrder = 'asc' | 'desc';

const COLORS = { primary: '#3b82f6', secondary: '#64748b', success: '#10b981', warning: '#f59e0b', accent: '#6366f1' };
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day || 1, 12, 0, 0);
};

const formatMonthYear = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = parseLocalDate(dateStr);
  return `${MONTH_NAMES[date.getMonth()]}/${date.getFullYear()}`;
};

const MonthYearPicker = ({ label, month, year, onMonthChange, onYearChange }: any) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <select value={month} onChange={(e) => onMonthChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200">
          {MONTH_NAMES_FULL.map((name, idx) => <option key={idx} value={String(idx + 1).padStart(2, '0')}>{name}</option>)}
        </select>
        <select value={year} onChange={(e) => onYearChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200">
          {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>
    </div>
  );
};

export const Dividends = () => {
  const { dividends, addDividend, deleteItem, assets } = useFinance();
  const { formatCurrency, isHidden } = usePrivacy();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingDividend, setEditingDividend] = useState<any>(null);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [searchTicker, setSearchTicker] = useState('');
  const [formMonth, setFormMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [formYear, setFormYear] = useState(String(new Date().getFullYear()));
  const [sortField, setSortField] = useState<SortField>('paymentDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-2">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-sm font-semibold" style={{ color: entry.color || entry.fill }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  const getAssetType = (ticker: string): 'ACAO' | 'FII' | 'ETF' => {
    if (!ticker) return 'ACAO';
    const t = ticker.toUpperCase().trim();
    const etfs = ['BOVA11', 'IVVB11', 'SMAL11', 'HASH11', 'QBTC11', 'TFLO'];
    if (etfs.includes(t)) return 'ETF';
    const units = ['TAEE11', 'SAPR11', 'ALUP11', 'ENGI11', 'SANB11', 'BPAC11', 'KLBN11'];
    if (units.includes(t)) return 'ACAO';
    const asset = assets.find(a => a.ticker?.toUpperCase() === t);
    if (asset?.type === 'FII') return 'FII';
    if (asset?.type === 'ETF') return 'ETF';
    if (t.endsWith('11') && t.length === 6) return 'FII';
    return 'ACAO';
  };

  const dividendsWithType = useMemo(() => {
    return dividends
      .filter((d, i, self) => i === self.findIndex(t => t.id === d.id))
      .filter(d => (d.payment_date || d.paymentDate) && d.ticker && (d.total_value || d.totalValue))
      .map(d => {
        const paymentDate = d.payment_date || d.paymentDate || '';
        const date = parseLocalDate(paymentDate);
        return {
          id: d.id, ticker: d.ticker, type: d.type || 'DIVIDENDO', paymentDate,
          totalValue: Number(d.total_value || d.totalValue || 0),
          assetType: getAssetType(d.ticker),
          year: String(date.getFullYear()),
          month: String(date.getMonth() + 1).padStart(2, '0')
        };
      });
  }, [dividends, assets]);

  const filteredAndSortedDividends = useMemo(() => {
    return dividendsWithType
      .filter(d => (filterType === 'ALL' || d.assetType === filterType) && (filterYear === 'ALL' || d.year === filterYear) && (!searchTicker || d.ticker.toLowerCase().includes(searchTicker.toLowerCase())))
      .sort((a, b) => {
        const aVal = sortField === 'totalValue' ? a.totalValue : (a as any)[sortField];
        const bVal = sortField === 'totalValue' ? b.totalValue : (b as any)[sortField];
        return sortOrder === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
      });
  }, [dividendsWithType, filterType, filterYear, searchTicker, sortField, sortOrder]);

  const availableYears = useMemo(() => [...new Set(dividendsWithType.map(d => d.year))].sort().reverse(), [dividendsWithType]);

  const totals = useMemo(() => {
    const byType: Record<string, number> = { ACAO: 0, FII: 0, ETF: 0 };
    const byYear: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const byAsset: Record<string, number> = {};
    filteredAndSortedDividends.forEach(d => {
      byType[d.assetType] += d.totalValue;
      byYear[d.year] = (byYear[d.year] || 0) + d.totalValue;
      byMonth[`${d.year}-${d.month}`] = (byMonth[`${d.year}-${d.month}`] || 0) + d.totalValue;
      byAsset[d.ticker] = (byAsset[d.ticker] || 0) + d.totalValue;
    });
    return { byType, byYear, byMonth, byAsset };
  }, [filteredAndSortedDividends]);

  const chartData = useMemo(() => {
    const monthlyData = Object.entries(totals.byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
      .map(([key, value]) => { const [y, m] = key.split('-'); return { name: `${MONTH_NAMES[parseInt(m) - 1]}/${y.slice(2)}`, value: isHidden ? 0 : value }; });
    const yearlyData = Object.entries(totals.byYear).sort((a, b) => a[0].localeCompare(b[0])).map(([year, value]) => ({ year, value: isHidden ? 0 : value }));
    const typeData = [
      { name: 'Ações', value: isHidden ? 0 : totals.byType.ACAO, color: COLORS.primary },
      { name: 'FIIs', value: isHidden ? 0 : totals.byType.FII, color: COLORS.warning },
      { name: 'ETFs', value: isHidden ? 0 : totals.byType.ETF, color: COLORS.accent }
    ].filter(t => t.value > 0 || isHidden);
    const assetData = Object.entries(totals.byAsset).sort((a, b) => b[1] - a[1]).map(([ticker, value]) => ({ ticker, value: isHidden ? 0 : value }));
    return { monthlyData, yearlyData, typeData, assetData };
  }, [totals, isHidden]);

  const totalFiltered = filteredAndSortedDividends.reduce((sum, d) => sum + d.totalValue, 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-slate-600" />;
    return sortOrder === 'asc' ? <ArrowUp size={14} className="text-blue-400" /> : <ArrowDown size={14} className="text-blue-400" />;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const paymentDate = `${formYear}-${formMonth}-15`;
    
    await addDividend({
      ticker: String(data.ticker).toUpperCase(),
      type: String(data.type),
      total_value: Number(data.totalValue),
      payment_date: paymentDate
    } as any);
    
    setIsOpen(false);
    setEditingDividend(null);
  };

  const handleEdit = (dividend: any) => {
    setEditingDividend(dividend);
    setFormMonth(dividend.month);
    setFormYear(dividend.year);
    setIsOpen(true);
  };

  const handleOpenNew = () => {
    setEditingDividend(null);
    setFormMonth(String(new Date().getMonth() + 1).padStart(2, '0'));
    setFormYear(String(new Date().getFullYear()));
    setIsOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-emerald-500" /> Dividendos
          </h2>
          <p className="text-slate-400 text-sm">Histórico e análise de proventos recebidos</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus size={18} /> Novo Dividendo
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <TrendingUp className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-emerald-300 font-semibold uppercase">Total Filtrado</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalFiltered)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <BarChart2 className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-blue-300 font-semibold uppercase">Ações</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totals.byType.ACAO)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <PieIcon className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-amber-300 font-semibold uppercase">FIIs</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totals.byType.FII)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Calendar className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-purple-300 font-semibold uppercase">ETFs</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totals.byType.ETF)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Views */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Buscar Ticker</label>
            <input
              type="text"
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              placeholder="Ex: PETR4"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo de Ativo</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200">
              <option value="ALL">Todos</option>
              <option value="ACAO">Ações</option>
              <option value="FII">FIIs</option>
              <option value="ETF">ETFs</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Ano</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200">
              <option value="ALL">Todos</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 mb-1 block">Visualização</label>
            <div className="flex gap-2">
              {(['TABLE', 'MONTHLY', 'YEARLY', 'BY_ASSET'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === mode ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  {mode === 'TABLE' ? 'Tabela' : mode === 'MONTHLY' ? 'Mensal' : mode === 'YEARLY' ? 'Anual' : 'Por Ativo'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      {viewMode !== 'TABLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {viewMode === 'MONTHLY' && (
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Dividendos Mensais (Últimos 12 meses)</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Dividendos" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {viewMode === 'YEARLY' && (
            <>
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Dividendos por Ano</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Dividendos" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Distribuição por Tipo</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData.typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => isHidden ? name : `${name} ${(percent * 100).toFixed(1)}%`}>
                        {chartData.typeData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {viewMode === 'BY_ASSET' && (
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Dividendos por Ativo</h3>
              <div className="h-[400px] overflow-y-auto">
                <ResponsiveContainer width="100%" height={Math.max(400, chartData.assetData.length * 30)}>
                  <BarChart data={chartData.assetData} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={55} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Dividendos" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela */}
      {viewMode === 'TABLE' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-white">Histórico de Dividendos</h3>
            <span className="text-sm text-slate-500">{isHidden ? '•••' : filteredAndSortedDividends.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase text-xs">
                <tr>
                  <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('paymentDate')}>
                    <div className="flex items-center gap-2">Pagamento <SortIcon field="paymentDate" /></div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('ticker')}>
                    <div className="flex items-center gap-2">Ticker <SortIcon field="ticker" /></div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('assetType')}>
                    <div className="flex items-center gap-2">Classe <SortIcon field="assetType" /></div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-2">Tipo <SortIcon field="type" /></div>
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('totalValue')}>
                    <div className="flex items-center gap-2 justify-end">Valor <SortIcon field="totalValue" /></div>
                  </th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredAndSortedDividends.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/30 group">
                    <td className="p-4 font-mono text-slate-300">{formatMonthYear(d.paymentDate)}</td>
                    <td className="p-4 font-bold text-white">{d.ticker}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded font-bold ${d.assetType === 'ACAO' ? 'bg-blue-500/10 text-blue-400' : d.assetType === 'FII' ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        {d.assetType}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{d.type}</td>
                    <td className="p-4 text-right font-bold text-emerald-400 font-mono">{formatCurrency(d.totalValue)}</td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100">
                        <button onClick={() => handleEdit(d)} className="text-slate-600 hover:text-blue-500 p-2"><Edit2 size={16} /></button>
                        <button onClick={() => deleteItem('dividends', d.id!)} className="text-slate-600 hover:text-rose-500 p-2"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAndSortedDividends.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-500">Nenhum dividendo encontrado com os filtros aplicados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditingDividend(null); }} title={editingDividend ? "Editar Dividendo" : "Novo Dividendo"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Ticker" name="ticker" placeholder="Ex: PETR4" required defaultValue={editingDividend?.ticker} />
          <Select label="Tipo" name="type" defaultValue={editingDividend?.type || 'DIVIDENDO'}>
            <option value="DIVIDENDO">Dividendo</option>
            <option value="JCP">JCP</option>
            <option value="RENDIMENTO">Rendimento</option>
          </Select>
          <MonthYearPicker label="Mês/Ano do Pagamento" month={formMonth} year={formYear} onMonthChange={setFormMonth} onYearChange={setFormYear} />
          <Input label="Valor Total (R$)" name="totalValue" type="number" step="0.01" placeholder="Ex: 150.00" required defaultValue={editingDividend?.totalValue} />
          <Button type="submit" className="w-full">
            {editingDividend ? <><Save size={18} /> Atualizar</> : <><Plus size={18} /> Adicionar</>}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
