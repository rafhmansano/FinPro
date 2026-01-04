// quoteService.ts - Serviço para buscar e gerenciar cotações de ativos
import { supabase } from './supabase';

export interface Quote {
  id?: string;
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  volume?: number;
  market_cap?: number;
  updated_at?: string;
  user_id?: string;
}

export interface BrapiQuote {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketDayRange: string;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  marketCap: number;
  regularMarketVolume: number;
  regularMarketPreviousClose: number;
  regularMarketOpen: number;
  fiftyTwoWeekRange: string;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  twoHundredDayAverage: number;
  twoHundredDayAverageChange: number;
  twoHundredDayAverageChangePercent: number;
}

export class QuoteService {
  // URL base da API brapi.dev (gratuita)
  private static readonly BRAPI_URL = 'https://brapi.dev/api/quote';
  
  // Cache de cotações (para evitar requisições excessivas)
  private static quoteCache: Map<string, { quote: Quote; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca cotação de um ativo na API brapi.dev
   */
  static async fetchQuoteFromAPI(ticker: string): Promise<Quote | null> {
    try {
      const tickerFormatted = ticker.toUpperCase().trim();
      
      // Verifica cache
      const cached = this.quoteCache.get(tickerFormatted);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.quote;
      }

      const response = await fetch(`${this.BRAPI_URL}/${tickerFormatted}`);
      
      if (!response.ok) {
        console.error(`Erro ao buscar cotação de ${tickerFormatted}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        console.warn(`Nenhuma cotação encontrada para ${tickerFormatted}`);
        return null;
      }

      const result: BrapiQuote = data.results[0];
      
      const quote: Quote = {
        ticker: tickerFormatted,
        price: result.regularMarketPrice || 0,
        change: result.regularMarketChange || 0,
        change_percent: result.regularMarketChangePercent || 0,
        volume: result.regularMarketVolume || 0,
        market_cap: result.marketCap || 0,
        updated_at: new Date().toISOString()
      };

      // Salva no cache
      this.quoteCache.set(tickerFormatted, { quote, timestamp: Date.now() });

      return quote;
    } catch (error) {
      console.error(`Erro ao buscar cotação de ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Busca múltiplas cotações de uma vez (batch)
   */
  static async fetchMultipleQuotes(tickers: string[]): Promise<Map<string, Quote>> {
    const quotes = new Map<string, Quote>();
    
    // Remove duplicatas e formata
    const uniqueTickers = [...new Set(tickers.map(t => t.toUpperCase().trim()))];
    
    // Busca em lotes de 10 (limite da API gratuita)
    const batchSize = 10;
    for (let i = 0; i < uniqueTickers.length; i += batchSize) {
      const batch = uniqueTickers.slice(i, i + batchSize);
      const tickersParam = batch.join(',');
      
      try {
        const response = await fetch(`${this.BRAPI_URL}/${tickersParam}`);
        
        if (!response.ok) {
          console.error(`Erro no batch ${i}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((result: BrapiQuote) => {
            const quote: Quote = {
              ticker: result.symbol,
              price: result.regularMarketPrice || 0,
              change: result.regularMarketChange || 0,
              change_percent: result.regularMarketChangePercent || 0,
              volume: result.regularMarketVolume || 0,
              market_cap: result.marketCap || 0,
              updated_at: new Date().toISOString()
            };
            
            quotes.set(result.symbol, quote);
            
            // Atualiza cache
            this.quoteCache.set(result.symbol, { quote, timestamp: Date.now() });
          });
        }
      } catch (error) {
        console.error(`Erro ao buscar batch ${i}:`, error);
      }
      
      // Delay entre batches para não sobrecarregar a API
      if (i + batchSize < uniqueTickers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return quotes;
  }

  /**
   * Salva ou atualiza cotação no banco de dados
   */
  static async saveQuote(quote: Quote): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('quotes')
        .select('id')
        .eq('ticker', quote.ticker)
        .single();

      if (existing) {
        // Atualiza
        await supabase
          .from('quotes')
          .update({
            price: quote.price,
            change: quote.change,
            change_percent: quote.change_percent,
            volume: quote.volume,
            market_cap: quote.market_cap,
            updated_at: new Date().toISOString()
          })
          .eq('ticker', quote.ticker);
      } else {
        // Insere
        await supabase
          .from('quotes')
          .insert([quote]);
      }
    } catch (error) {
      console.error(`Erro ao salvar cotação de ${quote.ticker}:`, error);
    }
  }

  /**
   * Busca cotação do banco de dados
   */
  static async getQuoteFromDB(ticker: string): Promise<Quote | null> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .single();

      if (error || !data) return null;
      
      return data as Quote;
    } catch (error) {
      console.error(`Erro ao buscar cotação de ${ticker} do DB:`, error);
      return null;
    }
  }

  /**
   * Busca todas as cotações do banco
   */
  static async getAllQuotesFromDB(): Promise<Quote[]> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar cotações do DB:', error);
        return [];
      }

      return (data as Quote[]) || [];
    } catch (error) {
      console.error('Erro ao buscar cotações:', error);
      return [];
    }
  }

  /**
   * Atualiza cotações de uma lista de ativos
   * Busca da API e salva no banco
   */
  static async updateQuotes(tickers: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const quotes = await this.fetchMultipleQuotes(tickers);
    
    for (const [ticker, quote] of quotes) {
      try {
        await this.saveQuote(quote);
        success++;
      } catch (error) {
        console.error(`Erro ao salvar ${ticker}:`, error);
        failed++;
      }
    }

    // Tickers que não foram encontrados
    const notFound = tickers.filter(t => !quotes.has(t.toUpperCase()));
    failed += notFound.length;

    return { success, failed };
  }

  /**
   * Obtém cotação (busca do cache, DB ou API)
   */
  static async getQuote(ticker: string, forceRefresh = false): Promise<Quote | null> {
    const tickerFormatted = ticker.toUpperCase().trim();

    // Se não forçar atualização, tenta cache
    if (!forceRefresh) {
      const cached = this.quoteCache.get(tickerFormatted);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.quote;
      }

      // Tenta buscar do DB
      const dbQuote = await this.getQuoteFromDB(tickerFormatted);
      if (dbQuote) {
        // Verifica se cotação do DB é recente (menos de 1 hora)
        const updatedAt = new Date(dbQuote.updated_at || 0).getTime();
        if (Date.now() - updatedAt < 60 * 60 * 1000) {
          this.quoteCache.set(tickerFormatted, { quote: dbQuote, timestamp: Date.now() });
          return dbQuote;
        }
      }
    }

    // Busca da API
    const apiQuote = await this.fetchQuoteFromAPI(tickerFormatted);
    if (apiQuote) {
      await this.saveQuote(apiQuote);
      return apiQuote;
    }

    return null;
  }

  /**
   * Limpa cache de cotações
   */
  static clearCache(): void {
    this.quoteCache.clear();
  }

  /**
   * Verifica se uma cotação está desatualizada
   */
  static isQuoteStale(quote: Quote, maxAgeMinutes = 60): boolean {
    if (!quote.updated_at) return true;
    const age = Date.now() - new Date(quote.updated_at).getTime();
    return age > maxAgeMinutes * 60 * 1000;
  }
}

export default QuoteService;
