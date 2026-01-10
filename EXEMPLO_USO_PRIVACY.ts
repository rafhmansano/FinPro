// ==========================================
// EXEMPLO DE USO DO usePrivacy no Dashboard
// ==========================================
// 
// Este arquivo mostra as modificações necessárias para proteger valores
// Você pode aplicar o mesmo padrão em todas as outras páginas

import { usePrivacy } from '../contexts/PrivacyContext';

// 1. ANTES - Função formatCurrency original:
// const formatCurrency = (value: number, currency: string = 'BRL') => {
//   if (currency === 'USD') {
//     return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
//   }
//   return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
// };

// 2. DEPOIS - No componente Dashboard, use o hook:
// export const Dashboard = () => {
//   const { formatCurrency, formatPercent, isHidden } = usePrivacy();
//   ...
//   // Agora todos os valores serão automaticamente ocultos quando isHidden = true
// }

// ==========================================
// MUDANÇAS NECESSÁRIAS NAS PÁGINAS:
// ==========================================

/*
PASSO 1: Importe o hook no início do arquivo
-----------------------------------------
import { usePrivacy } from '../contexts/PrivacyContext';

PASSO 2: Use o hook dentro do componente
-----------------------------------------
export const Dashboard = () => {
  const { formatCurrency, formatPercent, formatNumber, isHidden } = usePrivacy();
  
  // ... resto do código
}

PASSO 3: Substitua as chamadas de formatação
-----------------------------------------
// ANTES:
<p>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}</p>

// DEPOIS:
<p>{formatCurrency(value)}</p>

// ANTES (percentuais):
<p>{value.toFixed(2)}%</p>

// DEPOIS:
<p>{formatPercent(value)}</p>

PASSO 4: Para valores que não são moeda nem percentual
-----------------------------------------
// ANTES:
<p>{quantity.toLocaleString('pt-BR')}</p>

// DEPOIS:
<p>{isHidden ? '•••' : quantity.toLocaleString('pt-BR')}</p>

// Ou use formatNumber:
<p>{formatNumber(quantity)}</p>
*/

// ==========================================
// ARQUIVOS QUE PRECISAM SER ATUALIZADOS:
// ==========================================
// 
// 1. pages/Dashboard.tsx
//    - Valores de patrimônio total
//    - Dividendos recebidos
//    - Gráficos de valores
//
// 2. pages/CashFlow.tsx
//    - Saldo das contas
//    - Valores de transações
//    - Totais por período
//
// 3. pages/Portfolio.tsx
//    - Valores investidos
//    - Valor atual da carteira
//    - Ganho/perda por ativo
//
// 4. pages/Dividends.tsx
//    - Valores de dividendos recebidos
//    - Totais por tipo/período
//
// 5. pages/Valuation.tsx
//    - Preços calculados
//    - Margens de segurança
//
// ==========================================

export {};
