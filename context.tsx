import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

// Types
export interface Account {
  id?: string;
  name: string;
  type: string;
  initial_balance?: number;
  initialBalance?: number;
  icon?: string;
  user_id?: string;
}

export interface Transaction {
  id?: string;
  account_id?: string;
  accountId?: string;
  description: string;
  value?: number;
  amount?: number;
  type: string;
  category?: string;
  date?: string;
  transaction_date?: string;
  user_id?: string;
}

export interface Asset {
  id?: string;
  ticker: string;
  name: string;
  type: string;
  sector?: string;
  currency?: string;
  quantity?: number;
  avg_price?: number;
  user_id?: string;
}

export interface Trade {
  id?: string;
  ticker: string;
  type: string;
  quantity: number;
  price: number;
  date?: string;
  trade_date?: string;
  user_id?: string;
}

export interface Dividend {
  id?: string;
  ticker: string;
  type?: string;
  payment_date?: string;
  paymentDate?: string;
  total_value?: number;
  totalValue?: number;
  user_id?: string;
}

export interface Quote {
  ticker: string;
  price: number;
  change?: number;
  change_percent?: number;
  updated_at?: string;
}

export interface PortfolioPosition {
  id: string;
  ticker: string;
  name: string;
  type: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  currency: string;
  lastUpdate?: string;
}

interface FinanceContextType {
  accounts: Account[];
  transactions: Transaction[];
  assets: Asset[];
  trades: Trade[];
  dividends: Dividend[];
  quotes: Map<string, Quote>;
  portfolio: PortfolioPosition[];
  loading: boolean;
  quotesLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  isDemo: boolean;
  user: { id: string; email?: string } | null;
  brapiApiKey: string | null;
  setBrapiApiKey: (key: string) => void;
  addAccount: (account: Account) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  addAsset: (asset: Asset) => Promise<void>;
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
  addTrade: (trade: Trade) => Promise<void>;
  addDividend: (dividend: Dividend) => Promise<void>;
  deleteItem: (table: string, id: string) => Promise<void>;
  bulkInsert: (table: string, items: any[]) => Promise<number>;
  refreshData: () => Promise<void>;
  updateQuotes: (tickers?: string[]) => Promise<{ success: number; failed: number }>;
  getQuote: (ticker: string) => Quote | null;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

interface FinanceProviderProps {
  children: ReactNode;
}

export const FinanceProvider: React.FC<FinanceProviderProps> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured] = useState(isSupabaseConfigured());
  const [user] = useState<{ id: string; email?: string } | null>({ id: 'local-user', email: 'usuario@finpro.app' });
  const [brapiApiKey, setBrapiApiKeyState] = useState<string | null>(() => {
    return localStorage.getItem('brapi_api_key') || null;
  });
  const isDemo = !isConfigured;

  const setBrapiApiKey = (key: string) => {
    localStorage.setItem('brapi_api_key', key);
    setBrapiApiKeyState(key);
  };

  // Calcula portfolio com MÚLTIPLAS ESTRATÉGIAS para garantir que funcione
  const portfolio = useMemo(() => {
    console.log('=== 🔄 RECALCULANDO PORTFOLIO ===');
    console.log('📊 Total de Assets:', assets.length);
    console.log('📈 Total de Trades:', trades.length);
    console.log('💱 Total de Quotes:', quotes.size);
    
    const portfolioMap = new Map<string, PortfolioPosition>();
    
    // ESTRATÉGIA 1: Assets com quantity > 0 (dados diretos)
    assets.forEach(asset => {
      const ticker = asset.ticker?.toUpperCase();
      if (!ticker) return;
      
      const qty = Number(asset.quantity) || 0;
      const avgPrice = Number(asset.avg_price) || 0;
      
      if (qty > 0 && avgPrice > 0) {
        const quote = quotes.get(ticker);
        const currentPrice = quote?.price || avgPrice;
        const totalCost = qty * avgPrice;
        const marketValue = qty * currentPrice;
        const gainLoss = marketValue - totalCost;
        const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
        
        portfolioMap.set(ticker, {
          id: asset.id || ticker,
          ticker,
          name: asset.name || ticker,
          type: asset.type || 'ACAO',
          quantity: qty,
          avgPrice,
          currentPrice,
          marketValue,
          totalCost,
          gainLoss,
          gainLossPercent,
          currency: asset.currency || (ticker === 'TFLO' ? 'USD' : 'BRL'),
          lastUpdate: quote?.updated_at
        });
        
        console.log(`✅ [ASSET] ${ticker}: qty=${qty}, pm=R$${avgPrice.toFixed(2)}, atual=R$${currentPrice.toFixed(2)}, total=R$${marketValue.toFixed(2)}`);
      }
    });
    
    console.log(`📊 Estratégia 1 (Assets): ${portfolioMap.size} posições`);
    
    // ESTRATÉGIA 2: Calcular dos Trades (para tickers que não estão nos assets)
    const tradesPositions = new Map<string, { quantity: number; totalCost: number }>();
    
    trades.forEach(trade => {
      const ticker = trade.ticker?.toUpperCase();
      if (!ticker) return;
      
      if (!tradesPositions.has(ticker)) {
        tradesPositions.set(ticker, { quantity: 0, totalCost: 0 });
      }
      
      const pos = tradesPositions.get(ticker)!;
      const qty = Number(trade.quantity) || 0;
      const price = Number(trade.price) || 0;
      const type = (trade.type || '').toUpperCase();
      
      if (type === 'BUY' || type === 'COMPRA') {
        pos.quantity += qty;
        pos.totalCost += qty * price;
      } else if (type === 'SELL' || type === 'VENDA') {
        const avgPrice = pos.quantity > 0 ? pos.totalCost / pos.quantity : 0;
        pos.quantity -= qty;
        if (pos.quantity > 0) {
          pos.totalCost = pos.quantity * avgPrice;
        } else {
          pos.quantity = 0;
          pos.totalCost = 0;
        }
      }
    });
    
    console.log(`📈 Estratégia 2 (Trades): ${tradesPositions.size} tickers processados`);
    
    // Adiciona posições dos trades que não estão nos assets
    tradesPositions.forEach((pos, ticker) => {
      if (pos.quantity > 0 && !portfolioMap.has(ticker)) {
        const asset = assets.find(a => a.ticker?.toUpperCase() === ticker);
        const avgPrice = pos.totalCost / pos.quantity;
        const quote = quotes.get(ticker);
        const currentPrice = quote?.price || avgPrice;
        const totalCost = pos.totalCost;
        const marketValue = pos.quantity * currentPrice;
        const gainLoss = marketValue - totalCost;
        const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
        
        portfolioMap.set(ticker, {
          id: asset?.id || ticker,
          ticker,
          name: asset?.name || ticker,
          type: asset?.type || 'ACAO',
          quantity: pos.quantity,
          avgPrice,
          currentPrice,
          marketValue,
          totalCost,
          gainLoss,
          gainLossPercent,
          currency: asset?.currency || (ticker === 'TFLO' ? 'USD' : 'BRL'),
          lastUpdate: quote?.updated_at
        });
        
        console.log(`➕ [TRADE-ONLY] ${ticker}: qty=${pos.quantity}, pm=R$${avgPrice.toFixed(2)}, total=R$${marketValue.toFixed(2)}`);
      }
    });
    
    const finalPortfolio = Array.from(portfolioMap.values())
      .filter(p => p.quantity > 0)
      .sort((a, b) => b.marketValue - a.marketValue);
    
    const totalValue = finalPortfolio.reduce((sum, p) => sum + p.marketValue, 0);
    const totalCost = finalPortfolio.reduce((sum, p) => sum + p.totalCost, 0);
    
    console.log('=== ✅ PORTFOLIO FINAL ===');
    console.log(`📊 Total de Posições: ${finalPortfolio.length}`);
    console.log(`💰 Valor Investido: R$ ${totalCost.toFixed(2)}`);
    console.log(`💎 Valor Atual: R$ ${totalValue.toFixed(2)}`);
    console.log(`📈 Ganho/Perda: R$ ${(totalValue - totalCost).toFixed(2)} (${totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100).toFixed(2) : 0}%)`);
    console.log('========================');
    
    if (finalPortfolio.length === 0) {
      console.warn('⚠️ ATENÇÃO: Portfolio vazio!');
      console.warn('Verifique se a tabela assets tem registros com quantity > 0');
    }
    
    return finalPortfolio;
  }, [trades, assets, quotes]);

  const fetchData = useCallback(async () => {
    if (!isConfigured) {
      console.log('ℹ️ Modo demo - Supabase não configurado');
      setLoading(false);
      return;
    }

    console.log('🔄 Carregando dados do Supabase...');
    setLoading(true);
    setError(null);

    try {
      const [accountsRes, transactionsRes, assetsRes, tradesRes, dividendsRes] = await Promise.all([
        supabase.from('accounts').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('assets').select('*'),
        supabase.from('trades').select('*'),
        supabase.from('dividends').select('*')
      ]);

      if (accountsRes.error) console.error('❌ Accounts error:', accountsRes.error);
      if (transactionsRes.error) console.error('❌ Transactions error:', transactionsRes.error);
      if (assetsRes.error) console.error('❌ Assets error:', assetsRes.error);
      if (tradesRes.error) console.error('❌ Trades error:', tradesRes.error);
      if (dividendsRes.error) console.error('❌ Dividends error:', dividendsRes.error);

      const loadedAssets = assetsRes.data || [];
      const loadedTrades = tradesRes.data || [];

      setAccounts(accountsRes.data || []);
      setTransactions(transactionsRes.data || []);
      setAssets(loadedAssets);
      setTrades(loadedTrades);
      setDividends(dividendsRes.data || []);

      console.log('=== 📦 DADOS CARREGADOS ===');
      console.log('Assets:', loadedAssets.length);
      console.log('Trades:', loadedTrades.length);
      console.log('==========================');

      // Tenta carregar cotações do banco
      try {
        const { data: quotesData } = await supabase.from('quotes').select('*');
        if (quotesData) {
          const quotesMap = new Map<string, Quote>();
          quotesData.forEach((q: any) => quotesMap.set(q.ticker, q));
          setQuotes(quotesMap);
          console.log('💱 Cotações carregadas:', quotesData.length);
        }
      } catch (e) {
        console.log('ℹ️ Tabela quotes não existe');
      }

    } catch (err: any) {
      console.error('❌ Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addAccount = async (account: Account) => {
    const { data, error } = await supabase.from('accounts').insert([account]).select();
    if (error) throw error;
    if (data) setAccounts(prev => [...prev, ...data]);
  };

  const addTransaction = async (transaction: Transaction) => {
    const { data, error } = await supabase.from('transactions').insert([transaction]).select();
    if (error) throw error;
    if (data) setTransactions(prev => [...prev, ...data]);
  };

  const addAsset = async (asset: Asset) => {
    const { data, error } = await supabase.from('assets').insert([asset]).select();
    if (error) throw error;
    if (data) setAssets(prev => [...prev, ...data]);
  };

  const updateAsset = async (id: string, asset: Partial<Asset>) => {
    const { data, error } = await supabase.from('assets').update(asset).eq('id', id).select();
    if (error) throw error;
    if (data) {
      setAssets(prev => prev.map(a => a.id === id ? { ...a, ...data[0] } : a));
    }
  };

  const addTrade = async (trade: Trade) => {
    const { data, error } = await supabase.from('trades').insert([trade]).select();
    if (error) throw error;
    if (data) setTrades(prev => [...prev, ...data]);
  };

  const addDividend = async (dividend: Dividend) => {
    const { data, error } = await supabase.from('dividends').insert([dividend]).select();
    if (error) throw error;
    if (data) setDividends(prev => [...prev, ...data]);
  };

  const deleteItem = async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;

    switch (table) {
      case 'accounts':
        setAccounts(prev => prev.filter(item => item.id !== id));
        break;
      case 'transactions':
        setTransactions(prev => prev.filter(item => item.id !== id));
        break;
      case 'assets':
        setAssets(prev => prev.filter(item => item.id !== id));
        break;
      case 'trades':
        setTrades(prev => prev.filter(item => item.id !== id));
        break;
      case 'dividends':
        setDividends(prev => prev.filter(item => item.id !== id));
        break;
    }
  };

  const bulkInsert = async (table: string, items: any[]): Promise<number> => {
    if (items.length === 0) return 0;

    const { data, error } = await supabase.from(table).insert(items).select();
    if (error) throw error;

    const insertedCount = data?.length || 0;

    if (data) {
      switch (table) {
        case 'dividends':
          setDividends(prev => [...prev, ...data]);
          break;
        case 'trades':
          setTrades(prev => [...prev, ...data]);
          break;
        case 'assets':
          setAssets(prev => [...prev, ...data]);
          break;
        case 'transactions':
          setTransactions(prev => [...prev, ...data]);
          break;
        case 'accounts':
          setAccounts(prev => [...prev, ...data]);
          break;
      }
    }

    return insertedCount;
  };

  const refreshData = async () => {
    await fetchData();
  };

  const updateQuotes = async (tickers?: string[]): Promise<{ success: number; failed: number }> => {
    setQuotesLoading(true);
    let success = 0;
    let failed = 0;
    
    try {
      if (!brapiApiKey) {
        console.error('❌ API Key não configurada!');
        alert('⚠️ Configure sua API Key da brapi.dev primeiro!\n\nClique em "Configurar API" no menu.');
        return { success: 0, failed: 0 };
      }

      const tickersToUpdate = tickers || assets
        .filter(a => a.type !== 'RENDA_FIXA' && a.ticker)
        .map(a => a.ticker);

      if (tickersToUpdate.length === 0) {
        console.log('⚠️ Nenhum ticker para atualizar');
        return { success: 0, failed: 0 };
      }

      console.log('🔄 Atualizando cotações de:', tickersToUpdate);

      const newQuotes = new Map(quotes);

      for (let i = 0; i < tickersToUpdate.length; i += 10) {
        const batch = tickersToUpdate.slice(i, i + 10);
        const tickersParam = batch.join(',');
        
        console.log(`📡 Buscando batch ${Math.floor(i/10) + 1}:`, batch);
        
        try {
          const response = await fetch(
            `https://brapi.dev/api/quote/${tickersParam}?token=oNFdM2iKWkCym31wsHwDCL`
          );
          
          if (!response.ok) {
            if (response.status === 401) {
              console.error('❌ API Key inválida ou expirada');
              alert('❌ API Key inválida!\n\nVerifique sua chave em https://brapi.dev');
              failed += batch.length;
              break;
            }
            console.error(`❌ Erro HTTP ${response.status}`);
            failed += batch.length;
            continue;
          }

          const data = await response.json();
          if (data.results && Array.isArray(data.results)) {
            for (const result of data.results) {
              const quote: Quote = {
                ticker: result.symbol,
                price: result.regularMarketPrice || 0,
                change: result.regularMarketChange || 0,
                change_percent: result.regularMarketChangePercent || 0,
                updated_at: new Date().toISOString()
              };
              
              newQuotes.set(result.symbol, quote);
              success++;
              console.log(`✅ ${result.symbol}: R$ ${quote.price.toFixed(2)}`);

              try {
                const { data: existing } = await supabase
                  .from('quotes')
                  .select('id')
                  .eq('ticker', quote.ticker)
                  .single();

                if (existing) {
                  await supabase.from('quotes').update(quote).eq('ticker', quote.ticker);
                } else {
                  await supabase.from('quotes').insert([quote]);
                }
              } catch (e) {
                // Tabela pode não existir
              }
            }
          }
        } catch (error) {
          console.error(`❌ Erro no batch:`, error);
          failed += batch.length;
        }
        
        if (i + 10 < tickersToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setQuotes(newQuotes);
      console.log(`✅ Cotações: ${success} atualizadas, ${failed} falhas`);
      return { success, failed };
      
    } catch (error) {
      console.error('❌ Erro geral:', error);
      return { success: 0, failed: tickers?.length || assets.length };
    } finally {
      setQuotesLoading(false);
    }
  };

  const getQuote = (ticker: string): Quote | null => {
    return quotes.get(ticker.toUpperCase()) || null;
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        assets,
        trades,
        dividends,
        quotes,
        portfolio,
        loading,
        quotesLoading,
        error,
        isConfigured,
        isDemo,
        user,
        brapiApiKey,
        setBrapiApiKey,
        addAccount,
        addTransaction,
        addAsset,
        updateAsset,
        addTrade,
        addDividend,
        deleteItem,
        bulkInsert,
        refreshData,
        updateQuotes,
        getQuote
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};
