import { PublicFormBase } from './PublicFormBase';

export function PublicFormIA() {
  return (
    <PublicFormBase
      formKey="ia"
      backgroundImage="/ia-bg.png"
      gradient="bg-gradient-to-br from-emerald-950/85 via-green-900/70 to-teal-950/80"
      headerIcon={<span className="text-emerald-400 text-xs font-bold">IA</span>}
    />
  );
}
