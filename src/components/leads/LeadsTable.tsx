import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper 
} from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Lead } from '../../types/leads';
import { useLeadStore } from '../../store/useLeadStore';
import { useProductStore } from '../../store/useProductStore';
import { financialCalculator } from '../../services/financialCalculator';

const columnHelper = createColumnHelper<Lead>();

interface LeadsTableProps {
  leads: Lead[];
  totalCount: number;
  onLeadClick?: (lead: Lead) => void;
}

export function LeadsTable({ leads, totalCount, onLeadClick }: LeadsTableProps) {
  const { deleteLead } = useLeadStore();

  const columns = [
    columnHelper.accessor('photo', {
      header: '',
      cell: info => (
        <img 
          src={info.getValue()} 
          alt="Cliente" 
          className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800"
          referrerPolicy="no-referrer"
        />
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Nome',
      cell: info => <span className="font-bold text-slate-800 dark:text-slate-200">{info.getValue()}</span>,
    }),
    columnHelper.accessor('phone', {
      header: 'Telefone',
      cell: info => <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
    }),
    columnHelper.accessor('product', {
      header: 'Produto',
      cell: info => {
        const { products } = useProductStore.getState();
        const prodObj = financialCalculator.findProduct(info.getValue() || '', products);
        return (
          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase">
            {prodObj?.name || info.getValue()}
          </span>
        );
      },
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
        const status = statusMap[info.getValue()] || { label: info.getValue(), class: 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400' };
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
          onClick={(e) => { e.stopPropagation(); deleteLead(info.row.original.id); }}
          className="p-2 text-slate-300 hover:text-red-600 transition-colors"
          title="Excluir cliente"
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Removed Redundant Search Bar */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-slate-50 dark:bg-slate-800/50">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
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
              <tr
                key={row.id}
                onClick={() => onLeadClick?.(row.original)}
                className="hover:bg-slate-50 dark:bg-slate-800 transition-colors group cursor-pointer"
              >
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
      
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <span className="text-xs text-slate-500 dark:text-slate-400">Mostrando {leads.length} de {totalCount} clientes</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 disabled:opacity-50" disabled>Anterior</button>
          <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 disabled:opacity-50" disabled>Próximo</button>
        </div>
      </div>
    </div>
  );
}
