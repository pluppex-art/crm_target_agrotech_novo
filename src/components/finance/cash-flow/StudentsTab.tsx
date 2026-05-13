import React from 'react';
import { GraduationCap } from 'lucide-react';
import { fmt } from '../../../lib/utils';
import { StudentRow } from './StudentRow';

export const StudentsTab: React.FC<{ studentsByProduct: any[] }> = ({ studentsByProduct }) => {
  return (
    <div className="divide-y divide-slate-100">
      {studentsByProduct.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <GraduationCap size={32} className="mb-2 opacity-30" />
          <p className="text-sm">Nenhuma entrada de aluno identificada.</p>
        </div>
      ) : (
        studentsByProduct.map(group => (
          <div key={group.product} className="group">
            <div className="px-6 py-3 bg-slate-50/80 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700"><GraduationCap size={16} /></div>
                <div>
                  <p className="text-sm font-black text-slate-800 tracking-tight">{group.product}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{group.count} transaç{group.count !== 1 ? 'ões' : 'ão'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Subtotal</p>
                <p className="text-sm font-black text-emerald-700">R$ {fmt(group.total)}</p>
              </div>
            </div>
            <div className="divide-y divide-slate-50 bg-white">
              {group.items.map((t: any) => <StudentRow key={t.id} tx={t} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
