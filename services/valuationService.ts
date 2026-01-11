// services/valuationService.ts
// Serviço para extração de dados via Edge Function (seguro)

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
 * Extrai dados financeiros de um arquivo usando Edge Function
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
    
    // Chamar Edge Function
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
      return { success: false, error: error.message };
    }
    
    if (!data?.success) {
      return { success: false, error: data?.error || 'Erro desconhecido na extração' };
    }
    
    return { success: true, data: data.data };
    
  } catch (error: any) {
    console.error('Erro na extração:', error);
    return { success: false, error: error.message || 'Erro ao processar arquivo' };
  }
}

/**
 * Salva os dados extraídos no banco
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
      report_date: data.reportDate,
      shares: data.shares,
      equity: data.equity,
      dividends_paid: data.dividendsPaid,
      raw_extracted_data: data,
      extraction_confidence: data.confidence,
      user_verified: false
    };
    
    // Campos de ações
    if (data.assetType === 'ACAO') {
      record.revenue = data.revenue;
      record.gross_profit = data.grossProfit;
      record.ebitda = data.ebitda;
      record.ebit = data.ebit;
      record.net_income = data.netIncome;
      record.net_debt = data.netDebt;
      record.cash = data.cash;
      record.capex = data.capex;
      record.free_cash_flow = data.freeCashFlow;
    }
    
    // Campos de FIIs
    if (data.assetType === 'FII') {
      record.fii_segment = data.fiiSegment;
      record.nav = data.nav;
      record.nav_per_share = data.navPerShare;
      record.total_revenue = data.totalRevenue;
      record.net_result = data.netResult;
      record.ffo = data.ffo;
      record.num_properties = data.numProperties;
      record.total_area = data.totalArea;
      record.vacancy_rate = data.vacancyRate;
      record.avg_rent_per_sqm = data.avgRentPerSqm;
      record.cap_rate = data.capRate;
      record.num_cris = data.numCris;
      record.portfolio_value = data.portfolioValue;
      record.avg_duration = data.avgDuration;
      record.avg_yield = data.avgYield;
      record.ipca_exposure = data.ipcaExposure;
      record.cdi_exposure = data.cdiExposure;
      record.default_rate = data.defaultRate;
      record.sales_per_sqm = data.salesPerSqm;
      record.same_store_sales = data.sameStoreSales;
      record.noi = data.noi;
    }
    
    const { data: result, error } = await supabase
      .from('quarterly_results')
      .upsert(record, { 
        onConflict: 'user_id,ticker,year,quarter',
        ignoreDuplicates: false 
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Erro ao salvar:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, id: result?.id };
    
  } catch (error: any) {
    console.error('Erro ao salvar:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Recalcula indicadores para um ativo
 */
export async function recalculateIndicators(
  userId: string,
  ticker: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('calculate_asset_indicators', {
      p_user_id: userId,
      p_ticker: ticker
    });
    
    if (error) {
      console.error('Erro ao recalcular:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error('Erro ao recalcular:', error);
    return { success: false, error: error.message };
  }
}
