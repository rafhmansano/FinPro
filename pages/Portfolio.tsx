import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
import { Button, Modal, Input, Select } from '../components/ui';
import { Plus, Trash2, Edit2, Save, Briefcase, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = { primary: '#3b82f6', secondary: '#64748b', success: '#10b981', warning: '#f59e0b', accent: '#6366f1' };

// FIX #8 - Formatação de moeda dinâmica
const formatCurrency = (value: number, currency: string = 'BRL'): string => {
  const safeVal = typeof value === 'number' && !isNaN(value) ? value : 0;
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safeVal);
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeVal);
};

export const Portfolio = () => {
  const { assets, trades, addAsset, updateAsset, deleteItem } = useFinance();
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Lista de moedas suportadas
  const currencies = [
    { code: 'BRL', name: 'Real (R$)', symbol: 'R$' },
    { code: 'USD', name: 'Dólar (US$)', symbol: '$' }
  ];

  // Processar ativos com posições
  // CORREÇÃO: Usar dados de quantity e avg_price dos assets OU calcular dos trades
  const assetsWithPositions = useMemo(() => {
    // Primeiro, calcula posições dos trades (se houver)
    const positionsFromTrades: Record<string, { quantity: number; avgPrice: number; totalCost: number }> = {};
    
    trades.forEach(trade => {
      const ticker = trade.ticker?.toUpperCase();
      if (!ticker) return;
      
      if (!positionsFromTrades[ticker]) {
        positionsFromTrades[ticker] = { quantity: 0, avgPrice: 0, totalCost: 0 };
      }
      
      const qty = Number(trade.quantity) || 0;
      const price = Number(trade.price) || 0;
      const type = (trade.type || '').toUpperCase();
      
      if (type === 'BUY' || type === 'COMPRA') {
        const newTotalCost = positionsFromTrades[ticker].totalCost + (qty * price);
        const newQty = positionsFromTrades[ticker].quantity + qty;
        positionsFromTrades[ticker].quantity = newQty;
        positionsFromTrades[ticker].totalCost = newTotalCost;
        positionsFromTrades[ticker].avgPrice = newQty > 0 ? newTotalCost / newQty : 0;
      } else if (type === 'SELL' || type === 'VENDA') {
        positionsFromTrades[ticker].quantity -= qty;
        if (positionsFromTrades[ticker].quantity <= 0) {
          positionsFromTrades[ticker] = { quantity: 0, avgPrice: 0, totalCost: 0 };
        }
      }
    });
    
    return assets.map(asset => {
      const ticker = asset.ticker?.toUpperCase() || '';
      const tradePos = positionsFromTrades[ticker];
      
      // CORREÇÃO: Prioriza dados do asset, depois dos trades
      // Lê quantity e avg_price diretamente do asset (campos do banco)
      const assetQty = Number((asset as any).quantity) || 0;
      const assetAvgPrice = Number((asset as any).avg_price || (asset as any).avgPrice) || 0;
      
      // Se o asset tem quantidade, usa. Senão, usa dos trades
      const quantity = assetQty > 0 ? assetQty : (tradePos?.quantity || 0);
      const avgPrice = assetQty > 0 ? assetAvgPrice : (tradePos?.avgPrice || 0);
      
      // Moeda: verifica no asset ou usa USD para TFLO
      const currency = asset.currency || (ticker === 'TFLO' ? 'USD' : 'BRL');
      
      return {
        ...asset,
        currency,
        quantity,
        avgPrice,
        totalValue: quantity * avgPrice,
        hasPosition: quantity > 0
      };
    }).sort((a, b) => b.totalValue - a.totalValue);
  }, [assets, trades]);

  // Filtrar ativos
  const filteredAssets = useMemo(() => {
    if (filterType === 'ALL') return assetsWithPositions;
    return assetsWithPositions.filter(a => a.type === filterType);
  }, [assetsWithPositions, filterType]);

  // Apenas ativos com posição
  const activePositions = useMemo(() => {
    return filteredAssets.filter(a => a.hasPosition);
  }, [filteredAssets]);

  // Totais por tipo (separado por moeda)
  const totalsByType = useMemo(() => {
    const totals: Record<string, { BRL: number; USD: number }> = {
      ACAO: { BRL: 0, USD: 0 },
      FII: { BRL: 0, USD: 0 },
      ETF: { BRL: 0, USD: 0 },
      RENDA_FIXA: { BRL: 0, USD: 0 }
    };
    
    activePositions.forEach(a => {
      const type = a.type || 'ACAO';
      const currency = a.currency || 'BRL';
      if (totals[type]) {
        totals[type][currency as 'BRL' | 'USD'] += a.totalValue;
      }
    });
    
    return totals;
  }, [activePositions]);

  // Total geral (BRL)
  const totalPortfolioBRL = useMemo(() => {
    return activePositions
      .filter(a => a.currency === 'BRL' || !a.currency)
      .reduce((sum, a) => sum + a.totalValue, 0);
  }, [activePositions]);

  // Total geral (USD)
  const totalPortfolioUSD = useMemo(() => {
    return activePositions
      .filter(a => a.currency === 'USD')
      .reduce((sum, a) => sum + a.totalValue, 0);
  }, [activePositions]);

  // Dados para gráfico de pizza
  const pieData = useMemo(() => {
    return [
      { name: 'Ações', value: totalsByType.ACAO.BRL, color: COLORS.primary },
      { name: 'FIIs', value: totalsByType.FII.BRL, color: COLORS.warning },
      { name: 'ETFs (BRL)', value: totalsByType.ETF.BRL, color: COLORS.accent },
      { name: 'Renda Fixa', value: totalsByType.RENDA_FIXA.BRL, color: COLORS.success }
    ].filter(d => d.value > 0);
  }, [totalsByType]);

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
    setEditingAsset(asset);
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
          {formatCurrency(data.value || data.totalValue, data.currency)}
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
          <p className="text-slate-400 text-sm">Gerencie seus ativos de investimento</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus size={18} /> Novo Ativo
        </Button>
      </div>

      {/* Cards de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Briefcase className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-blue-300 font-semibold uppercase">Total (BRL)</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalPortfolioBRL, 'BRL')}</p>
            </div>
          </div>
        </div>

        {/* Card separado para USD */}
        {totalPortfolioUSD > 0 && (
          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <TrendingUp className="text-emerald-400" size={24} />
              </div>
              <div>
                <p className="text-xs text-emerald-300 font-semibold uppercase">Total (USD)</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalPortfolioUSD, 'USD')}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <p className="text-xs text-slate-400 font-semibold uppercase">Ações</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalsByType.ACAO.BRL)}</p>
          <p className="text-xs text-slate-500">{activePositions.filter(a => a.type === 'ACAO').length} ativos</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <p className="text-xs text-slate-400 font-semibold uppercase">FIIs</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalsByType.FII.BRL)}</p>
          <p className="text-xs text-slate-500">{activePositions.filter(a => a.type === 'FII').length} ativos</p>
        </div>
      </div>

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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
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
            Posições Ativas
          </h3>
          <div className="h-[300px] overflow-y-auto">
            {activePositions.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, activePositions.length * 35)}>
                <BarChart data={activePositions} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalValue" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
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

      {/* Tabela de Ativos */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-bold text-white">Todos os Ativos Cadastrados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase text-xs">
              <tr>
                <th className="p-4">Ticker</th>
                <th className="p-4">Nome</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Moeda</th>
                <th className="p-4">Setor</th>
                <th className="p-4 text-right">Quantidade</th>
                <th className="p-4 text-right">PM</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-slate-800/30 group">
                  <td className="p-4 font-bold text-white">{asset.ticker}</td>
                  <td className="p-4 text-slate-300">{asset.name}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                      asset.type === 'ACAO' ? 'bg-blue-500/10 text-blue-400' :
                      asset.type === 'FII' ? 'bg-amber-500/10 text-amber-400' :
                      asset.type === 'RENDA_FIXA' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-purple-500/10 text-purple-400'
                    }`}>
                      {asset.type === 'RENDA_FIXA' ? 'RF' : asset.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                      asset.currency === 'USD' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {asset.currency || 'BRL'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{asset.sector || '-'}</td>
                  <td className="p-4 text-right font-mono text-slate-300">
                    {asset.quantity > 0 ? asset.quantity.toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-300">
                    {asset.avgPrice > 0 ? formatCurrency(asset.avgPrice, asset.currency) : '-'}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-emerald-400">
                    {asset.totalValue > 0 ? formatCurrency(asset.totalValue, asset.currency) : '-'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100">
                      <button onClick={() => handleEdit(asset)} className="text-slate-600 hover:text-blue-500 p-2">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { if(confirm('Excluir ativo?')) deleteItem('assets', asset.id!) }}
                        className="text-slate-600 hover:text-rose-500 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500">
                    Nenhum ativo cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Ativo */}
      <Modal 
        isOpen={showAssetModal} 
        onClose={() => { setShowAssetModal(false); setEditingAsset(null); }} 
        title={editingAsset ? "Editar Ativo" : "Novo Ativo"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Ticker" 
            name="ticker" 
            placeholder="Ex: PETR4" 
            required 
            defaultValue={editingAsset?.ticker}
          />
          <Input 
            label="Nome" 
            name="name" 
            placeholder="Ex: Petrobras" 
            required 
            defaultValue={editingAsset?.name}
          />
          <Select label="Tipo" name="type" defaultValue={editingAsset?.type || 'ACAO'}>
            <option value="ACAO">Ação</option>
            <option value="FII">FII</option>
            <option value="ETF">ETF</option>
            <option value="RENDA_FIXA">Renda Fixa</option>
          </Select>
          
          <Select label="Moeda" name="currency" defaultValue={editingAsset?.currency || 'BRL'}>
            {currencies.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </Select>
          
          <Input 
            label="Setor" 
            name="sector" 
            placeholder="Ex: Energia" 
            defaultValue={editingAsset?.sector}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Quantidade" 
              name="quantity" 
              type="number"
              step="1"
              placeholder="Ex: 100" 
              defaultValue={editingAsset?.quantity || ''}
            />
            <Input 
              label="Preço Médio" 
              name="avgPrice" 
              type="number"
              step="0.01"
              placeholder="Ex: 25.50" 
              defaultValue={editingAsset?.avgPrice || ''}
            />
          </div>

          <Button type="submit" className="w-full">
            {editingAsset ? <><Save size={18} /> Atualizar</> : <><Plus size={18} /> Cadastrar</>}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
