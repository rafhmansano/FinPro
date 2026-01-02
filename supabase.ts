import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credenciais do Supabase (públicas - seguro para frontend)
const SUPABASE_URL = 'https://vdxrrqknfgwfajfxncei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeHJycWtuZmd3ZmFqZnhuY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODQ2NjcsImV4cCI6MjA3NDE2MDY2N30.FRueGvrSYp8A1q5iTI_4O_APp0av1A85VzyCgudbhMM';

// Cria o cliente Supabase
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Funções auxiliares para verificar conexão
export const getSupabaseUrl = (): string => SUPABASE_URL;
export const isSupabaseConfigured = (): boolean => true;

// Exporta as credenciais para uso em outros lugares se necessário
export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
};
