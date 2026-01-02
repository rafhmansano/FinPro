// Services - usa o cliente único do supabase.ts
import { supabase } from './supabase';

// Re-exporta o supabase para compatibilidade
export { supabase };

// Flag para modo mock/demo
export const isMock = false;

// Normaliza tipo de ativo
export const normalizeAssetType = (type: string): string => {
  const t = (type || '').toUpperCase().trim();
  if (['ACAO', 'AÇÃO', 'STOCK', 'ACOES', 'AÇÕES'].includes(t)) return 'ACAO';
  if (['FII', 'FUNDO IMOBILIARIO', 'FUNDO IMOBILIÁRIO'].includes(t)) return 'FII';
  if (['ETF', 'FUNDO DE ÍNDICE'].includes(t)) return 'ETF';
  if (['RF', 'RENDA FIXA', 'RENDA_FIXA', 'CDB', 'LCI', 'LCA', 'TESOURO'].includes(t)) return 'RENDA_FIXA';
  return 'ACAO';
};

// Google Sheets Service
export class GoogleSheetsService {
  static async fetchAndParse(url: string): Promise<any[]> {
    try {
      // Converte URL do Google Sheets para CSV
      let csvUrl = url;
      if (url.includes('docs.google.com/spreadsheets')) {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          const sheetId = match[1];
          csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        }
      }

      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error('Falha ao buscar planilha');
      
      const text = await response.text();
      return this.parseCSV(text);
    } catch (error: any) {
      throw new Error(`Erro ao processar planilha: ${error.message}`);
    }
  }

  static parseCSV(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });
  }
}

// Market Data Service para Valuation
export class MarketDataService {
  private static apiKey: string = '';
  private static baseUrl: string = 'https://brapi.dev/api';

  static async getQuote(ticker: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/quote/${ticker}?token=${this.apiKey}`);
      if (!response.ok) throw new Error(`Failed to fetch quote for ${ticker}`);
      const data = await response.json();
      return data.results?.[0] || null;
    } catch (error) {
      console.error(`Error fetching quote for ${ticker}:`, error);
      return null;
    }
  }

  static async getLatestPrice(ticker: string): Promise<number> {
    try {
      const quote = await this.getQuote(ticker);
      return quote?.regularMarketPrice || 0;
    } catch {
      // Retorna preço simulado para demo
      return Math.random() * 50 + 10;
    }
  }

  static async getCompanyFundamentals(ticker: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/quote/${ticker}?fundamental=true&token=${this.apiKey}`);
      if (!response.ok) throw new Error(`Failed to fetch fundamentals for ${ticker}`);
      const data = await response.json();
      const result = data.results?.[0] || {};
      
      return {
        dy: result.dividendYield || (Math.random() * 10).toFixed(2),
        pl: result.priceEarnings || (Math.random() * 20 + 5).toFixed(2),
        pvp: result.priceToBook || (Math.random() * 2 + 0.5).toFixed(2),
        eps: result.earningsPerShare || (Math.random() * 5 + 1).toFixed(2),
        roe: result.returnOnEquity || (Math.random() * 20 + 5).toFixed(2),
      };
    } catch {
      // Retorna dados simulados para demo
      return {
        dy: (Math.random() * 10).toFixed(2),
        pl: (Math.random() * 20 + 5).toFixed(2),
        pvp: (Math.random() * 2 + 0.5).toFixed(2),
        eps: (Math.random() * 5 + 1).toFixed(2),
        roe: (Math.random() * 20 + 5).toFixed(2),
      };
    }
  }
}

// Valuation Engine para cálculos de valuation
export class ValuationEngine {
  // Dividend Discount Model (DDM) - Gordon Growth Model
  static calculateDDM(currentDividend: number, growthRate: number, discountRate: number): number {
    if (discountRate <= growthRate) return 0;
    return (currentDividend * (1 + growthRate)) / (discountRate - growthRate);
  }

  // Graham Number
  static calculateGrahamNumber(eps: number, bookValuePerShare: number): number {
    if (eps <= 0 || bookValuePerShare <= 0) return 0;
    return Math.sqrt(22.5 * eps * bookValuePerShare);
  }

  // Margin of Safety calculation
  static calculateMarginOfSafety(intrinsicValue: number, currentPrice: number): number {
    if (intrinsicValue <= 0) return 0;
    return ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
  }

  // Análise principal
  static analyze(ticker: string, currentPrice: number, fundamentals: any, assetType: string): {
    intrinsicValue: number;
    upside: number;
    recommendation: 'COMPRA' | 'VENDA' | 'MANTER';
    strategy: string;
  } {
    let intrinsicValue = 0;
    let strategy = 'GRAHAM';

    const eps = parseFloat(fundamentals.eps) || 0;
    const dy = parseFloat(fundamentals.dy) || 0;
    const pvp = parseFloat(fundamentals.pvp) || 1;

    // Calcula valor intrínseco baseado no tipo de ativo
    if (assetType === 'FII') {
      // Para FIIs, usa modelo de dividendos
      const annualDividend = currentPrice * (dy / 100);
      intrinsicValue = this.calculateDDM(annualDividend, 0.03, 0.10);
      strategy = 'GORDON DDM';
    } else {
      // Para ações, usa Graham Number
      const bookValue = currentPrice / pvp;
      intrinsicValue = this.calculateGrahamNumber(eps, bookValue);
      strategy = 'GRAHAM';
    }

    // Se não conseguiu calcular, usa P/L médio
    if (intrinsicValue <= 0 || !isFinite(intrinsicValue)) {
      intrinsicValue = eps * 15; // P/L de 15x
      strategy = 'P/L MÉDIO';
    }

    const upside = currentPrice > 0 ? ((intrinsicValue - currentPrice) / currentPrice) * 100 : 0;

    let recommendation: 'COMPRA' | 'VENDA' | 'MANTER' = 'MANTER';
    if (upside >= 20) recommendation = 'COMPRA';
    else if (upside <= -20) recommendation = 'VENDA';

    return {
      intrinsicValue,
      upside,
      recommendation,
      strategy
    };
  }
}

// Funções de serviço auxiliares para Supabase
export const fetchAccounts = async () => {
  const { data, error } = await supabase.from('accounts').select('*');
  if (error) throw error;
  return data || [];
};

export const fetchTransactions = async () => {
  const { data, error } = await supabase.from('transactions').select('*');
  if (error) throw error;
  return data || [];
};

export const fetchAssets = async () => {
  const { data, error } = await supabase.from('assets').select('*');
  if (error) throw error;
  return data || [];
};

export const fetchTrades = async () => {
  const { data, error } = await supabase.from('trades').select('*');
  if (error) throw error;
  return data || [];
};

export const fetchDividends = async () => {
  const { data, error } = await supabase.from('dividends').select('*');
  if (error) throw error;
  return data || [];
};
