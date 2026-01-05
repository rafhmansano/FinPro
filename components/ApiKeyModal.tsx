import React, { useState } from 'react';
import { X, Key, ExternalLink } from 'lucide-react';
import { useFinance } from '../context';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const { brapiApiKey, setBrapiApiKey } = useFinance();
  const [apiKey, setApiKey] = useState(brapiApiKey || '');
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (apiKey.trim()) {
      setBrapiApiKey(apiKey.trim());
      alert('✅ API Key salva com sucesso!');
      onClose();
    } else {
      alert('⚠️ Digite uma API Key válida');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Configurar API Key - brapi.dev</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Explicação */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">🔑 Por que preciso de uma API Key?</h3>
            <p className="text-blue-800 text-sm">
              A brapi.dev agora requer autenticação para acessar cotações de ações.
              A API oferece um <strong>plano gratuito</strong> com até 200 requisições por dia.
            </p>
          </div>

          {/* Passo a passo */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">📋 Como obter sua API Key (GRÁTIS)</h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Acesse o site da brapi.dev</p>
                  <a
                    href="https://brapi.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                  >
                    https://brapi.dev
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Faça login ou crie uma conta gratuita</p>
                  <p className="text-sm text-gray-600">Você pode usar Google, GitHub ou email</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Acesse "API Keys" no dashboard</p>
                  <a
                    href="https://brapi.dev/dashboard/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                  >
                    Dashboard → API Keys
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium">Copie sua API Key</p>
                  <p className="text-sm text-gray-600">Ela terá um formato como: <code className="bg-gray-100 px-1 rounded">abc123xyz...</code></p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  5
                </div>
                <div>
                  <p className="font-medium">Cole abaixo e salve!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Input da API Key */}
          <div className="space-y-2">
            <label className="block font-medium">
              Sua API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole sua API Key aqui..."
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-24"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
              >
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {brapiApiKey && (
              <p className="text-sm text-green-600">
                ✅ Você já tem uma API Key configurada
              </p>
            )}
          </div>

          {/* Planos */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold mb-3">📊 Planos brapi.dev</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🆓</span>
                  <span className="font-bold">Gratuito</span>
                </div>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>✅ 200 requisições/dia</li>
                  <li>✅ Suficiente para uso pessoal</li>
                  <li>✅ Todas as cotações B3</li>
                </ul>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">💎</span>
                  <span className="font-bold">Premium</span>
                </div>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>✅ Requisições ilimitadas</li>
                  <li>✅ Dados históricos</li>
                  <li>✅ Prioridade</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Segurança */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">🔒 Segurança</h3>
            <p className="text-yellow-800 text-sm">
              Sua API Key é armazenada <strong>localmente</strong> no seu navegador.
              Nunca a compartilhe com ninguém!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            Salvar API Key
          </button>
        </div>
      </div>
    </div>
  );
};
