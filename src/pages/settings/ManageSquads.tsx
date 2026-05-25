import { SquadsSection } from '../../components/finance/settings/SquadsSection';

export function ManageSquads() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Gestão de Squads</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Crie e gerencie os squads da equipe comercial.</p>
      </div>
      <SquadsSection />
    </div>
  );
}
