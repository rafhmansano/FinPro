# Deploy da Edge Function - Passo a Passo

## Método: Via Dashboard do Supabase (Sem CLI)

### Passo 1: Configurar o Secret da API Key

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto (vdxrrqknfgwfajfxncei)
3. Vá em **Project Settings** (ícone de engrenagem)
4. Clique em **Edge Functions**
5. Clique em **Manage Secrets**
6. Clique em **New Secret**
7. Configure:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-sua-key-aqui` (cole sua API key da Anthropic)
8. Clique em **Save**

### Passo 2: Criar a Edge Function

Infelizmente, o Dashboard não permite criar Edge Functions diretamente.
Você precisa usar uma dessas opções:

---

## Opção A: GitHub Actions (Recomendado)

### 1. Adicione os arquivos ao seu repositório:

```
FinPro/
└── supabase/
    └── functions/
        └── extract-financial-data/
            └── index.ts   (copie o arquivo fornecido)
```

### 2. Crie o arquivo de workflow `.github/workflows/deploy-functions.yml`:

```yaml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - run: supabase functions deploy extract-financial-data --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### 3. Configure os Secrets no GitHub:

1. Vá no seu repositório GitHub → Settings → Secrets and variables → Actions
2. Adicione:
   - `SUPABASE_PROJECT_REF`: `vdxrrqknfgwfajfxncei`
   - `SUPABASE_ACCESS_TOKEN`: (obtenha em https://supabase.com/dashboard/account/tokens)

### 4. Faça push das alterações

O deploy será automático!

---

## Opção B: Deploy Manual Local (Uma vez só)

Se quiser fazer o deploy uma única vez sem GitHub Actions:

### 1. Instale o Docker Desktop
https://www.docker.com/products/docker-desktop/

### 2. Instale o Supabase CLI via Docker:

```bash
# Não precisa instalar - rode direto via npx
npx supabase --version
```

### 3. Faça login e deploy:

```bash
# Login (abre o browser)
npx supabase login

# Na pasta do FinPro
cd FinPro

# Link com o projeto
npx supabase link --project-ref vdxrrqknfgwfajfxncei

# Deploy da função
npx supabase functions deploy extract-financial-data
```

---

## Opção C: Deploy via Supabase CLI no Cloud Shell

Você pode usar o Google Cloud Shell (gratuito) para rodar o CLI:

1. Acesse: https://shell.cloud.google.com/
2. Execute:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Criar pasta e arquivo
mkdir -p supabase/functions/extract-financial-data
# Cole o conteúdo do index.ts

# Link e deploy
supabase link --project-ref vdxrrqknfgwfajfxncei
supabase functions deploy extract-financial-data
```

---

## Verificar se Funcionou

1. No Dashboard do Supabase, vá em **Edge Functions**
2. Você deve ver `extract-financial-data` listada
3. Clique nela para ver logs e métricas

---

## Testar a Função

No terminal ou via Postman:

```bash
curl -X POST https://vdxrrqknfgwfajfxncei.supabase.co/functions/v1/extract-financial-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -d '{"fileContent": "Resultado 3T24 Receita: 50 bi", "assetType": "ACAO", "ticker": "PETR4", "fileType": "text"}'
```

---

## Arquivos para Copiar

1. `supabase/functions/extract-financial-data/index.ts` → para seu repositório
2. `services/valuationService.ts` → para `src/services/`
