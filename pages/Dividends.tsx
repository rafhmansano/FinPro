import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
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

const monthYearToDbFormat = (month: string, year: string): string => `${year}-${month.padStart(2, '0')}-01`;

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color || entry.fill }}>
          {entry.name}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
        </p>
      ))}
    </div>
  );
};

export const Dividends = () => {
  const { dividends, addDividend, deleteItem, assets, bulkInsert } = useFinance();
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

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
      .map(([key, value]) => { const [y, m] = key.split('-'); return { name: `${MONTH_NAMES[parseInt(m) - 1]}/${y.slice(2)}`, value }; });
    const yearlyData = Object.entries(totals.byYear).sort((a, b) => a[0].localeCompare(b[0])).map(([year, value]) => ({ year, value }));
    const typeData = [
      { name: 'Ações', value: totals.byType.ACAO, color: COLORS.primary },
      { name: 'FIIs', value: totals.byType.FII, color: COLORS.warning },
      { name: 'ETFs', value: totals.byType.ETF, color: COLORS.accent }
    ].filter(t => t.value > 0);
    const assetData = Object.entries(totals.byAsset).sort((a, b) => b[1] - a[1]).map(([ticker, value]) => ({ ticker, value }));
    return { monthlyData, yearlyData, typeData, assetData };
  }, [totals]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const totalFiltered = filteredAndSortedDividends.reduce((sum, d) => sum + d.totalValue, 0);
  const totalAll = dividendsWithType.reduce((sum, d) => sum + d.totalValue, 0);

  const handleSort = (field: SortField) => { sortField === field ? setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') : (setSortField(field), setSortOrder('desc')); };
  const SortIcon = ({ field }: { field: SortField }) => sortField !== field ? <ArrowUpDown size={14} className="text-slate-600" /> : sortOrder === 'asc' ? <ArrowUp size={14} className="text-blue-400" /> : <ArrowDown size={14} className="text-blue-400" />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    await addDividend({ ticker: String(data.ticker).toUpperCase(), payment_date: monthYearToDbFormat(formMonth, formYear), total_value: Number(data.totalValue), type: data.type || 'DIVIDENDO' } as any);
    setIsOpen(false); setEditingDividend(null);
  };

  const handleEdit = (d: any) => { setEditingDividend(d); const date = parseLocalDate(d.paymentDate); setFormMonth(String(date.getMonth() + 1).padStart(2, '0')); setFormYear(String(date.getFullYear())); setIsOpen(true); };
  const handleOpenNew = () => { setEditingDividend(null); setFormMonth(String(new Date().getMonth() + 1).padStart(2, '0')); setFormYear(String(new Date().getFullYear())); setIsOpen(true); };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart2 className="text-emerald-500" /> Dividendos & Proventos</h2>
          <p className="text-slate-400 text-sm">Gestão completa de renda passiva</p>
          <div className="flex gap-4 mt-3">
            <div className="text-sm"><span className="text-slate-500">Total Geral:</span><span className="font-bold text-emerald-400 ml-2">{formatCurrency(totalAll)}</span></div>
            {totalFiltered !== totalAll && <div className="text-sm"><span className="text-slate-500">Filtrado:</span><span className="font-bold text-blue-400 ml-2">{formatCurrency(totalFiltered)}</span></div>}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setShowImportModal(true)}><Upload size={18} /> Importar</Button>
          <Button onClick={handleOpenNew}><Plus size={18} /> Adicionar</Button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Tipo</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200">
              <option value="ALL">Todos</option><option value="ACAO">Ações</option><option value="FII">FIIs</option><option value="ETF">ETFs</option>
            </select>
          </div>
          <div><label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Ano</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200">
              <option value="ALL">Todos</option>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Ticker</label>
            <input type="text" value={searchTicker} onChange={(e) => setSearchTicker(e.target.value)} placeholder="Buscar..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200" />
          </div>
          <div><label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Visualização</label>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200">
              <option value="TABLE">Tabela</option><option value="MONTHLY">Mensal</option><option value="YEARLY">Anual</option><option value="BY_ASSET">Por Ativo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[{ label: 'Ações', value: totals.byType.ACAO, color: 'blue', count: dividendsWithType.filter(d => d.assetType === 'ACAO').length },
          { label: 'FIIs', value: totals.byType.FII, color: 'amber', count: dividendsWithType.filter(d => d.assetType === 'FII').length },
          { label: 'ETFs', value: totals.byType.ETF, color: 'purple', count: dividendsWithType.filter(d => d.assetType === 'ETF').length }
        ].map(({ label, value, color, count }) => (
          <div key={label} className={`bg-gradient-to-br from-${color}-500/10 to-${color}-600/5 border border-${color}-500/20 rounded-2xl p-6`}>
            <p className={`text-xs text-${color}-300 font-bold uppercase`}>{label}</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(value)}</p>
            <p className="text-xs text-slate-500">{count} pagamentos</p>
          </div>
        ))}
      </div>

      {viewMode !== 'TABLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {viewMode === 'MONTHLY' && (
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Evolução Mensal</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Recebido" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {viewMode === 'YEARLY' && (
            <>
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Evolução Anual</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Total" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Distribuição por Tipo</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={chartData.typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                      {chartData.typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie><Tooltip formatter={(v: number) => formatCurrency(v)} /></PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
          {viewMode === 'BY_ASSET' && (
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Todos os Ativos</h3>
              <div className="h-[400px] overflow-y-auto">
                <ResponsiveContainer width="100%" height={Math.max(400, chartData.assetData.length * 30)}>
                  <BarChart data={chartData.assetData} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} width={55} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Total" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'TABLE' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase text-xs">
                <tr>
                  <th className="p-5"><button onClick={() => handleSort('paymentDate')} className="flex items-center gap-2 hover:text-white">Mês/Ano <SortIcon field="paymentDate" /></button></th>
                  <th className="p-5"><button onClick={() => handleSort('ticker')} className="flex items-center gap-2 hover:text-white">Ativo <SortIcon field="ticker" /></button></th>
                  <th className="p-5"><button onClick={() => handleSort('assetType')} className="flex items-center gap-2 hover:text-white">Tipo <SortIcon field="assetType" /></button></th>
                  <th className="p-5"><button onClick={() => handleSort('type')} className="flex items-center gap-2 hover:text-white">Categoria <SortIcon field="type" /></button></th>
                  <th className="p-5 text-right"><button onClick={() => handleSort('totalValue')} className="flex items-center gap-2 hover:text-white ml-auto">Valor <SortIcon field="totalValue" /></button></th>
                  <th className="p-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredAndSortedDividends.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/30 group">
                    <td className="p-5 font-mono text-slate-300">{formatMonthYear(d.paymentDate)}</td>
                    <td className="p-5 font-bold text-white">{d.ticker}</td>
                    <td className="p-5"><span className={`text-[10px] px-2 py-1 rounded font-bold ${d.assetType === 'ACAO' ? 'bg-blue-500/10 text-blue-400' : d.assetType === 'FII' ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'}`}>{d.assetType}</span></td>
                    <td className="p-5"><span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{d.type}</span></td>
                    <td className="p-5 text-right font-bold font-mono text-emerald-400">{formatCurrency(d.totalValue)}</td>
                    <td className="p-5 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100">
                        <button onClick={() => handleEdit(d)} className="text-slate-600 hover:text-blue-500 p-2"><Edit2 size={16} /></button>
                        <button onClick={() => { if(confirm('Excluir?')) deleteItem('dividends', d.id!) }} className="text-slate-600 hover:text-rose-500 p-2"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAndSortedDividends.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-500">Nenhum dividendo encontrado.</td></tr>}
              </tbody>
              {filteredAndSortedDividends.length > 0 && (
                <tfoot className="bg-slate-800/50 border-t-2 border-slate-700">
                  <tr><td colSpan={4} className="p-5 text-right font-bold text-slate-300 uppercase text-xs">Total ({filteredAndSortedDividends.length}):</td><td className="p-5 text-right font-mono text-emerald-400 font-bold text-lg">{formatCurrency(totalFiltered)}</td><td></td></tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditingDividend(null); }} title={editingDividend ? "Editar" : "Novo Dividendo"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Ativo" name="ticker" required defaultValue={editingDividend?.ticker}>
            <option value="">Selecione...</option>
            {assets.map(a => <option key={a.id} value={a.ticker}>{a.ticker} - {a.name}</option>)}
          </Select>
          <MonthYearPicker label="Mês/Ano" month={formMonth} year={formYear} onMonthChange={setFormMonth} onYearChange={setFormYear} />
          <Select label="Tipo" name="type" defaultValue={editingDividend?.type || 'DIVIDENDO'}>
            <option value="DIVIDENDO">Dividendo</option><option value="JCP">JCP</option><option value="RENDIMENTO">Rendimento</option>
          </Select>
          <Input label="Valor (R$)" type="number" step="0.01" name="totalValue" required defaultValue={editingDividend?.totalValue} />
          <Button type="submit" className="w-full">{editingDividend ? <><Save size={18} /> Atualizar</> : <><Plus size={18} /> Salvar</>}</Button>
        </form>
      </Modal>

      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportUrl(''); setImportResults(null); }} title="Importar do Google Sheets">
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-xs text-blue-300">Cole o link da planilha com colunas: Ticker, Mês/Ano, Valor</p>
          </div>
          <Input label="Link" placeholder="https://docs.google.com/spreadsheets/d/..." value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
          <Button onClick={() => { setImportResults({ success: true, message: 'Funcionalidade em desenvolvimento' }); }} className="w-full" disabled={!importUrl || isImporting}>
            {isImporting ? 'Processando...' : <><Upload size={18} /> Importar</>}
          </Button>
          {importResults && <div className={`p-4 rounded-xl ${importResults.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{importResults.message}</div>}
        </div>
      </Modal>
    </div>
  );
};
