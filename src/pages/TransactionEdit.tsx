import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router';
import { Save, ArrowLeft } from 'lucide-react';
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
    <div className="space-y-12 animate-in fade-in duration-500 max-w-4xl">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted" onClick={() => navigate('/transactions')}>
            <ArrowLeft size={18} />
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight">{id ? 'Edit' : 'Record'}</h1>
            <p className="text-muted-foreground font-medium">Log a manual fuel export transaction.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-12">
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="space-y-8">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/60 border-b pb-3">Temporal Info</h3>
              <div className="space-y-6">
                <FormInput label="Date" type="date" value={form.date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, date: e.target.value})} />
                <FormInput label="Time" type="time" value={form.time} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, time: e.target.value})} />
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/60 border-b pb-3">Asset Attribution</h3>
              <div className="space-y-6">
                <FormInput label="Vehicle ID" value={form.vehicle_id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, vehicle_id: e.target.value})} placeholder="0001" />
                <FormInput label="Operator PIN" value={form.pincode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, pincode: e.target.value})} placeholder="9999" />
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/60 border-b pb-3">Technical Data</h3>
              <div className="space-y-6">
                <FormInput label="Sequence" value={form.sequence} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, sequence: e.target.value})} placeholder="00001" />
                <FormInput label="Odometer" type="number" value={form.mileage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, mileage: parseInt(e.target.value) || 0})} />
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/60 border-b pb-3">Volume Metrics</h3>
              <div className="space-y-6">
                <FormInput label="Volume (L)" type="number" step="0.01" value={form.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({...form, amount: parseFloat(e.target.value) || 0})} />
                <div className="pt-2">
                  <Button className="w-full h-12 font-bold text-sm gap-3 rounded-2xl shadow-xl shadow-primary/20" onClick={save}>
                    <Save size={18} />
                    Commit Transaction
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
