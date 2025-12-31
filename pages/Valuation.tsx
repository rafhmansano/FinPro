import React, { useEffect, useState } from 'react';
import { useFinance } from '../context';
import { Button } from '../components/ui';
import { Search, AlertTriangle, Cpu, Crosshair, BarChart } from 'lucide-react';
import { MarketDataService, ValuationEngine } from '../services';
import { ValuationResult } from '../types';

export const Valuation = () => {
  const { portfolio } = useFinance();
  const [valuations, setValuations] = useState<ValuationResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio]);

  const runAnalysis = async () => {
    if (portfolio.length === 0) return;
    setLoading(true);
    try {
        const results = await Promise.all(portfolio.map(async (asset) => {
            const fundamentals = await MarketDataService.getCompanyFundamentals(asset.ticker);
            const currentPrice = await MarketDataService.getLatestPrice(asset.ticker);
            const analysis = ValuationEngine.analyze(asset.ticker, currentPrice, fundamentals, asset.type);
            
            return {
            ...asset,
            currentPrice,
            fundamentals,
            ...analysis
            };
        }));
        setValuations(results);
    } catch (e) {
        console.error(e);
    }
    setLoading(false);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (portfolio.length === 0) return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
          <Cpu size={48} className="mb-4 text-slate-700" />
          <p>Motor de IA requer dados na carteira. Adicione ativos.</p>
      </div>
  );

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Cpu className="text-blue-500" /> Motor de Valuation <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">BETA</span></h2>
           <p className="text-slate-400 text-sm">Estimativa algorítmica de preço justo.</p>
        </div>
        <Button variant="secondary" onClick={runAnalysis} disabled={loading}>
            {loading ? 'Processando...' : <><Search size={16} /> Reanalisar</>}
        </Button>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-blue-400 font-mono text-sm animate-pulse">PROCESSANDO DADOS...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {valuations.map(val => (
            <div key={val.id} className="bg-slate-900/80 border border-slate-700/50 p-6 rounded-2xl hover:border-blue-500/30 transition-all flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="text-xl font-bold text-white tracking-tight">{val.ticker}</h3>
                  <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700 uppercase tracking-widest">{val.strategy}</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div className="flex flex-col">
                      <span className="text-slate-500 text-xs uppercase mb-1">Preço Atual</span>
                      <strong className="text-white font-mono">{formatCurrency(val.currentPrice)}</strong>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-slate-500 text-xs uppercase mb-1">Preço Justo</span>
                      <strong className="text-blue-400 font-mono">{formatCurrency(val.intrinsicValue)}</strong>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-slate-500 text-xs uppercase mb-1">Margem de Segurança</span>
                      <strong className={`font-mono ${val.upside > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {val.upside > 0 ? '+' : ''}{val.upside.toFixed(2)}%
                      </strong>
                  </div>
                   <div className="flex flex-col">
                      <span className="text-slate-500 text-xs uppercase mb-1">Div. Yield</span>
                      <strong className="text-slate-200 font-mono">{val.fundamentals.dy}%</strong>
                  </div>
                </div>
              </div>

              <div className="text-center min-w-[140px] flex flex-col items-center justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 h-full w-full md:w-auto">
                 <Crosshair size={24} className={`mb-2 ${val.recommendation === 'COMPRA' ? 'text-emerald-500' : val.recommendation === 'VENDA' ? 'text-rose-500' : 'text-yellow-500'}`} />
                 <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Veredito</span>
                 <span className={`text-lg font-bold ${val.recommendation === 'COMPRA' ? 'text-emerald-400' : val.recommendation === 'VENDA' ? 'text-rose-400' : 'text-yellow-400'}`}>
                   {val.recommendation}
                 </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/20 text-sm text-blue-300 flex items-start gap-3">
        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
        <p>
          <strong>Aviso Legal:</strong> Este módulo usa modelos financeiros simplificados (Graham/Gordon) e dados fictícios. 
          Não constitui recomendação de investimento real. Consulte sempre um profissional certificado.
        </p>
      </div>
    </div>
  );
};