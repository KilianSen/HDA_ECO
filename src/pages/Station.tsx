import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Droplets, 
  History, 
  Plus, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

export function StationView({ stats, fetchData }: { stats: Stats, fetchData: () => void }) {
  const [deliveries, setDeliveries] = useState<StationDelivery[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newDelivery, setNewDelivery] = useState<Partial<StationDelivery>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
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
        notes: ''
      });
      setRefreshKey(k => k + 1);
      fetchData(); // Update global stats (tank level)
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
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Station Status</h2>
          <p className="text-muted-foreground text-sm font-medium">Tank levels and inventory management</p>
        </div>
        <Button variant="outline" size="sm" onClick={updateCapacity} className="gap-2 h-9 border-slate-300">
          <SettingsIcon size={14} />
          Adjust Capacity
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200 shadow-sm md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Current Tank Level</CardTitle>
              <InfoTooltip content="Calculated as: Total Deliveries - Total Transactions recorded in the system." />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <div className="text-4xl font-bold text-slate-900">
                {stats.station?.current_level.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-lg text-slate-400 font-medium">/ {stats.station?.capacity.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</span>
              </div>
              <Badge variant={stats.station?.fill_percentage && stats.station.fill_percentage < 20 ? "destructive" : "secondary"} className="text-xs font-bold px-2 py-1">
                {stats.station?.fill_percentage?.toFixed(1)}% Full
              </Badge>
            </div>
            <Progress value={stats.station?.fill_percentage || 0} className="h-4 rounded-full" />
            <div className="mt-4 flex gap-8 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <Droplets size={14} className="text-blue-500" />
                <span>{stats.station?.days_remaining || 0} Days remaining (est.)</span>
                <InfoTooltip content="Estimated based on historical daily average consumption." />
              </div>
              {stats.station?.fill_percentage && stats.station.fill_percentage < 10 && (
                <div className="flex items-center gap-2 text-red-600 font-bold animate-pulse">
                  <AlertCircle size={14} />
                  <span>Low Level Warning</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-xl shadow-slate-200/50">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Plus size={16} className="text-blue-400" />
              Quick Refuel
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Log a new fuel delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount (L)</label>
              <input 
                type="number" 
                className="w-full bg-slate-800 border-none rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500"
                value={newDelivery.amount || ''}
                onChange={e => setNewDelivery({...newDelivery, amount: parseFloat(e.target.value)})}
                placeholder="0"
              />
            </div>
            <Button onClick={addDelivery} className="w-full bg-blue-600 hover:bg-blue-500 font-bold">
              Confirm Delivery
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Delivery History</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)} className="h-8 text-xs font-bold text-blue-600">
            {isAdding ? 'Close Form' : 'Expanded Entry'}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isAdding && (
            <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
              <FormInput label="Date" type="date" value={newDelivery.date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDelivery({...newDelivery, date: e.target.value})} />
              <FormInput label="Amount (L)" type="number" value={newDelivery.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDelivery({...newDelivery, amount: parseFloat(e.target.value)})} />
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-600">Notes</label>
                <input type="text" className="w-full h-9 text-xs border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-blue-500" placeholder="Supplier, Invoice #..." value={newDelivery.notes} onChange={e => setNewDelivery({...newDelivery, notes: e.target.value})} />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <Button size="sm" onClick={addDelivery} className="bg-blue-600 hover:bg-blue-500 text-xs font-bold">Save Record</Button>
              </div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="">
                <TableHead className="w-[150px] text-xs font-bold uppercase text-slate-500">Date</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-500">Amount</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-500">Notes</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length > 0 ? (
                deliveries.map((d) => (
                  <TableRow key={d.id} className="">
                    <TableCell className="font-medium text-xs text-slate-700">{d.date}</TableCell>
                    <TableCell className="font-bold text-xs text-blue-600">+{d.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</TableCell>
                    <TableCell className="text-xs text-slate-500 italic">{d.notes || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500" onClick={() => deleteDelivery(d.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-xs text-slate-400 italic">No delivery records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
  );
}
