import React from 'react';
import { Phone, Flame } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { LeadCallSection } from './LeadCallSection';

interface ProfileHeaderProps {
  formData: any;
  whatsappUrl?: string;
  squadInfo: any;
  hoverStars: number;
  setHoverStars: (stars: number) => void;
  handleStarClick: (stars: number) => void;
  hasDiscount: boolean;
  baseValue: number;
  totalWithFee: number;
  leadId: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  formData,
  whatsappUrl,
  squadInfo,
  hoverStars,
  setHoverStars,
  handleStarClick,
  hasDiscount,
  baseValue,
  totalWithFee,
  leadId,
}) => {
  return (
    <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
      <img
        src={formData.profile_photo_url || formData.photo || '/placeholder-avatar.jpg'}
        alt={formData.name}
        className="w-14 h-14 rounded-full object-cover border-4 border-white shadow-sm shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-800 truncate">{formData.name}</h3>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 bg-green-50 border border-green-200 rounded-lg text-green-600 hover:bg-green-100 transition-colors shrink-0"
              title="Abrir WhatsApp"
            >
              <Phone size={13} />
            </a>
          )}
          {squadInfo && (
            <span
              className="text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter"
              style={{
                backgroundColor: `${squadInfo.color}10`,
                color: squadInfo.color,
                borderColor: `${squadInfo.color}30`
              }}
            >
              SQUAD {squadInfo.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => handleStarClick(i)}
              onMouseEnter={() => setHoverStars(i)}
              onMouseLeave={() => setHoverStars(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Flame
                size={18}
                className={cn(
                  "transition-colors",
                  i <= (hoverStars || formData.stars) ? "fill-orange-500 text-orange-500" : "text-slate-200"
                )}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex flex-col items-end justify-center min-h-[32px]">
            <span
              className={cn(
                "text-xs font-bold text-slate-400 line-through transition-all duration-200",
                hasDiscount ? "opacity-100 h-auto" : "opacity-0 h-0 overflow-hidden"
              )}
            >
              R$ {baseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={cn(
              "font-bold text-emerald-600 transition-all duration-200",
              hasDiscount ? "text-sm leading-tight" : "text-base leading-normal"
            )}>
              R$ {totalWithFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs text-slate-400">· {formData.cnpj || 'Sem CPF/CNPJ'}</span>
        </div>
      </div>

      <LeadCallSection leadId={leadId} />
    </div>
  );
};
