import React, { useState, useMemo } from 'react';
import { useFinance } from '../context';
import { Button, Modal, Input, Select } from '../components/ui';
import { Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Edit2, Building2, CreditCard, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

type TransactionType = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';

// FIX #1 - Correção de timezone
const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day || 1, 12, 0, 0);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('pt-BR');
};

const formatCurrency = (val: number | null | undefined): string => {
  // FIX #7 - Tratamento de valores nulos/undefined para evitar NaN
  const safeVal = typeof val === 'number' && !isNaN(val) ? val : 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeVal);
};

export const CashFlow = () => {
  const { accounts, transactions, addAccount, addTransaction, deleteItem } = useFinance();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [filterAccount, setFilterAccount] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>('ALL');

  // FIX #7 - Cálculo seguro do saldo das contas
  const accountsWithBalance = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Inicializa com saldo inicial das contas (tratando undefined/null)
    accounts.forEach(acc => {
      const initialBalance = Number(acc.initial_balance || acc.initialBalance || 0);
      balances[acc.id!] = isNaN(initialBalance) ? 0 : initialBalance;
    });
    
    // Soma transações
    transactions.forEach(t => {
      const value = Number(t.value || t.amount || 0);
      const safeValue = isNaN(value) ? 0 : value;
      const accId = t.account_id || t.accountId;
      const type = (t.type || '').toUpperCase();
      
      if (accId && balances[accId] !== undefined) {
        if (type === 'RECEITA' || type === 'INCOME' || type === 'DEPOSITO') {
          balances[accId] += safeValue;
        } else if (type === 'DESPESA' || type === 'EXPENSE' || type === 'SAQUE') {
          balances[accId] -= safeValue;
        }
      }
    });
    
    return accounts.map(acc => ({
      ...acc,
      balance: balances[acc.id!] || 0
    }));
  }, [accounts, transactions]);

  // FIX #7 - Saldo total seguro
  const totalBalance = useMemo(() => {
    return accountsWithBalance.reduce((sum, acc) => {
      const balance = Number(acc.balance);
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
  }, [accountsWithBalance]);

  // Transações filtradas
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const accId = t.account_id || t.accountId;
        if (filterAccount !== 'ALL' && accId !== filterAccount) return false;
        if (filterType !== 'ALL' && (t.type || '').toUpperCase() !== filterType) return false;
        if (filterMonth !== 'ALL') {
          const date = parseLocalDate(t.date || t.transaction_date || '');
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (monthKey !== filterMonth) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.date || a.transaction_date || '';
        const dateB = b.date || b.transaction_date || '';
        return dateB.localeCompare(dateA);
      });
  }, [transactions, filterAccount, filterType, filterMonth]);

  // Meses disponíveis
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      const date = parseLocalDate(t.date || t.transaction_date || '');
      if (!isNaN(date.getTime())) {
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Totais do período
  const periodTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    filteredTransactions.forEach(t => {
      const value = Number(t.value || t.amount || 0);
      const safeValue = isNaN(value) ? 0 : value;
      const type = (t.type || '').toUpperCase();
      
      if (type === 'RECEITA' || type === 'INCOME') {
        income += safeValue;
      } else if (type === 'DESPESA' || type === 'EXPENSE') {
        expense += safeValue;
      }
    });
    
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const handleAddAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    await addAccount({
      name: String(data.name),
      type: String(data.type) || 'CORRENTE',
      initial_balance: Number(data.initialBalance) || 0,
      icon: String(data.icon) || '🏦'
    } as any);
    
    setShowAccountModal(false);
  };

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    await addTransaction({
      account_id: String(data.accountId),
      description: String(data.description),
      value: Number(data.value),
      type: String(data.type),
      category: String(data.category) || 'Outros',
      date: String(data.date)
    } as any);
    
    setShowTransactionModal(false);
  };

  const getAccountName = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    return acc?.name || 'Conta não encontrada';
  };

  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const formatMonthLabel = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    return `${MONTH_NAMES[parseInt(month) - 1]}/${year}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-blue-500" /> Fluxo de Caixa
          </h2>
          <p className="text-slate-400 text-sm">Gerencie suas contas e movimentações.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setShowAccountModal(true)}>
            <Plus size={18} /> Nova Conta
          </Button>
          <Button onClick={() => setShowTransactionModal(true)}>
            <Plus size={18} /> Lançamento
          </Button>
        </div>
      </div>

      {/* Cards de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card Saldo Total */}
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Wallet className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-xs text-blue-300 font-semibold uppercase">Saldo Geral</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Todas as contas</p>
        </div>

        {/* Cards das Contas */}
        {accountsWithBalance.slice(0, 3).map(acc => (
          <div key={acc.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-slate-800 rounded-xl text-2xl">
                {acc.icon || '🏦'}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">{acc.name}</p>
                <p className={`text-2xl font-bold ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(acc.balance)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">{acc.type || 'Conta Corrente'}</p>
          </div>
        ))}
      </div>

      {/* Resumo do Período */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-emerald-400" size={24} />
            <div>
              <p className="text-xs text-emerald-300 uppercase font-semibold">Receitas</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(periodTotals.income)}</p>
            </div>
          </div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <TrendingDown className="text-rose-400" size={24} />
            <div>
              <p className="text-xs text-rose-300 uppercase font-semibold">Despesas</p>
              <p className="text-2xl font-bold text-rose-400">{formatCurrency(periodTotals.expense)}</p>
            </div>
          </div>
        </div>
        <div className={`${periodTotals.net >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'} border rounded-2xl p-6`}>
          <div className="flex items-center gap-3">
            <Wallet className={periodTotals.net >= 0 ? 'text-blue-400' : 'text-amber-400'} size={24} />
            <div>
              <p className={`text-xs ${periodTotals.net >= 0 ? 'text-blue-300' : 'text-amber-300'} uppercase font-semibold`}>Saldo Período</p>
              <p className={`text-2xl font-bold ${periodTotals.net >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>{formatCurrency(periodTotals.net)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Conta</label>
            <select 
              value={filterAccount} 
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            >
              <option value="ALL">Todas</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            >
              <option value="ALL">Todos</option>
              <option value="RECEITA">Receitas</option>
              <option value="DESPESA">Despesas</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Mês</label>
            <select 
              value={filterMonth} 
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200"
            >
              <option value="ALL">Todos</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-white">Extrato Consolidado</h3>
          <span className="text-sm text-slate-500">{filteredTransactions.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase text-xs">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Conta</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTransactions.map(t => {
                const value = Number(t.value || t.amount || 0);
                const type = (t.type || '').toUpperCase();
                const isIncome = type === 'RECEITA' || type === 'INCOME';
                
                return (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono text-slate-300">{formatDate(t.date || t.transaction_date || '')}</td>
                    <td className="p-4 text-white">{t.description || '-'}</td>
                    <td className="p-4 text-slate-400">{getAccountName(t.account_id || t.accountId || '')}</td>
                    <td className="p-4"><span className="text-xs bg-slate-800 px-2 py-1 rounded">{t.category || 'Outros'}</span></td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded font-bold ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isIncome ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-bold font-mono ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isIncome ? '+' : '-'} {formatCurrency(Math.abs(value))}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    Nenhuma movimentação neste período/conta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Conta */}
      <Modal isOpen={showAccountModal} onClose={() => setShowAccountModal(false)} title="Nova Conta">
        <form onSubmit={handleAddAccount} className="space-y-4">
          <Input label="Nome da Conta" name="name" placeholder="Ex: Conta Itaú" required />
          <Select label="Tipo" name="type">
            <option value="CORRENTE">Conta Corrente</option>
            <option value="POUPANCA">Poupança</option>
            <option value="INVESTIMENTO">Investimento</option>
            <option value="CARTEIRA">Carteira</option>
          </Select>
          <Input label="Saldo Inicial (R$)" type="number" step="0.01" name="initialBalance" defaultValue="0" />
          <Select label="Ícone" name="icon">
            <option value="🏦">🏦 Banco</option>
            <option value="💳">💳 Cartão</option>
            <option value="💰">💰 Dinheiro</option>
            <option value="📈">📈 Investimento</option>
          </Select>
          <Button type="submit" className="w-full"><Plus size={18} /> Criar Conta</Button>
        </form>
      </Modal>

      {/* Modal Novo Lançamento */}
      <Modal isOpen={showTransactionModal} onClose={() => setShowTransactionModal(false)} title="Novo Lançamento">
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <Select label="Conta" name="accountId" required>
            <option value="">Selecione...</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </Select>
          <Select label="Tipo" name="type" required>
            <option value="RECEITA">Receita</option>
            <option value="DESPESA">Despesa</option>
          </Select>
          <Input label="Descrição" name="description" placeholder="Ex: Salário" required />
          <Input label="Valor (R$)" type="number" step="0.01" name="value" required />
          <Input label="Categoria" name="category" placeholder="Ex: Alimentação" />
          <Input label="Data" type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
          <Button type="submit" className="w-full"><Plus size={18} /> Adicionar</Button>
        </form>
      </Modal>
    </div>
  );
};
