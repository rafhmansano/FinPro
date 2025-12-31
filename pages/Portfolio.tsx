import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFinance } from '../context';
import { Button, Modal, Input, Select } from '../components/ui';
import { Plus, ArrowRightLeft, Trash2, Layers, Database, RefreshCw, Loader2, Edit2, Save, X as XIcon, Upload, FileText, ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { normalizeAssetType } from '../services';
import { Asset, AssetType } from '../types';

type SortField = 'ticker' | 'name' | 'sector' | 'quantity' | 'avgPrice' | 'totalValue';
type SortOrder = 'asc' | 'desc';

interface ParsedOperation {
  ticker: string;
  type: 'COMPRA' | 'VENDA';
  quantity: number;
  price: number;
  totalValue: number;
  fees: number;
  date: string;
  broker?: string;
}

export const Portfolio = () => {
  const { assets, trades, loadDatabaseData, addAsset, addTrade, deleteItem, loading: contextLoading } = useFinance();
  const [modalType, setModalType] = useState<'ASSET' | 'TRADE' | 'EDIT' | 'UPLOAD' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{ success?: boolean; msg?: string } | null>(null);
  
  // Estados para ordenação
  const [sortField, setSortField] = useState<SortField>('ticker');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Estados para upload de nota
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [previewOperations, setPreviewOperations] = useState<ParsedOperation[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [detectedBroker, setDetectedBroker] = useState<string>('');
  
  const hasLoadedOnce = useRef(false);

  // Calcula preço médio real baseado nas operações
  const assetsWithCalculations = useMemo(() => {
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
      const totalValue = quantity * avgPrice;
      
      return {
        ...asset,
        calculatedQuantity: quantity,
        calculatedAvgPrice: avgPrice,
        totalValue: totalValue,
        hasRealTrades: assetTrades.length > 0
      };
    });
  }, [assets, trades]);

  // Aplica ordenação
  const sortedAssets = useMemo(() => {
    const sorted = [...assetsWithCalculations].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch(sortField) {
        case 'ticker':
          aVal = a.ticker.toLowerCase();
          bVal = b.ticker.toLowerCase();
          break;
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'sector':
          aVal = a.sector.toLowerCase();
          bVal = b.sector.toLowerCase();
          break;
        case 'quantity':
          aVal = a.calculatedQuantity;
          bVal = b.calculatedQuantity;
          break;
        case 'avgPrice':
          aVal = a.calculatedAvgPrice;
          bVal = b.calculatedAvgPrice;
          break;
        case 'totalValue':
          aVal = a.totalValue;
          bVal = b.totalValue;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [assetsWithCalculations, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={14} className="text-slate-600" />;
    return sortOrder === 'asc' 
      ? <ChevronUp size={14} className="text-blue-400" />
      : <ChevronDown size={14} className="text-blue-400" />;
  };

  useEffect(() => {
    if (hasLoadedOnce.current) return;
    if (assets.length > 0) {
      hasLoadedOnce.current = true;
      return;
    }
    
    const loadData = async () => {
      await loadDatabaseData(false);
      hasLoadedOnce.current = true;
    };
    
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDatabaseData(false);
    setIsRefreshing(false);
  };

  // FUNÇÕES DE PROCESSAMENTO DE PDF - MULTI-CORRETORA
  const detectBroker = (text: string): string => {
    const brokers = [
      { name: 'BTG Pactual', patterns: ['BTG Pactual CTVM', 'btgpactual.com'] },
      { name: 'XP Investimentos', patterns: ['XP INVESTIMENTOS', 'xpi.com.br', 'CBLC XP'] },
      { name: 'Clear Corretora', patterns: ['CLEAR CORRETORA', 'clear.com.br'] },
      { name: 'Rico', patterns: ['Rico Investimentos', 'rico.com.vc'] },
      { name: 'Nubank', patterns: ['Nu Invest', 'nuinvest.com.br'] },
      { name: 'Banco Inter', patterns: ['INTER DTVM', 'bancointer.com.br'] },
      { name: 'Ágora', patterns: ['Ágora Corretora', 'agoracorretora.com.br'] }
    ];
    
    for (const broker of brokers) {
      if (broker.patterns.some(pattern => text.includes(pattern))) {
        return broker.name;
      }
    }
    
    return 'Desconhecida';
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          let text = '';
          for (let i = 0; i < uint8Array.length; i++) {
            if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
              text += String.fromCharCode(uint8Array[i]);
            } else if (uint8Array[i] === 10 || uint8Array[i] === 13) {
              text += '\n';
            }
          }
          
          resolve(text);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseNotaCorretagem = (text: string, broker: string): ParsedOperation[] => {
    const operations: ParsedOperation[] = [];
    
    // Extrai data do pregão
    const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(?:Data\s+preg|Pregao|Data)/i);
    let tradeDate = new Date().toISOString().split('T')[0];
    
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      tradeDate = `${year}-${month}-${day}`;
    }
    
    // Padrões por corretora
    let operationPattern: RegExp;
    
    switch(broker) {
      case 'BTG Pactual':
        // Formato BTG: 1-BOVESPA C VISTA BBAS3F ON 5 21,58 107,90 D
        operationPattern = /1-BOVESPA\s+(C|V)\s+(?:VISTA|OPCAO)\s+([A-Z0-9]+)F?\s+(?:ON|PN|PNB|UNT|CI)?\s+(\d+)\s+([\d,.]+)\s+([\d,.]+)/gi;
        break;
        
      case 'XP Investimentos':
        // Formato XP: C V VISTA PETR4 PN 100 30,50 3.050,00
        operationPattern = /([CV])\s+(?:VISTA|OPCAO)\s+([A-Z0-9]+)\s+(?:ON|PN|PNB|UNT)?\s+(\d+)\s+([\d,.]+)\s+([\d,.]+)/gi;
        break;
        
      case 'Clear Corretora':
      case 'Rico':
        // Formato Clear/Rico: Similar ao BTG
        operationPattern = /BOVESPA\s+(C|V)\s+VISTA\s+([A-Z0-9]+)\s+(?:ON|PN)?\s+(\d+)\s+([\d,.]+)\s+([\d,.]+)/gi;
        break;
        
      case 'Nubank':
      case 'Banco Inter':
        // Formato Nu/Inter
        operationPattern = /(COMPRA|VENDA)\s+([A-Z0-9]+)\s+(\d+)\s+(?:@|a)\s+R?\$?\s*([\d,.]+)/gi;
        break;
        
      default:
        // Padrão genérico
        operationPattern = /(?:1-BOVESPA\s+)?(C|V|COMPRA|VENDA)\s+(?:VISTA\s+)?([A-Z0-9]+)F?\s+(?:ON|PN|PNB|UNT)?\s*(\d+)\s+([\d,.]+)(?:\s+([\d,.]+))?/gi;
    }
    
    let match;
    while ((match = operationPattern.exec(text)) !== null) {
      let [_, cv, ticker, qtd, preco, total] = match;
      
      // Normaliza C/V
      let type: 'COMPRA' | 'VENDA';
      if (cv === 'C' || cv === 'COMPRA') type = 'COMPRA';
      else if (cv === 'V' || cv === 'VENDA') type = 'VENDA';
      else continue;
      
      // Remove sufixo F e limpa ticker
      const cleanTicker = ticker.replace(/F$/, '').trim();
      
      // Parse números (aceita . e , como separadores)
      const quantity = parseInt(qtd);
      const price = parseFloat(preco.replace(/\./g, '').replace(',', '.'));
      const totalValue = total ? parseFloat(total.replace(/\./g, '').replace(',', '.')) : quantity * price;
      
      operations.push({
        ticker: cleanTicker,
        type,
        quantity,
        price,
        totalValue,
        fees: 0,
        date: tradeDate,
        broker
      });
    }
    
    // Calcula taxas proporcionais
    if (operations.length > 0) {
      const feePatterns = [
        /Total\s+CBLC\s+([\d,.]+)/i,
        /Taxa\s+de\s+liquida[cç][aã]o\s+([\d,.]+)/i,
        /Emolumentos\s+([\d,.]+)/i,
        /Taxa\s+de\s+registro\s+([\d,.]+)/i,
        /Corretagem\s+([\d,.]+)/i
      ];
      
      let totalFees = 0;
      feePatterns.forEach(pattern => {
        const match = text.match(pattern);
        if (match) {
          const fee = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
          if (!isNaN(fee)) totalFees += fee;
        }
      });
      
      // Distribui taxas proporcionalmente
      const totalValue = operations.reduce((sum, op) => sum + op.totalValue, 0);
      if (totalValue > 0) {
        operations.forEach(op => {
          op.fees = (op.totalValue / totalValue) * totalFees;
        });
      }
    }
    
    return operations;
  };

  const identifyAssetType = (ticker: string): AssetType => {
    // FIIs terminam em 11
    if (ticker.endsWith('11') && ticker.length === 6) return 'FII';
    
    // ETFs: alguns terminam em 11 mas são mais longos, ou têm padrões específicos
    const etfPatterns = ['BOVA', 'IVVB', 'SMAL', 'PIBB', 'DIVO'];
    if (etfPatterns.some(p => ticker.startsWith(p))) return 'ETF';
    
    // Ações: terminam em 3 (ON) ou 4 (PN) ou outros números
    if (ticker.match(/^[A-Z]{4}[0-9]$/)) return 'ACAO';
    
    return 'ACAO';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadFile(file);
      setUploadResults(null);
      setShowPreview(false);
      setPreviewOperations([]);
    } else {
      alert("Por favor, selecione um arquivo PDF válido.");
    }
  };

  const handlePreviewOperations = async () => {
    if (!uploadFile) return;
    
    setIsProcessing(true);
    try {
      const text = await extractTextFromPDF(uploadFile);
      const broker = detectBroker(text);
      setDetectedBroker(broker);
      
      const operations = parseNotaCorretagem(text, broker);
      
      if (operations.length === 0) {
        alert("Nenhuma operação encontrada no PDF. Verifique o formato.");
        setIsProcessing(false);
        return;
      }
      
      setPreviewOperations(operations);
      setShowPreview(true);
    } catch (err: any) {
      alert(`Erro ao processar PDF: ${err.message}`);
    }
    setIsProcessing(false);
  };

  const handleConfirmImport = async () => {
    if (previewOperations.length === 0) return;
    
    setIsProcessing(true);
    setShowPreview(false);
    
    try {
      let imported = 0;
      let errors = 0;
      
      for (const op of previewOperations) {
        try {
          let asset = assets.find(a => a.ticker === op.ticker);
          
          if (!asset) {
            const newAsset = await addAsset({
              ticker: op.ticker,
              name: op.ticker,
              type: identifyAssetType(op.ticker),
              sector: 'Não Especificado',
              quantity: 0,
              avg_price: 0
            });
            asset = newAsset;
          }
          
          await addTrade({
            assetId: asset.id!,
            type: op.type,
            quantity: op.quantity,
            price: op.price,
            fees: op.fees,
            date: op.date
          });
          
          imported++;
        } catch (err) {
          console.error("Erro ao importar:", op, err);
          errors++;
        }
      }
      
      setUploadResults({
        success: true,
        message: `${imported} operações importadas com sucesso!`,
        operations: previewOperations,
        imported,
        errors,
        broker: detectedBroker
      });
      
      await loadDatabaseData(false);
      setPreviewOperations([]);
      
    } catch (err: any) {
      setUploadResults({
        success: false,
        message: `Erro: ${err.message}`,
        operations: []
      });
    }
    
    setIsProcessing(false);
  };

  // HANDLERS DE FORMULÁRIOS
  const handleAssetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const assetPayload = {
      ticker: String(data.ticker).toUpperCase(),
      name: String(data.name),
      type: normalizeAssetType(String(data.type)),
      sector: String(data.sector),
      quantity: Number(data.quantity) || 0,
      avg_price: Number(data.avg_price) || 0,
    };
    try {
      await addAsset(assetPayload as any);
      setModalType(null);
    } catch (err) {
      alert("Falha ao salvar ativo.");
    }
  };

  const handleEditClick = (asset: Asset) => {
    setEditingAsset(asset);
    setModalType('EDIT');
    setUpdateStatus(null);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAsset || !editingAsset.id) return;

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const updatedPayload = {
      ticker: String(data.ticker).toUpperCase(),
      name: String(data.name),
      type: normalizeAssetType(String(data.type)),
      sector: String(data.sector),
      quantity: Number(data.quantity) || 0,
      avg_price: Number(data.avg_price) || 0,
    };

    try {
      setUpdateStatus(null);
      const { supabase, supabaseAdmin } = await import('../services');
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('assets')
        .update(updatedPayload)
        .eq('id', editingAsset.id);

      if (error) {
        setUpdateStatus({ success: false, msg: `Erro: ${error.message}` });
        return;
      }

      setUpdateStatus({ success: true, msg: "Ativo atualizado!" });
      
      setTimeout(async () => {
        await loadDatabaseData(false);
        setModalType(null);
        setEditingAsset(null);
        setUpdateStatus(null);
      }, 1000);
    } catch (err: any) {
      setUpdateStatus({ success: false, msg: `Falha: ${err.message}` });
    }
  };

  const handleTradeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const tradePayload = {
      ...data,
      quantity: Number(data.quantity),
      price: Number(data.price),
      fees: Number(data.fees) || 0
    };
    try {
      await addTrade(tradePayload as any);
      setModalType(null);
    } catch (err) {
      alert("Falha ao salvar operação.");
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const isInitialLoading = contextLoading && assets.length === 0 && !hasLoadedOnce.current;

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-400 font-mono text-sm">CARREGANDO CARTEIRA...</p>
      </div>
    );
  }

  const portfolioTotal = sortedAssets.reduce((sum, a) => sum + a.totalValue, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="text-emerald-500" /> Carteira de Investimentos
          </h2>
          <p className="text-slate-400 text-sm">Gerencie seus ativos diretamente no terminal.</p>
          {portfolioTotal > 0 && (
            <p className="text-blue-400 font-mono text-lg font-bold mt-2">
              Valor Total: {formatCurrency(portfolioTotal)}
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="ghost" onClick={handleRefresh} disabled={isRefreshing}>
             <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </Button>
          <Button variant="secondary" onClick={() => setModalType('UPLOAD')}>
            <Upload size={18} /> Nota Corretagem
          </Button>
          <Button variant="secondary" onClick={() => setModalType('ASSET')}>
            <Plus size={18} /> Ativo
          </Button>
          <Button onClick={() => setModalType('TRADE')}>
            <ArrowRightLeft size={18} /> Operação
          </Button>
        </div>
      </div>

      {/* TABELA */}
      {assets.length === 0 ? (
        <div className="p-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
             <Layers size={48} className="mx-auto text-slate-700 mb-4" />
             <p className="mb-4">Nenhum ativo disponível.</p>
             <div className="flex gap-4 justify-center flex-wrap">
               <Button variant="ghost" onClick={() => setModalType('UPLOAD')}>Importar Nota</Button>
               <Button variant="ghost" onClick={() => setModalType('ASSET')}>Adicionar Manual</Button>
             </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            {isRefreshing && (
                <div className="absolute inset-0 bg-slate-950/40 z-10 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold text-[10px]">
                        <tr>
                            <th className="p-5">
                                <button onClick={() => handleSort('ticker')} className="flex items-center gap-2 hover:text-white transition-colors">
                                    TICKER <SortIcon field="ticker" />
                                </button>
                            </th>
                            <th className="p-5">
                                <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-white transition-colors">
                                    NOME <SortIcon field="name" />
                                </button>
                            </th>
                            <th className="p-5">
                                <button onClick={() => handleSort('sector')} className="flex items-center gap-2 hover:text-white transition-colors">
                                    SETOR <SortIcon field="sector" />
                                </button>
                            </th>
                            <th className="p-5 text-right">
                                <button onClick={() => handleSort('quantity')} className="flex items-center gap-2 hover:text-white transition-colors ml-auto">
                                    QTD <SortIcon field="quantity" />
                                </button>
                            </th>
                            <th className="p-5 text-right">
                                <button onClick={() => handleSort('avgPrice')} className="flex items-center gap-2 hover:text-white transition-colors ml-auto">
                                    PREÇO MÉDIO <SortIcon field="avgPrice" />
                                </button>
                            </th>
                            <th className="p-5 text-right">
                                <button onClick={() => handleSort('totalValue')} className="flex items-center gap-2 hover:text-white transition-colors ml-auto">
                                    VALOR TOTAL <SortIcon field="totalValue" />
                                </button>
                            </th>
                            <th className="p-5 text-center">ORIGEM</th>
                            <th className="p-5 text-right">AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sortedAssets.map((asset) => (
                            <tr key={asset.id} className="hover:bg-blue-500/5 transition-colors group">
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 font-bold border border-slate-700">
                                            {asset.ticker.substring(0,2)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white uppercase">{asset.ticker}</p>
                                            <p className="text-[10px] text-slate-500 uppercase">{asset.type}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5 text-slate-300">{asset.name}</td>
                                <td className="p-5">
                                    <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-400">
                                        {asset.sector}
                                    </span>
                                </td>
                                <td className="p-5 text-right font-mono text-slate-300 font-bold">
                                    {asset.calculatedQuantity.toFixed(0)}
                                </td>
                                <td className="p-5 text-right font-mono text-emerald-400 font-bold">
                                    {formatCurrency(asset.calculatedAvgPrice)}
                                </td>
                                <td className="p-5 text-right font-mono text-blue-400 font-bold text-base">
                                    {formatCurrency(asset.totalValue)}
                                </td>
                                <td className="p-5 text-center">
                                    <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${
                                        asset.hasRealTrades 
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                        {asset.hasRealTrades ? 'OPERAÇÕES' : 'MANUAL'}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleEditClick(asset)}
                                            className="text-slate-600 hover:text-blue-500 p-2 hover:bg-blue-500/10 rounded-lg transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => { if(confirm('Excluir ativo?')) deleteItem('assets', asset.id!) }} 
                                            className="text-slate-600 hover:text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-800/50 border-t-2 border-slate-700">
                        <tr>
                            <td colSpan={5} className="p-5 text-right font-bold text-slate-300 uppercase text-xs">
                                Total do Portfólio:
                            </td>
                            <td className="p-5 text-right font-mono text-blue-400 font-bold text-lg">
                                {formatCurrency(portfolioTotal)}
                            </td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
      )}

      {/* MODAL: Upload Nota de Corretagem */}
      <Modal 
        isOpen={modalType === 'UPLOAD'} 
        onClose={() => {
          setModalType(null);
          setUploadFile(null);
          setUploadResults(null);
          setShowPreview(false);
          setPreviewOperations([]);
        }} 
        title="Importar Nota de Corretagem"
      >
        <div className="space-y-4">
          {!uploadResults && !showPreview ? (
            <>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-xs text-blue-300 flex items-start gap-2">
                  <FileText size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Corretoras Suportadas:</strong> BTG Pactual, XP, Clear, Rico, Nubank, Inter e Ágora.
                    O sistema detecta automaticamente o formato e extrai as operações.
                  </span>
                </p>
              </div>
              
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors">
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-300 font-medium mb-2">
                    {uploadFile ? uploadFile.name : 'Clique para selecionar PDF'}
                  </p>
                  <p className="text-xs text-slate-500">Arraste ou clique para selecionar</p>
                </label>
              </div>
              
              {uploadFile && !isProcessing && (
                <Button onClick={handlePreviewOperations} className="w-full">
                  <Eye size={18} /> Visualizar Operações
                </Button>
              )}
              
              {isProcessing && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="animate-spin text-blue-500" size={48} />
                  <p className="text-slate-400 font-mono text-sm">PROCESSANDO PDF...</p>
                </div>
              )}
            </>
          ) : showPreview ? (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-blue-300 font-medium">
                  📊 <strong>Corretora Detectada:</strong> {detectedBroker}
                </p>
                <p className="text-xs text-blue-300 mt-1">
                  {previewOperations.length} operações encontradas
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/50">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-left text-slate-400">Ticker</th>
                      <th className="p-3 text-left text-slate-400">Tipo</th>
                      <th className="p-3 text-right text-slate-400">Qtd</th>
                      <th className="p-3 text-right text-slate-400">Preço</th>
                      <th className="p-3 text-right text-slate-400">Total</th>
                      <th className="p-3 text-right text-slate-400">Taxas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {previewOperations.map((op, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-white">{op.ticker}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-1 rounded ${
                            op.type === 'COMPRA' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {op.type}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">{op.quantity}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">{formatCurrency(op.price)}</td>
                        <td className="p-3 text-right font-mono text-blue-400">{formatCurrency(op.totalValue)}</td>
                        <td className="p-3 text-right font-mono text-slate-500">{formatCurrency(op.fees)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-800/50 border-t-2 border-slate-700 sticky bottom-0">
                    <tr>
                      <td colSpan={4} className="p-3 text-right font-bold text-slate-400">Total:</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-400">
                        {formatCurrency(previewOperations.reduce((sum, op) => sum + op.totalValue, 0))}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {formatCurrency(previewOperations.reduce((sum, op) => sum + op.fees, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  className="flex-1"
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewOperations([]);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleConfirmImport}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  Confirmar Importação
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                uploadResults.success 
                  ? 'bg-emerald-500/10 border-emerald-500/20' 
                  : 'bg-rose-500/10 border-rose-500/20'
              }`}>
                {uploadResults.success ? 
                  <CheckCircle className="text-emerald-400 flex-shrink-0" size={20} /> : 
                  <AlertCircle className="text-rose-400 flex-shrink-0" size={20} />
                }
                <div className="flex-1">
                  <p className={uploadResults.success ? 'text-emerald-300 font-medium' : 'text-rose-300'}>
                    {uploadResults.message}
                  </p>
                  {uploadResults.success && (
                    <>
                      <p className="text-xs mt-2 text-slate-400">
                        Corretora: {uploadResults.broker} | 
                        Importadas: {uploadResults.imported} | 
                        Erros: {uploadResults.errors}
                      </p>
                      <p className="text-xs mt-1 text-emerald-400">
                        ✓ Ativos criados automaticamente
                        <br />✓ Preços médios calculados
                        <br />✓ Taxas distribuídas proporcionalmente
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  setModalType(null);
                  setUploadFile(null);
                  setUploadResults(null);
                }} 
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL: Cadastrar Ativo */}
      <Modal isOpen={modalType === 'ASSET'} onClose={() => setModalType(null)} title="Cadastrar Ativo">
        <form onSubmit={handleAssetSubmit} className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
            <p className="text-xs text-blue-300">
              💡 <strong>Dica:</strong> Valores iniciais. Para cálculo preciso, registre operações ou importe nota de corretagem.
            </p>
          </div>
          
          <Input label="Código (Ticker)" required name="ticker" placeholder="Ex: PETR4" className="uppercase font-mono" />
          <Input label="Nome Curto" required name="name" placeholder="Petrobras" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo" name="type">
                <option value="ACAO">Ação</option>
                <option value="FII">FII</option>
                <option value="ETF">ETF</option>
                <option value="RENDA_FIXA">Renda Fixa</option>
                <option value="CRIPT">Cripto</option>
            </Select>
            <Input label="Setor" name="sector" placeholder="Energia" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <Input label="Qtd. Inicial" name="quantity" type="number" defaultValue="0" />
            <Input label="P. Médio Inicial (R$)" name="avg_price" type="number" step="0.01" defaultValue="0" />
          </div>
          <Button type="submit" className="w-full">Salvar Ativo</Button>
        </form>
      </Modal>

      {/* MODAL: Editar Ativo */}
      <Modal 
        isOpen={modalType === 'EDIT'} 
        onClose={() => {
          setModalType(null);
          setEditingAsset(null);
          setUpdateStatus(null);
        }} 
        title="Editar Ativo"
      >
        {editingAsset && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {updateStatus && (
              <div className={`p-4 rounded-xl flex items-center gap-3 border animate-in fade-in ${
                updateStatus.success 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {updateStatus.success ? <Save size={20} /> : <XIcon size={20} />}
                <span className="text-sm font-medium">{updateStatus.msg}</span>
              </div>
            )}

            <Input 
              label="Código (Ticker)" 
              required 
              name="ticker" 
              defaultValue={editingAsset.ticker}
              className="uppercase font-mono" 
            />
            <Input 
              label="Nome Curto" 
              required 
              name="name" 
              defaultValue={editingAsset.name}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Tipo" name="type" defaultValue={editingAsset.type}>
                  <option value="ACAO">Ação</option>
                  <option value="FII">FII</option>
                  <option value="ETF">ETF</option>
                  <option value="RENDA_FIXA">Renda Fixa</option>
                  <option value="CRIPT">Cripto</option>
              </Select>
              <Input 
                label="Setor" 
                name="sector" 
                defaultValue={editingAsset.sector}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <Input 
                label="Quantidade (Ref.)" 
                name="quantity" 
                type="number" 
                defaultValue={editingAsset.quantity || 0}
              />
              <Input 
                label="P. Médio (Ref. R$)" 
                name="avg_price" 
                type="number" 
                step="0.01" 
                defaultValue={editingAsset.avg_price || 0}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                className="flex-1"
                onClick={() => {
                  setModalType(null);
                  setEditingAsset(null);
                  setUpdateStatus(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                <Save size={18} /> Salvar
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Registrar Operação */}
      <Modal isOpen={modalType === 'TRADE'} onClose={() => setModalType(null)} title="Registrar Operação">
        <form onSubmit={handleTradeSubmit} className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
            <p className="text-xs text-emerald-300">
              ✅ Cálculo automático de preço médio considerando todas operações.
            </p>
          </div>
          
          <Select label="Ativo" name="assetId" required>
            <option value="">Selecione...</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.ticker} - {a.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Direção" name="type">
                <option value="COMPRA">COMPRA</option>
                <option value="VENDA">VENDA</option>
            </Select>
            <Input label="Data" type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantidade" type="number" name="quantity" required />
            <Input label="Preço Unit. (R$)" type="number" step="0.01" name="price" required />
          </div>
          <Input label="Taxas/Corretagem (R$)" type="number" step="0.01" name="fees" defaultValue="0" />
          <Button type="submit" className="w-full">Confirmar Operação</Button>
        </form>
      </Modal>
    </div>
  );
};