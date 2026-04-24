import { useState } from 'react';
import { GraduationCap, Users, Save, Check } from 'lucide-react';
import { useTurmaStore } from '../../store/useTurmaStore';

export function ManageTurmas() {
  const { turmas, updateTurma } = useTurmaStore();
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [localMeta, setLocalMeta] = useState<Record<string, string>>({});

  const handleSave = async (turmaId: string) => {
    const raw = localMeta[turmaId];
    if (raw === undefined) return;
    const meta = parseInt(raw);
    if (isNaN(meta) || meta < 0) return;

    setSaving(s => ({ ...s, [turmaId]: true }));
    await updateTurma(turmaId, { meta });
    setSaving(s => ({ ...s, [turmaId]: false }));
    setSaved(s => ({ ...s, [turmaId]: true }));
    setLocalMeta(prev => { const next = { ...prev }; delete next[turmaId]; return next; });
    setTimeout(() => setSaved(s => ({ ...s, [turmaId]: false })), 2000);
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Configuração de Turmas</h1>
        <p className="text-sm text-slate-500 mt-1">Defina a meta de alunos por turma.</p>
      </div>

      {turmas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma turma cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {turmas.map(t => {
            const activeAttendees = t.attendees.filter(a => a.status !== 'cancelado').length;
            const isDirty = localMeta[t.id] !== undefined;
            const displayValue = isDirty ? localMeta[t.id] : (t.meta?.toString() ?? '');

            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-4"
              >
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-400">{t.date} · {t.category}</p>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                  <Users className="w-3.5 h-3.5" />
                  <span>{activeAttendees} aluno{activeAttendees !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    min={0}
                    value={displayValue}
                    onChange={e =>
                      setLocalMeta(prev => ({ ...prev, [t.id]: e.target.value }))
                    }
                    placeholder="Meta"
                    className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />

                  <button
                    onClick={() => handleSave(t.id)}
                    disabled={saving[t.id] || !isDirty}
                    title="Salvar meta"
                    className={`p-1.5 rounded-lg text-white transition-colors flex-shrink-0 ${
                      saved[t.id]
                        ? 'bg-emerald-400'
                        : isDirty
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'bg-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {saved[t.id] ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
