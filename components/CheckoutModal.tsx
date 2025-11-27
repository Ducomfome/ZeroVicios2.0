import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Lock, AlertTriangle, Truck, Search, 
  Copy, Clock, CheckCircle, PackageCheck, MessageCircle, Loader2
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, getDoc } from 'firebase/firestore';

declare global {
  interface Window {
    fbq: any;
  }
}

const FACEBOOK_PIXEL_ID = '1646006349697772';

// CONFIGURAÇÃO DIRETA DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyC1PSUlYQ8cliInVq9Nak-_HbmWLl7oBc0",
  authDomain: "zero-vicios-tracker.firebaseapp.com",
  projectId: "zero-vicios-tracker",
  storageBucket: "zero-vicios-tracker.firebasestorage.app",
  messagingSenderId: "363015306292",
  appId: "1:363015306292:web:52e53d1fd0e5ec599ade61",
  measurementId: "G-R22SS7H418"
};

const initFirebase = () => {
    try {
      return !getApps().length ? initializeApp(firebaseConfig) : getApp();
    } catch (e) { 
      return null; 
    }
};

const app = initFirebase();
const db = app ? getFirestore(app) : null;

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: { name: string; price: number } | null;
}

const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

const trackPixel = (eventName: string, params?: any) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }
};

const generateTrackingCode = () => {
    const prefix = "BR";
    const numbers = Math.floor(Math.random() * 900000000) + 100000000;
    const suffix = "PT";
    return `${prefix}${numbers}${suffix}`;
};

export function CheckoutModal({ isOpen, onClose, selectedPlan }: CheckoutModalProps) {
  const [checkoutState, setCheckoutState] = useState<'form' | 'loading' | 'pix' | 'success'>('form');
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; copiaECola: string; id: string } | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  
  const [address, setAddress] = useState({
    cep: '',
    street: '',
    number: '',
    district: '',
    city: '',
    state: ''
  });

  // Limpa estados ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
        setCheckoutState('form');
        setPixData(null);
        setIsCheckingPayment(false);
    }
  }, [isOpen]);

  // Listener de Pagamento (Firebase)
  useEffect(() => {
    let unsubscribe: () => void;
    
    // Verificações de segurança antes de chamar o Firestore
    if (checkoutState === 'pix' && pixData && pixData.id && db) {
        try {
            // Garante que é string e remove espaços em branco
            const docId = String(pixData.id).trim();

            if (!docId) return; // Se ID estiver vazio, não faz nada

            unsubscribe = onSnapshot(doc(db, "transactions", docId), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data && data.status === 'paid') {
                        handlePaymentSuccess();
                    }
                }
            }, (error) => {
                console.error("Erro no listener do Firestore:", error);
            });
        } catch (e) {
            console.error("Erro crítico ao conectar listener:", e);
        }
    }
    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [checkoutState, pixData]); // Removido 'db' das dependências para evitar re-runs desnecessários

  if (!isOpen) return null;

  const handleCepBlur = async () => {
    const cleanCep = address.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setAddress(prev => ({
          ...prev,
          street: data.logradouro,
          district: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleGeneratePix = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCheckoutState('loading');

    const formData = new FormData(e.currentTarget);
    const rawEmail = (formData.get('email') as string || '').toLowerCase().trim();
    const rawName = (formData.get('name') as string || '').toLowerCase().trim();
    let rawPhone = (formData.get('phone') as string || '').replace(/\D/g, '');

    if (rawPhone.length >= 10 && rawPhone.length <= 11) {
        rawPhone = '55' + rawPhone;
    }

    const firstName = rawName.split(' ')[0];
    const lastName = rawName.split(' ').slice(1).join(' ');

    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('init', FACEBOOK_PIXEL_ID, {
            em: rawEmail,
            ph: rawPhone,
            fn: firstName,
            ln: lastName,
            ct: 'br',
            st: address.state,
            zp: address.cep.replace(/\D/g, '')
        });
    }

    const userData = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      cpf: formData.get('cpf'),
      cep: address.cep,
      street: address.street,
      number: address.number,
      district: address.district,
      city: address.city,
      state: address.state,
      plan: selectedPlan?.name,
      price: selectedPlan?.price,
      fbc: getCookie('_fbc'),
      fbp: getCookie('_fbp'),
    };

    try {
      const response = await fetch('/api/gerar-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // SANITIZAÇÃO CRÍTICA DO ID
        const safeId = data.id ? String(data.id) : "";
        
        setPixData({
            qrCodeBase64: data.qrCodeBase64 || "",
            copiaECola: data.copiaECola || "",
            id: safeId
        });
        setCheckoutState('pix');

        trackPixel('AddPaymentInfo', {
           content_name: selectedPlan?.name,
           value: selectedPlan?.price,
           currency: 'BRL'
        });
        
        trackPixel('Lead', {
           content_name: 'Cadastro Pix',
           value: selectedPlan?.price,
           currency: 'BRL'
        });

      } else {
        alert(data.error || 'Erro ao gerar PIX.');
        setCheckoutState('form');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão.');
      setCheckoutState('form');
    }
  };

  const handleCopyPix = () => {
    if (pixData?.copiaECola) {
      navigator.clipboard.writeText(pixData.copiaECola);
      alert("Código PIX copiado!");
    }
  };

  const handlePaymentSuccess = () => {
     if (checkoutState !== 'success') {
        trackPixel('Purchase', {
            content_name: selectedPlan?.name,
            value: selectedPlan?.price,
            currency: 'BRL',
            event_id: pixData?.id ? String(pixData.id) : undefined, 
            content_type: 'product'
         });
         setCheckoutState('success');
     }
  };

  const handleManualCheck = async () => {
    if (!pixData?.id || !db) return;
    
    setIsCheckingPayment(true);
    try {
        const docId = String(pixData.id).trim();
        if (!docId) return;

        const docSnap = await getDoc(doc(db, "transactions", docId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'paid') {
                handlePaymentSuccess();
            } else {
                alert("O sistema ainda não identificou o pagamento. Se você já pagou, envie o comprovante no botão do WhatsApp abaixo para liberação imediata.");
            }
        } else {
             // Se não achar o documento, pode ser delay de criação ou erro de ID
             alert("Aguardando registro da transação. Tente novamente em 5 segundos.");
        }
    } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
    } finally {
        setIsCheckingPayment(false);
    }
  };

  // Safe QR Code Source
  const getQrCodeSource = () => {
      if (!pixData) return '';
      if (typeof pixData.qrCodeBase64 === 'string' && pixData.qrCodeBase64.startsWith('data:image')) {
          return pixData.qrCodeBase64;
      }
      if (pixData.copiaECola) {
          return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixData.copiaECola)}`;
      }
      return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md transition-opacity">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 z-10 bg-slate-100 rounded-full p-2 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="bg-slate-50 p-6 border-b border-slate-100 text-center relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
             <div className="flex justify-center mb-2 items-center text-green-600 gap-1">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Ambiente Criptografado</span>
             </div>
             
             {checkoutState === 'form' && (
                <>
                    <h3 className="text-xl font-bold text-slate-900">Finalizar Pedido Seguro</h3>
                    <p className="text-slate-500 text-sm mt-1">Você está comprando: <span className="font-bold text-slate-900">{selectedPlan?.name}</span></p>
                    <div className="mt-3 bg-green-100 text-green-800 text-sm py-1 px-3 rounded-lg inline-block font-bold">
                        Total: R$ {selectedPlan?.price.toFixed(2)}
                    </div>
                </>
             )}
             {checkoutState === 'pix' && <h3 className="text-xl font-bold text-slate-900">Pagamento via PIX</h3>}
             {checkoutState === 'success' && <h3 className="text-xl font-bold text-slate-900">Pedido Confirmado!</h3>}
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {checkoutState === 'form' && (
            <form onSubmit={handleGeneratePix} className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-3 text-xs text-yellow-800 mb-4">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600"/>
                <p>Devido à alta demanda, seu kit está reservado por apenas 10 minutos.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Nome Completo</label>
                <input type="text" name="name" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Digite seu nome completo" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">E-mail Principal</label>
                <input type="email" name="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Digite seu melhor e-mail" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">CPF</label>
                    <input type="text" name="cpf" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-green-500 outline-none" placeholder="000.000.000-00" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">WhatsApp</label>
                    <input type="tel" name="phone" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-green-500 outline-none" placeholder="(DDD) 9..." required />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-green-700 uppercase mb-3 flex items-center"><Truck size={14} className="mr-1"/> Dados de Entrega</p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">CEP</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={address.cep}
                                onChange={(e) => setAddress({...address, cep: e.target.value})}
                                onBlur={handleCepBlur}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-green-500 outline-none" 
                                placeholder="00000-000" 
                                required 
                            />
                            <div className="absolute left-3 top-3.5 text-slate-400">
                                {isLoadingCep ? <div className="w-4 h-4 border-2 border-green-500 rounded-full animate-spin border-t-transparent"></div> : <Search size={16}/>}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Rua</label>
                            <input type="text" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" placeholder="Rua..." required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Número</label>
                            <input type="text" value={address.number} onChange={(e) => setAddress({...address, number: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" placeholder="123" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Bairro</label>
                            <input type="text" value={address.district} onChange={(e) => setAddress({...address, district: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" placeholder="Bairro" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Cidade - UF</label>
                            <input type="text" value={address.city ? `${address.city} - ${address.state}` : ''} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-500 outline-none cursor-not-allowed" placeholder="Cidade" />
                        </div>
                    </div>
                </div>
              </div>
              
              <button type="submit" className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 rounded-xl shadow-lg shadow-green-500/20 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-lg">
                <Lock className="w-5 h-5" />
                PAGAR COM PIX
              </button>
              
              <div className="flex justify-center gap-4 mt-4 opacity-50 grayscale">
                <img src="https://img.icons8.com/color/48/000000/pix.png" className="h-6" alt="Pix" />
              </div>
            </form>
          )}

          {checkoutState === 'loading' && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-green-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-green-500" />
                  </div>
              </div>
              <h4 className="text-lg font-bold text-slate-900">Gerando Código Pix Seguro</h4>
              <p className="text-slate-500 text-sm mt-2 max-w-xs">Aguarde, estamos conectando com o servidor do Banco Central...</p>
            </div>
          )}

          {checkoutState === 'pix' && pixData && (
            <div className="text-center space-y-6 animate-fade-in pb-4">
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-sm mb-4">
                <p className="font-bold flex items-center justify-center gap-2"><Clock className="w-4 h-4"/> Pague em até 10 minutos</p>
                <p className="text-xs mt-1">Para garantir o envio imediato do seu kit.</p>
              </div>

              <div className="bg-white p-4 rounded-xl border-2 border-slate-100 inline-block shadow-sm relative group">
                {getQrCodeSource() ? (
                    <img 
                        src={getQrCodeSource()}
                        alt="QR Code Pix" 
                        className="w-56 h-56 mx-auto mix-blend-multiply" 
                    />
                ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">QR Code Indisponível</div>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Código Copia e Cola</p>
                <div className="flex gap-2 items-center bg-slate-100 p-2 rounded-xl border border-slate-200">
                    <input readOnly value={pixData.copiaECola} className="w-full bg-transparent border-none text-slate-600 text-xs outline-none truncate font-mono" onClick={(e) => e.currentTarget.select()} />
                    <button onClick={handleCopyPix} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors shadow-md active:transform active:scale-95"><Copy className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-600 font-medium mb-4">Após realizar o pagamento no seu banco, clique no botão abaixo para confirmar.</p>
                <button 
                    onClick={handleManualCheck}
                    disabled={isCheckingPayment}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-lg uppercase tracking-wide"
                >
                    {isCheckingPayment ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Verificando...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-6 h-6" />
                            JÁ FIZ O PAGAMENTO
                        </>
                    )}
                </button>
                
                <a 
                    href={`https://wa.me/5592984779395?text=${encodeURIComponent(`Olá, fiz o pagamento do pedido ${pixData.id} (Valor R$ ${selectedPlan?.price.toFixed(2)}). Poderia verificar e liberar meu acesso?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                >
                    <MessageCircle className="w-5 h-5" />
                    Enviar Comprovante / Liberar Agora
                </a>
              </div>
            </div>
          )}

          {checkoutState === 'success' && (
              <div className="text-center py-8 space-y-6 animate-fade-in-up">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                      <Truck className="w-12 h-12 text-green-600 relative z-10" />
                      <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 animate-ping"></div>
                  </div>
                  
                  <div>
                      <h2 className="text-2xl font-black text-slate-900 mb-2">Pedido Confirmado!</h2>
                      <p className="text-slate-600">Seu pagamento foi aprovado e seu kit está sendo preparado para envio.</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-5"><PackageCheck size={80}/></div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Seu Código de Rastreio (Prévia)</p>
                      <div className="bg-white border border-slate-200 p-3 rounded-lg font-mono text-xl font-bold text-slate-800 tracking-widest shadow-inner">
                          {generateTrackingCode()}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">*O rastreio oficial será enviado por e-mail em até 24h.</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-left flex gap-3">
                      <div className="bg-blue-100 p-2 rounded-full h-fit"><MessageCircle className="w-4 h-4 text-blue-600"/></div>
                      <div>
                          <p className="font-bold text-blue-900 text-sm">Próximos Passos:</p>
                          <p className="text-blue-800 text-xs mt-1 leading-relaxed">
                              Nossa equipe entrará em contato via WhatsApp e E-mail para confirmar seus dados. O prazo estimado de entrega é de <strong>15 a 30 dias úteis</strong>.
                          </p>
                      </div>
                  </div>

                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm underline">
                      Voltar ao site
                  </button>
              </div>
          )}
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
            <p className="text-[10px] text-slate-400">Ao finalizar a compra você concorda com nossos Termos de Uso.</p>
        </div>
      </div>
    </div>
  );
}