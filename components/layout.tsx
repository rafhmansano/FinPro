import React, { useState } from 'react';
import { 
  LayoutDashboard, Wallet, ArrowRightLeft, TrendingUp, Settings, 
  LogOut, PieChart, DollarSign, Menu, X
} from 'lucide-react';
import { useFinance } from '../context';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { user } = useFinance();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { id: 'DASHBOARD', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'CASHFLOW', label: 'Fluxo de Caixa', icon: ArrowRightLeft },
    { id: 'PORTFOLIO', label: 'Minha Carteira', icon: Wallet },
    { id: 'DIVIDENDS', label: 'Proventos', icon: DollarSign },
    { id: 'VALUATION', label: 'Valuation IA', icon: TrendingUp },
    { id: 'SETTINGS', label: 'Configurações', icon: Settings },
  ];

  // Fix: Explicitly type NavItem as React.FC to handle React reserved props like 'key' correctly in mapped components
  const NavItem: React.FC<{ item: typeof navItems[0] }> = ({ item }) => {
    const isActive = currentPage === item.id;
    return (
      <button 
        onClick={() => {
          onNavigate(item.id);
          setIsMobileOpen(false);
        }}
        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
          isActive 
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-500/50' 
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
        }`}
      >
        <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'} />
        <span className="font-medium tracking-wide text-sm">{item.label}</span>
        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Desktop Sidebar */}
      <aside className="w-72 fixed inset-y-0 left-0 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 z-30 hidden lg:flex flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="bg-blue-600 p-2.5 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <PieChart className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Fin<span className="text-blue-500">B3</span> Pro</h1>
            <p className="text-xs text-slate-500 font-mono tracking-wider">TERMINAL V2.1</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map(item => <NavItem key={item.id} item={item} />)}
        </nav>

        <div className="pt-6 border-t border-slate-800 mt-6">
           <div className="px-4 py-3 bg-slate-950/50 rounded-xl border border-slate-800 mb-4">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Autenticado</p>
             <p className="text-xs text-slate-300 font-mono truncate">{user?.email || user?.id || 'Anônimo'}</p>
           </div>
           <button onClick={() => window.location.reload()} className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-rose-400 transition-colors text-sm font-medium group">
             <LogOut size={18} className="group-hover:translate-x-1 transition-transform" /> Sair
           </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-40 p-4 flex justify-between items-center">
         <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded shadow-lg">
                <PieChart className="text-white" size={18} />
            </div>
            <h1 className="font-bold text-white tracking-tight">FinB3 Pro</h1>
         </div>
         <button onClick={() => setIsMobileOpen(true)} className="text-slate-300 p-2 hover:bg-slate-800 rounded-lg">
            <Menu size={24} />
         </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-slate-900 border-l border-slate-800 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center mb-8">
                <span className="font-bold text-white">Menu</span>
                <button onClick={() => setIsMobileOpen(false)}><X className="text-slate-400" /></button>
             </div>
             <nav className="space-y-2 flex-1">
                {navItems.map(item => <NavItem key={item.id} item={item} />)}
             </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-10 pt-20 lg:pt-10 overflow-y-auto h-screen scroll-smooth">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};