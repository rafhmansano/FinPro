import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

interface FinanceContextType {
  accounts: Account[];
  transactions: Transaction[];
  assets: Asset[];
  trades: Trade[];
  dividends: Dividend[];
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  addAccount: (account: Account) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  addAsset: (asset: Asset) => Promise<void>;
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
  addTrade: (trade: Trade) => Promise<void>;
  addDividend: (dividend: Dividend) => Promise<void>;
  deleteItem: (table: string, id: string) => Promise<void>;
  bulkInsert: (table: string, items: any[]) => Promise<number>;
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured] = useState(isSupabaseConfigured());

  const fetchData = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

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

      if (accountsRes.error) console.error('Accounts error:', accountsRes.error);
      if (transactionsRes.error) console.error('Transactions error:', transactionsRes.error);
      if (assetsRes.error) console.error('Assets error:', assetsRes.error);
      if (tradesRes.error) console.error('Trades error:', tradesRes.error);
      if (dividendsRes.error) console.error('Dividends error:', dividendsRes.error);

      setAccounts(accountsRes.data || []);
      setTransactions(transactionsRes.data || []);
      setAssets(assetsRes.data || []);
      setTrades(tradesRes.data || []);
      setDividends(dividendsRes.data || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
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

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        assets,
        trades,
        dividends,
        loading,
        error,
        isConfigured,
        addAccount,
        addTransaction,
        addAsset,
        updateAsset,
        addTrade,
        addDividend,
        deleteItem,
        bulkInsert,
        refreshData
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};
