# FinPro Valuation - Pacote Corrigido

## 📋 Checklist de Verificação

Antes de testar, verifique se todos estes itens estão configurados:

### ✅ 1. Tabelas no Supabase
Verifique se existem executando no SQL Editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('quarterly_results', 'asset_indicators');
```

Se não existirem, execute o script SQL de criação das tabelas.

### ✅ 2. Secret da API Key no Supabase
1. Dashboard Supabase → Project Settings → Edge Functions → Manage Secrets
2. Deve existir: `ANTHROPIC_API_KEY` com valor `sk-ant-...`

### ✅ 3. Edge Function Deployada
1. Dashboard Supabase → Edge Functions
2. Deve existir: `extract-financial-data`

Se não existir, você precisa fazer o deploy via:
- GitHub Actions (recomendado)
- Supabase CLI

### ✅ 4. Secrets no GitHub (para deploy automático)
Repository Settings → Secrets → Actions:
- `SUPABASE_PROJECT_REF`: vdxrrqknfgwfajfxncei
- `SUPABASE_ACCESS_TOKEN`: (obter em supabase.com/dashboard/account/tokens)

---

## 📦 Arquivos deste Pacote

```
finpro-valuation-fixed/
├── services/
│   └── valuationService.ts      → Copiar para src/services/
├── supabase/
│   └── functions/
│       └── extract-financial-data/
│           └── index.ts         → Adicionar ao repositório
├── .github/
│   └── workflows/
│       └── deploy-functions.yml → Adicionar ao repositório
└── README.md
```

---

## 🚀 Passos para Funcionar

### Passo 1: Substituir o Serviço
Copie `services/valuationService.ts` para `src/services/` no seu projeto, substituindo o arquivo existente.

### Passo 2: Adicionar Edge Function ao Repositório
Copie a pasta `supabase/` para a raiz do seu projeto FinPro.

### Passo 3: Adicionar Workflow do GitHub
Copie a pasta `.github/` para a raiz do seu projeto FinPro.

### Passo 4: Configurar Secrets no GitHub
1. Vá em: github.com/rafhmansano/FinPro/settings/secrets/actions
2. Adicione:
   - `SUPABASE_PROJECT_REF` = `vdxrrqknfgwfajfxncei`
   - `SUPABASE_ACCESS_TOKEN` = (gere um novo token em supabase.com)

### Passo 5: Configurar Secret no Supabase
1. Vá em: supabase.com/dashboard/project/vdxrrqknfgwfajfxncei/settings/functions
2. Manage Secrets → Add:
   - `ANTHROPIC_API_KEY` = sua key da Anthropic

### Passo 6: Commit e Push
```bash
git add .
git commit -m "fix: add edge function for valuation"
git push
```

O GitHub Actions vai deployar a Edge Function automaticamente.

### Passo 7: Verificar Deploy
1. Aguarde o workflow terminar (veja em Actions no GitHub)
2. No Supabase Dashboard → Edge Functions
3. Deve aparecer `extract-financial-data`

### Passo 8: Testar
1. Acesse o FinPro
2. Vá em Valuation
3. Clique em "Importar Resultado"
4. Faça upload de um PDF de release trimestral
5. Os dados devem ser extraídos automaticamente

---

## 🐛 Troubleshooting

### "Erro na extração: Edge Function não encontrada"
- A função não foi deployada. Verifique o GitHub Actions.

### "ANTHROPIC_API_KEY não configurada"
- Adicione o secret no Supabase (passo 5)

### "Erro 401 na API"
- API key inválida. Gere uma nova em console.anthropic.com

### Dados não aparecem após salvar
- Verifique se as tabelas existem (passo 1 do checklist)
- Verifique os logs no console do browser (F12)

---

## 🔍 Como Verificar se Está Funcionando

Abra o Console do browser (F12) e você deve ver logs como:
```
Chamando Edge Function extract-financial-data...
Tipo: ACAO Ticker: PETR4 FileType: pdf
Resposta da Edge Function: {success: true, data: {...}}
Salvando resultado trimestral: {...}
Salvo com sucesso, ID: abc123...
```

Se aparecer erro, o log vai mostrar exatamente onde está o problema.
