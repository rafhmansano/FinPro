// Services - usa o cliente único do supabase.ts
import { supabase } from './supabase';

// Re-exporta o supabase para compatibilidade
export { supabase };

// Funções de serviço auxiliares
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
