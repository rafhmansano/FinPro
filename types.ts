export type TransactionType = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
export type AssetType = 'ACAO' | 'FII' | 'RENDA_FIXA' | 'ETF' | 'CRIPT';
export type TradeType = 'COMPRA' | 'VENDA';
export type DividendType = 'DIVIDENDO' | 'JCP' | 'RENDIMENTO';

export interface Account {
  id?: string;
  name: string;
  bank: string;
  color: string;
  initialBalance: number;
  // Campos do banco (snake_case)
  initial_balance?: number;
}

export interface Transaction {
  id?: string;
  description: string;
  value: number;
  type: TransactionType;
  category: string;
  date: string;
  accountId?: string;
  // Campos do banco (snake_case)
  account_id?: string;
}

export interface Asset {
  id?: string;
  ticker: string;
  name: string;
  type: AssetType;
  sector: string;
  lastPrice?: number;
  // Campos do banco (snake_case)
  user_id?: string;
  created_at?: string;
  quantity?: number;
  avg_price?: number;
  last_price?: number;
}

export interface Trade {
  id?: string;
  assetId: string;
  type: TradeType;
  quantity: number;
  price: number;
  fees: number;
  date: string;
  // Campos do banco (snake_case)
  asset_id?: string;
}

export interface Dividend {
  id?: string;
  ticker: string;
  type: DividendType;
  totalValue: number;
  paymentDate: string;
  // 🔥 CAMPOS DO BANCO (snake_case)
  total_value?: number;
  payment_date?: string;
}

export interface PortfolioPosition extends Asset {
  quantity: number;
  avgPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPerc: number;
  currentPrice: number;
}

export interface ValuationResult extends PortfolioPosition {
  intrinsicValue: number;
  upside: number;
  recommendation: 'COMPRA' | 'VENDA' | 'MANTER';
  strategy: string;
  fundamentals: any;
}