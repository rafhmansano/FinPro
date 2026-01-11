// supabase/functions/extract-financial-data/index.ts

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STOCK_PROMPT = `Você é um analista financeiro especializado em extrair dados de releases de resultados trimestrais de empresas brasileiras.

Analise o documento e extraia os dados financeiros. Retorne APENAS um JSON válido, sem texto adicional.

Dados a extrair:
- ticker: Código da ação (ex: PETR4)
- year: Ano do resultado (número)
- quarter: Trimestre 1-4 (número)
- reportDate: Data base (YYYY-MM-DD)
- shares: Número total de ações (converter para unidades, não milhões)
- revenue: Receita Líquida em R$ (converter de milhões/bilhões para valor cheio)
- grossProfit: Lucro Bruto em R$
- ebitda: EBITDA em R$
- ebit: EBIT em R$
- netIncome: Lucro Líquido em R$
- equity: Patrimônio Líquido em R$
- netDebt: Dívida Líquida em R$ (positivo = dívida, negativo = caixa líquido)
- cash: Caixa em R$
- dividendsPaid: Dividendos/JCP pagos no trimestre em R$

Regras IMPORTANTES:
1. SEMPRE converta valores: "5,2 bi" = 5200000000, "150 mi" = 150000000
2. Se não encontrar um valor, use null
3. Identifique o trimestre: "1T24" ou "1º Trimestre 2024" = quarter: 1, year: 2024
4. Adicione "confidence" (0-100) baseado na qualidade dos dados encontrados
5. Adicione "extractedFields" com lista dos campos que você encontrou
6. Adicione "warnings" com observações importantes

Responda APENAS com o JSON.`;

const FII_PROMPT = `Você é um analista financeiro especializado em extrair dados de relatórios gerenciais de Fundos Imobiliários (FIIs) brasileiros.

Primeiro identifique o SEGMENTO do FII:
- PAPEL: FIIs de recebíveis (CRIs, CRAs, LCIs)
- LAJES: Escritórios/lajes corporativas  
- SHOPPINGS: Shopping centers
- LOGISTICA: Galpões logísticos
- HIBRIDO: Mix de ativos
- OUTROS: Outros tipos

Dados a extrair:
- ticker: Código do FII (ex: HGLG11)
- fiiSegment: Segmento
- year: Ano (número)
- quarter: Trimestre 1-4 (número)
- shares: Número de cotas
- equity: Patrimônio Líquido em R$
- nav: Valor Patrimonial do Fundo em R$
- navPerShare: VP por cota em R$
- dividendsPaid: Rendimentos distribuídos no período em R$
- totalRevenue: Receita Total em R$
- netResult: Resultado Líquido em R$

Para FIIs de TIJOLO adicione: numProperties, totalArea (m²), vacancyRate (%)
Para FIIs de PAPEL adicione: numCris, portfolioValue, avgYield (%), ipcaExposure (%), cdiExposure (%)

Regras:
1. Converta valores para R$ (não milhões)
2. Taxas em % (ex: vacancyRate: 5.5)
3. Se não encontrar, use null
4. Adicione "confidence", "extractedFields" e "warnings"

Responda APENAS com o JSON.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fileContent, assetType, ticker, fileType } = await req.json();

    if (!fileContent) {
      return new Response(
        JSON.stringify({ success: false, error: "fileContent é obrigatório" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Buscar API key do ambiente (configurada como secret)
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY não configurada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Selecionar prompt
    const systemPrompt = assetType === "FII" ? FII_PROMPT : STOCK_PROMPT;
    const fullPrompt = ticker ? `${systemPrompt}\n\nO ticker do ativo é: ${ticker}` : systemPrompt;

    // Preparar mensagem baseado no tipo de arquivo
    let userContent: any;
    
    if (fileType === "pdf") {
      // PDF em base64
      const base64Data = fileContent.startsWith("data:") 
        ? fileContent.split(",")[1] 
        : fileContent;
      
      userContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data
          }
        },
        {
          type: "text",
          text: "Extraia os dados financeiros deste documento. Responda APENAS com JSON válido."
        }
      ];
    } else {
      // Texto
      userContent = [
        {
          type: "text",
          text: `Extraia os dados financeiros do documento abaixo. Responda APENAS com JSON válido.\n\n${fileContent}`
        }
      ];
    }

    // Chamar Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: fullPrompt,
        messages: [{ role: "user", content: userContent }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro Claude API:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Erro na API: ${response.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    // Extrair JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível extrair dados do documento" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const extracted = JSON.parse(jsonMatch[0]);
    
    // Garantir campos
    if (!extracted.ticker && ticker) extracted.ticker = ticker;
    if (!extracted.assetType) extracted.assetType = assetType || "ACAO";
    if (!extracted.confidence) extracted.confidence = 70;
    if (!extracted.extractedFields) extracted.extractedFields = [];
    if (!extracted.warnings) extracted.warnings = [];

    return new Response(
      JSON.stringify({ success: true, data: extracted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
