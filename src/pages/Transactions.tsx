import { 
  Download,
  FileSpreadsheet,
  Trash2,
  Plus,
  Edit2,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import type { Transaction, Stats } from '../types';

export function TransactionsView({ 
  transactions, 
  stats, 
  deleteTransaction, 
  exportToCSV, 
  exportToExcel 
}: {
  transactions: Transaction[];
  stats: Stats;
  deleteTransaction: (id: number) => void;
  exportToCSV: () => void;
  exportToExcel: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h2>
          <p className="text-muted-foreground text-sm font-medium">Historical log of all fuel exports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={() => navigate('/transactions/new')} className="h-9 px-4 gap-2 shadow-md shadow-blue-100">
            <Plus size={16} />
            Add Manual Entry
          </Button>
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <Button variant="ghost" size="sm" onClick={exportToCSV} className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <Download size={14} className="mr-1.5" /> CSV
            </Button>
            <div className="w-px bg-slate-200 my-1 mx-1"></div>
            <Button variant="ghost" size="sm" onClick={exportToExcel} className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <FileSpreadsheet size={14} className="mr-1.5" /> Excel
            </Button>
          </div>
        </div>
      </header>

      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-200 hover:bg-slate-50">
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500 py-4">Timestamp</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500 py-4">Vehicle Asset</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500 py-4">Operator Info</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500 py-4 text-center">Reading ({stats.unit_mode === 'hours' ? 'h' : 'km'})</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500 py-4 text-right">Fuel Volume</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors group border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-xs">{t.date.split('-').reverse().join('.')}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{t.time}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-xs">{t.vehicle_name || 'Unnamed Vehicle'}</span>
                        <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{t.vehicle_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                         <div className="bg-slate-100 p-1 rounded border border-slate-200 group-hover:border-blue-200 shadow-sm transition-colors">
                          <User size={12} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                         </div>
                         <span className="font-semibold text-slate-700 text-xs">{t.driver_name || t.pincode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <span className="font-mono text-slate-600 text-xs font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {t.mileage.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Badge variant="secondary" className="font-mono font-bold text-blue-600 text-xs border-blue-100 bg-blue-50">
                        {t.amount.toFixed(2)} L
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => navigate(`/transactions/${t.id}/edit`)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => deleteTransaction(t.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-xs">
                    No transactions found for the selected period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
