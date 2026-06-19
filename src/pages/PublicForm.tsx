import { Leaf } from 'lucide-react';
import { PublicFormBase } from './PublicFormBase';

export function PublicForm() {
  return (
    <PublicFormBase
      formKey="drone"
      backgroundImage="/drone-bg.png"
      gradient="bg-gradient-to-br from-emerald-950/95 via-emerald-900/80 to-teal-950/90"
      headerIcon={<Leaf className="w-3.5 h-3.5 text-emerald-400" />}
    />
  );
}
