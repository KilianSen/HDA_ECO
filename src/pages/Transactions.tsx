import { 
  Trash2,
  Plus,
  Edit2,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import type { Transaction, Stats } from '../types';
import { motion, type Variants } from 'motion/react';
import { EntityTag } from '@/components/EntityTag';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.02 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10"
    >
       <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Records</h1>
          <p className="text-muted-foreground font-medium">Complete historical log of fuel exports.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-xl bg-muted/50 p-1">
            <Button variant="ghost" size="sm" onClick={exportToCSV} className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-background">
              CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={exportToExcel} className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-background">
              Excel
            </Button>
          </div>
          <Button variant="default" size="sm" onClick={() => navigate('/transactions/new')} className="h-10 px-6 gap-2 font-bold rounded-xl shadow-lg shadow-primary/20">
            <Plus size={16} />
            New Entry
          </Button>
        </div>
      </motion.header>

      <motion.div variants={itemVariants} className="rounded-3xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-muted/50">
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] p-6 text-muted-foreground">Timestamp</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] p-6 text-muted-foreground">Asset / Vehicle</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] p-6 text-muted-foreground">Operator</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] p-6 text-muted-foreground text-center">Reading ({stats.unit_mode === 'hours' ? 'h' : 'km'})</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] p-6 text-muted-foreground text-right">Volume (L)</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-muted/50">
            {transactions.length > 0 ? (
              transactions.map((t) => (
                <motion.tr 
                  variants={itemVariants}
                  key={t.id} 
                  className="hover:bg-muted/5 transition-colors group"
                >
                  <TableCell className="p-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{t.date.split('-').reverse().join('.')}</span>
                      <span className="text-[10px] text-muted-foreground font-bold tracking-tight">{t.time}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-6">
                    <EntityTag 
                      type="vehicle"
                      id={t.vehicle_id}
                      name={t.vehicle_name}
                      color={t.color}
                      unitMode={stats.unit_mode}
                      stat={stats.by_vehicle?.find(v => v.id === t.vehicle_id)}
                    />
                  </TableCell>
                  <TableCell className="p-6">
                    <EntityTag 
                      type="driver"
                      id={t.pincode}
                      name={t.driver_name}
                      unitMode={stats.unit_mode}
                      stat={stats.by_driver?.find(d => d.pincode === t.pincode)}
                    />
                  </TableCell>
                  <TableCell className="p-6 text-center">
                    <span className="font-mono text-xs font-black bg-muted/50 px-3 py-1 rounded-lg">
                      {t.mileage.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="p-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-primary">
                        {t.amount.toFixed(2)} L
                      </span>
                      {t.cost !== undefined && (
                        <span className="text-[10px] font-bold text-muted-foreground">
                          € {t.cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg" onClick={() => navigate(`/transactions/${t.id}/edit`)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg" onClick={() => deleteTransaction(t.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium italic text-sm">
                  No records matching criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>
    </motion.div>
  );
}
