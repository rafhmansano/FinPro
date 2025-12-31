import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
import { supabase, supabaseAdmin, isMock, normalizeAssetType } from './services';
import { Asset, Transaction, Trade, Dividend, PortfolioPosition, Account } from './types';
import { User } from '@supabase/supabase-js';

const ALLOWED_ASSET_TYPES = ['ACAO', 'FII', 'RENDA_FIXA', 'ETF', 'CRIPT'];

interface FinanceContextType {
  user: User | null;
  loading: boolean;
  transactions: Transaction[];
  assets: Asset[];
  trades: Trade[];
  dividends: Dividend[];
  accounts: Account[];
  portfolio: PortfolioPosition[];
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<any>;
  addAsset: (data: Omit<Asset, 'id'>) => Promise<any>;
  addTrade: (data: Omit<Trade, 'id'>) => Promise<any>;
  addDividend: (data: Omit<Dividend, 'id'>) => Promise<any>;
  addAccount: (data: Omit<Account, 'id'>) => Promise<any>;
  updateItem: (table: string, id: string, data: any) => Promise<void>;
  bulkInsert: (table: string, items: any[]) => Promise<number>;
  deleteItem: (table: string, id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  getDbCounts: () => Promise<Record<string, number>>;
  adoptOrphanData: () => Promise<number>;
  isDemo: boolean;
  loadDatabaseData: (force?: boolean) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const isInitialMount = useRef(true);
  const isLoadingData = useRef(false);

  const enableDemoMode = () => {
    setIsDemo(true);
    setUser({ id: 'demo-user', email: 'demo@finb3.pro' } as User);
    setLoading(false);
  };

  useEffect(() => {
    if (isMock) { enableDemoMode(); return; }
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
           setUser(session.user);
           setIsDemo(false);
        } else {
           enableDemoMode();
        }
      } catch (err) {
        enableDemoMode();
      }
    };
    initAuth();
  }, []);

  const fetchTableData = async (table: string): Promise<any[]> => {
    if (isMock) return [];
    try {
      const client = supabaseAdmin || supabase;
      let query = client.from(table).select('*').order('created_at', { ascending: false });
      
      if (!supabaseAdmin && user && user.id !== 'demo-user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) {
          console.warn(`Aviso ao buscar ${table}:`, error.message);
          return [];
      }
      return data || [];
    } catch (e) {
      console.error(`Falha técnica ao buscar ${table}:`, e);
      return [];
    }
  };

  const loadDatabaseData = async (force: boolean = false) => {
      if (isLoadingData.current) {
        console.log('⏸️ Carregamento já em andamento, ignorando chamada duplicada');
        return;
      }

      if (isMock) { 
        setLoading(false); 
        return; 
      }
      
      isLoadingData.current = true;

      if (isInitialMount.current || force === true) {
          setLoading(true);
      }

      try {
        const [transData, assetsData, tradesData, divsData, accsData] = await Promise.all([
          fetchTableData('transactions'),
          fetchTableData('assets'),
          fetchTableData('trades'),
          fetchTableData('dividends'),
          fetchTableData('accounts'),
        ]);
        setTransactions(transData);
        setAssets(assetsData);
        setTrades(tradesData);
        setDividends(divsData);
        setAccounts(accsData);
      } catch (err) {
        console.error("Erro crítico no carregamento do banco:", err);
      } finally {
        setLoading(false);
        isInitialMount.current = false;
        isLoadingData.current = false;
      }
  };

  const bulkInsert = async (table: string, items: any[]) => {
    if (isMock) return 0;
    const client = supabaseAdmin || supabase;
    const itemsToInsert = items.map((item) => {
      const newItem = { ...item };
      
      if (table === 'assets') {
        newItem.type = normalizeAssetType(newItem.type);
        if (!ALLOWED_ASSET_TYPES.includes(newItem.type)) newItem.type = 'ACAO';
      }
      
      if (table === 'dividends') {
        if (newItem.paymentDate) {
          newItem.payment_date = newItem.paymentDate;
          delete newItem.paymentDate;
        }
        if (newItem.totalValue) {
          newItem.total_value = newItem.totalValue;
          delete newItem.totalValue;
        }
        if (newItem.type) {
          const typeMap: Record<string, string> = {
            'DIVIDENDO': 'DIVIDENDO',
            'DIVIDENDOS': 'DIVIDENDO',
            'DIV': 'DIVIDENDO',
            'JCP': 'JCP',
            'JUROS': 'JCP',
            'RENDIMENTO': 'RENDIMENTO',
            'RENDIMENTOS': 'RENDIMENTO',
            'REND': 'RENDIMENTO'
          };
          newItem.type = typeMap[String(newItem.type).toUpperCase()] || 'DIVIDENDO';
        }
      }
      
      if (table === 'trades') {
        if (newItem.assetId) {
          newItem.asset_id = newItem.assetId;
          delete newItem.assetId;
        }
      }
      
      if (table === 'transactions') {
        if (newItem.accountId) {
          newItem.account_id = newItem.accountId;
          delete newItem.accountId;
        }
      }
      
      if (table === 'accounts') {
        if (newItem.initialBalance) {
          newItem.initial_balance = newItem.initialBalance;
          delete newItem.initialBalance;
        }
      }
      
      if (user && user.id && user.id !== 'demo-user') newItem.user_id = user.id;
      return newItem;
    });
    
    const { data, error } = await client.from(table).insert(itemsToInsert).select();
    if (error) throw new Error(error.message);
    await loadDatabaseData(false);
    return data?.length || 0;
  };

  const handleAdd = async (table: string, data: any, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    if (isMock) return data;
    const client = supabaseAdmin || supabase;
    const insertPayload = { ...data };
    
    if (table === 'assets' && insertPayload.type) {
        insertPayload.type = normalizeAssetType(insertPayload.type);
        if (!ALLOWED_ASSET_TYPES.includes(insertPayload.type)) insertPayload.type = 'ACAO';
    }
    
    if (table === 'dividends') {
        if (insertPayload.paymentDate) {
            insertPayload.payment_date = insertPayload.paymentDate;
            delete insertPayload.paymentDate;
        }
        if (insertPayload.totalValue) {
            insertPayload.total_value = insertPayload.totalValue;
            delete insertPayload.totalValue;
        }
        if (insertPayload.type) {
            const typeMap: Record<string, string> = {
                'DIVIDENDO': 'DIVIDENDO',
                'DIVIDENDOS': 'DIVIDENDO',
                'DIV': 'DIVIDENDO',
                'JCP': 'JCP',
                'JUROS': 'JCP',
                'RENDIMENTO': 'RENDIMENTO',
                'RENDIMENTOS': 'RENDIMENTO',
                'REND': 'RENDIMENTO'
            };
            insertPayload.type = typeMap[String(insertPayload.type).toUpperCase()] || 'DIVIDENDO';
        }
    }
    
    if (table === 'trades') {
        if (insertPayload.assetId) {
            insertPayload.asset_id = insertPayload.assetId;
            delete insertPayload.assetId;
        }
    }
    
    if (table === 'transactions') {
        if (insertPayload.accountId) {
            insertPayload.account_id = insertPayload.accountId;
            delete insertPayload.accountId;
        }
    }
    
    if (table === 'accounts') {
        if (insertPayload.initialBalance) {
            insertPayload.initial_balance = insertPayload.initialBalance;
            delete insertPayload.initialBalance;
        }
    }
    
    if (user && user.id && user.id !== 'demo-user') insertPayload.user_id = user.id;
    
    const { data: inserted, error } = await client.from(table).insert([insertPayload]).select().single();
    if (error) throw error;
    setter(prev => [inserted, ...prev]);
    return inserted;
  };

  const adoptOrphanData = async () => {
      if (!supabaseAdmin || !user || isDemo || user.id === 'demo-user') return 0;
      const tables = ['assets', 'transactions', 'trades', 'dividends', 'accounts'];
      let count = 0;
      for (const t of tables) {
          const { data } = await supabaseAdmin.from(t).select('id').is('user_id', null);
          if (data && data.length > 0) {
              const ids = data.map(i => i.id);
              const { error } = await supabaseAdmin.from(t).update({ user_id: user.id }).in('id', ids);
              if (!error) count += ids.length;
          }
      }
      if (count > 0) await loadDatabaseData(false);
      return count;
  };

  const updateItem = async (table: string, id: string, data: any) => {
    if (isMock) return;
    const client = supabaseAdmin || supabase;
    
    const updatePayload = { ...data };
    
    if (table === 'assets' && updatePayload.type) {
      updatePayload.type = normalizeAssetType(updatePayload.type);
      if (!ALLOWED_ASSET_TYPES.includes(updatePayload.type)) {
        updatePayload.type = 'ACAO';
      }
    }
    
    const { error } = await client
      .from(table)
      .update(updatePayload)
      .eq('id', id);
    
    if (error) {
      console.error("Erro ao atualizar:", error.message);
      throw new Error(error.message);
    }
    
    await loadDatabaseData(false);
  };

  useEffect(() => {
    if ((user || isDemo) && isInitialMount.current) {
      loadDatabaseData();
    }
  }, [user, isDemo]);

  const portfolio = useMemo(() => {
    const positions: Record<string, any> = {};
    trades.forEach(trade => {
      if (!trade.assetId) return;
      if (!positions[trade.assetId]) positions[trade.assetId] = { quantity: 0, totalCost: 0 };
      const pos = positions[trade.assetId];
      const qty = Number(trade.quantity) || 0;
      const price = Number(trade.price) || 0;
      const fees = Number(trade.fees) || 0;
      const totalTrade = (qty * price) + fees;
      if (trade.type === 'COMPRA') { pos.totalCost += totalTrade; pos.quantity += qty; }
      else if (trade.type === 'VENDA') { const avg = pos.quantity > 0 ? pos.totalCost / pos.quantity : 0; pos.totalCost -= (qty * avg); pos.quantity -= qty; }
    });
    return assets.map(asset => {
      let pos = positions[asset.id!] || { 
        quantity: Number(asset.quantity || 0), 
        totalCost: Number(asset.quantity || 0) * Number(asset.avg_price || 0) 
      };
      const currentPrice = asset.lastPrice || 100;
      const marketValue = pos.quantity * currentPrice;
      const gainLoss = marketValue - pos.totalCost;
      const gainLossPerc = pos.totalCost > 0 ? (gainLoss / pos.totalCost) * 100 : 0;
      return { 
        ...asset, 
        quantity: pos.quantity, 
        avgPrice: pos.quantity > 0 ? pos.totalCost / pos.quantity : 0, 
        marketValue, 
        gainLoss, 
        gainLossPerc, 
        currentPrice 
      };
    }).filter(p => p.quantity > 0) as PortfolioPosition[];
  }, [assets, trades]);

  const value = {
    user, loading, transactions, assets, trades, dividends, portfolio, accounts,
    addTransaction: (data: any) => handleAdd('transactions', data, setTransactions),
    addAsset: (data: any) => handleAdd('assets', data, setAssets),
    addTrade: (data: any) => handleAdd('trades', data, setTrades),
    addDividend: (data: any) => handleAdd('dividends', data, setDividends),
    addAccount: (data: any) => handleAdd('accounts', data, setAccounts),
    bulkInsert,
    updateItem,
    deleteItem: async (table: string, id: string) => {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from(table).delete().eq('id', id);
        if (error) {
            console.error("Erro ao deletar:", error.message);
            return;
        }
        await loadDatabaseData(false);
    },
    refreshData: () => loadDatabaseData(false),
    loadDatabaseData,
    getDbCounts: async () => ({}),
    adoptOrphanData,
    isDemo
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within a FinanceProvider");
  return context;
};