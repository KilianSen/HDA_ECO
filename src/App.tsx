import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { utils, writeFile } from 'xlsx';
import { 
  Fuel, 
  Car, 
  Calendar, 
  TrendingUp,
  List,
  User,
  Settings,
  Clock,
  Download,
  FileSpreadsheet,
  Trash2,
  Plus,
  Edit2,
  X,
  Save
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface Transaction {
  id: number;
  sequence: string;
  pincode: string;
  vehicle_id: string;
  mileage: number;
  amount: number;
  product_id: string;
  date: string;
  time: string;
  vehicle_name?: string;
  driver_name?: string;
}

interface VehicleStat {
  name: string;
  id: string;
  total_fuel: number;
  count: number;
  efficiency: string;
  distance: number;
}

interface DriverStat {
  name: string;
  pincode: string;
  total_fuel: number;
  count: number;
  avg_per_refuel: string;
}

interface Stats {
  total_fuel: number;
  total_transactions: number;
  total_vehicles: number;
  unit_mode?: 'km' | 'hours';
  by_vehicle?: VehicleStat[];
  by_driver?: DriverStat[];
  recent_activity?: Transaction[];
  by_month?: { month: string; amount: number }[];
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ total_fuel: 0, total_transactions: 0, total_vehicles: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'management'>('dashboard');
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'month' | 'year' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [latestDate, setLatestDate] = useState<string | null>(null);

  // Management State
  const [newVehicle, setNewVehicle] = useState({ id: '', name: '' });
  const [newDriver, setNewDriver] = useState({ pincode: '', name: '' });
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [transactionForm, setTransactionForm] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    sequence: '',
    pincode: '',
    vehicle_id: '',
    mileage: 0,
    amount: 0,
    product_id: '01'
  });

  const fetchLatestDate = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/transactions?limit=1');
      if (res.data && res.data.length > 0) {
        setLatestDate(res.data[0].date);
      }
    } catch (err) {
      console.error('Error fetching latest date:', err);
    }
  }, []);

  useEffect(() => {
    fetchLatestDate();
  }, [fetchLatestDate]);

  const fetchData = useCallback(async () => {
    try {
      let params = {};
      const refDate = latestDate || new Date().toISOString().split('T')[0];
      const [rYear, rMonth] = refDate.split('-').map(Number);

      if (timeframe === 'today') {
        params = { start: refDate, end: refDate };
      } else if (timeframe === 'month') {
        const start = new Date(rYear, rMonth - 1, 1).toISOString().split('T')[0];
        params = { start, end: refDate };
      } else if (timeframe === 'year') {
        const start = `${rYear}-01-01`;
        params = { start, end: refDate };
      } else if (timeframe === 'custom' && customStart && customEnd) {
        params = { start: customStart, end: customEnd };
      }

      const [filteredTransRes, statsRes] = await Promise.all([
        axios.get('http://localhost:3001/api/transactions', { params }),
        axios.get('http://localhost:3001/api/stats', { params })
      ]);
      setTransactions(filteredTransRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [timeframe, customStart, customEnd, latestDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || loading) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:3001/api/upload', formData);
      setFile(null);
      // Reset input value so same file can be selected again
      const input = document.getElementById('file-upload-sidebar') as HTMLInputElement;
      if (input) input.value = '';
      await fetchLatestDate();
      fetchData();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveVehicleName = async (id: string, name: string) => {
    try {
      await axios.post('http://localhost:3001/api/vehicles', { id, name });
      fetchData();
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const saveDriverName = async (pincode: string, name: string) => {
    try {
      await axios.post('http://localhost:3001/api/drivers', { pincode, name });
      fetchData();
    } catch (error) {
      console.error('Error saving driver:', error);
    }
  };

  const toggleUnitMode = async () => {
    const newMode = stats.unit_mode === 'hours' ? 'km' : 'hours';
    try {
      await axios.post('http://localhost:3001/api/settings', { key: 'unit_mode', value: newMode });
      fetchData();
    } catch (error) {
      console.error('Error toggling unit mode:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Vehicle', 'Vehicle ID', 'Driver', 'PIN', 'Mileage', 'Amount (L)'];
    const rows = transactions.map(t => [
      t.date,
      t.time,
      t.vehicle_name || 'Unnamed',
      t.vehicle_id,
      t.driver_name || t.pincode,
      t.pincode,
      t.mileage,
      t.amount
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `hda_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const data = transactions.map(t => ({
      'Date': t.date,
      'Time': t.time,
      'Vehicle': t.vehicle_name || 'Unnamed',
      'Vehicle ID': t.vehicle_id,
      'Driver': t.driver_name || t.pincode,
      'PIN': t.pincode,
      [`Mileage (${stats.unit_mode === 'hours' ? 'h' : 'km'})`]: t.mileage,
      'Amount (L)': t.amount
    }));

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Transactions");
    writeFile(wb, `hda_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const deleteTransaction = async (id: number) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await axios.delete(`http://localhost:3001/api/transactions/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm(`Delete vehicle ${id}?`)) return;
    try {
      await axios.delete(`http://localhost:3001/api/vehicles/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const deleteDriver = async (pincode: string) => {
    if (!confirm(`Delete driver with PIN ${pincode}?`)) return;
    try {
      await axios.delete(`http://localhost:3001/api/drivers/${pincode}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  const addVehicle = async () => {
    if (!newVehicle.id) return;
    try {
      await axios.post('http://localhost:3001/api/vehicles', newVehicle);
      setNewVehicle({ id: '', name: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding vehicle:', error);
    }
  };

  const addDriver = async () => {
    if (!newDriver.pincode) return;
    try {
      await axios.post('http://localhost:3001/api/drivers', newDriver);
      setNewDriver({ pincode: '', name: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding driver:', error);
    }
  };

  const saveTransaction = async () => {
    try {
      await axios.post('http://localhost:3001/api/transactions', transactionForm);
      setIsAddingTransaction(false);
      setTransactionForm({
        date: latestDate || new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        sequence: '',
        pincode: '',
        vehicle_id: '',
        mileage: 0,
        amount: 0,
        product_id: '01'
      });
      fetchData();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const editTransaction = (t: Transaction) => {
    setTransactionForm(t);
    setIsAddingTransaction(true);
  };

  const chartData = transactions
    .reduce((acc: { date: string; amount: number }[], curr) => {
      const existing = acc.find(item => item.date === curr.date);
      if (existing) {
        existing.amount += curr.amount;
      } else {
        acc.push({ date: curr.date, amount: curr.amount });
      }
      return acc;
    }, [])
    .sort((a, b) => a.date.localeCompare(b.date));

  // Unique vehicles and drivers for management
  const uniqueVehicles = Array.from(new Set(transactions.map(t => t.vehicle_id)))
    .map(id => ({ 
      id, 
      name: transactions.find(t => t.vehicle_id === id)?.vehicle_name || '' 
    }));

  const uniqueDrivers = Array.from(new Set(transactions.map(t => t.pincode)))
    .map(pincode => ({ 
      pincode, 
      name: transactions.find(t => t.pincode === pincode)?.driver_name || '' 
    }));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Fuel className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold">HDA ECO</h1>
        </div>
        
        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <TrendingUp size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'transactions' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <List size={20} />
            Transactions
          </button>
          <button 
            onClick={() => setActiveTab('management')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'management' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Settings size={20} />
            Management
          </button>
        </nav>

        <div className="pt-8 mt-8 border-t border-slate-800 space-y-4">
           <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-3">Mode</p>
              <button 
                onClick={toggleUnitMode}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  {stats.unit_mode === 'hours' ? <Clock size={16} className="text-blue-400" /> : <TrendingUp size={16} className="text-blue-400" />}
                  <span>{stats.unit_mode === 'hours' ? 'Hours' : 'Kilometers'}</span>
                </div>
                <div className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                  SWITCH
                </div>
              </button>
           </div>

           <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Local Sync</p>
              <input 
                type="file" 
                onChange={handleFileChange}
                className="hidden" 
                id="file-upload-sidebar"
              />
              <label 
                htmlFor="file-upload-sidebar"
                className="block text-sm cursor-pointer hover:text-blue-400 truncate"
              >
                {file ? file.name : 'Select File...'}
              </label>
              <Button 
                onClick={handleUpload} 
                disabled={!file || loading}
                size="sm"
                className="w-full mt-3 h-8 text-xs"
              >
                {loading ? '...' : 'Upload Now'}
              </Button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
                <p className="text-slate-500">Overview of fuel operations</p>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="flex bg-slate-200 p-1 rounded-lg self-start">
                  {(['all', 'today', 'month', 'year', 'custom'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        timeframe === t 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {t === 'all' ? 'All Time' : t === 'today' ? 'Today' : t === 'month' ? 'This Month' : t === 'year' ? 'This Year' : 'Custom'}
                    </button>
                  ))}
                </div>

                {timeframe === 'custom' && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <input 
                      type="date" 
                      className="bg-white border rounded px-2 py-1 text-xs"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input 
                      type="date" 
                      className="bg-white border rounded px-2 py-1 text-xs"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Total Fuel (L)</CardTitle>
                  <Fuel className="text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.total_fuel?.toFixed(1) || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Vehicles</CardTitle>
                  <Car className="text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.total_vehicles || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Records</CardTitle>
                  <Calendar className="text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{stats.total_transactions || 0}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {timeframe === 'all' ? 'Monthly Consumption' : 'Daily Consumption'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeframe === 'all' && stats.by_month ? [...stats.by_month].reverse() : chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey={timeframe === 'all' ? 'month' : 'date'} 
                        fontSize={11} 
                        tickFormatter={(val) => timeframe === 'all' ? val : val.split('-').slice(1).reverse().join('.')} 
                        stroke="#94a3b8"
                      />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      {stats.recent_activity && stats.recent_activity.length > 0 ? (
                        <div className="space-y-3">
                          {stats.recent_activity.map((t: Transaction, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <Car className="text-slate-500" size={16} />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-700">{t.vehicle_name || t.vehicle_id}</p>
                                <p className="text-xs text-slate-500">{t.date}</p>
                              </div>
                              <span className="font-mono font-bold text-blue-600 text-sm">{t.amount.toFixed(1)}L</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Top Consumers (Vehicles)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {stats.by_vehicle?.map((v: VehicleStat, i: number) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{v.name || v.id}</span>
                            <span className="text-xs text-slate-400 font-mono">
                              {v.distance.toLocaleString()} {stats.unit_mode === 'hours' ? 'h total' : 'km total'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-blue-600 block">{v.total_fuel.toFixed(1)} L</span>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                              {v.efficiency} {stats.unit_mode === 'hours' ? 'L/h' : 'L/100km'}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${(v.total_fuel / (stats.by_vehicle![0].total_fuel || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Drivers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {stats.by_driver?.map((d: DriverStat, i: number) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{d.name || d.pincode}</span>
                            <span className="text-xs text-slate-400">
                              {d.count} refuels total
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-green-600 block">{d.total_fuel.toFixed(1)} L</span>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                              avg: {d.avg_per_refuel} L
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: `${(d.total_fuel / (stats.by_driver![0].total_fuel || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Transactions</h2>
                <p className="text-slate-500">Full history of fuel exports</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAddingTransaction(!isAddingTransaction)} className="gap-2">
                  {isAddingTransaction ? <X size={16} /> : <Plus size={16} />}
                  {isAddingTransaction ? 'Cancel' : 'Add Manual'}
                </Button>
                <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
                  <Download size={16} />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                  <FileSpreadsheet size={16} />
                  Export Excel
                </Button>
              </div>
            </header>

            {isAddingTransaction && (
              <Card className="animate-in fade-in slide-in-from-top-2">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plus size={16} />
                    {transactionForm.id ? 'Edit Transaction' : 'Manual Entry'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Date</label>
                      <input type="date" className="w-full text-xs border rounded p-1.5" value={transactionForm.date} onChange={e => setTransactionForm({...transactionForm, date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Time</label>
                      <input type="time" className="w-full text-xs border rounded p-1.5" value={transactionForm.time} onChange={e => setTransactionForm({...transactionForm, time: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Vehicle ID</label>
                      <input type="text" className="w-full text-xs border rounded p-1.5" placeholder="0001" value={transactionForm.vehicle_id} onChange={e => setTransactionForm({...transactionForm, vehicle_id: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">PIN</label>
                      <input type="text" className="w-full text-xs border rounded p-1.5" placeholder="9999" value={transactionForm.pincode} onChange={e => setTransactionForm({...transactionForm, pincode: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Seq</label>
                      <input type="text" className="w-full text-xs border rounded p-1.5" placeholder="00001" value={transactionForm.sequence} onChange={e => setTransactionForm({...transactionForm, sequence: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Mileage</label>
                      <input type="number" className="w-full text-xs border rounded p-1.5" value={transactionForm.mileage} onChange={e => setTransactionForm({...transactionForm, mileage: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Amount (L)</label>
                      <input type="number" step="0.01" className="w-full text-xs border rounded p-1.5" value={transactionForm.amount} onChange={e => setTransactionForm({...transactionForm, amount: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="flex items-end">
                      <Button className="w-full h-8 text-xs gap-2" onClick={saveTransaction}>
                        <Save size={14} />
                        Save
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Date / Time</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver / PIN</TableHead>
                      <TableHead>Mileage ({stats.unit_mode === 'hours' ? 'h' : 'km'})</TableHead>
                      <TableHead className="text-right">Amount (L)</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-slate-600">
                          {t.date.split('-').reverse().join('.')} <span className="text-slate-400 ml-1">{t.time}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold">{t.vehicle_name || 'Unnamed Vehicle'}</span>
                            <span className="text-xs text-slate-400 font-mono">{t.vehicle_id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <User size={14} className="text-slate-400" />
                             <span>{t.driver_name || t.pincode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-slate-500">
                          {t.mileage.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          {t.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => editTransaction(t)}
                              className="text-slate-300 hover:text-blue-500 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => deleteTransaction(t.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'management' && (
          <div className="space-y-8">
             <header>
              <h2 className="text-3xl font-bold text-slate-900">Management</h2>
              <p className="text-slate-500">Assign names to Vehicle IDs and PINs</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Vehicle Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car size={20} />
                      Vehicles
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Vehicle Form */}
                  <div className="flex gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <input 
                      type="text" 
                      placeholder="ID (e.g. 0001)"
                      className="w-24 px-2 py-1 text-xs border rounded"
                      value={newVehicle.id}
                      onChange={(e) => setNewVehicle({...newVehicle, id: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Name"
                      className="flex-1 px-2 py-1 text-xs border rounded"
                      value={newVehicle.name}
                      onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                    />
                    <Button size="sm" className="h-7 w-7 p-0" onClick={addVehicle}>
                      <Plus size={14} />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {uniqueVehicles.map(v => (
                      <div key={v.id} className="flex items-center gap-3 p-2 border-b last:border-0 group">
                        <div className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{v.id}</div>
                        <input 
                          type="text" 
                          defaultValue={v.name}
                          placeholder="Assign name..."
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
                          onBlur={(e) => saveVehicleName(v.id, e.target.value)}
                        />
                        <button 
                          onClick={() => deleteVehicle(v.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {uniqueVehicles.length === 0 && <p className="text-sm text-slate-400 italic">No vehicles found yet.</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Driver Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User size={20} />
                    Drivers (by PIN)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                   {/* Add Driver Form */}
                   <div className="flex gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <input 
                      type="text" 
                      placeholder="PIN"
                      className="w-24 px-2 py-1 text-xs border rounded"
                      value={newDriver.pincode}
                      onChange={(e) => setNewDriver({...newDriver, pincode: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Driver Name"
                      className="flex-1 px-2 py-1 text-xs border rounded"
                      value={newDriver.name}
                      onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                    />
                    <Button size="sm" className="h-7 w-7 p-0" onClick={addDriver}>
                      <Plus size={14} />
                    </Button>
                  </div>

                   <div className="space-y-3">
                    {uniqueDrivers.map(d => (
                      <div key={d.pincode} className="flex items-center gap-3 p-2 border-b last:border-0 group">
                        <div className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{d.pincode}</div>
                        <input 
                          type="text" 
                          defaultValue={d.name}
                          placeholder="Assign driver name..."
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
                          onBlur={(e) => saveDriverName(d.pincode, e.target.value)}
                        />
                        <button 
                          onClick={() => deleteDriver(d.pincode)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {uniqueDrivers.length === 0 && <p className="text-sm text-slate-400 italic">No drivers found yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
