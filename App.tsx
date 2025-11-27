import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  ShieldCheck,
  Truck,
  FlaskConical,
  Heart,
  Lightbulb,
  X,
  Play,
  Copy,
  Lock,
  Star,
  Clock,
  ArrowRight,
  MessageCircle,
  AlertTriangle,
  MapPin,
  Search,
  PackageCheck
} from "lucide-react";
import { AdminDashboard } from "./components/AdminDashboard";

// =========================================================
// TIPOS E CONFIGURAÇÕES
// =========================================================
declare global {
  interface Window {
    fbq: any;
  }
}

const FACEBOOK_PIXEL_ID = '1646006349697772';

type VideoKey = "vsl" | "test1" | "test2";

const VIDEO_SOURCES: Record<VideoKey, string> = {
  vsl: "https://pub-9ad786fb39ec4b43b2905a55edcb38d9.r2.dev/1120.mp4",
  test1: "https://pub-9ad786fb39ec4b43b2905a55edcb38d9.r2.dev/baixados%20(1).mp4",
  test2: "https://pub-9ad786fb39ec4b43b2905a55edcb38d9.r2.dev/baixados%20(2).mp4",
};

const POSTER_SOURCES: Record<VideoKey, string> = {
  vsl: "https://pub-9ad786fb39ec4b43b2905a55edcb38d9.r2.dev/images%20(1)%20(1).png",
  test1: "",
  test2: "",
};

const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

// Helper do Pixel
const trackPixel = (eventName: string, params?: any) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }
};

// Gerador de Código de Rastreio Fake
const generateTrackingCode = () => {
    const prefix = "BR";
    const numbers = Math.floor(Math.random() * 900000000) + 100000000;
    const suffix = "PT";
    return `${prefix}${numbers}${suffix}`;
};

// =========================================================
// COMPONENTE: CONTADOR DE ESCASSEZ
// =========================================================
function CountdownBar() {
  const [timeLeft, setTimeLeft] = useState({ m: 14, s: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.s === 0) {
          if (prev.m === 0) return prev;
          return { m: prev.m - 1, s: 59 };
        }
        return { ...prev, s: prev.s - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-red-600 text-white py-2 px-4 text-center text-sm font-bold shadow-md sticky top-0 z-50 flex justify-center items-center gap-2 animate-pulse">
      <Clock className="w-4 h-4" />
      <span>OFERTA RELÂMPAGO: O desconto de lançamento encerra em {String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}</span>
    </div>
  );
}

// =========================================================
// COMPONENTE: PLAYER (FLEXÍVEL COM RASTREAMENTO)
// =========================================================
function Player({
  id,
  src,
  poster,
  currentlyPlaying,
  setCurrentlyPlaying,
  refsMap,
  aspectRatio = "16/9", 
}: {
  id: VideoKey;
  src: string;
  poster: string;
  currentlyPlaying: VideoKey | null;
  setCurrentlyPlaying: (k: VideoKey | null) => void;
  refsMap: React.MutableRefObject<Record<VideoKey, HTMLVideoElement | null>>;
  aspectRatio?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPosterVisible, setIsPosterVisible] = useState(true);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const trackedQuartiles = useRef<Set<number>>(new Set()); // Para não enviar 50% várias vezes
  const isPlaying = currentlyPlaying === id;

  useEffect(() => {
    refsMap.current[id] = localRef.current;
    return () => {
      refsMap.current[id] = null;
    };
  }, [id, refsMap]);

  const sendVideoEvent = async (eventType: string) => {
    try {
        await fetch('/api/track-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType, videoId: id })
        });
    } catch (e) { console.error('Erro tracking video', e); }
  };

  const handleTimeUpdate = () => {
    const video = localRef.current;
    if (!video) return;

    const progress = (video.currentTime / video.duration) * 100;
    
    // Rastreamento de quartis
    [25, 50, 75].forEach(q => {
        if (progress >= q && !trackedQuartiles.current.has(q)) {
            trackedQuartiles.current.add(q);
            sendVideoEvent(`${q}%`);
        }
    });
  };

  const handlePlayClick = async () => {
    (Object.keys(refsMap.current) as VideoKey[]).forEach((k) => {
      if (k !== id && refsMap.current[k]) {
        try {
          refsMap.current[k]!.pause();
        } catch {}
      }
    });
    setCurrentlyPlaying(id);
    setIsPosterVisible(false);
    setIsLoading(true);
    
    // Rastreia Play
    if (trackedQuartiles.current.size === 0) {
        sendVideoEvent('play');
    }

    try {
      await refsMap.current[id]?.play();
    } catch (err) {
      console.error("Erro ao dar play:", err);
      setIsLoading(false);
      setIsPosterVisible(true);
      setCurrentlyPlaying(null);
    }
  };

  return (
    <div 
      className="relative w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-700 bg-gray-900 group"
      style={{ aspectRatio: aspectRatio.replace('/', ' / ') }}
    >
      <video
        ref={(el) => {
          localRef.current = el;
          refsMap.current[id] = el;
        }}
        src={src}
        playsInline
        controls={isPlaying}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onTimeUpdate={handleTimeUpdate}
        onPause={() => {
          if (currentlyPlaying === id) setCurrentlyPlaying(null);
          setIsPosterVisible(true);
        }}
        onEnded={() => {
          setCurrentlyPlaying(null);
          setIsPosterVisible(true);
          sendVideoEvent('complete');
        }}
        className="w-full h-full object-cover"
      />
      
      {isPosterVisible && poster && (
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${poster})` }}>
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all" />
        </div>
      )}

      {isPosterVisible && (
        <div
          onClick={handlePlayClick}
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group/play"
        >
          <div className="relative flex items-center justify-center">
            {/* Ping Animation Ring */}
            <div className="absolute w-24 h-24 bg-green-500 rounded-full animate-ping opacity-30"></div>
            
            {/* Static Glow */}
            <div className="absolute w-20 h-20 bg-green-500 rounded-full opacity-20 blur-md"></div>

            {/* Solid White Button */}
            <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover/play:scale-110 group-hover/play:shadow-[0_0_50px_rgba(34,197,94,0.6)]">
              {/* Play Icon (Filled) with slight left margin for optical centering */}
              <Play className="w-8 h-8 text-green-600 fill-green-600 ml-1" />
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// =========================================================
// PÁGINA PRINCIPAL
// =========================================================
export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  // Verificação de Rota Secreta
  useEffect(() => {
    if (window.location.pathname === '/admin/painel-secreto') {
        setIsAdmin(true);
    }
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutState, setCheckoutState] = useState<'form' | 'loading' | 'pix' | 'success'>('form');
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number } | null>(null);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; copiaECola: string; id: string } | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<VideoKey | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  
  // Estados para Endereço
  const [address, setAddress] = useState({
    cep: '',
    street: '',
    number: '',
    district: '',
    city: '',
    state: ''
  });
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const videoRefs = useRef<Record<VideoKey, HTMLVideoElement | null>>({
    vsl: null, test1: null, test2: null,
  });

  // Mostrar botão flutuante após rolar a página
  useEffect(() => {
    trackPixel('ViewContent'); // Pixel: Evento Ver Conteúdo ao carregar
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openModal = (planName: string, price: number) => {
    setSelectedPlan({ name: planName, price });
    setCheckoutState('form');
    setIsModalOpen(true);
    
    // Pixel: Adicionar ao Carrinho e Iniciar Finalização de Compra
    trackPixel('AddToCart', {
      content_name: planName,
      value: price,
      currency: 'BRL',
      content_type: 'product'
    });
    trackPixel('InitiateCheckout', {
      content_name: planName,
      value: price,
      currency: 'BRL',
      content_type: 'product'
    });
  };

  const closeModal = () => setIsModalOpen(false);

  // Função para buscar CEP
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

    // Formatação básica de telefone
    if (rawPhone.length >= 10 && rawPhone.length <= 11) {
        rawPhone = '55' + rawPhone;
    }

    const firstName = rawName.split(' ')[0];
    const lastName = rawName.split(' ').slice(1).join(' ');

    // ADVANCED MATCHING
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
      // Endereço Completo
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
        setPixData(data);
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
        console.error("Erro API:", data);
        alert(data.error || 'Erro ao gerar PIX. Verifique os dados e tente novamente.');
        setCheckoutState('form');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão. Verifique sua internet.');
      setCheckoutState('form');
    }
  };

  const handleCopyPix = () => {
    if (pixData?.copiaECola) {
      navigator.clipboard.writeText(pixData.copiaECola);
      alert("Código PIX copiado!");
    }
  };

  // Função chamada quando o usuário clica em "Já fiz o pagamento"
  const handlePaymentConfirmation = () => {
    // Disparar Purchase client-side
    trackPixel('Purchase', {
        content_name: selectedPlan?.name,
        value: selectedPlan?.price,
        currency: 'BRL',
        event_id: pixData?.id, 
        content_type: 'product'
     });
     setCheckoutState('success');
  };

  useEffect(() => {
    return () => {
      (Object.keys(videoRefs.current) as VideoKey[]).forEach((k) => {
        try { videoRefs.current[k]?.pause(); } catch {}
      });
    };
  }, []);

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="font-sans text-slate-800 bg-slate-50 min-h-screen selection:bg-green-200 selection:text-green-900 pb-20 md:pb-0">
      <CountdownBar />
      
      {/* SEÇÃO 1: HERO / VSL */}
      <section className="relative py-12 md:py-24 overflow-hidden bg-slate-900">
        <div 
            className="absolute inset-0 bg-cover bg-center z-0 opacity-40 mix-blend-overlay" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551601651-2a8555f1a136?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 z-0"></div>

        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center px-4 py-1.5 bg-green-900/40 border border-green-500/50 rounded-full mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.3)]">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
             <span className="text-green-400 font-bold text-xs uppercase tracking-widest">Revelação Científica 2024</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight">
            Descubra o Método Natural Para <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Eliminar o Vício</span> Sem Sofrimento
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Uma abordagem inovadora que devolve o controle do seu cérebro, restaura sua dignidade e protege sua família.
          </p>

          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <Player
              id="vsl"
              src={VIDEO_SOURCES.vsl}
              poster={POSTER_SOURCES.vsl}
              currentlyPlaying={currentlyPlaying}
              setCurrentlyPlaying={setCurrentlyPlaying}
              refsMap={videoRefs}
              aspectRatio="16/9"
            />
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-xs uppercase tracking-wide">
               <span className="flex items-center"><Star className="w-3 h-3 text-yellow-500 mr-1"/> 4.9/5 Avaliação Média</span>
               <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
               <span>Assista com som ligado</span>
            </div>
          </div>

          <div className="mt-10 animate-fade-in-up">
            <a
              href="#oferta"
              className="group relative inline-flex items-center justify-center bg-gradient-to-b from-green-500 to-emerald-700 text-white text-xl md:text-2xl font-black py-6 px-10 md:px-16 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_50px_rgba(16,185,129,0.6)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
            >
              <div className="absolute inset-0 rounded-full border-t border-white/20"></div>
              SIM! QUERO ME LIBERTAR AGORA
              <ArrowRight className="w-8 h-8 ml-3 group-hover:translate-x-1 transition-transform" />
            </a>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-slate-400 text-sm font-medium">
                <span className="flex items-center"><Lock className="w-4 h-4 mr-1 text-green-500" /> Compra Segura</span>
                <span className="hidden md:inline">|</span>
                <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1 text-green-500" /> Garantia de 30 Dias</span>
                <span className="hidden md:inline">|</span>
                <span className="flex items-center"><Truck className="w-4 h-4 mr-1 text-green-500" /> Envio Discreto</span>
            </div>
          </div>
        </div>
      </section>

      {/* STRIP: LOGOS / AUTORIDADE */}
      <div className="border-b border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             <div className="flex items-center gap-2 font-bold text-slate-500"><ShieldCheck className="w-6 h-6"/> Registro ANVISA</div>
             <div className="flex items-center gap-2 font-bold text-slate-500"><FlaskConical className="w-6 h-6"/> Ciência Aprovada</div>
             <div className="flex items-center gap-2 font-bold text-slate-500"><CheckCircle className="w-6 h-6"/> 100% Natural</div>
        </div>
      </div>

      {/* SEÇÃO 2: PROVAS SOCIAIS (CORRIGIDA) */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Vidas Transformadas <span className="text-green-600 bg-green-100 px-2 rounded-lg">De Verdade</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Veja o que dizem as pessoas que já testaram e aprovaram o método Zero Vícios.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 justify-items-center">
             
             {/* Depoimento 1 */}
             <div className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 w-full max-w-sm hover:-translate-y-2 transition-transform duration-300">
                <Player
                    id="test1"
                    src={VIDEO_SOURCES.test1}
                    poster={POSTER_SOURCES.test1}
                    currentlyPlaying={currentlyPlaying}
                    setCurrentlyPlaying={setCurrentlyPlaying}
                    refsMap={videoRefs}
                    aspectRatio="9/16" 
                />
                <div className="mt-6 flex items-start gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-lg border-2 border-green-200">V</div>
                    <div>
                        <div className="flex items-center gap-2">
                             <p className="font-bold text-slate-900 text-lg">Valdirene S.</p>
                             <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> VERIFICADO</span>
                        </div>
                        <p className="text-slate-500 text-sm mb-2">Cliente há 3 meses</p>
                        <div className="flex text-yellow-400">
                            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Depoimento 2 */}
            <div className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 w-full max-w-sm hover:-translate-y-2 transition-transform duration-300">
                <Player
                    id="test2"
                    src={VIDEO_SOURCES.test2}
                    poster={POSTER_SOURCES.test2}
                    currentlyPlaying={currentlyPlaying}
                    setCurrentlyPlaying={setCurrentlyPlaying}
                    refsMap={videoRefs}
                    aspectRatio="9/16"
                />
                 <div className="mt-6 flex items-start gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-lg border-2 border-green-200">M</div>
                    <div>
                        <div className="flex items-center gap-2">
                             <p className="font-bold text-slate-900 text-lg">Maria P.</p>
                             <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> VERIFICADO</span>
                        </div>
                        <p className="text-slate-500 text-sm mb-2">Cliente há 5 meses</p>
                        <div className="flex text-yellow-400">
                             {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                        </div>
                    </div>
                </div>
            </div>

          </div>
        </div>
      </section>

      {/* SEÇÃO 3: BENEFÍCIOS (GRID BENTO) */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-green-50 skew-x-12 opacity-50 z-0"></div>
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="text-green-600 font-bold tracking-wider uppercase text-sm mb-2 block">Diferenciais Únicos</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900">
              Tecnologia Natural Avançada
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">Desenvolvido por especialistas para atuar diretamente nos receptores de dopamina, o Zero Vícios funciona onde outros falham.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: Heart, 
                title: "Equilíbrio Emocional", 
                desc: "Ativos potentes que modulam o sistema nervoso, reduzindo drasticamente a ansiedade e a compulsão nos momentos mais críticos.",
                color: "bg-red-50 text-red-600"
              },
              { 
                icon: FlaskConical, 
                title: "Fórmula Ultra Pura", 
                desc: "100% natural, livre de químicos pesados. Sem efeitos colaterais como sonolência ou perda de libido. Seguro para uso contínuo.",
                color: "bg-blue-50 text-blue-600"
              },
              { 
                icon: Lightbulb, 
                title: "Clareza Mental", 
                desc: "Recupere o foco, a memória e a produtividade que o vício roubou de você. Volte a sentir prazer nas pequenas coisas da vida.",
                color: "bg-yellow-50 text-yellow-600"
              }
            ].map((item, idx) => (
                <div key={idx} className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 group">
                    <div className={`w-20 h-20 ${item.color} rounded-2xl flex items-center justify-center mb-8 mx-auto transform group-hover:rotate-6 transition-transform`}>
                        <item.icon className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">{item.title}</h3>
                    <p className="text-slate-600 text-center leading-relaxed">{item.desc}</p>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 5: OFERTA (PRICING) */}
      <section id="oferta" className="py-24 bg-gradient-to-b from-slate-50 to-slate-200 relative">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             <div className="absolute top-1/4 left-10 w-64 h-64 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
             <div className="absolute top-1/3 right-10 w-64 h-64 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block py-1 px-3 rounded-full bg-green-100 text-green-700 font-bold text-xs uppercase tracking-wider mb-4 border border-green-200">Oferta Por Tempo Limitado</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-2">Escolha Seu Tratamento</h2>
            <p className="mt-4 text-slate-600 max-w-xl mx-auto">Não deixe para depois. O preço promocional pode acabar a qualquer momento.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end max-w-6xl mx-auto">
            
            {/* CARD 1: 3 MESES */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 transition-transform hover:scale-[1.02] order-2 lg:order-1 relative opacity-90 hover:opacity-100">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-800">Tratamento Inicial</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">Kit 3 Meses</p>
                <div className="relative h-48 w-full mb-6">
                     <img src="https://i.imgur.com/5wouai7.png" alt="Kit 3" className="object-contain w-full h-full drop-shadow-xl" />
                </div>
                <div className="flex justify-center items-end gap-1 mb-6">
                    <span className="text-4xl font-black text-slate-900">R$ 5,00</span>
                </div>
                <p className="text-slate-500 text-sm mb-6">Valor de Teste</p>
                <button 
                  onClick={() => openModal("Kit 3 Meses", 5.00)} 
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-xl transition-colors border border-slate-300"
                >
                  COMPRAR KIT 3 MESES
                </button>
              </div>
            </div>

            {/* CARD 2: 5 MESES (DESTAQUE) */}
            <div className="relative bg-white rounded-3xl shadow-2xl shadow-green-900/20 border-2 border-green-500 p-8 transform lg:-translate-y-4 z-10 order-1 lg:order-2">
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-2 rounded-full text-sm font-bold uppercase tracking-wide shadow-lg flex items-center gap-2 whitespace-nowrap">
                <Star className="w-4 h-4 fill-white text-white"/> Mais Vendido <Star className="w-4 h-4 fill-white text-white"/>
              </div>
              <div className="text-center mt-6">
                <h3 className="text-3xl font-black text-slate-900">Tratamento Completo</h3>
                <p className="text-green-600 font-bold mb-6 text-sm">Kit 5 Meses (Recomendado)</p>
                
                <div className="relative h-64 w-full mb-8">
                     <div className="absolute inset-0 bg-green-500/20 rounded-full filter blur-3xl transform scale-75"></div>
                     <img src="https://i.imgur.com/pNINamC.png" alt="Kit 5" className="relative object-contain w-full h-full transform scale-110 drop-shadow-2xl transition-transform hover:scale-125 duration-500" />
                </div>
                
                <div className="mb-8">
                    <p className="text-sm text-red-500 line-through font-medium">De R$ 297,00</p>
                    <div className="flex justify-center items-end gap-1">
                        <span className="text-6xl font-black text-green-600">R$ 5,00</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-2 font-medium">Valor de Teste</p>
                    <span className="inline-block mt-2 bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                        🔥 Economize 45% Hoje
                    </span>
                </div>
                
                <ul className="text-left space-y-3 mb-8 bg-slate-50 p-5 rounded-2xl text-sm text-slate-700 border border-slate-100">
                    <li className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0"/> <span className="font-semibold">Tratamento Ideal (150 dias)</span></li>
                    <li className="flex items-center"><Truck className="w-5 h-5 text-green-500 mr-3 flex-shrink-0"/> <span className="font-semibold">Frete GRÁTIS</span> Expresso</li>
                    <li className="flex items-center"><ShieldCheck className="w-5 h-5 text-green-500 mr-3 flex-shrink-0"/> <span className="font-semibold">Garantia Blindada 30 Dias</span></li>
                </ul>

                <button 
                  onClick={() => openModal("Kit 5 Meses", 5.00)} 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-xl font-black py-6 rounded-2xl shadow-lg shadow-green-500/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 group"
                >
                  QUERO O MAIS VENDIDO
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* CARD 3: 12 MESES */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 transition-transform hover:scale-[1.02] order-3 relative opacity-90 hover:opacity-100">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-800">Estoque Anual</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">Kit 12 Meses</p>
                <div className="relative h-48 w-full mb-6">
                     <img src="https://i.imgur.com/aJoKk1u.png" alt="Kit 12" className="object-contain w-full h-full drop-shadow-xl" />
                </div>
                <div className="flex justify-center items-end gap-1 mb-6">
                    <span className="text-4xl font-black text-slate-900">R$ 5,00</span>
                </div>
                <p className="text-slate-500 text-sm mb-6">Valor de Teste</p>
                <button 
                  onClick={() => openModal("Kit 12 Meses", 5.00)} 
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-xl transition-colors border border-slate-300"
                >
                  COMPRAR KIT 12 MESES
                </button>
              </div>
            </div>

          </div>
          
          <div className="mt-12 text-center">
            <img src="https://img.icons8.com/color/96/000000/pix.png" alt="Pix Aceito" className="h-8 inline-block mx-4 opacity-75 grayscale hover:grayscale-0 transition-all" />
            <div className="mt-4 flex justify-center gap-2 text-xs text-slate-400">
                 <Lock className="w-3 h-3"/> Checkout com criptografia de 256-bits
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 6: GARANTIA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-green-200 rounded-full blur-2xl opacity-50"></div>
                
                <div className="flex-shrink-0 relative">
                     <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center relative z-10">
                        <ShieldCheck className="w-16 h-16 text-green-600" />
                     </div>
                     <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                </div>
                
                <div className="text-center md:text-left">
                    <h2 className="text-3xl font-black text-slate-900 mb-4">Garantia Incondicional de 30 Dias</h2>
                    <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                        O risco é todo nosso. Se você usar o produto e não notar diferença na sua ansiedade ou controle em até 30 dias, nós devolvemos <span className="font-bold text-slate-900">100% do seu dinheiro</span>. Basta um e-mail. Sem letras miúdas.
                    </p>
                    <div className="inline-flex items-center bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-sm font-bold text-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" /> Satisfação Garantida ou Seu Dinheiro de Volta
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-slate-900 text-slate-100">
        <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-12">Dúvidas Frequentes</h2>
            <div className="space-y-4">
                {[
                    {q: "O produto é aprovado pela ANVISA?", a: "Sim! Nossa fórmula é 100% aprovada pela ANVISA nos termos da RDC 240/2018, sendo totalmente seguro para consumo."},
                    {q: "Como o envio é feito? É discreto?", a: "Absolutamente. Prezamos pela sua privacidade. O produto é enviado em uma caixa parda comum, sem logos ou menção ao conteúdo. Ninguém saberá o que você comprou."},
                    {q: "Quanto tempo para ver resultados?", a: "A maioria dos clientes relata diminuição da ansiedade já nos primeiros 7 a 10 dias. O tratamento completo de 5 meses é recomendado para estabilização total."},
                    {q: "Tem efeitos colaterais?", a: "Não. Por ser 100% natural, não causa sonolência excessiva, não afeta a libido e não causa dependência."},
                    {q: "Quais as formas de pagamento?", a: "Aceitamos PIX com aprovação imediata e desconto especial. É a forma mais rápida de garantir o envio do seu pedido."}
                ].map((faq, i) => (
                    <div key={i} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors">
                        <h3 className="font-bold text-white text-lg mb-3 flex items-start gap-3">
                            <span className="text-green-500">?</span> {faq.q}
                        </h3>
                        <p className="text-slate-400 pl-6 leading-relaxed">{faq.a}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="py-12 bg-slate-950 text-slate-500 text-sm border-t border-slate-900">
        <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                <div>
                    <p className="font-black text-white text-2xl mb-2 tracking-tighter">ZERO VICIOS</p>
                    <p className="mb-4">O fim da dependência começa aqui.</p>
                    
                    <div className="text-xs text-slate-600 space-y-1">
                        <p><span className="font-semibold text-slate-500">CNPJ:</span> 36.691.120/0001-20</p>
                        <p><span className="font-semibold text-slate-500">Razão Social:</span> A & G Produtos Naturais LTDA</p>
                    </div>
                </div>
            </div>
            
            <div className="border-t border-slate-900 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between text-xs">
                <p>Copyright © {new Date().getFullYear()} Zero Vicios. Todos os direitos reservados.</p>
                <div className="flex gap-4 mt-4 md:mt-0 justify-center">
                    <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
                    <a href="#" className="hover:text-white transition-colors">Políticas de Privacidade</a>
                    <a href="#" className="hover:text-white transition-colors">Contato</a>
                </div>
            </div>
            <p className="text-[10px] text-center mt-8 opacity-30 max-w-2xl mx-auto">
                Os resultados podem variar de pessoa para pessoa. Este produto não substitui o aconselhamento médico profissional.
            </p>
        </div>
      </footer>
      
      {/* BOTÃO FLUTUANTE DE WHATSAPP/SUPORTE */}
      <a href="#" className="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center">
        <MessageCircle className="w-6 h-6" />
      </a>

      {/* STICKY CTA MOBILE */}
      <div className={`fixed bottom-0 left-0 w-full bg-white p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-40 md:hidden transition-transform duration-300 ${showStickyCTA ? 'translate-y-0' : 'translate-y-full'}`}>
         <a href="#oferta" className="block w-full bg-green-600 text-white font-bold text-center py-4 rounded-xl shadow-lg uppercase tracking-wide">
            Comprar Agora - 45% OFF
         </a>
      </div>

      {/* MODAL DE CHECKOUT OTIMIZADO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
            
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 z-10 bg-slate-100 rounded-full p-2 transition-colors">
              <X className="w-5 h-5" />
            </button>

            {/* Header do Modal */}
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
              {/* FORMULÁRIO */}
              {checkoutState === 'form' && (
                <form onSubmit={handleGeneratePix} className="space-y-4">
                  
                  {/* ALERTA DE SEGURANÇA */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-3 text-xs text-yellow-800 mb-4">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600"/>
                    <p>Devido à alta demanda, seu kit está reservado por apenas 10 minutos. Finalize agora.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Nome Completo</label>
                    <input type="text" name="name" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder:text-slate-400" placeholder="Digite seu nome completo" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">E-mail Principal</label>
                    <input type="email" name="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder:text-slate-400" placeholder="Digite seu melhor e-mail" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">CPF</label>
                        <input type="text" name="cpf" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder:text-slate-400" placeholder="000.000.000-00" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">WhatsApp</label>
                        <input type="tel" name="phone" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder:text-slate-400" placeholder="(DDD) 9..." required />
                    </div>
                  </div>

                  {/* SEÇÃO ENDEREÇO */}
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder:text-slate-400" 
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

              {/* LOADING */}
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

              {/* PIX DISPLAY */}
              {checkoutState === 'pix' && pixData && (
                <div className="text-center space-y-6 animate-fade-in pb-4">
                  
                  <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-sm mb-4">
                    <p className="font-bold flex items-center justify-center gap-2"><Clock className="w-4 h-4"/> Pague em até 10 minutos</p>
                    <p className="text-xs mt-1">Para garantir o envio imediato do seu kit.</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border-2 border-slate-100 inline-block shadow-sm relative group">
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-xl">
                        <span className="font-bold text-slate-900">Scan Me</span>
                    </div>
                    <img 
                        src={
                        pixData.qrCodeBase64 
                            ? (pixData.qrCodeBase64.startsWith('data:image') 
                                ? pixData.qrCodeBase64 
                                : `data:image/png;base64,${pixData.qrCodeBase64}`)
                            : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixData.copiaECola)}`
                        } 
                        alt="QR Code Pix" 
                        className="w-56 h-56 mx-auto mix-blend-multiply" 
                        onError={(e) => {
                        e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixData.copiaECola)}`;
                        }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Código Copia e Cola</p>
                    <div className="flex gap-2 items-center bg-slate-100 p-2 rounded-xl border border-slate-200">
                        <input readOnly value={pixData.copiaECola} className="w-full bg-transparent border-none text-slate-600 text-xs outline-none truncate font-mono" onClick={(e) => e.currentTarget.select()} />
                        <button onClick={handleCopyPix} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors shadow-md active:transform active:scale-95"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-600 font-medium mb-4">Após realizar o pagamento no seu banco, clique no botão abaixo para confirmar e liberar seu envio.</p>
                    <button 
                        onClick={handlePaymentConfirmation}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-lg uppercase tracking-wide"
                    >
                        <CheckCircle className="w-6 h-6" />
                        JÁ FIZ O PAGAMENTO
                    </button>
                  </div>

                </div>
              )}

              {/* TELA DE SUCESSO / RASTREIO */}
              {checkoutState === 'success' && (
                  <div className="text-center py-8 space-y-6 animate-fade-in-up">
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                          <Truck className="w-12 h-12 text-green-600 relative z-10" />
                          <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 animate-ping"></div>
                      </div>
                      
                      <div>
                          <h2 className="text-2xl font-black text-slate-900 mb-2">Pedido Confirmado!</h2>
                          <p className="text-slate-600">Seu pagamento está sendo processado e em breve seu kit será despachado.</p>
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

                      <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-sm underline">
                          Voltar ao site
                      </button>
                  </div>
              )}

            </div>
            
            {/* Footer do Modal */}
            <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                <p className="text-[10px] text-slate-400">Ao finalizar a compra você concorda com nossos Termos de Uso.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}