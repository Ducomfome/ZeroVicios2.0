import React, { useState } from 'react';
import { QrCode, Copy, Check, X } from 'lucide-react';

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
}

export const PixModal: React.FC<PixModalProps> = ({ isOpen, onClose, amount }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Mock Pix Code
  const pixCode = "00020126360014BR.GOV.BCB.PIX0114+551199999999520400005303986540510.005802BR5913Zero Vicio App6009Sao Paulo62070503***6304E2CA";

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-3">
            <QrCode size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Desbloquear Premium</h2>
          <p className="text-slate-400 text-sm mt-1">
            Contribua com R$ {amount.toFixed(2).replace('.', ',')} para acessar recursos exclusivos e apoiar o projeto.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl mb-6 mx-auto w-64 h-64 flex items-center justify-center">
            {/* Placeholder for QR Code generation logic often handled by backend */}
            <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${pixCode}`} 
                alt="Pix QR Code" 
                className="w-full h-full object-contain"
            />
        </div>

        <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between border border-slate-700 mb-4">
          <div className="overflow-hidden mr-2">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Pix Copia e Cola</p>
            <p className="text-sm text-slate-300 truncate font-mono">{pixCode}</p>
          </div>
          <button 
            onClick={handleCopy}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md text-white transition-colors"
          >
            {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
        </div>

        <div className="text-center text-xs text-slate-500">
          A confirmação via webhook é processada automaticamente em até 2 minutos.
        </div>
      </div>
    </div>
  );
};