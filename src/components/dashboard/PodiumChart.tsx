import React from 'react';

interface PodiumEntry {
  label: string;
  count: number;
  squadName?: string;
  squadColor?: string;
}

interface PodiumChartProps {
  top3: PodiumEntry[];
}

const PODIUM_CONFIG = [
  // Index 0: 2nd Place (render on the left)
  {
    place: 2,
    badgeText: '2º',
    height: 'h-[110px]',
    topBg: 'bg-[#f1f5f9] border-[#cbd5e1]',
    bodyBg: 'from-[#cbd5e1] via-white to-white',
    badgeStyle: 'bg-[#e2e8f0] text-slate-700 dark:text-slate-300 border-[#cbd5e1]',
    borderColor: 'border-[#cbd5e1]',
    charHeight: 'h-[160px] -mb-7',
    zIndex: 'z-20',
  },
  // Index 1: 1st Place (render in the center)
  {
    place: 1,
    badgeText: '1',
    height: 'h-[150px]',
    topBg: 'bg-[#fef3c7] border-[#fde047]',
    bodyBg: 'from-[#fef08a] via-white to-white',
    badgeStyle: 'bg-[#fef08a] text-amber-800 border-[#fde047]',
    borderColor: 'border-[#fde047]',
    charHeight: 'h-[200px] -mb-9',
    zIndex: 'z-30',
  },
  // Index 2: 3rd Place (render on the right)
  {
    place: 3,
    badgeText: '3º',
    height: 'h-[80px]',
    topBg: 'bg-[#ffedd5] border-[#fed7aa]',
    bodyBg: 'from-[#fed7aa] via-white to-white',
    badgeStyle: 'bg-[#ffedd5] text-amber-900 border-[#fed7aa]',
    borderColor: 'border-[#fed7aa]',
    charHeight: 'h-[135px] -mb-6',
    zIndex: 'z-10',
  },
];

// Left (2nd place), Center (1st place), Right (3rd place)
const DISPLAY_ORDER = [0, 1, 2]; // refers to indices of PODIUM_CONFIG

function detectGender(name: string): 'man' | 'woman' {
  const firstName = name.trim().split(' ')[0].toLowerCase();
  
  // Custom manual list of common female names in Portuguese
  const femaleNames = new Set([
    'thais', 'thaís', 'beatriz', 'alice', 'yasmin', 'raquel', 'ruth', 'isabel', 
    'irem', 'esther', 'ellen', 'mabel', 'miriam', 'carol', 'helen', 'vivian',
    'luana', 'debora', 'débora', 'juliana', 'patricia', 'patrícia',
    'fernanda', 'camila', 'aline', 'amanda', 'larissa', 'leticia', 'letícia',
    'gabriela', 'bruna', 'carolina', 'mariana', 'carla', 'renata', 'sabrina',
    'thais', 'thaís', 'thaysa', 'tais'
  ]);
  
  const maleNames = new Set([
    'luca', 'lucas', 'andrea', 'joshua', 'noah', 'bautista',
    'paulo', 'victor', 'vitor', 'gabriel', 'lima', 'gustavo', 'marcos', 'joao', 'joão',
    'pedro', 'lucas', 'mateus', 'matheus', 'felipe', 'philipe', 'rafael', 'bruno',
    'tiago', 'thiago', 'diego', 'rodrigo', 'andre', 'andré', 'alexandre'
  ]);

  if (femaleNames.has(firstName)) return 'woman';
  if (maleNames.has(firstName)) return 'man';

  // Simple Portuguese name heuristic: ends in 'a' -> female, otherwise -> male
  if (firstName.endsWith('a')) return 'woman';
  
  return 'man';
}

export function PodiumChart({ top3 }: PodiumChartProps) {
  if (top3.length === 0) return null;

  // Map the top3 sellers to their podium positions.
  // top3 is sorted: index 0 = 1st place, index 1 = 2nd place, index 2 = 3rd place.
  const sellersByPlace = {
    1: top3[0] || null,
    2: top3[1] || null,
    3: top3[2] || null,
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Podium grid */}
      <div className="w-full flex items-end justify-center gap-1 sm:gap-2 pt-6">
        {DISPLAY_ORDER.map((cfgIdx) => {
          const cfg = PODIUM_CONFIG[cfgIdx];
          const entry = sellersByPlace[cfg.place as keyof typeof sellersByPlace];

          if (!entry) {
            return <div key={cfg.place} className="flex-1 min-w-[80px] sm:min-w-[100px]" />;
          }

          // Split name into up to 2 lines
          const nameParts = entry.label.toUpperCase().split(' ');
          const line1 = nameParts[0] || '';
          const line2 = nameParts.slice(1).join(' ') || '';

          // Detect gender dynamically to select man/woman image
          const gender = detectGender(entry.label);
          
          // Select squad name prefix dynamically: pluppex, target or default
          let prefix = "pluppex_";
          if (entry.squadName) {
            const squadLower = entry.squadName.toLowerCase();
            if (squadLower.includes("target")) {
              prefix = "target_";
            }
          }

          // Append cache buster version query parameter to force browser to discard old cached versions
          const imagePath = `/podium_${prefix}${gender}_${cfg.place}.png?v=6`;

          return (
            <div key={cfg.place} className={`flex-1 min-w-[80px] sm:min-w-[100px] flex flex-col items-center relative ${cfg.zIndex}`}>
              {/* Placement Text Above */}
              <span className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-slate-200 tracking-wider mb-1">
                {cfg.place}° LUGAR
              </span>

              {/* Character Illustration - relative z-20 so it renders on top of the cylinder top face and does not cut */}
              <div className="relative w-full flex justify-center pointer-events-none z-20">
                <img
                  src={imagePath}
                  alt={`${cfg.place} Place Character`}
                  className={`${cfg.charHeight} object-contain`}
                />
              </div>

              {/* Pedestal Top Face (Ellipse) - relative z-10 */}
              <div className={`w-full h-4 sm:h-5 rounded-[50%] border-t border-x ${cfg.topBg} -mb-[9px] relative z-10`} />

              {/* Pedestal Body (Cylinder) - relative z-0 */}
              <div
                className={`w-full ${cfg.height} rounded-b-[24px] bg-gradient-to-b ${cfg.bodyBg} border-b border-x ${cfg.borderColor} flex flex-col items-center pt-5 shadow-sm relative z-0`}
              >
                {/* Placement Circle Badge inside Pedestal */}
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center font-black text-xs sm:text-sm ${cfg.badgeStyle} shadow-sm mb-2`}>
                  {cfg.badgeText}
                </div>

                {/* Seller Name */}
                <div className="text-center px-1 max-w-full">
                  <p className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight leading-tight uppercase truncate" title={line1}>
                    {line1}
                  </p>
                  {line2 && (
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-700 dark:text-slate-300 tracking-tight leading-tight uppercase truncate" title={line2}>
                      {line2}
                    </p>
                  )}
                </div>

                {/* Wins badge / squad name info optionally shown */}
                {entry.squadName && (
                  <span
                    className="mt-2 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider scale-90"
                    style={{
                      backgroundColor: entry.squadColor ? `${entry.squadColor}20` : '#f0fdf4',
                      color: entry.squadColor || '#16a34a',
                    }}
                  >
                    {entry.squadName}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
