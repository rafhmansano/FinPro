import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';  // Corrigido: arquivo é supabase.ts na raiz
import { useAuth } from './contexts/AuthContext';

// Types
export interface Asset {
  id?: string;
  user_id?: string;
  ticker: string;
  name: string;
  type: 'ACAO' | 'FII' | 'ETF' | 'RENDA_FIXA';
  sector?: string;
  currency?: string;
  quantity?: number;
  avg_price?: number;
  current_price?: number;
  last_quote_update?: string;
}

export interface Trade {
  id?: string;
  user_id?: string;
  asset_id?: string;
  ticker: string;
  type: 'BUY' | 'SELL' | 'COMPRA' | 'VENDA';
  quantity: number;
  price: number;
  date: string;
  fees?: number;
  notes?: string;
}

export interface Dividend {
  id?: string;
  user_id?: string;
  ticker: string;
  type: string;
  total_value?: number;
  totalValue?: number;
  payment_date?: string;
  paymentDate?: string;
}

export interface Account {
  id?: string;
  user_id?: string;
  name: string;
  type: string;
  initial_balance?: number;
  initialBalance?: number;
  icon?: string;
}

export interface Transaction {
  id?: string;
  user_id?: string;
  account_id?: string;
  accountId?: string;
  description: string;
  value?: number;
  amount?: number;
  type: string;
  category?: string;
  date?: string;
  transaction_date?: string;
}

export interface Valuation {
  id?: string;
  user_id?: string;
  ticker: string;
  method: string;
  fair_price: number;
  current_price?: number;
  inputs?: Record<string, number>;
  calculated_at?: string;
  notes?: string;
}

export interface PortfolioPosition {
  id: string;
  ticker: string;
  name: string;
  type: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalCost: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  currency: string;
}

interface FinanceContextType {
  // Data
  assets: Asset[];
  trades: Trade[];
  dividends: Dividend[];
  accounts: Account[];
  transactions: Transaction[];
  valuations: Valuation[];
  portfolio: PortfolioPosition[];
  
  // Loading states
  loading: boolean;
  quotesLoading: boolean;
  
  // Asset operations
  addAsset: (asset: Omit<Asset, 'id' | 'user_id'>) => Promise<void>;
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
  
  // Trade operations
  addTrade: (trade: Omit<Trade, 'id' | 'user_id'>) => Promise<void>;
  
  // Dividend operations
  addDividend: (dividend: Omit<Dividend, 'id' | 'user_id'>) => Promise<void>;
  
  // Account operations
  addAccount: (account: Omit<Account, 'id' | 'user_id'>) => Promise<void>;
  
  // Transaction operations
  addTransaction: (transaction: Omit<Transaction, 'id' | 'user_id'>) => Promise<void>;
  
  // Valuation operations
  addValuation: (valuation: Omit<Valuation, 'id' | 'user_id'>) => Promise<void>;
  updateValuation: (id: string, valuation: Partial<Valuation>) => Promise<void>;
  
  // Bulk operations
  bulkInsert: (table: string, data: any[]) => Promise<{ success: number; failed: number }>;
  
  // Delete
  deleteItem: (table: string, id: string) => Promise<void>;
  
  // Quotes
  updateQuotes: () => Promise<{ success: number; failed: number }>;
  
  // Refresh
  refreshData: () => Promise<void>;
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
  const { user } = useAuth();
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Fetch all data for the current user
  const fetchData = useCallback(async () => {
    if (!user) {
      // Clear all data if no user
      setAssets([]);
      setTrades([]);
      setDividends([]);
      setAccounts([]);
      setTransactions([]);
      setValuations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // RLS will automatically filter by user_id
      const [
        { data: assetsData },
        { data: tradesData },
        { data: dividendsData },
        { data: accountsData },
        { data: transactionsData },
        { data: valuationsData }
      ] = await Promise.all([
        supabase.from('assets').select('*').order('ticker'),
        supabase.from('trades').select('*').order('date', { ascending: false }),
        supabase.from('dividends').select('*').order('payment_date', { ascending: false }),
        supabase.from('accounts').select('*').order('name'),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('valuations').select('*').order('ticker')
      ]);

      setAssets(assetsData || []);
      setTrades(tradesData || []);
      setDividends(dividendsData || []);
      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);
      setValuations(valuationsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch data when user changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate portfolio positions
  const portfolio: PortfolioPosition[] = React.useMemo(() => {
    const holdings: Record<string, {
      ticker: string;
      name: string;
      type: string;
      quantity: number;
      totalCost: number;
      currentPrice: number;
      currency: string;
      assetId: string;
    }> = {};

    // Process trades to calculate positions
    trades.forEach(trade => {
      const ticker = trade.ticker?.toUpperCase();
      if (!ticker) return;

      const asset = assets.find(a => a.ticker?.toUpperCase() === ticker);
      
      if (!holdings[ticker]) {
        holdings[ticker] = {
          ticker,
          name: asset?.name || ticker,
          type: asset?.type || 'ACAO',
          quantity: 0,
          totalCost: 0,
          currentPrice: asset?.current_price || 0,
          currency: asset?.currency || 'BRL',
          assetId: asset?.id || ''
        };
      }

      const qty = Number(trade.quantity) || 0;
      const price = Number(trade.price) || 0;
      const tradeType = trade.type?.toUpperCase();

      if (tradeType === 'BUY' || tradeType === 'COMPRA') {
        holdings[ticker].totalCost += qty * price;
        holdings[ticker].quantity += qty;
      } else if (tradeType === 'SELL' || tradeType === 'VENDA') {
        const avgPrice = holdings[ticker].quantity > 0 
          ? holdings[ticker].totalCost / holdings[ticker].quantity 
          : 0;
        holdings[ticker].totalCost -= qty * avgPrice;
        holdings[ticker].quantity -= qty;
      }

      // Update current price from asset
      if (asset?.current_price) {
        holdings[ticker].currentPrice = asset.current_price;
      }
    });

    // Convert to array and calculate metrics
    return Object.values(holdings)
      .filter(h => h.quantity > 0)
      .map(h => {
        const avgPrice = h.quantity > 0 ? h.totalCost / h.quantity : 0;
        const marketValue = h.quantity * h.currentPrice;
        const gainLoss = marketValue - h.totalCost;
        const gainLossPercent = h.totalCost > 0 ? (gainLoss / h.totalCost) * 100 : 0;

        return {
          id: h.assetId || h.ticker,
          ticker: h.ticker,
          name: h.name,
          type: h.type,
          quantity: h.quantity,
          avgPrice,
          currentPrice: h.currentPrice,
          totalCost: h.totalCost,
          marketValue,
          gainLoss,
          gainLossPercent,
          currency: h.currency
        };
      })
      .sort((a, b) => b.marketValue - a.marketValue);
  }, [trades, assets]);

  // Add asset with user_id
  const addAsset = async (asset: Omit<Asset, 'id' | 'user_id'>) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('assets')
      .insert([{ ...asset, user_id: user.id }]);
    
    if (error) {
      console.error('Error adding asset:', error);
      throw error;
    }
    
    await fetchData();
  };

  // Update asset
  const updateAsset = async (id: string, asset: Partial<Asset>) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('assets')
      .update(asset)
      .eq('id', id)
      .eq('user_id', user.id); // Extra safety
    
    if (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
    
    await fetchData();
  };

  // Add trade with user_id
  const addTrade = async (trade: Omit<Trade, 'id' | 'user_id'>) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('trades')
      .insert([{ ...trade, user_id: user.id }]);
    
    if (error) {
      console.error('Error adding trade:', error);
      throw error;
    }
    
    await fetchData();
  };

  // Add dividend with user_id
  const addDividend = async (dividend: Omit<Dividend, 'id' | 'user_id'>) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('dividends')
      .insert([{ ...dividend, user_id: user.id }]);
    
    if (error) {
      console.error('Error adding dividend:', error);
      throw error;
    }
    
    await fetchData();
  };

  // Add account with user_id
  const addAccount = async (account: Omit<Account, 'id' | 'user_id'>) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('accounts')
      .insert([{ ...account, user_id: user.id }]);
    
    if (error) {
      console.error('Error adding account:', error);
      throw error;
    }
    
    await fetchData();
  };

  // Add transaction with user_id
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'user_id'>) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('transactions')
      .insert([{ ...transaction, user_id: user.id }]);
    
    if (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
    
    await fetchData();
  };

  // Add valuation with user_id
  const addValuation = async (valuation: Omit<Valuation, 'id' | 'user_id'>) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('valuations')
      .insert([{ ...valuation, user_id: user.id }]);
    
    if (error) {
      console.error('Error adding valuation:', error);
      throw error;
    }
    
    await fetchData();
  };

  // Update valuation
  const updateValuation = async (id: string, valuation: Partial<Valuation>) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('valuations')
      .update(valuation)
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating valuation:', error);
      throw error;
    }
    
    await fetchData();
  };

  // Bulk insert with user_id
  const bulkInsert = async (table: string, data: any[]): Promise<{ success: number; failed: number }> => {
    if (!user || !data.length) return { success: 0, failed: 0 };
    
    // Add user_id to all records
    const dataWithUserId = data.map(item => ({ ...item, user_id: user.id }));
    
    const { error } = await supabase
      .from(table)
      .insert(dataWithUserId);
    
    if (error) {
      console.error(`Error bulk inserting to ${table}:`, error);
      return { success: 0, failed: data.length };
    }
    
    await fetchData();
    return { success: data.length, failed: 0 };
  };

  // Delete item (RLS will ensure user can only delete their own)
  const deleteItem = async (table: string, id: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw error;
    }
    
    await fetchData();
  };

  // Update quotes for all assets
  const updateQuotes = async (): Promise<{ success: number; failed: number }> => {
    if (!user || assets.length === 0) return { success: 0, failed: 0 };
    
    setQuotesLoading(true);
    let success = 0;
    let failed = 0;

    const brlAssets = assets.filter(a => a.currency !== 'USD');
    const usdAssets = assets.filter(a => a.currency === 'USD');

    // Fetch BRL quotes from BRAPI
    for (const asset of brlAssets) {
      try {
        const response = await fetch(`https://brapi.dev/api/quote/${asset.ticker}`);
        const data = await response.json();
        
        if (data.results?.[0]?.regularMarketPrice) {
          await supabase
            .from('assets')
            .update({ 
              current_price: data.results[0].regularMarketPrice,
              last_quote_update: new Date().toISOString()
            })
            .eq('id', asset.id)
            .eq('user_id', user.id);
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error fetching quote for ${asset.ticker}:`, error);
        failed++;
      }
    }

    // Fetch USD quotes (placeholder - implement your preferred API)
    for (const asset of usdAssets) {
      try {
        // You can use Yahoo Finance, Alpha Vantage, etc.
        // For now, mark as failed
        failed++;
      } catch (error) {
        failed++;
      }
    }

    await fetchData();
    setQuotesLoading(false);
    
    return { success, failed };
  };

  const value: FinanceContextType = {
    assets,
    trades,
    dividends,
    accounts,
    transactions,
    valuations,
    portfolio,
    loading,
    quotesLoading,
    addAsset,
    updateAsset,
    addTrade,
    addDividend,
    addAccount,
    addTransaction,
    addValuation,
    updateValuation,
    bulkInsert,
    deleteItem,
    updateQuotes,
    refreshData: fetchData
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

export default FinanceContext;
