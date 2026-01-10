import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PrivacyContextType {
  isHidden: boolean;
  togglePrivacy: () => void;
  formatCurrency: (value: number, currency?: string) => string;
  formatNumber: (value: number, decimals?: number) => string;
  formatPercent: (value: number, showSign?: boolean) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem('finpro_privacy_mode') === 'true';
  });

  const togglePrivacy = useCallback(() => {
    setIsHidden(prev => {
      const newValue = !prev;
      localStorage.setItem('finpro_privacy_mode', String(newValue));
      return newValue;
    });
  }, []);

  const formatCurrency = useCallback((value: number, currency: string = 'BRL'): string => {
    if (isHidden) return '•••••';
    
    const safeVal = typeof value === 'number' && !isNaN(value) ? value : 0;
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safeVal);
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeVal);
  }, [isHidden]);

  const formatNumber = useCallback((value: number, decimals: number = 0): string => {
    if (isHidden) return '•••';
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  }, [isHidden]);

  const formatPercent = useCallback((value: number, showSign: boolean = false): string => {
    if (isHidden) return '•••%';
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }, [isHidden]);

  return (
    <PrivacyContext.Provider value={{ isHidden, togglePrivacy, formatCurrency, formatNumber, formatPercent }}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy deve ser usado dentro de um PrivacyProvider');
  }
  return context;
};
