// Programmatic Audio Effects Synthesizer using Web Audio API
// High-performance, zero asset downloads, works in any modern browser!

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(err => console.log("Erro ao inicializar contexto de áudio:", err));
  }
}

// 1. Venda Registrada ("Plim" Caixa Registradora)
export function playSaleRegistered() {
  const ctx = getAudioContext();
  if (!ctx) return;
  unlockAudio();

  const now = ctx.currentTime;
  
  // Note 1: High metallic bell
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now); // A5
  osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
  
  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  // Note 2: Secondary register bell
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(587.33, now); // D5
  gain2.gain.setValueAtTime(0.2, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.35);
  
  osc2.start(now);
  osc2.stop(now + 0.2);
}

// 2. Subida de Posição (Ascendente)
export function playRankUp() {
  const ctx = getAudioContext();
  if (!ctx) return;
  unlockAudio();

  const now = ctx.currentTime;
  const duration = 0.45;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now); // A4
  // Rapid frequency sweep upwards
  osc.frequency.exponentialRampToValueAtTime(1109.73, now + duration); // C#6

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

// 3. Queda de Posição (Descendente)
export function playRankDown() {
  const ctx = getAudioContext();
  if (!ctx) return;
  unlockAudio();

  const now = ctx.currentTime;
  const duration = 0.5;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(554.37, now); // C#5
  // Slow frequency sweep downwards
  osc.frequency.linearRampToValueAtTime(220, now + duration); // A3

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

// 4. Alcançar o Topo (Fanfarra Triunfal de Meta/1º Lugar)
export function playFirstPlaceJingle() {
  const ctx = getAudioContext();
  if (!ctx) return;
  unlockAudio();

  const now = ctx.currentTime;
  
  // A triumphant arpeggio C4 (261.63) -> E4 (329.63) -> G4 (392.00) -> C5 (523.25)
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
  const delay = 0.12;

  notes.forEach((freq, idx) => {
    const noteTime = now + idx * delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Mixture of triangle and sine wave for brassy trumpet sound
    osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, noteTime);
    
    gain.gain.setValueAtTime(0.01, noteTime);
    gain.gain.linearRampToValueAtTime(0.3, noteTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.6);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(noteTime);
    osc.stop(noteTime + 0.6);
  });
}

// 5. Atingir Meta de Ganhos (Chuva de moedas caindo)
export function playTargetAchieved() {
  const ctx = getAudioContext();
  if (!ctx) return;
  unlockAudio();

  const now = ctx.currentTime;
  const numCoins = 18;

  for (let i = 0; i < numCoins; i++) {
    const coinTime = now + i * 0.07;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // High-pitched metallic clink
    osc.type = 'sine';
    const randFreq = 1800 + Math.random() * 900;
    osc.frequency.setValueAtTime(randFreq, coinTime);
    osc.frequency.exponentialRampToValueAtTime(randFreq * 0.8, coinTime + 0.12);
    
    gain.gain.setValueAtTime(0.01, coinTime);
    gain.gain.linearRampToValueAtTime(0.25, coinTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, coinTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(coinTime);
    osc.stop(coinTime + 0.15);
  }
}
