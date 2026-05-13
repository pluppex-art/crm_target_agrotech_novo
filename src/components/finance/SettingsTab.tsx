import { useState } from 'react';
import { Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

// Sub-components
import { OteProfilesSection } from './settings/OteProfilesSection';
import { SquadsSection } from './settings/SquadsSection';
import { CommissionRulesSection } from './settings/CommissionRulesSection';
import { PartnerRulesSection } from './settings/PartnerRulesSection';
import { FeeRulesSection } from './settings/FeeRulesSection';

type SettingsSection = 'ote' | 'squads' | 'commission' | 'partner' | 'fees';

export function SettingsTab() {
  const [section, setSection] = useState<SettingsSection>('ote');

  const sectionLabels: Record<SettingsSection, string> = {
    ote: 'Perfis OTE',
    squads: 'Gestão de Squads',
    commission: 'Regras de Comissão',
    partner: 'Regras de Parceria',
    fees: 'Taxas e Deduções',
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <Settings size={18} className="text-slate-400" />
        <span className="text-sm font-bold text-slate-600">Configurações Financeiras</span>
        <span className="text-slate-200">|</span>
        {(['ote', 'squads', 'commission', 'partner', 'fees'] as SettingsSection[]).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              section === s ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-50')}>
            {sectionLabels[s]}
          </button>
        ))}
      </div>

      {section === 'ote' && <OteProfilesSection />}
      {section === 'squads' && <SquadsSection />}
      {section === 'commission' && <CommissionRulesSection />}
      {section === 'partner' && <PartnerRulesSection />}
      {section === 'fees' && <FeeRulesSection />}
    </div>
  );
}
