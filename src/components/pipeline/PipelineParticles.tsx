import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, PartyPopper, Star, Sparkles, Trophy, Plane } from 'lucide-react';
import { cn } from '../../lib/utils';

// Static particles generated once - moved from Pipeline.tsx
const WIN_PARTICLES = Array.from({ length: 80 }).map((_, i) => {
  const angle = Math.PI * (1.1 + Math.random() * 0.8);
  const velocity = 30 + Math.random() * 60;

  const peakX = 50 + Math.cos(angle) * velocity;
  const peakY = 90 + Math.sin(angle) * velocity;

  const endX = peakX + (Math.random() * 30 - 15);
  const endY = 120;

  return {
    id: i,
    peakX, peakY, endX, endY,
    size: 20 + Math.random() * 30,
    duration: 2.5 + Math.random() * 2,
    delay: Math.random() * 0.3,
    initialRotation: Math.random() * 360,
    endRotation: Math.random() * 360 + 720 * (Math.random() > 0.5 ? 1 : -1),
    colorIdx: i % 6,
    iconIdx: i % 5,
    fillType: i % 3,
  };
});

interface PipelineParticlesProps {
  showRocket: boolean;
  onAnimationComplete?: () => void;
}

export const PipelineParticles: React.FC<PipelineParticlesProps> = ({
  showRocket,
  onAnimationComplete
}) => {
  const icons = [PartyPopper, Star, Sparkles, Trophy, Plane];
  const colors = [
    'text-emerald-500',
    'text-yellow-400',
    'text-blue-500',
    'text-purple-500',
    'text-pink-500',
    'text-orange-500',
    'text-cyan-400'
  ];

  return (
    <AnimatePresence>
      {showRocket && (
        <div key="particles-overlay" className="fixed inset-0 z-[999] pointer-events-none overflow-hidden block">
          {/* Confetti Burst Background */}
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.div
              key={`confetti-${i}`}
              initial={{
                x: `${40 + Math.random() * 20}vw`,
                y: "100vh",
                opacity: 1,
                scale: Math.random() * 0.5 + 0.5,
                rotate: 0
              }}
              animate={{
                x: `${Math.random() * 100}vw`,
                y: "-10vh",
                rotate: Math.random() * 360 * 3,
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "easeOut"
              }}
              className={cn(
                "absolute w-3 h-3 rounded-sm",
                colors[i % colors.length].replace('text-', 'bg-')
              )}
            />
          ))}

          {/* Rocket */}
          <motion.div
            initial={{ x: "-20vw", y: "120vh", scale: 0 }}
            animate={{
              x: "120vw",
              y: "-20vh",
              scale: [0, 3, 3, 1],
            }}
            transition={{
              duration: 2,
              ease: "easeInOut",
            }}
            onAnimationComplete={onAnimationComplete}
            className="absolute top-0 left-0 text-emerald-500 drop-shadow-[0_0_60px_rgba(16,185,129,0.8)] z-50 pointer-events-none"
            style={{ rotate: 50, originX: 0.5, originY: 0.5 }}
          >
            <Rocket size={180} strokeWidth={1} fill="currentColor" />
          </motion.div>

          {/* Particles */}
          {WIN_PARTICLES.map((p) => {
            const Icon = icons[p.iconIdx];
            const color = colors[p.colorIdx];
            const fill = p.fillType === 0 ? "currentColor" : "none";

            return (
              <motion.div
                key={p.id}
                initial={{ x: "50vw", y: "95vh", rotate: p.initialRotation, opacity: 0, scale: 0 }}
                animate={{
                  x: ["50vw", `${p.peakX}vw`, `${p.endX}vw`],
                  y: ["95vh", `${p.peakY}vh`, `${p.endY}vh`],
                  rotate: p.endRotation,
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.2, 1, 0]
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  times: [0, 0.25, 1],
                  ease: "easeInOut"
                }}
                className={`absolute top-0 left-0 ${color}`}
              >
                <Icon size={p.size} strokeWidth={2} fill={fill} />
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
};
