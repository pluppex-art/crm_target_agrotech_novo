import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper 
} from '@tanstack/react-table';
import { Search, Filter, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Lead } from '../../types/leads';
import { useLeadStore } from '../../store/useLeadStore';

const columnHelper = createColumnHelper<Lead>();

interface LeadsTableProps {
  leads: Lead[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const { deleteLead } = useLeadStore();

  const columns = [
    columnHelper.accessor('photo', {
      header: '',
      cell: info => (
        <img 
          src={info.getValue()} 
          alt="Lead" 
          className="w-8 h-8 rounded-full border border-slate-100"
          referrerPolicy="no-referrer"
        />
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Nome',
      cell: info => <span className="font-bold text-slate-800">{info.getValue()}</span>,
    }),
    columnHelper.accessor('phone', {
      header: 'Telefone',
      cell: info => <span className="text-slate-500">{info.getValue()}</span>,
    }),
    columnHelper.accessor('product', {
      header: 'Produto',
      cell: info => (
        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('value', {
      header: 'Valor',
      cell: info => <span className="font-bold">R$ {info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const statusMap: Record<string, { label: string; class: string }> = {
          new: { label: 'Em Aberto', class: 'bg-blue-50 text-blue-600' },
          qualified: { label: 'Qualificação', class: 'bg-green-50 text-green-600' },
          proposal: { label: 'Proposta', class: 'bg-purple-50 text-purple-600' },
          closed: { label: 'Fechado', class: 'bg-red-50 text-red-600' },
        };
        const status = statusMap[info.getValue()] || { label: info.getValue(), class: 'bg-gray-50 text-gray-600' };
        return (
          <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", status.class)}>
            {status.label}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: (info) => (
        <button 
          onClick={() => {
            deleteLead(info.row.original.id);
          }}
          className="p-2 text-slate-300 hover:text-red-600 transition-colors"
          title="Excluir lead"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/50 gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Filtrar por nome ou produto..." 
            className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="sm:hidden text-sm text-slate-600">Filtros</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-slate-50/50">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 text-sm border-b border-slate-50">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <span className="text-xs text-slate-500">Mostrando {leads.length} de {leads.length} leads</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-slate-200 rounded-md text-xs bg-white disabled:opacity-50" disabled>Anterior</button>
          <button className="px-3 py-1 border border-slate-200 rounded-md text-xs bg-white disabled:opacity-50" disabled>Próximo</button>
        </div>
      </div>
    </div>
  );
}
