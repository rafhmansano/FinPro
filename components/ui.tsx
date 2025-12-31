import React from 'react';
import { Plus, X, Loader2 } from 'lucide-react';

export const Card: React.FC<{ 
  title: string; 
  value: React.ReactNode; 
  subtext?: string; 
  icon?: React.ElementType; 
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}> = ({ title, value, subtext, icon: Icon, trend, className = '' }) => (
  <div className={`bg-slate-900/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(56,189,248,0.1)] transition-all duration-300 ${className}`}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{title}</p>
        <div className="text-3xl font-bold text-white mt-2 tracking-tight font-mono">{value}</div>
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : trend === 'down' ? 'bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.3)]' : 'bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]'}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
      )}
    </div>
    {subtext && (
      <div className="flex items-center text-sm">
        <span className={`font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
          {subtext}
        </span>
      </div>
    )}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = 
  ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 text-sm tracking-wide";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] border border-blue-500/50",
    secondary: "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 hover:text-white",
    danger: "bg-rose-900/30 text-rose-400 border border-rose-900/50 hover:bg-rose-900/50 hover:text-rose-300",
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/30">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ReactNode }> = ({ label, icon, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{label}</label>
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          {icon}
        </div>
      )}
      <input 
        className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${icon ? 'pl-11 pr-4' : 'px-4'} py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${className}`} 
        {...props} 
      />
    </div>
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{label}</label>
    <select 
      className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none ${className}`} 
      {...props} 
    >
      {children}
    </select>
  </div>
);