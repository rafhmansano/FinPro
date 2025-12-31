import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
import { Button, Modal, Input, Select } from '../components/ui';
import { Plus, Trash2, BarChart2, PieChart as PieIcon, Calendar, TrendingUp, Edit2, Save, X as XIcon, Upload, Download, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

type FilterType = 'ALL' | 'ACAO' | 'FII' | 'ETF';
type ViewMode = 'TABLE' | 'MONTHLY' | 'YEARLY' | 'BY_ASSET';
type SortField = 'paymentDate' | 'ticker' | 'type' | 'assetType' | 'totalValue';
type SortOrder = 'asc' | 'desc';

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

export const Dividends = () => {
  const { dividends, addDividend, deleteItem, assets, bulkInsert } = useFinance();
  const [isOpen, setIsOpen] = useState(false);
  const [editingDividend, setEditingDividend] = useState<any>(null);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [searchTicker, setSearchTicker] = useState('');
  
  // Estados para ordenação
  const [sortField, setSortField] = useState<SortField>('paymentDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Estados para importação
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  // Identifica tipo do ativo
  const getAssetType = (ticker: string): 'ACAO' | 'FII' | 'ETF' => {
    if (!ticker) return 'ACAO';
    
    const normalizedTicker = ticker.toUpperCase().trim();
    
    // Lista de ETFs conhecidos
    const etfs = ['BOVA11', 'IVVB11', 'SMAL11', 'HASH11', 'QBTC11', 'BOVV11', 'PIBB11', 'SPXI11', 'NASD11'];
    if (etfs.includes(normalizedTicker)) return 'ETF';
    
    // Lista COMPLETA de Units de ações conhecidas (terminam em 11 mas NÃO são FIIs)
    // Units são compostas por ações ON + PN, por isso terminam em 11
    const units = [
      // Energia/Utilidades
      'TAEE11', 'SAPR11', 'ALUP11', 'ENGI11', 'RNEW11', 'TIET11', 'AESB11', 'CMIG11', 'ELET11', 'CPLE11',
      // Bancos e Financeiras
      'SANB11', 'BPAC11', 'SULA11', 'KLBN11', 'BIDI11', 'BMGB11',
      // Outros
      'UNIT11'
    ];
    if (units.includes(normalizedTicker)) {
      return 'ACAO';
    }
    
    // FIIs conhecidos (lista expandida)
    const knownFIIs = [
      'HGLG11', 'BCFF11', 'IRDM11', 'ALZR11', 'KNCR11', 'XPML11', 
      'HGCR11', 'CPTS11', 'VGIR11', 'KNSC11', 'MXRF11', 'XPLG11',
      'VILG11', 'BTLG11', 'VISC11', 'HGBS11', 'HGRU11', 'RBRR11',
      'VRTA11', 'RECT11', 'TGAR11', 'RBRF11', 'JSRE11', 'HFOF11'
    ];
    if (knownFIIs.includes(normalizedTicker)) return 'FII';
    
    // Verifica se o ativo está cadastrado na carteira (tem prioridade sobre o fallback)
    const asset = assets.find(a => a.ticker.toUpperCase() === normalizedTicker);
    if (asset) {
      if (asset.type === 'FII') return 'FII';
      if (asset.type === 'ETF') return 'ETF';
      return 'ACAO';
    }
    
    // Fallback: se termina em 11 com 6 caracteres E não é unit conhecida, assume FII
    // Mas este é o ÚLTIMO recurso
    if (normalizedTicker.endsWith('11') && normalizedTicker.length === 6) {
      return 'FII';
    }
    
    return 'ACAO';
  };

  // Dividendos com tipo identificado e normalização de campos
  const dividendsWithType = useMemo(() => {
    // Remove duplicatas por ID
    const uniqueDividends = dividends.filter((d, index, self) =>
      index === self.findIndex(t => t.id === d.id)
    );
    
    return uniqueDividends
      .filter(d => {
        // Aceita tanto snake_case quanto camelCase
        const paymentDate = d.payment_date || d.paymentDate;
        const ticker = d.ticker;
        const totalValue = d.total_value || d.totalValue;
        return paymentDate && ticker && totalValue;
      })
      .map(d => {
        // Normaliza todos os campos
        const paymentDate = d.payment_date || d.paymentDate || '';
        const totalValue = Number(d.total_value || d.totalValue || 0);
        const type = d.type || 'DIVIDENDO';
        
        return {
          id: d.id,
          ticker: d.ticker,
          type: type,
          paymentDate: paymentDate,
          totalValue: totalValue,
          // Campos calculados
          assetType: getAssetType(d.ticker),
          year: paymentDate.substring(0, 4),
          month: paymentDate.substring(5, 7)
        };
      });
  }, [dividends, assets]);

  // Filtragem e ordenação
  const filteredAndSortedDividends = useMemo(() => {
    let filtered = dividendsWithType.filter(d => {
      if (filterType !== 'ALL' && d.assetType !== filterType) return false;
      if (filterYear !== 'ALL' && d.year !== filterYear) return false;
      if (searchTicker && !d.ticker.toLowerCase().includes(searchTicker.toLowerCase())) return false;
      return true;
    });
    
    // Ordenação
    return filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch(sortField) {
        case 'paymentDate':
          aVal = a.paymentDate;
          bVal = b.paymentDate;
          break;
        case 'ticker':
          aVal = a.ticker.toLowerCase();
          bVal = b.ticker.toLowerCase();
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'assetType':
          aVal = a.assetType;
          bVal = b.assetType;
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
  }, [dividendsWithType, filterType, filterYear, searchTicker, sortField, sortOrder]);

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
    return sortOrder === 'asc' 
      ? <ArrowUp size={14} className="text-blue-400" />
      : <ArrowDown size={14} className="text-blue-400" />;
  };

  // Anos disponíveis
  const availableYears = useMemo(() => {
    const years = [...new Set(dividendsWithType.map(d => d.year))].sort().reverse();
    return years;
  }, [dividendsWithType]);

  // Totalizadores (usando filteredAndSortedDividends)
  const totals = useMemo(() => {
    const byType: Record<string, number> = { ACAO: 0, FII: 0, ETF: 0 };
    const byYear: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const byAsset: Record<string, number> = {};
    
    filteredAndSortedDividends.forEach(d => {
      const value = Number(d.totalValue) || 0;
      byType[d.assetType] += value;
      byYear[d.year] = (byYear[d.year] || 0) + value;
      byMonth[`${d.year}-${d.month}`] = (byMonth[`${d.year}-${d.month}`] || 0) + value;
      byAsset[d.ticker] = (byAsset[d.ticker] || 0) + value;
    });
    
    return { byType, byYear, byMonth, byAsset };
  }, [filteredAndSortedDividends]);

  // Dados para gráficos
  const chartData = useMemo(() => {
    // Mensal (últimos 12 meses)
    const monthlyData = Object.entries(totals.byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return {
          name: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`,
          value
        };
      });

    // Anual
    const yearlyData = Object.entries(totals.byYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, value]) => ({ year, value }));

    // Por tipo
    const typeData = [
      { name: 'Ações', value: totals.byType.ACAO, color: '#3b82f6' },
      { name: 'FIIs', value: totals.byType.FII, color: '#f59e0b' },
      { name: 'ETFs', value: totals.byType.ETF, color: '#8b5cf6' }
    ].filter(t => t.value > 0);

    // Por ativo (top 10)
    const assetData = Object.entries(totals.byAsset)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ticker, value]) => ({ ticker, value }));

    return { monthlyData, yearlyData, typeData, assetData };
  }, [totals]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Normaliza o tipo para valores aceitos pelo banco
    const typeMap: Record<string, string> = {
      'DIVIDENDO': 'DIVIDENDO',
      'JCP': 'JCP',
      'RENDIMENTO': 'RENDIMENTO'
    };
    
    const normalizedType = typeMap[String(data.type).toUpperCase()] || 'DIVIDENDO';
    
    const dividendData = {
      ticker: String(data.ticker).toUpperCase(),
      payment_date: data.paymentDate,
      total_value: Number(data.totalValue),
      type: normalizedType
    };
    
    if (editingDividend) {
      // Atualizar (requer função updateItem no context)
      console.log('Atualizar:', editingDividend.id, dividendData);
      // TODO: Implementar updateItem para dividendos
    } else {
      await addDividend(dividendData as any);
    }
    
    setIsOpen(false);
    setEditingDividend(null);
  };

  const handleEdit = (dividend: any) => {
    setEditingDividend(dividend);
    setIsOpen(true);
  };

  // Parser de CSV inteligente que:
  // 1. Respeita aspas
  // 2. Detecta e corrige valores decimais BR quebrados (11,7 vira 11.7)
  const parseCSVLine = (line: string, expectedColumns: number, separator: string = ','): string[] => {
    // Primeiro tenta parse simples respeitando aspas
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    
    // Se temos mais colunas que o esperado, provavelmente um número decimal foi quebrado
    // Ex: ["HGLG11", "15/12/2019", "11", "7", "Dividendo", "FII"] quando esperamos 5 colunas
    if (expectedColumns > 0 && result.length > expectedColumns) {
      console.log(`[CSV] Linha com ${result.length} colunas (esperado: ${expectedColumns}), tentando reagrupar...`);
      
      // Encontra onde está o número quebrado (geralmente coluna do valor)
      // Procura por dois números consecutivos que parecem ser partes de um decimal
      const fixed: string[] = [];
      let i = 0;
      
      while (i < result.length) {
        const current = result[i];
        const next = result[i + 1];
        
        // Se atual é número e próximo também é número curto (1-2 dígitos), provavelmente é decimal quebrado
        if (next !== undefined && 
            /^\d+$/.test(current) && 
            /^\d{1,2}$/.test(next) &&
            fixed.length >= 2) { // Já passou ticker e data
          // Junta como decimal: "11" + "7" -> "11.7"
          fixed.push(`${current}.${next}`);
          console.log(`[CSV] Reagrupado: "${current}" + "${next}" -> "${current}.${next}"`);
          i += 2;
        } else {
          fixed.push(current);
          i++;
        }
      }
      
      return fixed;
    }
    
    return result;
  };

  // Função robusta para parsear valores monetários brasileiros
  const parseMonetaryValue = (rawValue: string): number => {
    if (!rawValue) return 0;
    
    let value = String(rawValue).trim();
    
    // Remove símbolos de moeda e espaços
    value = value.replace(/[R$\s]/g, '');
    
    // Detecta o formato do número
    // Formato BR: 1.234,56 (ponto = milhar, vírgula = decimal)
    // Formato US: 1,234.56 (vírgula = milhar, ponto = decimal)
    
    const hasComma = value.includes(',');
    const hasDot = value.includes('.');
    
    if (hasComma && hasDot) {
      // Ambos presentes - determina qual é decimal pelo último
      const lastComma = value.lastIndexOf(',');
      const lastDot = value.lastIndexOf('.');
      
      if (lastComma > lastDot) {
        // Formato BR: 1.234,56
        value = value.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato US: 1,234.56
        value = value.replace(/,/g, '');
      }
    } else if (hasComma) {
      // Só tem vírgula - assume que é decimal BR
      // Ex: "26,43" -> "26.43"
      value = value.replace(',', '.');
    }
    // Se só tem ponto, já está no formato correto para parseFloat
    
    const parsed = parseFloat(value);
    
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleImportFromSheets = async () => {
    if (!importUrl) return;
    
    setIsImporting(true);
    setImportResults(null);
    
    try {
      // Extrai ID da planilha e GID da aba
      let sheetId = '';
      let gid = '0';
      
      const idMatch = importUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch) sheetId = idMatch[1];
      
      const gidMatch = importUrl.match(/gid=(\d+)/);
      if (gidMatch) gid = gidMatch[1];
      
      if (!sheetId) {
        throw new Error('Link inválido. Certifique-se de copiar o link completo da planilha.');
      }
      
      // Constrói URL do CSV
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error('Não foi possível acessar a planilha. Verifique se ela está compartilhada como "Qualquer pessoa com o link pode visualizar".');
      }
      
      const text = await response.text();
      
      // 🔥 LOG: Mostra as primeiras linhas do CSV para debug
      console.log('=== CSV RECEBIDO (primeiras 5 linhas) ===');
      const allRows = text.split(/\r?\n/);
      allRows.slice(0, 5).forEach((row, i) => console.log(`Linha ${i}: ${row}`));
      console.log('=========================================');
      
      const rows = allRows.filter(r => r.trim());
      
      if (rows.length < 2) throw new Error('Planilha vazia ou sem dados.');
      
      // Detecta separador: TAB, ponto-e-vírgula, ou vírgula
      const firstRow = rows[0];
      let separator: string;
      
      if (firstRow.includes('\t')) {
        separator = '\t';
        console.log('[IMPORT] Separador: TAB');
      } else if (firstRow.includes(';')) {
        separator = ';';
        console.log('[IMPORT] Separador: ponto-e-vírgula');
      } else {
        separator = ',';
        console.log('[IMPORT] Separador: vírgula');
      }
      
      // Conta colunas pelo header
      const headerParts = firstRow.split(separator);
      const expectedColumns = headerParts.length;
      console.log(`[IMPORT] Headers detectados: ${expectedColumns} colunas`);
      console.log('[IMPORT] Headers:', headerParts);
      
      const headers = headerParts.map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      
      // Mapeia colunas da planilha
      const columnMap: Record<string, string> = {
        'ticker': 'ticker',
        'código': 'ticker',
        'codigo': 'ticker',
        'ativo': 'ticker',
        'papel': 'ticker',
        'ação': 'ticker',
        'acao': 'ticker',
        'data': 'paymentDate',
        'data pagamento': 'paymentDate',
        'data de pagamento': 'paymentDate',
        'data do pagamento': 'paymentDate',
        'dt pagamento': 'paymentDate',
        'dt. pagamento': 'paymentDate',
        'valor': 'totalValue',
        'valor total': 'totalValue',
        'rendimento': 'totalValue',
        'valor liquido': 'totalValue',
        'valor líquido': 'totalValue',
        'tipo': 'type',
        'categoria': 'type',
        'classe': 'type',
        'tipo de provento': 'type',
        'provento': 'type',
        // Mapeamento para tipo de ativo (Ação/FII/ETF)
        'fonte': 'assetType',
        'tipo ativo': 'assetType',
        'tipo de ativo': 'assetType',
        'asset type': 'assetType'
      };
      
      const dividendsToImport: any[] = [];
      const errors: string[] = [];
      
      rows.slice(1).forEach((row, index) => {
        try {
          // Usa parser CSV inteligente que reagrupa decimais quebrados
          const values = parseCSVLine(row, expectedColumns, separator);
          const obj: any = {};
          
          headers.forEach((h, i) => {
            const mappedKey = columnMap[h] || h;
            obj[mappedKey] = values[i] || '';
          });
          
          // 🔥 LOG: Mostra dados brutos das primeiras linhas
          if (index < 5) {
            console.log(`[IMPORT] Linha ${index + 2}:`, {
              raw: row.substring(0, 100),
              valuesParsed: values,
              ticker: obj.ticker,
              date: obj.paymentDate,
              value: obj.totalValue
            });
          }
          
          // Valida campos obrigatórios
          if (!obj.ticker || !obj.paymentDate || !obj.totalValue) {
            errors.push(`Linha ${index + 2}: Faltam dados obrigatórios (Ticker, Data ou Valor)`);
            return;
          }
          
          // 🔥 USA A FUNÇÃO ROBUSTA DE PARSE
          const parsedValue = parseMonetaryValue(obj.totalValue);
          
          // Log detalhado para as primeiras linhas
          if (index < 3) {
            console.log(`[IMPORT] Linha ${index + 2}: "${obj.totalValue}" -> ${parsedValue}`);
          }
          
          if (parsedValue <= 0) {
            errors.push(`Linha ${index + 2}: Valor não é um número válido (${obj.totalValue})`);
            return;
          }
          
          // Normaliza o tipo do dividendo
          let dividendType = 'DIVIDENDO';
          if (obj.type) {
            const typeNormalized = String(obj.type).toUpperCase().trim();
            if (['DIVIDENDO', 'DIVIDENDOS', 'DIV'].includes(typeNormalized)) {
              dividendType = 'DIVIDENDO';
            } else if (['JCP', 'JUROS', 'JUROS SOBRE CAPITAL'].includes(typeNormalized)) {
              dividendType = 'JCP';
            } else if (['RENDIMENTO', 'RENDIMENTOS', 'REND', 'FII'].includes(typeNormalized)) {
              dividendType = 'RENDIMENTO';
            }
          }
          
          const dividend: any = {
            ticker: String(obj.ticker).toUpperCase().trim(),
            payment_date: obj.paymentDate,
            total_value: parsedValue,
            type: dividendType
          };
          
          // Normaliza data (aceita DD/MM/YYYY ou YYYY-MM-DD)
          if (dividend.payment_date.includes('/')) {
            const parts = dividend.payment_date.split('/');
            if (parts.length === 3) {
              const [day, month, year] = parts;
              dividend.payment_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
          
          // Valida valores finais
          if (parsedValue <= 0) {
            errors.push(`Linha ${index + 2}: Valor inválido (${obj.totalValue})`);
            return;
          }
          
          if (!dividend.payment_date || dividend.payment_date.length < 8) {
            errors.push(`Linha ${index + 2}: Data inválida (${obj.paymentDate})`);
            return;
          }
          
          dividendsToImport.push(dividend);
          
        } catch (err: any) {
          errors.push(`Linha ${index + 2}: ${err.message}`);
        }
      });
      
      if (dividendsToImport.length === 0) {
        let errorMsg = 'Nenhum dividendo válido encontrado.';
        if (errors.length > 0) {
          errorMsg += `\n\nErros encontrados:\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) errorMsg += `\n... e mais ${errors.length - 5} erros.`;
        }
        throw new Error(errorMsg);
      }
      
      // 🔥 LOG: Mostra os primeiros dividendos que serão enviados
      console.log('=== DIVIDENDOS A SEREM IMPORTADOS (primeiros 5) ===');
      dividendsToImport.slice(0, 5).forEach((d, i) => {
        console.log(`[${i + 1}] ${d.ticker} | ${d.payment_date} | total_value: ${d.total_value} (tipo: ${typeof d.total_value})`);
      });
      console.log('===================================================');
      
      // Importa em lote
      const count = await bulkInsert('dividends', dividendsToImport);
      
      console.log(`[IMPORT] ${count} dividendos inseridos no banco.`);
      
      setImportResults({
        success: true,
        message: `${count} dividendos importados com sucesso!`,
        count,
        preview: dividendsToImport.slice(0, 5),
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined
      });
      
    } catch (err: any) {
      console.error('Erro ao importar:', err);
      setImportResults({
        success: false,
        message: err.message || 'Erro desconhecido ao processar a planilha.'
      });
    }
    
    setIsImporting(false);
  };

  const totalFiltered = filteredAndSortedDividends.reduce((sum, d) => sum + Number(d.totalValue || 0), 0);
  const totalAll = dividendsWithType.reduce((sum, d) => sum + Number(d.totalValue || 0), 0);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="text-emerald-500" /> Dividendos & Proventos
          </h2>
          <p className="text-slate-400 text-sm">Gestão completa de renda passiva</p>
          <div className="flex gap-4 mt-3">
            <div className="text-sm">
              <span className="text-slate-500">Total Geral:</span>
              <span className="font-bold text-emerald-400 ml-2">{formatCurrency(totalAll)}</span>
            </div>
            {totalFiltered !== totalAll && (
              <div className="text-sm">
                <span className="text-slate-500">Filtrado:</span>
                <span className="font-bold text-blue-400 ml-2">{formatCurrency(totalFiltered)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="ghost" onClick={() => setShowImportModal(true)}>
            <Upload size={18} /> Importar Planilha
          </Button>
          <Button onClick={() => { setEditingDividend(null); setIsOpen(true); }}>
            <Plus size={18} /> Adicionar Dividendo
          </Button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Tipo de Ativo</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            >
              <option value="ALL">Todos</option>
              <option value="ACAO">Ações</option>
              <option value="FII">FIIs</option>
              <option value="ETF">ETFs</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Ano</label>
            <select 
              value={filterYear} 
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            >
              <option value="ALL">Todos</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Ticker</label>
            <input 
              type="text"
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              placeholder="Buscar ticker..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Visualização</label>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            >
              <option value="TABLE">Tabela</option>
              <option value="MONTHLY">Mensal</option>
              <option value="YEARLY">Anual</option>
              <option value="BY_ASSET">Por Ativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <TrendingUp className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-blue-300 font-bold uppercase">Ações</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totals.byType.ACAO)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {dividendsWithType.filter(d => d.assetType === 'ACAO').length} pagamentos
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <BarChart2 className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-amber-300 font-bold uppercase">FIIs</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totals.byType.FII)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {dividendsWithType.filter(d => d.assetType === 'FII').length} pagamentos
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <PieIcon className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-purple-300 font-bold uppercase">ETFs</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totals.byType.ETF)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {dividendsWithType.filter(d => d.assetType === 'ETF').length} pagamentos
          </p>
        </div>
      </div>

      {/* GRÁFICOS */}
      {viewMode !== 'TABLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {viewMode === 'MONTHLY' && (
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Evolução Mensal</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px'}}
                      formatter={(val: number) => [formatCurrency(val), 'Recebido']}
                    />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
                  </LineChart>
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
                      <Tooltip 
                        contentStyle={{backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px'}}
                        formatter={(val: number) => [formatCurrency(val), 'Total']}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Distribuição por Tipo</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.typeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      >
                        {chartData.typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
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
              <h3 className="text-lg font-bold text-white mb-6">Top 10 Ativos</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.assetData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} width={80} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px'}}
                      formatter={(val: number) => [formatCurrency(val), 'Total']}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABELA */}
      {viewMode === 'TABLE' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-5">
                    <button 
                      onClick={() => handleSort('paymentDate')} 
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Data <SortIcon field="paymentDate" />
                    </button>
                  </th>
                  <th className="p-5">
                    <button 
                      onClick={() => handleSort('ticker')} 
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Ativo <SortIcon field="ticker" />
                    </button>
                  </th>
                  <th className="p-5">
                    <button 
                      onClick={() => handleSort('assetType')} 
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Tipo <SortIcon field="assetType" />
                    </button>
                  </th>
                  <th className="p-5">
                    <button 
                      onClick={() => handleSort('type')} 
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      Categoria <SortIcon field="type" />
                    </button>
                  </th>
                  <th className="p-5 text-right">
                    <button 
                      onClick={() => handleSort('totalValue')} 
                      className="flex items-center gap-2 hover:text-white transition-colors ml-auto"
                    >
                      Valor <SortIcon field="totalValue" />
                    </button>
                  </th>
                  <th className="p-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredAndSortedDividends.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-5 font-mono text-slate-500">
                      {new Date(d.paymentDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-5 font-bold text-white">{d.ticker}</td>
                    <td className="p-5">
                      <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                        d.assetType === 'ACAO' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        d.assetType === 'FII' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {d.assetType}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-400">
                        {d.type}
                      </span>
                    </td>
                    <td className="p-5 text-right font-bold font-mono text-emerald-400 text-base">
                      {formatCurrency(Number(d.totalValue))}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(d)}
                          className="text-slate-600 hover:text-blue-500 p-2 hover:bg-blue-500/10 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => { if(confirm('Excluir dividendo?')) deleteItem('dividends', d.id!) }}
                          className="text-slate-600 hover:text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAndSortedDividends.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500">
                      Nenhum dividendo encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredAndSortedDividends.length > 0 && (
                <tfoot className="bg-slate-800/50 border-t-2 border-slate-700">
                  <tr>
                    <td colSpan={4} className="p-5 text-right font-bold text-slate-300 uppercase text-xs">
                      Total ({filteredAndSortedDividends.length} pagamentos):
                    </td>
                    <td className="p-5 text-right font-mono text-emerald-400 font-bold text-lg">
                      {formatCurrency(totalFiltered)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar/Editar Dividendo */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => { setIsOpen(false); setEditingDividend(null); }} 
        title={editingDividend ? "Editar Dividendo" : "Registrar Dividendo"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Ativo" name="ticker" required defaultValue={editingDividend?.ticker}>
            <option value="">Selecione...</option>
            {assets.map(a => <option key={a.id} value={a.ticker}>{a.ticker} - {a.name}</option>)}
          </Select>
          
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Data Pagamento" 
              type="date" 
              name="paymentDate" 
              required 
              defaultValue={editingDividend?.paymentDate || new Date().toISOString().split('T')[0]}
            />
            <Select label="Tipo" name="type" defaultValue={editingDividend?.type || 'DIVIDENDO'}>
              <option value="DIVIDENDO">Dividendo</option>
              <option value="JCP">JCP</option>
              <option value="RENDIMENTO">Rendimento (FII)</option>
            </Select>
          </div>
          
          <Input 
            label="Valor Total (R$)" 
            type="number" 
            step="0.01" 
            name="totalValue" 
            required 
            defaultValue={editingDividend?.totalValue}
          />
          
          <Button type="submit" className="w-full">
            {editingDividend ? <><Save size={18} /> Atualizar</> : <><Plus size={18} /> Salvar</>}
          </Button>
        </form>
      </Modal>

      {/* MODAL: Importar da Planilha */}
      <Modal 
        isOpen={showImportModal} 
        onClose={() => { setShowImportModal(false); setImportUrl(''); setImportResults(null); }} 
        title="Importar Dividendos do Google Sheets"
      >
        <div className="space-y-4">
          {!importResults ? (
            <>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-xs text-blue-300">
                  <strong>Cole o link da sua planilha do Google Sheets.</strong>
                  <br />Certifique-se de que a planilha tenha as colunas: Ticker, Data e Valor.
                </p>
              </div>
              
              <Input 
                label="Link do Google Sheets" 
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-2">
                  <strong>Exemplo de estrutura esperada:</strong>
                </p>
                <table className="w-full text-xs text-slate-500">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left p-2">Ticker</th>
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Valor</th>
                      <th className="text-left p-2">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2">PETR4</td>
                      <td className="p-2">15/12/2024</td>
                      <td className="p-2">125,50</td>
                      <td className="p-2">DIVIDENDO</td>
                    </tr>
                    <tr>
                      <td className="p-2">HGLG11</td>
                      <td className="p-2">10/12/2024</td>
                      <td className="p-2">1,35</td>
                      <td className="p-2">RENDIMENTO</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <Button 
                onClick={handleImportFromSheets} 
                className="w-full"
                disabled={!importUrl || isImporting}
              >
                {isImporting ? (
                  <>Processando...</>
                ) : (
                  <><Upload size={18} /> Importar Dividendos</>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                importResults.success 
                  ? 'bg-emerald-500/10 border-emerald-500/20' 
                  : 'bg-rose-500/10 border-rose-500/20'
              }`}>
                {importResults.success ? (
                  <div className="text-emerald-400 flex-shrink-0">✓</div>
                ) : (
                  <div className="text-rose-400 flex-shrink-0">✗</div>
                )}
                <div className="flex-1">
                  <p className={importResults.success ? 'text-emerald-300 font-medium' : 'text-rose-300'}>
                    {importResults.message}
                  </p>
                  {importResults.success && (
                    <p className="text-xs text-slate-400 mt-2">
                      Os dividendos foram adicionados ao histórico e já estão refletidos nos gráficos.
                    </p>
                  )}
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportUrl('');
                  setImportResults(null);
                }} 
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};