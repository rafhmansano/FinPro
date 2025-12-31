import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
import { Button, Modal, Input, Select } from '../components/ui';
import { Trash2, Plus, ArrowUpRight, ArrowDownLeft, RefreshCcw, Landmark, CreditCard, Building2, Wallet, ArrowRightLeft } from 'lucide-react';
import { TransactionType } from '../types';

export const CashFlow = () => {
  const { transactions, accounts, addTransaction, addAccount, deleteItem } = useFinance();
  
  // States for Modals
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [transType, setTransType] = useState<TransactionType>('DESPESA');
  
  // State for Filtering
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');

  // --- Calculations ---
  const accountBalances = useMemo(() => {
    return accounts.map(acc => {
      const accTrans = transactions.filter(t => t.accountId === acc.id);
      const income = accTrans.filter(t => t.type === 'RECEITA').reduce((sum, t) => sum + Number(t.value), 0);
      const expense = accTrans.filter(t => t.type === 'DESPESA').reduce((sum, t) => sum + Number(t.value), 0);
      
      return {
        ...acc,
        balance: Number(acc.initialBalance) + income - expense,
        income,
        expense
      };
    });
  }, [accounts, transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'ALL') return transactions;
    return transactions.filter(t => t.accountId === selectedAccountId);
  }, [selectedAccountId, transactions]);

  // --- Handlers ---

  const handleTransSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as any;
    
    if (!data.accountId && accounts.length > 0) {
        alert("Por favor, selecione uma conta para esta transação.");
        return;
    }

    addTransaction({ ...data, type: transType });
    setIsTransModalOpen(false);
  };

  const handleAccountSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as any;
    addAccount({
        name: data.name,
        bank: data.bank,
        color: data.color,
        initialBalance: Number(data.initialBalance)
    });
    setIsAccountModalOpen(false);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getBankStyle = (bankName: string) => {
    const styles: any = {
        'Nubank': { color: 'from-purple-600 to-purple-800', icon: CreditCard },
        'Inter': { color: 'from-orange-500 to-orange-700', icon: Building2 },
        'Itaú': { color: 'from-blue-600 to-blue-800', icon: Landmark },
        'Bradesco': { color: 'from-red-600 to-red-800', icon: Landmark },
        'Caixa': { color: 'from-blue-400 to-blue-600', icon: Landmark },
        'Dinheiro': { color: 'from-emerald-600 to-emerald-800', icon: Wallet },
    };
    return styles[bankName] || { color: 'from-slate-700 to-slate-900', icon: Landmark };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white">Fluxo de Caixa</h2>
           <p className="text-slate-400 text-sm">Gerencie suas contas e movimentações.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
             <Button variant="secondary" onClick={() => setIsAccountModalOpen(true)}><Plus size={18} /> Nova Conta</Button>
             <Button onClick={() => setIsTransModalOpen(true)}><ArrowRightLeft size={18} /> Lançamento</Button>
        </div>
      </div>

      {/* Accounts Carousel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Global Card */}
        <button 
            onClick={() => setSelectedAccountId('ALL')}
            className={`p-6 rounded-2xl border text-left transition-all relative overflow-hidden group ${selectedAccountId === 'ALL' ? 'bg-blue-600 border-blue-500 shadow-blue-900/20 shadow-xl' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
        >
             <div className="relative z-10">
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${selectedAccountId === 'ALL' ? 'text-blue-200' : 'text-slate-500'}`}>Saldo Geral</p>
                <h3 className="text-2xl font-bold text-white font-mono">
                    {formatCurrency(accountBalances.reduce((acc, curr) => acc + curr.balance, 0))}
                </h3>
                <p className="text-xs mt-2 opacity-70 text-white">Todas as contas</p>
             </div>
             {/* Background Decoration */}
             <div className="absolute -bottom-4 -right-4 text-white opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet size={80} />
             </div>
        </button>

        {/* Individual Account Cards */}
        {accountBalances.map(acc => {
            const style = getBankStyle(acc.bank);
            const isSelected = selectedAccountId === acc.id;
            
            return (
                <button 
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id!)}
                    className={`p-6 rounded-2xl border text-left transition-all relative overflow-hidden group ${isSelected ? 'ring-2 ring-blue-500 border-transparent shadow-xl' : 'border-slate-800 hover:border-slate-600'}`}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br ${style.color} opacity-90 transition-opacity`}></div>
                    <div className={`absolute inset-0 bg-black ${isSelected ? 'opacity-0' : 'opacity-60 group-hover:opacity-40'} transition-opacity`}></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-white font-bold text-sm flex items-center gap-2">
                                <style.icon size={16} /> {acc.name}
                            </span>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]"></div>}
                        </div>
                        <h3 className="text-xl font-bold text-white font-mono mb-1">
                            {formatCurrency(acc.balance)}
                        </h3>
                        <div className="flex gap-3 text-[10px] text-white/80 font-mono mt-3">
                             <span className="flex items-center gap-1"><ArrowUpRight size={10} /> {formatCurrency(acc.income)}</span>
                             <span className="flex items-center gap-1"><ArrowDownLeft size={10} /> {formatCurrency(acc.expense)}</span>
                        </div>
                    </div>
                    
                    <div 
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 p-2 hover:bg-black/20 rounded cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation(); 
                            if(confirm('Excluir esta conta?')) deleteItem('accounts', acc.id!);
                        }}
                    >
                         <Trash2 size={14} className="text-white/70 hover:text-white" />
                    </div>
                </button>
            );
        })}
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
            <h3 className="text-sm font-bold text-slate-300">Extrato {selectedAccountId !== 'ALL' ? `- ${accounts.find(a => a.id === selectedAccountId)?.name}` : 'Consolidado'}</h3>
            <span className="text-xs text-slate-500 font-mono">{filteredTransactions.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-5">Data</th>
                <th className="p-5">Descrição</th>
                <th className="p-5">Conta</th>
                <th className="p-5">Categoria</th>
                <th className="p-5">Tipo</th>
                <th className="p-5 text-right">Valor</th>
                <th className="p-5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTransactions.sort((a,b) => b.date.localeCompare(a.date)).map(t => {
                const acc = accounts.find(a => a.id === t.accountId);
                return (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="p-5 font-mono text-slate-500">{t.date.split('-').reverse().join('/')}</td>
                  <td className="p-5 font-medium text-slate-200">{t.description}</td>
                  <td className="p-5">
                     {acc ? (
                         <span className="text-xs flex items-center gap-1 text-slate-400">
                             <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${getBankStyle(acc.bank).color}`}></div>
                             {acc.name}
                         </span>
                     ) : <span className="text-xs text-slate-600">-</span>}
                  </td>
                  <td className="p-5">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-400">{t.category}</span>
                  </td>
                  <td className="p-5">
                     {t.type === 'RECEITA' ? (
                         <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><ArrowUpRight size={14} /> ENT.</span>
                     ) : t.type === 'DESPESA' ? (
                         <span className="flex items-center gap-1 text-rose-400 text-xs font-bold"><ArrowDownLeft size={14} /> SAI.</span>
                     ) : (
                         <span className="flex items-center gap-1 text-blue-400 text-xs font-bold"><RefreshCcw size={14} /> TRF.</span>
                     )}
                  </td>
                  <td className={`p-5 text-right font-mono font-bold text-base ${t.type === 'RECEITA' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {t.type === 'DESPESA' && '- '} 
                    {formatCurrency(Number(t.value))}
                  </td>
                  <td className="p-5 text-right">
                    <button onClick={() => deleteItem('transactions', t.id!)} className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-rose-500/10">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )})}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">Nenhuma movimentação neste período/conta.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: Nova Transação --- */}
      <Modal isOpen={isTransModalOpen} onClose={() => setIsTransModalOpen(false)} title="Nova Movimentação">
        <form onSubmit={handleTransSubmit}>
          <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
            {(['RECEITA', 'DESPESA', 'TRANSFERENCIA'] as const).map(t => (
              <button 
                type="button" 
                key={t}
                onClick={() => setTransType(t)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  transType === t 
                  ? (t === 'RECEITA' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : t === 'DESPESA' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50' : 'bg-blue-600 text-white') 
                  : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          
          <Select label="Conta de Origem" name="accountId" required>
              {accounts.length === 0 && <option value="">Crie uma conta primeiro...</option>}
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.bank})</option>)}
          </Select>

          <Input label="Descrição" required name="description" placeholder="Ex: Mercado, Salário" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$)" required type="number" step="0.01" name="value" placeholder="0.00" />
            <Input label="Data" required type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <Select label="Categoria" name="category">
             <option value="Moradia">Moradia</option>
             <option value="Alimentação">Alimentação</option>
             <option value="Transporte">Transporte</option>
             <option value="Salário">Salário</option>
             <option value="Lazer">Lazer</option>
             <option value="Saúde">Saúde</option>
             <option value="Investimentos">Investimentos</option>
             <option value="Outros">Outros</option>
          </Select>
          
          {accounts.length === 0 ? (
             <p className="text-xs text-rose-400 text-center mb-2">Você precisa cadastrar uma conta bancária antes de adicionar transações.</p>
          ) : (
             <Button type="submit" className="w-full mt-4">Confirmar</Button>
          )}
        </form>
      </Modal>

      {/* --- MODAL: Nova Conta --- */}
      <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title="Cadastrar Conta Corrente">
        <form onSubmit={handleAccountSubmit}>
          <Input label="Nome da Conta" required name="name" placeholder="Ex: Minha Conta Principal" />
          
          <div className="grid grid-cols-2 gap-4">
             <Select label="Instituição" name="bank">
                <option value="Nubank">Nubank</option>
                <option value="Inter">Banco Inter</option>
                <option value="Itaú">Itaú</option>
                <option value="Bradesco">Bradesco</option>
                <option value="Caixa">Caixa</option>
                <option value="Dinheiro">Dinheiro Físico</option>
                <option value="BTG">BTG</option>
                <option value="Outros">Outros</option>
             </Select>
             <Input label="Saldo Inicial (R$)" type="number" step="0.01" name="initialBalance" defaultValue="0" />
          </div>

          <div className="mb-4">
             <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Cor do Cartão</label>
             <input type="color" name="color" className="w-full h-10 rounded-xl cursor-pointer bg-slate-950 border border-slate-800 p-1" defaultValue="#3b82f6" />
          </div>
          
          <Button type="submit" className="w-full mt-4">Criar Conta</Button>
        </form>
      </Modal>
    </div>
  );
};