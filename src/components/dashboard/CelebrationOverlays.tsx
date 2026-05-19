import React, { useEffect, useRef } from 'react';

interface CelebrationOverlayProps {
  sellerName: string;
  squadName?: string;
  avatarUrl?: string;
  place?: number;
  value?: number;
  onClose: () => void;
}

export function NewLeaderOverlay({ sellerName, squadName, onClose }: CelebrationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // 1. Tocar efeito sonoro
    // playFirstPlaceJingle() is played by the caller, but we guarantee play just in case
    
    // 2. Animação de confete em Canvas auto-contida
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    const colors = ['#fbbf24', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        if (p.y > height) {
          p.y = -20;
          p.x = Math.random() * width;
        }
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Auto-close overlay after 7.5 seconds
    const timer = setTimeout(onClose, 7500);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white select-none">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Triumphal Banner */}
      <div className="text-center px-4 relative z-10 max-w-2xl flex flex-col items-center animate-in fade-in zoom-in-75 duration-500">
        
        {/* Dynamic Glowing Gold Medal/Shield */}
        <div className="w-40 h-40 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.6)] mb-8 animate-bounce relative">
          <span className="text-slate-950 font-black text-7xl select-none">1</span>
          
          {/* Subtle revolving particles or rings */}
          <div className="absolute inset-0 rounded-full border border-dashed border-white/50 animate-[spin_10s_linear_infinite]" />
        </div>

        <h2 className="text-amber-400 font-black text-2xl sm:text-4xl tracking-widest uppercase mb-4 animate-pulse">
          Temos um Novo Líder!
        </h2>
        
        <h1 className="text-4xl sm:text-7xl font-black uppercase tracking-tight mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          {sellerName}
        </h1>

        {squadName && (
          <span
            className="text-[10px] sm:text-xs px-4 py-1.5 rounded-full font-black uppercase tracking-widest shadow-md"
            style={{
              backgroundColor: squadName.toUpperCase() === 'PLUPPEX' ? '#7c3aed' : '#16a34a',
              color: '#ffffff',
            }}
          >
            SQUAD {squadName}
          </span>
        )}

        <p className="mt-8 text-xs font-bold text-slate-400 tracking-wider animate-[pulse_2s_infinite]">
          ASSUMIU O TOPO DO RANKING DE VENDEDORES
        </p>

        <button
          onClick={onClose}
          className="mt-12 px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold hover:bg-slate-850 hover:border-slate-700 transition-all text-slate-400 hover:text-white"
        >
          Fechar Visualização
        </button>
      </div>
    </div>
  );
}

export function GoalReachedOverlay({ sellerName, squadName, value = 10000, onClose }: CelebrationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Canvas animation for falling coins
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const coins: Array<{
      x: number;
      y: number;
      radius: number;
      speedY: number;
      speedX: number;
      spin: number;
      spinSpeed: number;
    }> = [];

    for (let i = 0; i < 80; i++) {
      coins.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        radius: Math.random() * 5 + 6,
        speedY: Math.random() * 4 + 4,
        speedX: Math.random() * 2 - 1,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: Math.random() * 0.15 + 0.05,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      coins.forEach((c) => {
        c.y += c.speedY;
        c.x += c.speedX;
        c.spin += c.spinSpeed;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(Math.sin(c.spin), 1);
        
        // Draw elegant gold coin
        ctx.beginPath();
        ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#d97706';
        ctx.stroke();
        
        // Inner coin ring
        ctx.beginPath();
        ctx.arc(0, 0, c.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        ctx.restore();

        if (c.y > height) {
          c.y = -20;
          c.x = Math.random() * width;
        }
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const timer = setTimeout(onClose, 7500);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white select-none">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="text-center px-4 relative z-10 max-w-2xl flex flex-col items-center animate-in fade-in zoom-in-75 duration-500">
        
        {/* Dynamic Glowing Star/Trophy */}
        <div className="w-40 h-40 bg-gradient-to-tr from-emerald-500 to-green-300 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.6)] mb-8 animate-[pulse_1.5s_infinite]">
          <span className="text-5xl">🏆</span>
        </div>

        <h2 className="text-emerald-400 font-black text-2xl sm:text-4xl tracking-widest uppercase mb-4">
          Meta de Ganhos Atingida!
        </h2>
        
        <h1 className="text-4xl sm:text-7xl font-black uppercase tracking-tight mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          {sellerName}
        </h1>

        <div className="flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-black mb-1">
            Meta Batida
          </p>
          <span className="text-3xl sm:text-4xl font-black text-emerald-400">
            {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        {squadName && (
          <span
            className="text-[10px] sm:text-xs px-4 py-1.5 rounded-full font-black uppercase tracking-widest shadow-md"
            style={{
              backgroundColor: squadName.toUpperCase() === 'PLUPPEX' ? '#7c3aed' : '#16a34a',
              color: '#ffffff',
            }}
          >
            SQUAD {squadName}
          </span>
        )}

        <button
          onClick={onClose}
          className="mt-12 px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold hover:bg-slate-850 hover:border-slate-700 transition-all text-slate-400 hover:text-white"
        >
          Fechar Visualização
        </button>
      </div>
    </div>
  );
}
