import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../contexts/PrivacyContext';

interface PrivacyToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({ className = '', showLabel = false }) => {
  const { isHidden, togglePrivacy } = usePrivacy();

  return (
    <button
      onClick={togglePrivacy}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
        isHidden 
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20' 
          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
      } ${className}`}
      title={isHidden ? 'Mostrar valores' : 'Esconder valores'}
    >
      {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
      {showLabel && (
        <span className="text-xs font-medium">
          {isHidden ? 'Oculto' : 'Visível'}
        </span>
      )}
    </button>
  );
};

// Versão compacta para mobile
export const PrivacyToggleCompact: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isHidden, togglePrivacy } = usePrivacy();

  return (
    <button
      onClick={togglePrivacy}
      className={`p-2 rounded-lg transition-all ${
        isHidden 
          ? 'bg-amber-500/10 text-amber-400' 
          : 'bg-slate-800 text-slate-400 hover:text-slate-300'
      } ${className}`}
      title={isHidden ? 'Mostrar valores' : 'Esconder valores'}
    >
      {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
};
