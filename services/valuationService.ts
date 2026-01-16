// src/services/valuationService.ts
// Serviço para extração de dados via Supabase Edge Function

import { supabase } from '../supabase';

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedData;
  error?: string;
}

export interface ExtractedData {
  ticker: string;
  assetType: 'ACAO' | 'FII';
  fiiSegment?: string;
  year: number;
  quarter: number;
  reportDate?: string;
  
  // Ações
  shares?: number;
  revenue?: number;
  grossProfit?: number;
  ebitda?: number;
  ebit?: number;
  netIncome?: number;
  equity?: number;
  netDebt?: number;
  cash?: number;
  dividendsPaid?: number;
  capex?: number;
  freeCashFlow?: number;
  
  // FIIs
  nav?: number;
  navPerShare?: number;
  totalRevenue?: number;
  netResult?: number;
  ffo?: number;
  numProperties?: number;
  totalArea?: number;
  vacancyRate?: number;
  avgRentPerSqm?: number;
  capRate?: number;
  numCris?: number;
  portfolioValue?: number;
  avgDuration?: number;
  avgYield?: number;
  ipcaExposure?: number;
  cdiExposure?: number;
  defaultRate?: number;
  salesPerSqm?: number;
  sameStoreSales?: number;
  noi?: number;
  
  // Metadata
  confidence: number;
  extractedFields: string[];
  warnings: string[];
}

/**
 * Extrai dados financeiros de um arquivo usando Supabase Edge Function
 */
export async function extractFinancialData(
  file: File,
  assetType: 'ACAO' | 'FII',
  ticker?: string
): Promise<ExtractionResult> {
  try {
    let fileContent: string;
    let fileType: string;
    
    if (file.type === 'application/pdf') {
      // Converter PDF para base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      fileContent = btoa(binary);
      fileType = 'pdf';
    } else {
      // Ler como texto
      fileContent = await file.text();
      fileType = 'text';
    }
    
    console.log('Chamando Edge Function extract-financial-data...');
    console.log('Tipo:', assetType, 'Ticker:', ticker, 'FileType:', fileType);
    
    // Chamar Edge Function do Supabase
    const { data, error } = await supabase.functions.invoke('extract-financial-data', {
      body: {
        fileContent,
        fileType,
        assetType,
        ticker
      }
    });
    
    if (error) {
      console.error('Erro na Edge Function:', error);
      return { 
        success: false, 
        error: `Erro na extração: ${error.message}. Verifique se a Edge Function foi deployada.` 
      };
    }
    
    console.log('Resposta da Edge Function:', data);
    
    if (!data?.success) {
      return { 
        success: false, 
        error: data?.error || 'Erro desconhecido na extração' 
      };
    }
    
    return { success: true, data: data.data };
    
  } catch (error: any) {
    console.error('Erro na extração:', error);
    return { 
      success: false, 
      error: error.message || 'Erro ao processar arquivo' 
    };
  }
}

/**
 * Salva os dados extraídos no banco de dados
 */
export async function saveQuarterlyResult(
  userId: string,
  data: ExtractedData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const record: any = {
      user_id: userId,
      ticker: data.ticker,
      asset_type: data.assetType,
      year: data.year,
      quarter: data.quarter,
      report_date: data.reportDate || null,
      shares: data.shares || null,
      equity: data.equity || null,
      dividends_paid: data.dividendsPaid || null,
      raw_extracted_data: data,
      extraction_confidence: data.confidence || 0,
      user_verified: false
    };
    
    // Campos de ações
    if (data.assetType === 'ACAO') {
      record.revenue = data.revenue || null;
      record.gross_profit = data.grossProfit || null;
      record.ebitda = data.ebitda || null;
      record.ebit = data.ebit || null;
      record.net_income = data.netIncome || null;
      record.net_debt = data.netDebt || null;
      record.cash = data.cash || null;
      record.capex = data.capex || null;
      record.free_cash_flow = data.freeCashFlow || null;
    }
    
    // Campos de FIIs
    if (data.assetType === 'FII') {
      record.fii_segment = data.fiiSegment || null;
      record.nav = data.nav || null;
      record.nav_per_share = data.navPerShare || null;
      record.total_revenue = data.totalRevenue || null;
      record.net_result = data.netResult || null;
      record.ffo = data.ffo || null;
      record.num_properties = data.numProperties || null;
      record.total_area = data.totalArea || null;
      record.vacancy_rate = data.vacancyRate || null;
      record.avg_rent_per_sqm = data.avgRentPerSqm || null;
      record.cap_rate = data.capRate || null;
      record.num_cris = data.numCris || null;
      record.portfolio_value = data.portfolioValue || null;
      record.avg_duration = data.avgDuration || null;
      record.avg_yield = data.avgYield || null;
      record.ipca_exposure = data.ipcaExposure || null;
      record.cdi_exposure = data.cdiExposure || null;
      record.default_rate = data.defaultRate || null;
      record.sales_per_sqm = data.salesPerSqm || null;
      record.same_store_sales = data.sameStoreSales || null;
      record.noi = data.noi || null;
    }
    
    console.log('Salvando resultado trimestral:', record);
    
    const { data: result, error } = await supabase
      .from('quarterly_results')
      .upsert(record, { 
        onConflict: 'user_id,ticker,year,quarter',
        ignoreDuplicates: false 
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Erro ao salvar no banco:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Salvo com sucesso, ID:', result?.id);
    return { success: true, id: result?.id };
    
  } catch (error: any) {
    console.error('Erro ao salvar:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Recalcula indicadores para um ativo específico
 */
export async function recalculateIndicators(
  userId: string,
  ticker: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Recalculando indicadores para:', ticker);
    
    const { error } = await supabase.rpc('calculate_asset_indicators', {
      p_user_id: userId,
      p_ticker: ticker
    });
    
    if (error) {
      console.error('Erro ao recalcular indicadores:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Indicadores recalculados com sucesso');
    return { success: true };
    
  } catch (error: any) {
    console.error('Erro ao recalcular:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca indicadores de ativos do usuário
 */
export async function getAssetIndicators(
  userId: string,
  ticker?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('asset_indicators')
      .select('*')
      .eq('user_id', userId);
    
    if (ticker) {
      query = query.eq('ticker', ticker);
    }
    
    const { data, error } = await query.order('ticker');
    
    if (error) {
      console.error('Erro ao buscar indicadores:', error);
      return [];
    }
    
    return data || [];
    
  } catch (error) {
    console.error('Erro ao buscar indicadores:', error);
    return [];
  }
}

/**
 * Busca histórico trimestral de um ativo
 */
export async function getQuarterlyHistory(
  userId: string,
  ticker: string,
  limit: number = 8
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('quarterly_results')
      .select('*')
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
    
    return data || [];
    
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }
}
