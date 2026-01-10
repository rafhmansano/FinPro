import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
import { usePrivacy } from '../contexts/PrivacyContext';
import { Button, Modal, Input, Select } from '../components/ui';
import { Calculator, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, Edit2, Save, Trash2 } from 'lucide-react';

interface ValuationData {
  id?: string;
  ticker: string;
  method: 'BAZIN' | 'GRAHAM' | 'DCF' | 'DIVIDEND_YIELD' | 'P_VP';
  fair_price: number;
  current_price?: number;
  inputs?: Record<string, number>;
  calculated_at?: string;
  notes?: string;
}

const VALUATION_METHODS = [
  { value: 'BAZIN', label: 'Bazin (Dividendos)', description: 'Preço justo baseado em dividendos (DY 6%)' },
  { value: 'GRAHAM', label: 'Graham', description: 'Fórmula de Benjamin Graham' },
  { value: 'DIVIDEND_YIELD', label: 'Dividend Yield Alvo', description: 'Baseado em DY desejado' },
  { value: 'P_VP', label: 'P/VP', description: 'Baseado em valor patrimonial' },
  { value: 'DCF', label: 'DCF Simplificado', description: 'Fluxo de caixa descontado' }
];

export const Valuation = () => {
  const { assets, valuations, addValuation, updateValuation, deleteItem, portfolio } = useFinance();
  const { formatCurrency, formatPercent, isHidden } = usePrivacy();
  
  const [showModal, setShowModal] = useState(false);
  const [editingValuation, setEditingValuation] = useState<ValuationData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('BAZIN');
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

  const valuationsWithMargin = useMemo(() => {
    return (valuations || []).map(v => {
      const position = portfolio.find(p => p.ticker?.toUpperCase() === v.ticker?.toUpperCase());
      const currentPrice = position?.currentPrice || v.current_price || 0;
      const fairPrice = Number(v.fair_price) || 0;
      const margin = currentPrice > 0 ? ((fairPrice - currentPrice) / currentPrice) * 100 : 0;
      
      return {
        ...v,
        currentPrice,
        fairPrice,
        margin,
        status: margin > 15 ? 'BARATO' : margin < -15 ? 'CARO' : 'JUSTO'
      };
    }).sort((a, b) => b.margin - a.margin);
  }, [valuations, portfolio]);

  const summary = useMemo(() => {
    const cheap = valuationsWithMargin.filter(v => v.status === 'BARATO').length;
    const fair = valuationsWithMargin.filter(v => v.status === 'JUSTO').length;
    const expensive = valuationsWithMargin.filter(v => v.status === 'CARO').length;
    return { cheap, fair, expensive, total: valuationsWithMargin.length };
  }, [valuationsWithMargin]);

  const calculatePrice = (method: string, inputs: Record<string, number>): number => {
    switch (method) {
      case 'BAZIN':
        // Preço Justo = DPA / 0.06 (Dividend Yield de 6%)
        return (inputs.dpa || 0) / 0.06;
      case 'GRAHAM':
        // Preço Justo = √(22.5 × LPA × VPA)
        return Math.sqrt(22.5 * (inputs.lpa || 0) * (inputs.vpa || 0));
      case 'DIVIDEND_YIELD':
        // Preço Justo = DPA / (DY_alvo / 100)
        return (inputs.dpa || 0) / ((inputs.dyTarget || 6) / 100);
      case 'P_VP':
        // Preço Justo = VPA × P/VP_alvo
        return (inputs.vpa || 0) * (inputs.pvpTarget || 1);
      case 'DCF':
        // DCF Simplificado: FCL × (1 + g) / (r - g)
        const fcl = inputs.fcl || 0;
        const g = (inputs.growth || 5) / 100;
        const r = (inputs.discount || 12) / 100;
        if (r <= g) return 0;
        return (fcl * (1 + g)) / (r - g);
      default:
        return 0;
    }
  };

  const handleCalculate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inputs: Record<string, number> = {};
    
    formData.forEach((value, key) => {
      if (key !== 'ticker' && key !== 'notes') {
        inputs[key] = Number(value) || 0;
      }
    });

    const price = calculatePrice(selectedMethod, inputs);
    setCalculatedPrice(price);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const inputs: Record<string, number> = {};
    formData.forEach((value, key) => {
      if (!['ticker', 'notes', 'currentPrice'].includes(key)) {
        inputs[key] = Number(value) || 0;
      }
    });

    const fairPrice = calculatedPrice || calculatePrice(selectedMethod, inputs);

    const valuationData: any = {
      ticker: String(data.ticker).toUpperCase(),
      method: selectedMethod,
      fair_price: fairPrice,
      current_price: Number(data.currentPrice) || 0,
      inputs,
      notes: String(data.notes || ''),
      calculated_at: new Date().toISOString()
    };

    if (editingValuation?.id) {
      await updateValuation(editingValuation.id, valuationData);
    } else {
      await addValuation(valuationData);
    }

    setShowModal(false);
    setEditingValuation(null);
    setCalculatedPrice(null);
  };

  const handleEdit = (valuation: any) => {
    setEditingValuation(valuation);
    setSelectedMethod(valuation.method || 'BAZIN');
    setCalculatedPrice(valuation.fair_price);
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingValuation(null);
    setSelectedMethod('BAZIN');
    setCalculatedPrice(null);
    setShowModal(true);
  };

  const renderMethodInputs = () => {
    const inputs = editingValuation?.inputs || {};
    
    switch (selectedMethod) {
      case 'BAZIN':
        return (
          <Input 
            label="DPA (Dividendo por Ação - últimos 12 meses)" 
            name="dpa" 
            type="number" 
            step="0.01" 
            placeholder="Ex: 2.50"
            defaultValue={inputs.dpa}
            required 
          />
        );
      case 'GRAHAM':
        return (
          <>
            <Input 
              label="LPA (Lucro por Ação)" 
              name="lpa" 
              type="number" 
              step="0.01" 
              placeholder="Ex: 5.00"
              defaultValue={inputs.lpa}
              required 
            />
            <Input 
              label="VPA (Valor Patrimonial por Ação)" 
              name="vpa" 
              type="number" 
              step="0.01" 
              placeholder="Ex: 20.00"
              defaultValue={inputs.vpa}
              required 
            />
          </>
        );
      case 'DIVIDEND_YIELD':
        return (
          <>
            <Input 
              label="DPA (Dividendo por Ação - últimos 12 meses)" 
              name="dpa" 
              type="number" 
              step="0.01" 
              placeholder="Ex: 2.50"
              defaultValue={inputs.dpa}
              required 
            />
            <Input 
              label="Dividend Yield Alvo (%)" 
              name="dyTarget" 
              type="number" 
              step="0.1" 
              placeholder="Ex: 6"
              defaultValue={inputs.dyTarget || 6}
              required 
            />
          </>
        );
      case 'P_VP':
        return (
          <>
            <Input 
              label="VPA (Valor Patrimonial por Ação)" 
              name="vpa" 
              type="number" 
              step="0.01" 
              placeholder="Ex: 20.00"
              defaultValue={inputs.vpa}
              required 
            />
            <Input 
              label="P/VP Alvo" 
              name="pvpTarget" 
              type="number" 
              step="0.1" 
              placeholder="Ex: 1.0"
              defaultValue={inputs.pvpTarget || 1}
              required 
            />
          </>
        );
      case 'DCF':
        return (
          <>
            <Input 
              label="FCL por Ação (Fluxo de Caixa Livre)" 
              name="fcl" 
              type="number" 
              step="0.01" 
              placeholder="Ex: 3.00"
              defaultValue={inputs.fcl}
              required 
            />
            <Input 
              label="Taxa de Crescimento (%)" 
              name="growth" 
              type="number" 
              step="0.1" 
              placeholder="Ex: 5"
              defaultValue={inputs.growth || 5}
              required 
            />
            <Input 
              label="Taxa de Desconto (%)" 
              name="discount" 
              type="number" 
              step="0.1" 
              placeholder="Ex: 12"
              defaultValue={inputs.discount || 12}
              required 
            />
          </>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BARATO': return 'text-emerald-400 bg-emerald-500/10';
      case 'CARO': return 'text-rose-400 bg-rose-500/10';
      default: return 'text-amber-400 bg-amber-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'BARATO': return <CheckCircle size={16} />;
      case 'CARO': return <AlertTriangle size={16} />;
      default: return <Target size={16} />;
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
          <p className="text-slate-400 text-sm">Calcule o preço justo dos seus ativos</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Calculator size={18} /> Nova Análise
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <TrendingUp className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-emerald-300 font-semibold uppercase">Baratos</p>
              <p className="text-2xl font-bold text-white">{isHidden ? '•••' : summary.cheap}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Target className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-amber-300 font-semibold uppercase">Preço Justo</p>
              <p className="text-2xl font-bold text-white">{isHidden ? '•••' : summary.fair}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-600/20 to-rose-700/10 border border-rose-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/20 rounded-xl">
              <TrendingDown className="text-rose-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-rose-300 font-semibold uppercase">Caros</p>
              <p className="text-2xl font-bold text-white">{isHidden ? '•••' : summary.expensive}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Calculator className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-purple-300 font-semibold uppercase">Total Análises</p>
              <p className="text-2xl font-bold text-white">{isHidden ? '•••' : summary.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Valuations */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-bold text-white">Análises de Valuation</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase text-xs">
              <tr>
                <th className="p-4">Ticker</th>
                <th className="p-4">Método</th>
                <th className="p-4 text-right">Preço Atual</th>
                <th className="p-4 text-right">Preço Justo</th>
                <th className="p-4 text-right">Margem</th>
                <th className="p-4">Status</th>
                <th className="p-4">Notas</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {valuationsWithMargin.map(v => (
                <tr key={v.id} className="hover:bg-slate-800/30 group">
                  <td className="p-4 font-bold text-white">{v.ticker}</td>
                  <td className="p-4">
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded">
                      {VALUATION_METHODS.find(m => m.value === v.method)?.label || v.method}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-slate-300">
                    {formatCurrency(v.currentPrice)}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-white">
                    {formatCurrency(v.fairPrice)}
                  </td>
                  <td className={`p-4 text-right font-mono font-bold ${v.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatPercent(v.margin, true)}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-bold ${getStatusColor(v.status)}`}>
                      {getStatusIcon(v.status)} {v.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 max-w-[200px] truncate">
                    {v.notes || '-'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100">
                      <button onClick={() => handleEdit(v)} className="text-slate-600 hover:text-blue-500 p-2">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteItem('valuations', v.id!)} className="text-slate-600 hover:text-rose-500 p-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {valuationsWithMargin.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500">
                    Nenhuma análise de valuation ainda. Clique em "Nova Análise" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setEditingValuation(null); setCalculatedPrice(null); }} 
        title={editingValuation ? "Editar Valuation" : "Nova Análise de Valuation"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Ticker" 
            name="ticker" 
            placeholder="Ex: PETR4" 
            required 
            defaultValue={editingValuation?.ticker} 
          />
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Método de Valuation</label>
            <select 
              value={selectedMethod} 
              onChange={(e) => { setSelectedMethod(e.target.value); setCalculatedPrice(null); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200"
            >
              {VALUATION_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label} - {m.description}</option>
              ))}
            </select>
          </div>

          <Input 
            label="Preço Atual (R$)" 
            name="currentPrice" 
            type="number" 
            step="0.01" 
            placeholder="Ex: 35.00"
            defaultValue={editingValuation?.current_price}
          />

          <div className="border-t border-slate-800 pt-4">
            <h4 className="text-sm font-bold text-slate-300 mb-4">Parâmetros do Cálculo</h4>
            {renderMethodInputs()}
          </div>

          {calculatedPrice !== null && calculatedPrice > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-xs text-emerald-300 uppercase font-semibold mb-1">Preço Justo Calculado</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(calculatedPrice)}</p>
            </div>
          )}

          <Input 
            label="Notas (opcional)" 
            name="notes" 
            placeholder="Ex: Análise conservadora..."
            defaultValue={editingValuation?.notes}
          />

          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={handleCalculate as any} className="flex-1">
              <Calculator size={18} /> Calcular
            </Button>
            <Button type="submit" className="flex-1">
              <Save size={18} /> Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
