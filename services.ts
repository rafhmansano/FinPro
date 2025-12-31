
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const MANUAL_URL = ""; 
const MANUAL_KEY = ""; 

let supabaseUrl: string = "https://mock.supabase.co";
let supabaseKey: string = "mock-key";
let supabaseServiceKey: string | null = null;

try {
  const localUrl = localStorage.getItem('finb3_supabase_url');
  const localKey = localStorage.getItem('finb3_supabase_key');
  // Ajuste na chave para bater com Settings.tsx
  const localServiceKey = localStorage.getItem('finb3_supabase_service_role');

  if (MANUAL_URL && MANUAL_KEY) {
    supabaseUrl = MANUAL_URL;
    supabaseKey = MANUAL_KEY;
  }
  else if (localUrl && localKey) {
    supabaseUrl = localUrl;
    supabaseKey = localKey;
    supabaseServiceKey = localServiceKey;
  }
} catch (error) {
  console.error("❌ Erro ao carregar configurações do Supabase:", error);
}

export const isMock = supabaseUrl === "https://mock.supabase.co";

// Cliente Público (Sujeito a RLS)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente Administrativo (Bypass RLS)
export const supabaseAdmin: SupabaseClient | null = (!isMock && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

/**
 * Normaliza tipos de ativos para o padrão esperado pelo banco de dados.
 */
export const normalizeAssetType = (value: string): string => {
  if (!value) return 'ACAO';
  
  const normalized = value.trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
    .replace(/\s+/g, '_');
  
  const typeMap: Record<string, string> = {
    'ACAO': 'ACAO', 'ACOES': 'ACAO', 'ACTION': 'ACAO', 'STOCKS': 'ACAO', 'STOCK': 'ACAO',
    'FII': 'FII', 'FUNDO_IMOBILIARIO': 'FII', 'FUNDO_IMOBILARIO': 'FII', 'REIT': 'FII', 'FUNDO': 'FII',
    'RENDA_FIXA': 'RENDA_FIXA', 'RF': 'RENDA_FIXA', 'CDB': 'RENDA_FIXA', 'LCA': 'RENDA_FIXA', 'LCI': 'RENDA_FIXA', 'TESOURO': 'RENDA_FIXA',
    'ETF': 'ETF', 'INDEX_FUND': 'ETF',
    'CRIPT': 'CRIPT', 'CRIPTO': 'CRIPT', 'CRYPTO': 'CRIPT', 'BITCOIN': 'CRIPT', 'BTC': 'CRIPT'
  };
  
  return typeMap[normalized] || 'ACAO';
};

export const GoogleSheetsService = {
  convertLinkToCsv: (url: string) => {
    try {
      const idMatch = url.match(/\/d\/(.*?)(\/|$)/);
      if (!idMatch) return null;
      const id = idMatch[1];
      const gidMatch = url.match(/gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    } catch (e) {
      return null;
    }
  },
  fetchAndParse: async (url: string) => {
    const csvUrl = GoogleSheetsService.convertLinkToCsv(url);
    if (!csvUrl) throw new Error("Link do Google Sheets inválido.");
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("Não foi possível acessar a planilha.");
    const text = await response.text();
    const rows = text.split(/\r?\n/).filter(r => r.trim());
    if (rows.length < 2) throw new Error("Planilha vazia.");
    const separator = rows[0].includes(';') ? ';' : ',';
    const headers = rows[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    return rows.slice(1).map(row => {
      const values = row.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: any = {};
      headers.forEach((h, i) => { if (h) obj[h] = values[i]; });
      return obj;
    });
  }
};

export const MarketDataService = {
  getLatestPrice: async (ticker: string): Promise<number> => {
    const mockPrices: Record<string, number> = {
      'PETR4': 36.50, 'VALE3': 68.20, 'WEGE3': 40.10, 'ITUB4': 32.80,
      'HGLG11': 162.50, 'MXRF11': 10.35, 'KNRI11': 158.90,
      'TESOURO SELIC': 14500.00, 'IVVB11': 280.50, 'BTC': 350000.00
    };
    return mockPrices[ticker.toUpperCase()] || 100.00;
  },
  getCompanyFundamentals: async (ticker: string) => {
    const mocks: Record<string, any> = {
      'PETR4': { lpa: 4.5, vpa: 28.0, dy: 18.5, roe: 30 },
      'VALE3': { lpa: 8.2, vpa: 45.0, dy: 12.0, roe: 25 }
    };
    return mocks[ticker.toUpperCase()] || { lpa: 1, vpa: 1, dy: 0, roe: 0 };
  }
};

export const ValuationEngine = {
  analyze: (ticker: string, price: number, fundamentals: any, type: string) => {
    let intrinsicValue = 0;
    const strategy = (type === 'ACAO') ? 'Graham' : (type === 'FII' ? 'Gordon' : 'Preço de Tela');
    if (type === 'ACAO') {
      intrinsicValue = Math.sqrt(22.5 * (fundamentals.lpa || 0) * (fundamentals.vpa || 0));
    } else if (type === 'FII') {
      intrinsicValue = (price * ((fundamentals.dy || 0) / 100)) / 0.08;
    } else {
      intrinsicValue = price;
    }
    const upside = price > 0 ? ((intrinsicValue - price) / price) * 100 : 0;
    const recommendation = (upside > 15 ? 'COMPRA' : (upside < -10 ? 'VENDA' : 'MANTER')) as 'COMPRA' | 'VENDA' | 'MANTER';
    return { 
      intrinsicValue: isNaN(intrinsicValue) ? 0 : intrinsicValue, 
      upside: isNaN(upside) ? 0 : upside, 
      recommendation, 
      strategy 
    };
  }
};
