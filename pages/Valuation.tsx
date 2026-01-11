import React, { useState, useMemo, useCallback } from 'react';
import { useFinance } from '../context';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { Button, Modal, Input, Select } from '../components/ui';
import { 
  Calculator, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, 
  Upload, FileText, RefreshCw, ChevronDown, ChevronUp, Eye, Edit2, Trash2,
  Building2, Landmark, BarChart3, PieChart, DollarSign, Percent, Info
} from 'lucide-react';

// Tipos
interface QuarterlyResult {
  id: string;
  ticker: string;
  asset_type: 'ACAO' | 'FII';
  fii_segment?: string;
  year: number;
  quarter: number;
  shares?: number;
  equity?: number;
  net_income?: number;
  revenue?: number;
  ebitda?: number;
  dividends_paid?: number;
  net_debt?: number;
  nav?: number;
  nav_per_share?: number;
  vacancy_rate?: number;
  cap_rate?: number;
  user_verified?: boolean;
}

interface AssetIndicator {
  id: string;
  ticker: string;
  asset_type: 'ACAO' | 'FII';
  lpa?: number;
  vpa?: number;
  dpa?: number;
  p_l?: number;
  p_vp?: number;
  roe?: number;
  dividend_yield?: number;
  net_debt_ebitda?: number;
  current_price?: number;
  ceiling_bazin?: number;
  ceiling_graham?: number;
  ceiling_pl_10?: number;
  ceiling_pvp_1?: number;
  ceiling_dy_6?: number;
  ceiling_dy_8?: number;
  ceiling_fii_dy_8?: number;
  ceiling_fii_dy_10?: number;
  ceiling_fii_pvp_1?: number;
  fair_price_avg?: number;
  upside_potential?: number;
  recommendation?: string;
  last_calculated_at?: string;
}

// Componente de Card de Preço Teto
const CeilingCard = ({ 
  label, 
  value, 
  currentPrice, 
  formatCurrency, 
  isHidden,
  color = 'blue'
}: { 
  label: string; 
  value: number | null | undefined; 
  currentPrice: number;
  formatCurrency: (v: number) => string;
  isHidden: boolean;
  color?: string;
}) => {
  if (!value || value <= 0) return null;
  
  const margin = currentPrice > 0 ? ((value - currentPrice) / currentPrice) * 100 : 0;
  const isAbove = margin > 0;
  
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-600/20 to-blue-700/10 border-blue-500/20',
    green: 'from-emerald-600/20 to-emerald-700/10 border-emerald-500/20',
    purple: 'from-purple-600/20 to-purple-700/10 border-purple-500/20',
    amber: 'from-amber-600/20 to-amber-700/10 border-amber-500/20',
    cyan: 'from-cyan-600/20 to-cyan-700/10 border-cyan-500/20',
  };
  
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} border rounded-xl p-4`}>
      <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{formatCurrency(value)}</p>
      <p className={`text-xs font-mono mt-1 ${isAbove ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isHidden ? '•••' : `${isAbove ? '+' : ''}${margin.toFixed(1)}%`}
      </p>
    </div>
  );
};

// Componente de Ativo Expandido
const AssetValuationCard = ({
  asset,
  indicators,
  quarterlyData,
  formatCurrency,
  formatPercent,
  isHidden,
  onEdit,
  onRefresh
}: {
  asset: any;
  indicators?: AssetIndicator;
  quarterlyData: QuarterlyResult[];
  formatCurrency: (v: number, currency?: string) => string;
  formatPercent: (v: number, showSign?: boolean) => string;
  isHidden: boolean;
  onEdit: (ticker: string) => void;
  onRefresh: (ticker: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const currentPrice = asset.current_price || indicators?.current_price || 0;
  const assetType = asset.type || indicators?.asset_type || 'ACAO';
  const isFII = assetType === 'FII';
  
  // Calcular status geral
  const getStatus = () => {
    if (!indicators?.upside_potential) return { label: 'Sem dados', color: 'slate', icon: Info };
    const upside = indicators.upside_potential;
    if (upside > 20) return { label: 'Muito Barato', color: 'emerald', icon: TrendingUp };
    if (upside > 5) return { label: 'Barato', color: 'green', icon: TrendingUp };
    if (upside > -5) return { label: 'Justo', color: 'amber', icon: Target };
    if (upside > -20) return { label: 'Caro', color: 'orange', icon: TrendingDown };
    return { label: 'Muito Caro', color: 'rose', icon: AlertTriangle };
  };
  
  const status = getStatus();
  const StatusIcon = status.icon;
  
  const statusColors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header do Card */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-xl">
              {isFII ? <Building2 className="text-amber-400" size={24} /> : <Landmark className="text-blue-400" size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{asset.ticker}</h3>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${isFII ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {assetType}
                </span>
              </div>
              <p className="text-sm text-slate-400">{asset.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Preço Atual */}
            <div className="text-right">
              <p className="text-xs text-slate-500">Preço Atual</p>
              <p className="text-xl font-bold text-white">{formatCurrency(currentPrice)}</p>
            </div>
            
            {/* Preço Justo Médio */}
            {indicators?.fair_price_avg && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Preço Justo (Média)</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(indicators.fair_price_avg)}</p>
              </div>
            )}
            
            {/* Status */}
            <div className={`px-3 py-2 rounded-xl border ${statusColors[status.color]}`}>
              <div className="flex items-center gap-2">
                <StatusIcon size={16} />
                <span className="font-medium">{status.label}</span>
              </div>
              {indicators?.upside_potential && (
                <p className="text-xs font-mono mt-1">
                  {isHidden ? '•••' : `${indicators.upside_potential > 0 ? '+' : ''}${indicators.upside_potential.toFixed(1)}%`}
                </p>
              )}
            </div>
            
            {/* Expand */}
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Conteúdo Expandido */}
      {expanded && (
        <div className="border-t border-slate-800 p-6 space-y-6">
          {/* Indicadores Principais */}
          {indicators && (
            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Indicadores Fundamentalistas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {!isFII && (
                  <>
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">LPA</p>
                      <p className="text-lg font-bold text-white">{indicators.lpa ? formatCurrency(indicators.lpa) : '-'}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">VPA</p>
                      <p className="text-lg font-bold text-white">{indicators.vpa ? formatCurrency(indicators.vpa) : '-'}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">P/L</p>
                      <p className="text-lg font-bold text-white">{indicators.p_l ? `${indicators.p_l.toFixed(1)}x` : '-'}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">P/VP</p>
                      <p className="text-lg font-bold text-white">{indicators.p_vp ? `${indicators.p_vp.toFixed(2)}x` : '-'}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">ROE</p>
                      <p className="text-lg font-bold text-white">{indicators.roe ? `${indicators.roe.toFixed(1)}%` : '-'}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Dív.Líq/EBITDA</p>
                      <p className="text-lg font-bold text-white">{indicators.net_debt_ebitda ? `${indicators.net_debt_ebitda.toFixed(1)}x` : '-'}</p>
                    </div>
                  </>
                )}
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">DPA (12m)</p>
                  <p className="text-lg font-bold text-white">{indicators.dpa ? formatCurrency(indicators.dpa) : '-'}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Dividend Yield</p>
                  <p className="text-lg font-bold text-emerald-400">{indicators.dividend_yield ? `${indicators.dividend_yield.toFixed(2)}%` : '-'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Preços Teto */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Preços Teto por Método</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {!isFII ? (
                <>
                  <CeilingCard 
                    label="Bazin (DY 6%)" 
                    value={indicators?.ceiling_bazin} 
                    currentPrice={currentPrice}
                    formatCurrency={formatCurrency}
                    isHidden={isHidden}
                    color="green"
                  />
                  <CeilingCard 
                    label="Graham" 
                    value={indicators?.ceiling_graham} 
                    currentPrice={currentPrice}
                    formatCurrency={formatCurrency}
                    isHidden={isHidden}
                    color="blue"
                  />
                  <CeilingCard 
                    label="P/L 10x" 
                    value={indicators?.ceiling_pl_10} 
                    currentPrice={currentPrice}
                    formatCurrency={formatCurrency}
                    isHidden={isHidden}
                    color="purple"
                  />
                  <CeilingCard 
                    label="P/VP 1.0" 
                    value={indicators?.ceiling_pvp_1} 
                    currentPrice={currentPrice}
                    formatCurrency={formatCurrency}
                    isHidden={isHidden}
                    color="amber"
                  />
                  <CeilingCard 
                    label="DY 6%" 
                    value={indicators?.ceiling_dy_6} 
                    currentPrice={currentPrice}
                    formatCurrency={formatCurrency}
                    isHidden={isHidden}
                    color="cyan"
                  />
                  <CeilingCard 
                    label="DY 8%" 
                    value={indicators?.ceiling_dy_8} 
                    currentPrice={currentPrice}
                    formatCurrency={formatCurrency}
                    isHidden={isHidden}
                    color="green"
                  />
                </>
              ) : (
                <>
                  <CeilingCard 
                    label="DY 8%" 
                    value={indicators?.ceiling_fii_dy_8} 
                    currentPrice={currentPrice}
                    formatCurrency={formatCurrency}
                    isHidden={isHidden}
                    color="green"
                  />
                  <CeilingCard 
                    label="DY 10%" 
                    value={indicators?.ceiling_fii_dy_10} 
                    currentPrice={currentPrice}
                    formatCurrency={formatCurrency}
                    isHidden={isHidden}
                    color="amber"
                  />
                  <CeilingCard 
                    label="P/VP 1.0" 
                    value={indicators?.ceiling_fii_pvp_1} 
                    currentPrice={currentPrice}
                    formatCurrency={formatCurrency}
                    isHidden={isHidden}
                    color="blue"
                  />
                </>
              )}
            </div>
          </div>
          
          {/* Histórico Trimestral */}
          {quarterlyData.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Histórico Trimestral</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="p-3 text-left">Período</th>
                      {!isFII && (
                        <>
                          <th className="p-3 text-right">Receita</th>
                          <th className="p-3 text-right">Lucro Líq.</th>
                          <th className="p-3 text-right">EBITDA</th>
                        </>
                      )}
                      <th className="p-3 text-right">Patrimônio</th>
                      <th className="p-3 text-right">Dividendos</th>
                      <th className="p-3 text-center">Verificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {quarterlyData.slice(0, 8).map(q => (
                      <tr key={q.id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-medium text-white">{q.quarter}T{q.year}</td>
                        {!isFII && (
                          <>
                            <td className="p-3 text-right font-mono text-slate-300">
                              {q.revenue ? formatCurrency(q.revenue) : '-'}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-300">
                              {q.net_income ? formatCurrency(q.net_income) : '-'}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-300">
                              {q.ebitda ? formatCurrency(q.ebitda) : '-'}
                            </td>
                          </>
                        )}
                        <td className="p-3 text-right font-mono text-slate-300">
                          {q.equity ? formatCurrency(q.equity) : '-'}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-400">
                          {q.dividends_paid ? formatCurrency(q.dividends_paid) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {q.user_verified ? (
                            <CheckCircle size={16} className="text-emerald-400 mx-auto" />
                          ) : (
                            <AlertTriangle size={16} className="text-amber-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Ações */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => onEdit(asset.ticker)}>
              <Upload size={16} /> Importar Resultado
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onRefresh(asset.ticker)}>
              <RefreshCw size={16} /> Recalcular
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Página Principal
export const Valuation = () => {
  const { assets, portfolio } = useFinance();
  const { formatCurrency, formatPercent, isHidden } = usePrivacy();
  const { user } = useAuth();
  
  const [indicators, setIndicators] = useState<AssetIndicator[]>([]);
  const [quarterlyResults, setQuarterlyResults] = useState<QuarterlyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTicker, setSearchTicker] = useState('');
  
  // Upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAssetType, setUploadAssetType] = useState<'ACAO' | 'FII'>('ACAO');
  const [uploadFiiSegment, setUploadFiiSegment] = useState<string>('OUTROS');
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Buscar dados
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [{ data: indicatorsData }, { data: quarterlyData }] = await Promise.all([
        supabase.from('asset_indicators').select('*').order('ticker'),
        supabase.from('quarterly_results').select('*').order('year', { ascending: false }).order('quarter', { ascending: false })
      ]);
      
      setIndicators(indicatorsData || []);
      setQuarterlyResults(quarterlyData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combinar assets com indicadores
  const assetsWithIndicators = useMemo(() => {
    const allAssets = [...assets];
    
    // Adicionar assets do portfolio que não estão na lista
    portfolio.forEach(p => {
      if (!allAssets.find(a => a.ticker === p.ticker)) {
        allAssets.push({
          id: p.id,
          ticker: p.ticker,
          name: p.name,
          type: p.type as any,
          current_price: p.currentPrice
        });
      }
    });
    
    return allAssets
      .filter(a => {
        if (filterType !== 'ALL' && a.type !== filterType) return false;
        if (searchTicker && !a.ticker.toLowerCase().includes(searchTicker.toLowerCase())) return false;
        
        const ind = indicators.find(i => i.ticker === a.ticker);
        if (filterStatus !== 'ALL') {
          const upside = ind?.upside_potential || 0;
          if (filterStatus === 'BARATO' && upside <= 5) return false;
          if (filterStatus === 'JUSTO' && (upside < -5 || upside > 5)) return false;
          if (filterStatus === 'CARO' && upside >= -5) return false;
        }
        
        return true;
      })
      .map(a => ({
        asset: a,
        indicators: indicators.find(i => i.ticker === a.ticker),
        quarterlyData: quarterlyResults.filter(q => q.ticker === a.ticker)
      }))
      .sort((a, b) => {
        const upsideA = a.indicators?.upside_potential || -999;
        const upsideB = b.indicators?.upside_potential || -999;
        return upsideB - upsideA;
      });
  }, [assets, portfolio, indicators, quarterlyResults, filterType, filterStatus, searchTicker]);

  // Resumo
  const summary = useMemo(() => {
    const withData = indicators.filter(i => i.upside_potential !== null);
    return {
      total: indicators.length,
      cheap: withData.filter(i => (i.upside_potential || 0) > 5).length,
      fair: withData.filter(i => (i.upside_potential || 0) >= -5 && (i.upside_potential || 0) <= 5).length,
      expensive: withData.filter(i => (i.upside_potential || 0) < -5).length,
      noData: assets.length - indicators.length
    };
  }, [indicators, assets]);

  const handleOpenUpload = (ticker?: string) => {
    setSelectedTicker(ticker || '');
    const asset = assets.find(a => a.ticker === ticker);
    if (asset) {
      setUploadAssetType(asset.type === 'FII' ? 'FII' : 'ACAO');
    }
    setExtractedData(null);
    setUploadFile(null);
    setShowUploadModal(true);
  };

  const handleExtract = async () => {
    if (!uploadFile || !selectedTicker) return;
    
    setExtracting(true);
    try {
      // Ler arquivo
      const text = await uploadFile.text();
      
      // Aqui você chamaria a API de extração
      // Por enquanto, simular com dados de exemplo
      const mockExtracted = {
        ticker: selectedTicker,
        assetType: uploadAssetType,
        year: 2024,
        quarter: 3,
        revenue: 50000000000,
        netIncome: 8000000000,
        equity: 100000000000,
        dividendsPaid: 2000000000,
        shares: 1000000000,
        confidence: 85,
        extractedFields: ['revenue', 'netIncome', 'equity', 'dividendsPaid'],
        warnings: ['Alguns valores podem precisar de revisão']
      };
      
      setExtractedData(mockExtracted);
    } catch (error) {
      console.error('Erro na extração:', error);
      alert('Erro ao extrair dados do arquivo');
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveExtracted = async () => {
    if (!extractedData || !user) return;
    
    try {
      const { error } = await supabase.from('quarterly_results').insert([{
        user_id: user.id,
        ticker: extractedData.ticker,
        asset_type: extractedData.assetType,
        year: extractedData.year,
        quarter: extractedData.quarter,
        revenue: extractedData.revenue,
        net_income: extractedData.netIncome,
        equity: extractedData.equity,
        dividends_paid: extractedData.dividendsPaid,
        shares: extractedData.shares,
        raw_extracted_data: extractedData,
        user_verified: false
      }]);
      
      if (error) throw error;
      
      // Recalcular indicadores
      await supabase.rpc('calculate_asset_indicators', {
        p_user_id: user.id,
        p_ticker: extractedData.ticker
      });
      
      await fetchData();
      setShowUploadModal(false);
      alert('Dados salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar dados');
    }
  };

  const handleRefreshIndicators = async (ticker: string) => {
    if (!user) return;
    
    try {
      await supabase.rpc('calculate_asset_indicators', {
        p_user_id: user.id,
        p_ticker: ticker
      });
      await fetchData();
    } catch (error) {
      console.error('Erro ao recalcular:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="text-purple-500" /> Valuation
          </h2>
          <p className="text-slate-400 text-sm">Análise fundamentalista e preços teto dos seus ativos</p>
        </div>
        <Button onClick={() => handleOpenUpload()}>
          <Upload size={18} /> Importar Resultado
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">Total Analisados</p>
          <p className="text-2xl font-bold text-white">{isHidden ? '•••' : summary.total}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-xs text-emerald-400 uppercase font-semibold">Baratos</p>
          <p className="text-2xl font-bold text-emerald-400">{isHidden ? '•••' : summary.cheap}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-xs text-amber-400 uppercase font-semibold">Preço Justo</p>
          <p className="text-2xl font-bold text-amber-400">{isHidden ? '•••' : summary.fair}</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
          <p className="text-xs text-rose-400 uppercase font-semibold">Caros</p>
          <p className="text-2xl font-bold text-rose-400">{isHidden ? '•••' : summary.expensive}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">Sem Dados</p>
          <p className="text-2xl font-bold text-slate-400">{isHidden ? '•••' : summary.noData}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Buscar</label>
            <input
              type="text"
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              placeholder="Ticker..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            >
              <option value="ALL">Todos</option>
              <option value="ACAO">Ações</option>
              <option value="FII">FIIs</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Status</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            >
              <option value="ALL">Todos</option>
              <option value="BARATO">Baratos</option>
              <option value="JUSTO">Preço Justo</option>
              <option value="CARO">Caros</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={fetchData} className="w-full">
              <RefreshCw size={16} /> Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Ativos */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500">Carregando...</div>
        ) : assetsWithIndicators.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Calculator size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum ativo encontrado</p>
            <p className="text-sm mt-2">Importe resultados trimestrais para começar a análise</p>
          </div>
        ) : (
          assetsWithIndicators.map(({ asset, indicators, quarterlyData }) => (
            <AssetValuationCard
              key={asset.id || asset.ticker}
              asset={asset}
              indicators={indicators}
              quarterlyData={quarterlyData}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
              isHidden={isHidden}
              onEdit={handleOpenUpload}
              onRefresh={handleRefreshIndicators}
            />
          ))
        )}
      </div>

      {/* Modal de Upload */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Importar Resultado Trimestral"
      >
        <div className="space-y-4">
          <Input
            label="Ticker"
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
            placeholder="Ex: PETR4, HGLG11"
          />
          
          <Select
            label="Tipo de Ativo"
            value={uploadAssetType}
            onChange={(e) => setUploadAssetType(e.target.value as 'ACAO' | 'FII')}
          >
            <option value="ACAO">Ação</option>
            <option value="FII">FII</option>
          </Select>
          
          {uploadAssetType === 'FII' && (
            <Select
              label="Segmento do FII"
              value={uploadFiiSegment}
              onChange={(e) => setUploadFiiSegment(e.target.value)}
            >
              <option value="PAPEL">Papel (CRIs)</option>
              <option value="LAJES">Lajes Corporativas</option>
              <option value="SHOPPINGS">Shoppings</option>
              <option value="LOGISTICA">Logística</option>
              <option value="HIBRIDO">Híbrido</option>
              <option value="OUTROS">Outros</option>
            </Select>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">
              Arquivo do Release (PDF ou TXT)
            </label>
            <input
              type="file"
              accept=".pdf,.txt,.xlsx"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
            />
          </div>
          
          {uploadFile && !extractedData && (
            <Button onClick={handleExtract} disabled={extracting} className="w-full">
              {extracting ? (
                <><RefreshCw size={16} className="animate-spin" /> Extraindo...</>
              ) : (
                <><FileText size={16} /> Extrair Dados</>
              )}
            </Button>
          )}
          
          {extractedData && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white">Dados Extraídos</h4>
                  <span className={`text-xs px-2 py-1 rounded ${extractedData.confidence >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    Confiança: {extractedData.confidence}%
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Período</p>
                    <p className="text-white font-mono">{extractedData.quarter}T{extractedData.year}</p>
                  </div>
                  {extractedData.revenue && (
                    <div>
                      <p className="text-slate-500">Receita</p>
                      <p className="text-white font-mono">{formatCurrency(extractedData.revenue)}</p>
                    </div>
                  )}
                  {extractedData.netIncome && (
                    <div>
                      <p className="text-slate-500">Lucro Líquido</p>
                      <p className="text-white font-mono">{formatCurrency(extractedData.netIncome)}</p>
                    </div>
                  )}
                  {extractedData.equity && (
                    <div>
                      <p className="text-slate-500">Patrimônio Líquido</p>
                      <p className="text-white font-mono">{formatCurrency(extractedData.equity)}</p>
                    </div>
                  )}
                  {extractedData.dividendsPaid && (
                    <div>
                      <p className="text-slate-500">Dividendos</p>
                      <p className="text-emerald-400 font-mono">{formatCurrency(extractedData.dividendsPaid)}</p>
                    </div>
                  )}
                </div>
                
                {extractedData.warnings?.length > 0 && (
                  <div className="mt-3 p-2 bg-amber-500/10 rounded-lg">
                    <p className="text-xs text-amber-400">
                      <AlertTriangle size={12} className="inline mr-1" />
                      {extractedData.warnings[0]}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setExtractedData(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSaveExtracted} className="flex-1">
                  <CheckCircle size={16} /> Salvar Dados
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
