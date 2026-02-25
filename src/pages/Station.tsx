import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  History, 
  Plus, 
  Trash2, 
  Settings2,
  TrendingDown
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormInput } from '../components/FormInput';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { Stats, StationDelivery } from '../types';
import { motion, type Variants } from 'motion/react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export function StationView({ stats, fetchData }: { stats: Stats, fetchData: () => void }) {
  const [deliveries, setDeliveries] = useState<StationDelivery[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newDelivery, setNewDelivery] = useState<Partial<StationDelivery>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    price_per_liter: 0,
    notes: ''
  });

  useEffect(() => {
    axios.get('http://localhost:3001/api/station/deliveries')
      .then(res => setDeliveries(res.data))
      .catch(err => console.error('Error fetching deliveries:', err));
  }, [refreshKey]);

  const addDelivery = async () => {
    try {
      await axios.post('http://localhost:3001/api/station/deliveries', newDelivery);
      setIsAdding(false);
      setNewDelivery({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        price_per_liter: 0,
        notes: ''
      });
      setRefreshKey(k => k + 1);
      fetchData();
    } catch (error) {
      console.error('Error adding delivery:', error);
    }
  };

  const deleteDelivery = async (id: number) => {
    if (!confirm('Delete this delivery record?')) return;
    try {
      await axios.delete(`http://localhost:3001/api/station/deliveries/${id}`);
      setRefreshKey(k => k + 1);
      fetchData();
    } catch (error) {
      console.error('Error deleting delivery:', error);
    }
  };

  const updateCapacity = async () => {
    const newCap = prompt("Enter new total tank capacity (L):", stats.station?.capacity.toString());
    if (newCap && !isNaN(parseFloat(newCap))) {
      await axios.post('http://localhost:3001/api/settings', { key: 'tank_capacity', value: newCap });
      fetchData();
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12"
    >
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Station</h1>
          <p className="text-muted-foreground font-medium">Inventory and fuel delivery tracking.</p>
        </div>
        <Button variant="outline" size="sm" onClick={updateCapacity} className="h-10 gap-2 font-semibold rounded-xl">
          <Settings2 size={16} />
          Configure Tank
        </Button>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Avg. Price" value={`${stats.station?.avg_price.toFixed(3)} €/L`} tooltip="Weighted average price based on delivery records." />
        <MetricCard title="Inventory Value" value={`${stats.station?.inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} tooltip="Total value of current fuel in tank at average price." />
        <MetricCard title="Total Spend" value={`${stats.station?.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} tooltip="Total financial volume of all recorded deliveries." />
        <MetricCard title="Est. Autonomy" value={`${stats.station?.days_remaining || 0} Days`} tooltip="Days remaining based on avg daily consumption." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-none bg-muted/30 p-8">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Live Inventory</h3>
                  <InfoTooltip content="Calculated from reported deliveries minus vehicle transactions." />
                </div>
                <Badge variant={stats.station?.fill_percentage && stats.station.fill_percentage < 20 ? "destructive" : "secondary"} className="font-bold">
                  {stats.station?.fill_percentage?.toFixed(1)}% CAPACITY
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div className="text-6xl font-black tracking-tighter">
                  {stats.station?.current_level.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span className="text-2xl text-muted-foreground font-bold ml-3">/ {stats.station?.capacity.toLocaleString()} L</span>
                </div>
                <Progress value={stats.station?.fill_percentage || 0} className="h-3 rounded-full bg-muted" />
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-none bg-muted/20 p-8">
            <div className="flex items-center gap-2 mb-8">
              <TrendingDown size={18} className="text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Fill Level History</h3>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.station?.fill_history || []}>
                  <defs>
                    <linearGradient id="fillLevel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.split('-').slice(1).reverse().join('.')}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(val) => `${val}L`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                    formatter={(value: number) => [`${value.toLocaleString()} L`, 'Tank Level']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="level" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#fillLevel)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-none bg-primary text-primary-foreground p-8 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary-foreground/70">
                <Plus size={20} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Add Delivery</h3>
              </div>
              <p className="text-sm font-medium text-primary-foreground/60 leading-relaxed">
                Log new fuel shipments to update the current tank level and financial records.
              </p>
            </div>
            
            <div className="space-y-6 mt-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Fuel Amount (LITERS)</label>
                  <input 
                    type="number" 
                    className="w-full bg-primary-foreground/10 border-none rounded-xl px-4 py-3 text-xl font-bold placeholder:text-primary-foreground/30 focus:ring-2 focus:ring-primary-foreground/20 outline-none"
                    value={newDelivery.amount || ''}
                    onChange={e => setNewDelivery({...newDelivery, amount: parseFloat(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Price (€ / Liter)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    className="w-full bg-primary-foreground/10 border-none rounded-xl px-4 py-3 text-xl font-bold placeholder:text-primary-foreground/30 focus:ring-2 focus:ring-primary-foreground/20 outline-none"
                    value={newDelivery.price_per_liter || ''}
                    onChange={e => setNewDelivery({...newDelivery, price_per_liter: parseFloat(e.target.value)})}
                    placeholder="0.000"
                  />
                </div>
              </div>
              <Button onClick={addDelivery} className="w-full bg-background text-primary hover:bg-background/90 h-12 font-bold text-sm rounded-xl">
                Register Delivery
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <History size={20} className="text-muted-foreground" />
            <h3 className="text-lg font-bold tracking-tight">Supply History</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)} className="text-xs font-bold text-primary">
            {isAdding ? 'CANCEL' : 'MANUAL ENTRY'}
          </Button>
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-6 bg-muted/30 rounded-2xl grid grid-cols-1 md:grid-cols-5 gap-6 overflow-hidden"
          >
            <FormInput label="Date" type="date" value={newDelivery.date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDelivery({...newDelivery, date: e.target.value})} />
            <FormInput label="Amount (L)" type="number" value={newDelivery.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDelivery({...newDelivery, amount: parseFloat(e.target.value)})} />
            <FormInput label="Price (€/L)" type="number" step="0.001" value={newDelivery.price_per_liter} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDelivery({...newDelivery, price_per_liter: parseFloat(e.target.value)})} />
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Notes / Supplier</label>
              <input type="text" className="w-full h-10 bg-background border border-muted rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" value={newDelivery.notes} onChange={e => setNewDelivery({...newDelivery, notes: e.target.value})} />
            </div>
            <div className="md:col-span-5 flex justify-end">
              <Button size="sm" onClick={addDelivery} className="font-bold px-8">Save Record</Button>
            </div>
          </motion.div>
        )}

        <div className="rounded-2xl border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-[10px] font-black uppercase tracking-widest p-5">Arrival Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest p-5">Volume (L)</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest p-5">Price (€/L)</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest p-5">Total Cost</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest p-5">Notes</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length > 0 ? (
                deliveries.map((d, i) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + (i * 0.03) }}
                    key={d.id} 
                    className="hover:bg-muted/10 border-b border-muted/50 transition-colors"
                  >
                    <TableCell className="p-5 font-bold text-sm">{d.date}</TableCell>
                    <TableCell className="p-5 font-black text-sm text-primary">+{d.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell className="p-5 font-bold text-sm text-muted-foreground">€ {d.price_per_liter?.toFixed(3) || '0.000'}</TableCell>
                    <TableCell className="p-5 font-bold text-sm">€ {((d.amount || 0) * (d.price_per_liter || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="p-5 text-sm text-muted-foreground font-medium italic">{d.notes || '—'}</TableCell>
                    <TableCell className="p-5 text-right">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8 transition-colors" onClick={() => deleteDelivery(d.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground font-medium italic">No supply records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetricCard({ title, value, tooltip }: { title: string, value: string, tooltip: string }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className="border-none shadow-none bg-muted/20 p-6 space-y-1 h-full">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{title}</p>
          <InfoTooltip content={tooltip} />
        </div>
        <p className="text-2xl font-black tracking-tight">{value}</p>
      </Card>
    </motion.div>
  );
}
