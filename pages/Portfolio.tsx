import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
import { usePrivacy } from '../contexts/PrivacyContext';
import { Button, Modal, Input, Select } from '../components/ui';
import { Plus, Trash2, Edit2, Save, Briefcase, TrendingUp, TrendingDown, PieChart as PieIcon, RefreshCw, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = { primary: '#3b82f6', secondary: '#64748b', success: '#10b981', warning: '#f59e0b', accent: '#6366f1', danger: '#ef4444' };

export const Portfolio = () => {
  const { portfolio, assets, updateQuotes, quotesLoading, addAsset, updateAsset, deleteItem } = useFinance();
  const { formatCurrency, formatPercent, formatNumber, isHidden } = usePrivacy();
  
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const currencies = [
    { code: 'BRL', name: 'Real (R$)', symbol: 'R$' },
    { code: 'USD', name: 'Dólar (US$)', symbol: '$' }
  ];

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const filteredPortfolio = useMemo(() => {
    if (filterType === 'ALL') return portfolio;
    return portfolio.filter(p => p.type === filterType);
  }, [portfolio, filterType]);

  const totals = useMemo(() => {
    const brl = portfolio.filter(p => p.currency === 'BRL' || !p.currency);
    const usd = portfolio.filter(p => p.currency === 'USD');

    const totalCostBRL = brl.reduce((sum, p) => sum + p.totalCost, 0);
    const marketValueBRL = brl.reduce((sum, p) => sum + p.marketValue, 0);
    const gainLossBRL = marketValueBRL - totalCostBRL;
    const gainLossPercentBRL = totalCostBRL > 0 ? (gainLossBRL / totalCostBRL) * 100 : 0;

    const totalCostUSD = usd.reduce((sum, p) => sum + p.totalCost, 0);
    const marketValueUSD = usd.reduce((sum, p) => sum + p.marketValue, 0);
    const gainLossUSD = marketValueUSD - totalCostUSD;
    const gainLossPercentUSD = totalCostUSD > 0 ? (gainLossUSD / totalCostUSD) * 100 : 0;

    return {
      brl: { totalCost: totalCostBRL, marketValue: marketValueBRL, gainLoss: gainLossBRL, gainLossPercent: gainLossPercentBRL },
      usd: { totalCost: totalCostUSD, marketValue: marketValueUSD, gainLoss: gainLossUSD, gainLossPercent: gainLossPercentUSD }
    };
  }, [portfolio]);

  const totalsByType = useMemo(() => {
    const totals: Record<string, { marketValue: number; gainLoss: number; count: number }> = {
      ACAO: { marketValue: 0, gainLoss: 0, count: 0 },
      FII: { marketValue: 0, gainLoss: 0, count: 0 },
      ETF: { marketValue: 0, gainLoss: 0, count: 0 },
      RENDA_FIXA: { marketValue: 0, gainLoss: 0, count: 0 }
    };

    portfolio.forEach(p => {
      if (totals[p.type]) {
        totals[p.type].marketValue += p.marketValue;
        totals[p.type].gainLoss += p.gainLoss;
        totals[p.type].count++;
      }
    });

    return totals;
  }, [portfolio]);

  const pieData = useMemo(() => {
    return [
      { name: 'Ações', value: isHidden ? 0 : totalsByType.ACAO.marketValue, color: COLORS.primary },
      { name: 'FIIs', value: isHidden ? 0 : totalsByType.FII.marketValue, color: COLORS.warning },
      { name: 'ETFs', value: isHidden ? 0 : totalsByType.ETF.marketValue, color: COLORS.accent },
      { name: 'Renda Fixa', value: isHidden ? 0 : totalsByType.RENDA_FIXA.marketValue, color: COLORS.success }
    ].filter(d => d.value > 0 || isHidden);
  }, [totalsByType, isHidden]);

  const handleUpdateQuotes = async () => {
    const result = await updateQuotes();
    setLastUpdate(new Date());
    
    if (result.failed > 0) {
      alert(`Cotações atualizadas!\n✓ Sucesso: ${result.success}\n✗ Falhas: ${result.failed}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const assetData = {
      ticker: String(data.ticker).toUpperCase(),
      name: String(data.name),
      type: String(data.type),
      sector: String(data.sector) || null,
      currency: String(data.currency) || 'BRL',
      quantity: Number(data.quantity) || 0,
      avg_price: Number(data.avgPrice) || 0
    };

    if (editingAsset) {
      await updateAsset(editingAsset.id, assetData);
    } else {
      await addAsset(assetData as any);
    }

    setShowAssetModal(false);
    setEditingAsset(null);
  };

  const handleEdit = (asset: any) => {
    const fullAsset = assets.find(a => a.id === asset.id);
    setEditingAsset(fullAsset || asset);
    setShowAssetModal(true);
  };

  const handleOpenNew = () => {
    setEditingAsset(null);
    setShowAssetModal(true);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-1">{data.ticker || data.name}</p>
        <p className="text-sm font-semibold text-emerald-400">
          {formatCurrency(data.value || data.marketValue, data.currency)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="text-blue-500" /> Minha Carteira
          </h2>
          <p className="text-slate-400 text-sm">Posições atualizadas com cotações em tempo real</p>
          {lastUpdate && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <Clock size={12} />
              Última atualização: {formatDate(lastUpdate.toISOString())}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            onClick={handleUpdateQuotes} 
            disabled={quotesLoading}
          >
            <RefreshCw size={18} className={quotesLoading ? 'animate-spin' : ''} />
            {quotesLoading ? 'Atualizando...' : 'Atualizar Cotações'}
          </Button>
          <Button onClick={handleOpenNew}>
            <Plus size={18} /> Novo Ativo
          </Button>
        </div>
      </div>

      {/* Cards de Totais - BRL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Briefcase className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-blue-300 font-semibold uppercase">Investido (BRL)</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totals.brl.totalCost)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <TrendingUp className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-emerald-300 font-semibold uppercase">Valor Atual (BRL)</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totals.brl.marketValue)}</p>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${totals.brl.gainLoss >= 0 ? 'from-green-600/20 to-green-700/10 border-green-500/20' : 'from-red-600/20 to-red-700/10 border-red-500/20'} border rounded-2xl p-6`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-3 ${totals.brl.gainLoss >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-xl`}>
              {totals.brl.gainLoss >= 0 ? <TrendingUp className="text-green-400" size={24} /> : <TrendingDown className="text-red-400" size={24} />}
            </div>
            <div>
              <p className={`text-xs ${totals.brl.gainLoss >= 0 ? 'text-green-300' : 'text-red-300'} font-semibold uppercase`}>Ganho/Perda (BRL)</p>
              <p className={`text-2xl font-bold ${totals.brl.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(totals.brl.gainLoss)}
              </p>
            </div>
          </div>
          <p className={`text-sm ${totals.brl.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'} font-mono`}>
            {formatPercent(totals.brl.gainLossPercent, true)}
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <p className="text-xs text-slate-400 font-semibold uppercase">Posições Ativas</p>
          <p className="text-3xl font-bold text-white">{isHidden ? '•••' : portfolio.length}</p>
          <p className="text-xs text-slate-500 mt-2">
            {isHidden ? '••• Ações • ••• FIIs • ••• ETFs • ••• RF' : `${totalsByType.ACAO.count} Ações • ${totalsByType.FII.count} FIIs • ${totalsByType.ETF.count} ETFs • ${totalsByType.RENDA_FIXA.count} RF`}
          </p>
        </div>
      </div>

      {/* Cards USD */}
      {totals.usd.marketValue > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <p className="text-xs text-slate-400 font-semibold uppercase">Investido (USD)</p>
            <p className="text-xl font-bold text-white">{formatCurrency(totals.usd.totalCost, 'USD')}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <p className="text-xs text-slate-400 font-semibold uppercase">Valor Atual (USD)</p>
            <p className="text-xl font-bold text-white">{formatCurrency(totals.usd.marketValue, 'USD')}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <p className={`text-xs ${totals.usd.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold uppercase`}>Ganho/Perda (USD)</p>
            <p className={`text-xl font-bold ${totals.usd.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(totals.usd.gainLoss, 'USD')} ({formatPercent(totals.usd.gainLossPercent, true)})
            </p>
          </div>
        </div>
      )}

      {/* Filtro */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <div className="flex gap-4 items-center">
          <label className="text-sm text-slate-400">Filtrar por tipo:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
          >
            <option value="ALL">Todos</option>
            <option value="ACAO">Ações</option>
            <option value="FII">FIIs</option>
            <option value="ETF">ETFs</option>
            <option value="RENDA_FIXA">Renda Fixa</option>
          </select>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <PieIcon size={20} className="text-blue-400" />
            Distribuição por Tipo
          </h3>
          <div className="h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => isHidden ? name : `${name} ${(percent * 100).toFixed(1)}%`}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                Nenhuma posição ativa
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-400" />
            Top Posições
          </h3>
          <div className="h-[300px] overflow-y-auto">
            {filteredPortfolio.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, filteredPortfolio.slice(0, 10).length * 35)}>
                <BarChart data={filteredPortfolio.slice(0, 10).map(p => ({ ...p, marketValue: isHidden ? 0 : p.marketValue }))} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="marketValue" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                Nenhuma posição ativa
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Posições */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-bold text-white">Posições Detalhadas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase text-xs">
              <tr>
                <th className="p-4">Ticker</th>
                <th className="p-4">Nome</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-right">Qtd</th>
                <th className="p-4 text-right">PM</th>
                <th className="p-4 text-right">Preço Atual</th>
                <th className="p-4 text-right">Investido</th>
                <th className="p-4 text-right">Valor Atual</th>
                <th className="p-4 text-right">Ganho/Perda</th>
                <th className="p-4 text-right">%</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPortfolio.map(position => (
                <tr key={position.id} className="hover:bg-slate-800/30 group">
                  <td className="p-4 font-bold text-white">{position.ticker}</td>
                  <td className="p-4 text-slate-300">{position.name}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                      position.type === 'ACAO' ? 'bg-blue-500/10 text-blue-400' :
                      position.type === 'FII' ? 'bg-amber-500/10 text-amber-400' :
                      position.type === 'RENDA_FIXA' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-purple-500/10 text-purple-400'
                    }`}>
                      {position.type === 'RENDA_FIXA' ? 'RF' : position.type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-slate-300">
                    {formatNumber(position.quantity)}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-300">
                    {formatCurrency(position.avgPrice, position.currency)}
                  </td>
                  <td className="p-4 text-right font-mono text-white">
                    {formatCurrency(position.currentPrice, position.currency)}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-300">
                    {formatCurrency(position.totalCost, position.currency)}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-white">
                    {formatCurrency(position.marketValue, position.currency)}
                  </td>
                  <td className={`p-4 text-right font-mono font-bold ${position.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(position.gainLoss, position.currency)}
                  </td>
                  <td className={`p-4 text-right font-mono font-bold ${position.gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(position.gainLossPercent, true)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100">
                      <button onClick={() => handleEdit(position)} className="text-slate-600 hover:text-blue-500 p-2">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPortfolio.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-500">
                    Nenhuma posição ativa. Adicione ativos e operações para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showAssetModal}
        onClose={() => { setShowAssetModal(false); setEditingAsset(null); }}
        title={editingAsset ? "Editar Ativo" : "Novo Ativo"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Ticker" name="ticker" placeholder="Ex: PETR4" required defaultValue={editingAsset?.ticker} />
          <Input label="Nome" name="name" placeholder="Ex: Petrobras" required defaultValue={editingAsset?.name} />
          <Select label="Tipo" name="type" defaultValue={editingAsset?.type || 'ACAO'}>
            <option value="ACAO">Ação</option>
            <option value="FII">FII</option>
            <option value="ETF">ETF</option>
            <option value="RENDA_FIXA">Renda Fixa</option>
          </Select>
          <Select label="Moeda" name="currency" defaultValue={editingAsset?.currency || 'BRL'}>
            {currencies.map(c => (<option key={c.code} value={c.code}>{c.name}</option>))}
          </Select>
          <Input label="Setor" name="sector" placeholder="Ex: Energia" defaultValue={editingAsset?.sector} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantidade" name="quantity" type="number" step="1" placeholder="Ex: 100" defaultValue={editingAsset?.quantity || ''} />
            <Input label="Preço Médio" name="avgPrice" type="number" step="0.01" placeholder="Ex: 25.50" defaultValue={editingAsset?.avg_price || editingAsset?.avgPrice || ''} />
          </div>
          <Button type="submit" className="w-full">
            {editingAsset ? <><Save size={18} /> Atualizar</> : <><Plus size={18} /> Cadastrar</>}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
