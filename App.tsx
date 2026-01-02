import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context';
import { Layout } from './components/layout';
import { Dashboard } from './pages/Dashboard';
import { CashFlow } from './pages/CashFlow';
import { Portfolio } from './pages/Portfolio';
import { Dividends } from './pages/Dividends';
import { Valuation } from './pages/Valuation';
import { Settings } from './pages/Settings';

const AppContent = () => {
  const { user, loading } = useFinance();
  const [currentPage, setCurrentPage] = useState('DASHBOARD');

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-mono text-xs tracking-widest">INICIALIZANDO SISTEMA...</p>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tighter">FinPro</h1>
        <p className="text-slate-400 mb-8 font-light">Inteligência Financeira de Nova Geração</p>
        <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-mono uppercase">Estabelecendo Conexão Segura...</p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'DASHBOARD' && <Dashboard />}
      {currentPage === 'CASHFLOW' && <CashFlow />}
      {currentPage === 'PORTFOLIO' && <Portfolio />}
      {currentPage === 'DIVIDENDS' && <Dividends />}
      {currentPage === 'VALUATION' && <Valuation />}
      {currentPage === 'SETTINGS' && <Settings />}
    </Layout>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
