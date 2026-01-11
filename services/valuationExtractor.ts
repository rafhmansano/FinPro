// services/valuationExtractor.ts
// Serviço para extrair dados de releases trimestrais usando Claude API

export interface ExtractedStockData {
  ticker: string;
  assetType: 'ACAO';
  year: number;
  quarter: number;
  reportDate?: string;
  
  // Dados principais
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
  
  // Metadados
  confidence: number;
  extractedFields: string[];
  warnings: string[];
}

export interface ExtractedFIIData {
  ticker: string;
  assetType: 'FII';
  fiiSegment: 'PAPEL' | 'LAJES' | 'SHOPPINGS' | 'LOGISTICA' | 'HIBRIDO' | 'OUTROS';
  year: number;
  quarter: number;
  reportDate?: string;
  
  // Dados comuns FII
  shares?: number; // Número de cotas
  equity?: number; // Patrimônio Líquido
  nav?: number; // NAV
  navPerShare?: number; // VP por cota
  dividendsPaid?: number;
  totalRevenue?: number;
  netResult?: number;
  ffo?: number;
  
  // FII Tijolo
  numProperties?: number;
  totalArea?: number; // ABL m²
  vacancyRate?: number;
  avgRentPerSqm?: number;
  capRate?: number;
  
  // FII Papel
  numCris?: number;
  portfolioValue?: number;
  avgDuration?: number;
  avgYield?: number;
  ipcaExposure?: number;
  cdiExposure?: number;
  defaultRate?: number;
  
  // FII Shoppings
  salesPerSqm?: number;
  sameStoreSales?: number;
  noi?: number;
  
  // Metadados
  confidence: number;
  extractedFields: string[];
  warnings: string[];
}

export type ExtractedData = ExtractedStockData | ExtractedFIIData;

// Prompt para extração de dados de AÇÕES
const STOCK_EXTRACTION_PROMPT = `Você é um analista financeiro especializado em extrair dados de releases de resultados trimestrais de empresas brasileiras.

Analise o documento fornecido e extraia os seguintes dados financeiros. Retorne APENAS um JSON válido, sem explicações.

Dados a extrair:
- ticker: Código da ação (ex: PETR4, VALE3)
- year: Ano do resultado
- quarter: Trimestre (1, 2, 3 ou 4)
- reportDate: Data base do relatório (formato YYYY-MM-DD)
- shares: Número total de ações (em unidades, não milhões)
- revenue: Receita Líquida (em R$)
- grossProfit: Lucro Bruto (em R$)
- ebitda: EBITDA (em R$)
- ebit: EBIT ou Lucro Operacional (em R$)
- netIncome: Lucro Líquido (em R$)
- equity: Patrimônio Líquido (em R$)
- netDebt: Dívida Líquida (em R$, positivo = dívida, negativo = caixa líquido)
- cash: Caixa e Equivalentes de Caixa (em R$)
- dividendsPaid: Dividendos/JCP pagos no trimestre (em R$)
- capex: CAPEX ou Investimentos (em R$)
- freeCashFlow: Fluxo de Caixa Livre (em R$)

Regras:
1. Use valores em R$ (não em milhões ou bilhões - converta se necessário)
2. Se um valor não for encontrado, use null
3. Identifique o trimestre pelo período (ex: "1T24" = quarter: 1, year: 2024)
4. Para dívida líquida: positivo = empresa tem dívida, negativo = caixa líquido
5. Adicione um campo "confidence" de 0 a 100 indicando sua confiança na extração
6. Adicione um array "extractedFields" com os campos que você encontrou
7. Adicione um array "warnings" com qualquer observação importante

Formato de resposta:
{
  "ticker": "XXXX3",
  "assetType": "ACAO",
  "year": 2024,
  "quarter": 3,
  "reportDate": "2024-09-30",
  "shares": 1000000000,
  "revenue": 50000000000,
  "grossProfit": 15000000000,
  "ebitda": 12000000000,
  "ebit": 10000000000,
  "netIncome": 8000000000,
  "equity": 100000000000,
  "netDebt": 20000000000,
  "cash": 5000000000,
  "dividendsPaid": 2000000000,
  "capex": 3000000000,
  "freeCashFlow": 5000000000,
  "confidence": 85,
  "extractedFields": ["ticker", "year", "quarter", "revenue", "netIncome", "equity"],
  "warnings": ["CAPEX estimado com base no fluxo de caixa"]
}`;

// Prompt para extração de dados de FIIs
const FII_EXTRACTION_PROMPT = `Você é um analista financeiro especializado em extrair dados de relatórios gerenciais de Fundos Imobiliários (FIIs) brasileiros.

Analise o documento fornecido e extraia os dados financeiros. Retorne APENAS um JSON válido, sem explicações.

Primeiro, identifique o SEGMENTO do FII:
- PAPEL: FIIs de recebíveis (CRIs, CRAs, LCIs)
- LAJES: FIIs de lajes corporativas/escritórios
- SHOPPINGS: FIIs de shopping centers
- LOGISTICA: FIIs de galpões logísticos
- HIBRIDO: FIIs com mix de ativos
- OUTROS: Outros tipos

Dados COMUNS a todos FIIs:
- ticker: Código do FII (ex: HGLG11, KNRI11)
- fiiSegment: Segmento do FII
- year: Ano
- quarter: Trimestre (1-4) ou mês (usar trimestre correspondente)
- reportDate: Data base do relatório
- shares: Número de cotas
- equity: Patrimônio Líquido
- nav: Valor Patrimonial do Fundo
- navPerShare: VP por cota
- dividendsPaid: Rendimentos distribuídos no período
- totalRevenue: Receita Total
- netResult: Resultado Líquido
- ffo: FFO (Funds From Operations)

Dados para FIIs de TIJOLO (LAJES, SHOPPINGS, LOGISTICA):
- numProperties: Número de imóveis
- totalArea: ABL total em m²
- vacancyRate: Taxa de vacância (em %, ex: 5.5)
- avgRentPerSqm: Aluguel médio por m²
- capRate: Cap Rate (em %)

Dados para FIIs de PAPEL:
- numCris: Número de CRIs/papéis
- portfolioValue: Valor da carteira
- avgDuration: Duration média (em anos)
- avgYield: Yield médio da carteira (em % a.a.)
- ipcaExposure: % exposição a IPCA
- cdiExposure: % exposição a CDI
- defaultRate: Taxa de inadimplência (em %)

Dados para FIIs de SHOPPINGS (adicional):
- salesPerSqm: Vendas por m²
- sameStoreSales: SSS - Same Store Sales (em %)
- noi: NOI - Net Operating Income

Regras:
1. Use valores em R$ para valores monetários
2. Use % para taxas (ex: vacancyRate: 5.5 significa 5.5%)
3. Se um valor não for encontrado, use null
4. Adicione "confidence" (0-100), "extractedFields" e "warnings"

Formato de resposta:
{
  "ticker": "XXXX11",
  "assetType": "FII",
  "fiiSegment": "LOGISTICA",
  "year": 2024,
  "quarter": 3,
  ...campos relevantes...
  "confidence": 80,
  "extractedFields": ["ticker", "navPerShare", "dividendsPaid"],
  "warnings": ["Vacância física vs financeira não especificada"]
}`;

// Função principal de extração
export async function extractFinancialData(
  fileContent: string,
  assetType: 'ACAO' | 'FII',
  ticker?: string
): Promise<ExtractedData> {
  const prompt = assetType === 'ACAO' ? STOCK_EXTRACTION_PROMPT : FII_EXTRACTION_PROMPT;
  
  const systemPrompt = prompt + (ticker ? `\n\nO ticker do ativo é: ${ticker}` : '');
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // A API key será passada pelo backend/edge function
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Extraia os dados financeiros do seguinte documento:\n\n${fileContent}`
          }
        ]
      })
    });

    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse do JSON retornado
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível extrair JSON da resposta');
    }
    
    const extracted = JSON.parse(jsonMatch[0]);
    return extracted as ExtractedData;
    
  } catch (error) {
    console.error('Erro na extração:', error);
    throw error;
  }
}

// Função para calcular indicadores a partir dos dados extraídos
export function calculateIndicators(
  data: ExtractedData,
  currentPrice: number,
  ltmData?: ExtractedData[] // Dados dos últimos 4 trimestres para LTM
) {
  if (data.assetType === 'ACAO') {
    return calculateStockIndicators(data as ExtractedStockData, currentPrice, ltmData as ExtractedStockData[]);
  } else {
    return calculateFIIIndicators(data as ExtractedFIIData, currentPrice, ltmData as ExtractedFIIData[]);
  }
}

function calculateStockIndicators(
  data: ExtractedStockData,
  currentPrice: number,
  ltmData?: ExtractedStockData[]
) {
  const shares = data.shares || 1;
  
  // Calcular LTM (Last Twelve Months) se tiver dados históricos
  let ltmNetIncome = data.netIncome || 0;
  let ltmDividends = data.dividendsPaid || 0;
  let ltmRevenue = data.revenue || 0;
  let ltmEbitda = data.ebitda || 0;
  
  if (ltmData && ltmData.length >= 4) {
    ltmNetIncome = ltmData.slice(0, 4).reduce((sum, q) => sum + (q.netIncome || 0), 0);
    ltmDividends = ltmData.slice(0, 4).reduce((sum, q) => sum + (q.dividendsPaid || 0), 0);
    ltmRevenue = ltmData.slice(0, 4).reduce((sum, q) => sum + (q.revenue || 0), 0);
    ltmEbitda = ltmData.slice(0, 4).reduce((sum, q) => sum + (q.ebitda || 0), 0);
  }
  
  // Indicadores por ação
  const lpa = ltmNetIncome / shares;
  const vpa = (data.equity || 0) / shares;
  const dpa = ltmDividends / shares;
  
  // Múltiplos
  const pl = currentPrice > 0 && lpa > 0 ? currentPrice / lpa : null;
  const pvp = currentPrice > 0 && vpa > 0 ? currentPrice / vpa : null;
  
  // Rentabilidade
  const roe = data.equity && data.equity > 0 ? (ltmNetIncome / data.equity) * 100 : null;
  const netMargin = ltmRevenue > 0 ? (ltmNetIncome / ltmRevenue) * 100 : null;
  const ebitdaMargin = ltmRevenue > 0 && ltmEbitda > 0 ? (ltmEbitda / ltmRevenue) * 100 : null;
  
  // Dividend Yield
  const dy = currentPrice > 0 && dpa > 0 ? (dpa / currentPrice) * 100 : null;
  
  // Payout
  const payout = ltmNetIncome > 0 && ltmDividends > 0 ? (ltmDividends / ltmNetIncome) * 100 : null;
  
  // Endividamento
  const netDebtEbitda = ltmEbitda > 0 && data.netDebt ? data.netDebt / ltmEbitda : null;
  
  // PREÇOS TETO
  const ceilings = {
    bazin: dpa > 0 ? dpa / 0.06 : null,
    graham: lpa > 0 && vpa > 0 ? Math.sqrt(22.5 * lpa * vpa) : null,
    pl10: lpa > 0 ? lpa * 10 : null,
    pl15: lpa > 0 ? lpa * 15 : null,
    pvp1: vpa > 0 ? vpa * 1.0 : null,
    pvp1_5: vpa > 0 ? vpa * 1.5 : null,
    dy6: dpa > 0 ? dpa / 0.06 : null,
    dy8: dpa > 0 ? dpa / 0.08 : null,
  };
  
  // Preço justo médio (média dos métodos válidos)
  const validCeilings = Object.values(ceilings).filter(v => v !== null && v > 0) as number[];
  const avgFairPrice = validCeilings.length > 0 
    ? validCeilings.reduce((a, b) => a + b, 0) / validCeilings.length 
    : null;
  
  // Potencial de alta
  const upside = avgFairPrice && currentPrice > 0 
    ? ((avgFairPrice - currentPrice) / currentPrice) * 100 
    : null;
  
  // Recomendação
  let recommendation: string;
  if (upside === null) recommendation = 'NEUTRO';
  else if (upside > 30) recommendation = 'COMPRA_FORTE';
  else if (upside > 10) recommendation = 'COMPRA';
  else if (upside > -10) recommendation = 'NEUTRO';
  else if (upside > -30) recommendation = 'VENDA';
  else recommendation = 'VENDA_FORTE';
  
  return {
    // Indicadores
    lpa,
    vpa,
    dpa,
    pl,
    pvp,
    roe,
    netMargin,
    ebitdaMargin,
    dy,
    payout,
    netDebtEbitda,
    
    // Preços teto
    ceilings,
    
    // Resumo
    currentPrice,
    avgFairPrice,
    upside,
    recommendation,
  };
}

function calculateFIIIndicators(
  data: ExtractedFIIData,
  currentPrice: number,
  ltmData?: ExtractedFIIData[]
) {
  const shares = data.shares || 1;
  
  // Calcular LTM
  let ltmDividends = data.dividendsPaid || 0;
  let ltmFFO = data.ffo || 0;
  
  if (ltmData && ltmData.length >= 4) {
    ltmDividends = ltmData.slice(0, 4).reduce((sum, q) => sum + (q.dividendsPaid || 0), 0);
    ltmFFO = ltmData.slice(0, 4).reduce((sum, q) => sum + (q.ffo || 0), 0);
  }
  
  // Indicadores por cota
  const navPerShare = data.navPerShare || (data.nav ? data.nav / shares : null);
  const dpa = ltmDividends / shares;
  const ffoPerShare = ltmFFO / shares;
  
  // Múltiplos
  const pNav = currentPrice > 0 && navPerShare ? currentPrice / navPerShare : null;
  
  // Yields
  const monthlyYield = currentPrice > 0 && data.dividendsPaid 
    ? ((data.dividendsPaid / shares) / currentPrice) * 100 
    : null;
  const annualYield = currentPrice > 0 && dpa > 0 
    ? (dpa / currentPrice) * 100 
    : null;
  
  // PREÇOS TETO FII
  const ceilings = {
    dy8: dpa > 0 ? dpa / 0.08 : null,
    dy10: dpa > 0 ? dpa / 0.10 : null,
    dy12: dpa > 0 ? dpa / 0.12 : null,
    pvp1: navPerShare ? navPerShare * 1.0 : null,
    pvp0_95: navPerShare ? navPerShare * 0.95 : null,
    pvp0_9: navPerShare ? navPerShare * 0.9 : null,
  };
  
  // Média dos preços teto válidos
  const validCeilings = Object.values(ceilings).filter(v => v !== null && v > 0) as number[];
  const avgFairPrice = validCeilings.length > 0 
    ? validCeilings.reduce((a, b) => a + b, 0) / validCeilings.length 
    : null;
  
  // Potencial de alta
  const upside = avgFairPrice && currentPrice > 0 
    ? ((avgFairPrice - currentPrice) / currentPrice) * 100 
    : null;
  
  // Recomendação
  let recommendation: string;
  if (upside === null) recommendation = 'NEUTRO';
  else if (upside > 20) recommendation = 'COMPRA_FORTE';
  else if (upside > 5) recommendation = 'COMPRA';
  else if (upside > -5) recommendation = 'NEUTRO';
  else if (upside > -20) recommendation = 'VENDA';
  else recommendation = 'VENDA_FORTE';
  
  return {
    // Indicadores
    navPerShare,
    dpa,
    ffoPerShare,
    pNav,
    monthlyYield,
    annualYield,
    vacancyRate: data.vacancyRate,
    capRate: data.capRate,
    
    // Preços teto
    ceilings,
    
    // Resumo
    currentPrice,
    avgFairPrice,
    upside,
    recommendation,
  };
}

// Tipos para o formulário de revisão
export interface ReviewFormData {
  ticker: string;
  assetType: 'ACAO' | 'FII';
  fiiSegment?: string;
  year: number;
  quarter: number;
  [key: string]: any;
}
