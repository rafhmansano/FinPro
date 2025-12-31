
import React, { useState, useEffect } from 'react';
import { useFinance } from '../context';
import { Button, Input, Select, Modal } from '../components/ui';
import { 
  Database, Wifi, WifiOff, RefreshCw, Key, Save, ShieldAlert,
  Loader2, Globe, FileSpreadsheet, CheckCircle2, AlertCircle, ChevronRight,
  Info
} from 'lucide-react';
import { isMock, GoogleSheetsService, normalizeAssetType } from '../services';

const COLUMN_MAPPING: Record<string, string> = {
  'ticker': 'ticker', 'código': 'ticker', 'ativo': 'ticker', 'símbolo': 'ticker',
  'nome': 'name', 'empresa': 'name', 'name': 'name',
  'tipo': 'type', 'classe': 'type', 'type': 'type',
  'setor': 'sector', 'sector': 'sector',
  'quantidade': 'quantity', 'qtd': 'quantity', 'quantity': 'quantity',
  'preço médio': 'avg_price', 'preco medio': 'avg_price', 'pm': 'avg_price', 'avg_price': 'avg_price', 'custo': 'avg_price',
  'descrição': 'description', 'descricao': 'description', 'item': 'description',
  'valor': 'value', 'quantia': 'value', 'price': 'value',
  'data': 'date', 'vencimento': 'date', 'pagamento': 'date',
  'categoria': 'category', 'grupo': 'category',
  'conta': 'accountId', 'origem': 'accountId',
  'valor total': 'totalValue', 'rendimento': 'totalValue', 'provento': 'totalValue'
};

const TABLE_SCHEMAS: Record<string, string[]> = {
  assets: ['ticker', 'name', 'type', 'sector', 'quantity', 'avg_price'],
  transactions: ['description', 'value', 'type', 'category', 'date', 'accountId'],
  dividends: ['ticker', 'type', 'totalValue', 'paymentDate']
};

const NUMERIC_FIELDS = ['quantity', 'avg_price', 'value', 'totalValue', 'fees', 'price'];

export const Settings = () => {
  const { assets, isDemo, bulkInsert, refreshData } = useFinance();
  const [dbUrl, setDbUrl] = useState('');
  const [dbKey, setDbKey] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importTable, setImportTable] = useState('assets');
  const [importStep, setImportStep] = useState<'URL' | 'PREVIEW' | 'LOADING'>('URL');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<{success?: boolean, msg?: string} | null>(null);

  useEffect(() => {
    setDbUrl(localStorage.getItem('finb3_supabase_url') || '');
    setDbKey(localStorage.getItem('finb3_supabase_key') || '');
    // Corrigido para finb3_supabase_service_role
    setServiceKey(localStorage.getItem('finb3_supabase_service_role') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('finb3_supabase_url', dbUrl);
    localStorage.setItem('finb3_supabase_key', dbKey);
    // Corrigido para finb3_supabase_service_role
    localStorage.setItem('finb3_supabase_service_role', serviceKey);
    window.location.reload();
  };

  const handleFetchSheet = async () => {
    setImportStep('LOADING');
    setImportStatus(null);
    try {
      const rawData = await GoogleSheetsService.fetchAndParse(sheetUrl);
      const normalizedData = rawData.map(row => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          const mappedKey = COLUMN_MAPPING[key] || key;
          newRow[mappedKey] = row[key];
        });
        return newRow;
      });
      setParsedData(normalizedData);
      setImportStep('PREVIEW');
    } catch (e: any) {
      setImportStatus({ success: false, msg: `Falha na leitura: ${e.message}` });
      setImportStep('URL');
    }
  };

  const handleFinalImport = async () => {
    setImportStep('LOADING');
    try {
      const allowedKeys = TABLE_SCHEMAS[importTable];
      const mapped = parsedData.map(item => {
        const cleaned: any = {};
        allowedKeys.forEach(k => {
          if (item[k] !== undefined && item[k] !== null) {
            let val = item[k];
            if (NUMERIC_FIELDS.includes(k)) {
                if (typeof val === 'string') val = val.replace(/[R$\s.]/g, '').replace(',', '.');
                const numVal = parseFloat(val);
                cleaned[k] = isNaN(numVal) ? 0 : numVal;
            } else {
                let strVal = String(val).trim();
                if (importTable === 'assets' && k === 'type') strVal = normalizeAssetType(strVal);
                if (k === 'ticker') strVal = strVal.toUpperCase();
                cleaned[k] = strVal;
            }
          }
        });
        return cleaned;
      });
      const count = await bulkInsert(importTable, mapped);
      setImportStatus({ success: true, msg: `${count} registros sincronizados!` });
      setImportStep('URL');
      setParsedData([]);
      setSheetUrl('');
      await refreshData();
    } catch (e: any) {
      setImportStatus({ success: false, msg: `Erro: ${e.message}` });
      setImportStep('URL');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20 max-w-4xl mx-auto">
       <div className="border-b border-slate-800 pb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Configuração do Terminal</h2>
            <p className="text-slate-400">Gerencie sua conectividade e dados externos.</p>
          </div>
          <Button variant="secondary" onClick={() => { setImportStatus(null); setIsImportModalOpen(true); }}>
             <FileSpreadsheet size={18} /> Importar Planilha
          </Button>
       </div>

       <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
         <div className="flex items-start gap-4 mb-8">
            <div className={`p-4 rounded-2xl ${isMock ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {isMock ? <WifiOff size={28} /> : <Wifi size={28} />}
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">Status da Sincronização</h3>
                <p className="text-sm text-slate-400">Infraestrutura: {isMock ? 'MODO OFFLINE' : 'SUPABASE CLOUD'}</p>
            </div>
         </div>

         <div className="space-y-5">
            <Input label="Supabase URL" value={dbUrl} onChange={e => setDbUrl(e.target.value)} icon={<Globe size={18} />} placeholder="https://xyz.supabase.co" />
            <Input label="Anon Key (Public)" value={dbKey} onChange={e => setDbKey(e.target.value)} type="password" icon={<Key size={18} />} placeholder="Public key" />
            <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-amber-500">
                    <ShieldAlert size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Poder Administrativo</span>
                </div>
                <Input label="Service Role Key (Master)" value={serviceKey} onChange={e => setServiceKey(e.target.value)} type="password" icon={<Key size={18} />} placeholder="Master key" />
            </div>
            <Button onClick={handleSave} className="w-full h-12 text-base"><Save size={20} /> Aplicar Alterações</Button>
         </div>
         <Database className="absolute -bottom-10 -right-10 text-slate-800/20" size={200} />
       </div>

       <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Importador de Dados">
          {importStep === 'LOADING' ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="animate-spin text-blue-500" size={48} />
                  <p className="text-slate-400 font-mono text-sm tracking-widest">SANEANDO DADOS...</p>
              </div>
          ) : importStep === 'URL' ? (
              <div className="space-y-6">
                  {importStatus && (
                      <div className={`p-4 rounded-xl flex items-center gap-3 border ${importStatus.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                          {importStatus.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                          <span className="text-sm font-medium">{importStatus.msg}</span>
                      </div>
                  )}
                  <Select label="Tabela Destino" value={importTable} onChange={e => setImportTable(e.target.value)}>
                      <option value="assets">Carteira de Ativos</option>
                      <option value="transactions">Fluxo de Caixa</option>
                      <option value="dividends">Histórico de Proventos</option>
                  </Select>
                  <Input label="Google Sheets Link (CSV)" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." icon={<FileSpreadsheet size={18} />} />
                  <Button className="w-full" onClick={handleFetchSheet} disabled={!sheetUrl}>Mapear Planilha <ChevronRight size={18} /></Button>
              </div>
          ) : (
              <div className="space-y-6">
                  <div className="flex justify-between items-center"><h4 className="text-sm font-bold text-white">Preview do Lote</h4><Button variant="ghost" onClick={() => setImportStep('URL')}>Voltar</Button></div>
                  <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/50">
                      <table className="w-full text-[10px] text-left">
                          <thead className="bg-slate-900 text-slate-500 sticky top-0"><tr>{Object.keys(parsedData[0] || {}).map(h => <th key={h} className="p-2 border-b border-slate-800">{h}</th>)}</tr></thead>
                          <tbody className="divide-y divide-slate-800">{parsedData.slice(0, 5).map((row, i) => (<tr key={i}>{Object.values(row).map((v: any, j) => (<td key={j} className="p-2 truncate max-w-[120px] text-slate-300">{String(v)}</td>))}</tr>))}</tbody>
                      </table>
                  </div>
                  <Button className="w-full h-12 text-base font-bold" onClick={handleFinalImport}>Confirmar Inserção</Button>
              </div>
          )}
       </Modal>
    </div>
  );
};
