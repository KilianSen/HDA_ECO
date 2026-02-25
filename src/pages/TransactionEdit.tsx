import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router';
import { X, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '../components/FormInput';
import type { Transaction } from '../types';

export function TransactionEditView({ latestDate, fetchData, fetchLatestDate }: { latestDate: string | null, fetchData: () => void, fetchLatestDate: () => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Transaction>>({
    date: latestDate || new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    sequence: '',
    pincode: '',
    vehicle_id: '',
    mileage: 0,
    amount: 0,
    product_id: '01'
  });

  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:3001/api/transactions?limit=1000`).then(res => {
        const t = res.data.find((item: Transaction) => item.id === parseInt(id));
        if (t) setForm(t);
      });
    }
  }, [id]);

  const save = async () => {
    try {
      await axios.post('http://localhost:3001/api/transactions', form);
      await fetchLatestDate();
      fetchData();
      navigate('/transactions');
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm" onClick={() => navigate('/transactions')}>
          <X size={18} />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{id ? 'Edit Transaction' : 'New Transaction'}</h2>
          <p className="text-muted-foreground text-sm font-medium">Record fuel export details manually</p>
        </div>
      </header>

      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700">Transaction Details</CardTitle>
          <CardDescription>All fields are required for accurate logging.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FormInput label="Transaction Date" type="date" value={form.date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, date: e.target.value})} />
            <FormInput label="Time" type="time" value={form.time} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, time: e.target.value})} />
            <FormInput label="Vehicle Asset ID" value={form.vehicle_id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, vehicle_id: e.target.value})} placeholder="e.g. 0001" />
            <FormInput label="Operator PIN" value={form.pincode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, pincode: e.target.value})} placeholder="e.g. 9999" />
            <FormInput label="Sequence Number" value={form.sequence} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, sequence: e.target.value})} placeholder="00001" />
            <FormInput label="Odometer Reading" type="number" value={form.mileage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, mileage: parseInt(e.target.value) || 0})} />
            <FormInput label="Fuel Volume (L)" type="number" step="0.01" value={form.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, amount: parseFloat(e.target.value) || 0})} />
            <div className="flex items-end">
              <Button className="w-full h-10 font-bold gap-2 shadow-md shadow-blue-100" onClick={save}>
                <Save size={16} />
                Save Transaction
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
