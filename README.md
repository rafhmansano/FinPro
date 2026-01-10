# 🔐 Guia de Integração - FinPro

Este guia explica como integrar as funcionalidades de **modo de privacidade** e **autenticação** no seu projeto FinPro.

---

## 📁 Arquivos Criados

```
finpro-integration/
├── contexts/
│   ├── AuthContext.tsx       # Autenticação com Supabase
│   └── PrivacyContext.tsx    # Controle de visibilidade
├── components/
│   ├── layout.tsx            # Layout atualizado (substitui o atual)
│   ├── PrivacyToggle.tsx     # Botão de privacidade
│   └── ProtectedRoute.tsx    # Proteção de rotas
├── pages/
│   └── LoginPage.tsx         # Tela de login
├── App.tsx                   # App.tsx atualizado
└── EXEMPLO_USO_PRIVACY.ts    # Documentação de uso
```

---

## 🚀 Passo a Passo

### 1. Copie os arquivos para seu projeto

```bash
# Crie a pasta contexts se não existir
mkdir -p contexts

# Copie os arquivos
cp finpro-integration/contexts/* contexts/
cp finpro-integration/components/* components/
cp finpro-integration/pages/LoginPage.tsx pages/
cp finpro-integration/App.tsx App.tsx
```

### 2. Habilite o Supabase Auth

No dashboard do Supabase (https://supabase.com/dashboard):

1. Acesse seu projeto: `vdxrrqknfgwfajfxncei`
2. Vá em **Authentication** → **Providers**
3. Habilite **Email** provider
4. Em **URL Configuration**, configure:
   - Site URL: `https://rafhmansano.github.io/FinPro/`
   - Redirect URLs: `https://rafhmansano.github.io/FinPro/`

### 3. Crie seu primeiro usuário

Opção A: Via Dashboard do Supabase
- Vá em **Authentication** → **Users** → **Add user**

Opção B: Via tela de cadastro do app
- Acesse o app e clique em "Criar conta"

---

## 🎨 Funcionalidades Incluídas

### Modo de Privacidade
- Botão no sidebar para alternar visibilidade
- Valores substituídos por `•••••` quando oculto
- Estado salvo no localStorage (persiste entre sessões)
- Atalho de teclado: `Ctrl+H` (opcional, veja abaixo)

### Autenticação
- Login com email/senha
- Cadastro de novos usuários
- Recuperação de senha
- Logout
- Sessão persistente

---

## 📝 Atualizando as Páginas para Usar Privacidade

### Exemplo: Dashboard.tsx

```tsx
// ANTES
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
};

// DEPOIS
import { usePrivacy } from '../contexts/PrivacyContext';

export const Dashboard = () => {
  const { formatCurrency, formatPercent, isHidden } = usePrivacy();
  
  // Agora use formatCurrency normalmente
  // Os valores serão ocultados automaticamente quando necessário
  return (
    <div>
      <p>{formatCurrency(patrimonio)}</p>
      <p>{formatPercent(rentabilidade)}</p>
    </div>
  );
};
```

### Exemplo: Portfolio.tsx

```tsx
import { usePrivacy } from '../contexts/PrivacyContext';

export const Portfolio = () => {
  const { formatCurrency, formatPercent, formatNumber, isHidden } = usePrivacy();
  
  return (
    <table>
      <tr>
        <td>{position.ticker}</td>
        <td>{formatNumber(position.quantity)}</td>
        <td>{formatCurrency(position.avgPrice)}</td>
        <td>{formatCurrency(position.marketValue)}</td>
        <td className={position.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
          {formatCurrency(position.gainLoss)}
        </td>
        <td>{formatPercent(position.gainLossPercent, true)}</td>
      </tr>
    </table>
  );
};
```

---

## ⌨️ Atalho de Teclado (Opcional)

Para adicionar `Ctrl+H` como atalho para alternar privacidade, adicione no `App.tsx`:

```tsx
import { useEffect } from 'react';
import { usePrivacy } from './contexts/PrivacyContext';

// Dentro do AppContent
const { togglePrivacy } = usePrivacy();

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault();
      togglePrivacy();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [togglePrivacy]);
```

---

## 🔒 Row Level Security (RLS)

Para que cada usuário veja apenas seus próprios dados, atualize as policies no Supabase:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Criar policy para cada tabela
CREATE POLICY "Users can view own data" ON assets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own data" ON trades
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own data" ON dividends
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own data" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own data" ON accounts
  FOR ALL USING (auth.uid() = user_id);
```

**Importante**: Suas tabelas precisam ter a coluna `user_id` para isso funcionar.

---

## ✅ Checklist de Integração

- [ ] Copiar arquivos de contexts
- [ ] Copiar componentes atualizados
- [ ] Copiar LoginPage.tsx
- [ ] Substituir App.tsx
- [ ] Habilitar Email provider no Supabase
- [ ] Configurar URLs no Supabase
- [ ] Criar primeiro usuário
- [ ] Testar login/logout
- [ ] Testar modo de privacidade
- [ ] Atualizar páginas para usar `usePrivacy`
- [ ] (Opcional) Configurar RLS no banco

---

## 🐛 Troubleshooting

### "Invalid login credentials"
→ Verifique se o email foi confirmado (se confirmação estiver habilitada)

### Valores não estão sendo ocultados
→ Certifique-se de usar `formatCurrency` do `usePrivacy` ao invés da função local

### Erro ao fazer login
→ Verifique se o Email provider está habilitado no Supabase

### Loop infinito de loading
→ Verifique se os providers estão na ordem correta no App.tsx:
   `AuthProvider` → `PrivacyProvider` → `ProtectedRoute` → `FinanceProvider`

---

**Desenvolvido para FinPro** 💰
