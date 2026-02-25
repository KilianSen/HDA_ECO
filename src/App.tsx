import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink
} from 'react-router';
import { 
  Fuel, 
  TrendingUp,
  List,
  Settings,
  Github,
  Warehouse
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { DashboardView } from './pages/Dashboard';
import { TransactionsView } from './pages/Transactions';
import { TransactionEditView } from './pages/TransactionEdit';
import { ManagementView } from './pages/Management';
import { StationView } from './pages/Station';
import type { Transaction, Stats } from './types';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ total_fuel: 0, total_transactions: 0, total_vehicles: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'month' | 'year' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [latestDate, setLatestDate] = useState<string | null>(null);

  // Management State
  const [newVehicle, setNewVehicle] = useState({ id: '', name: '' });
  const [newDriver, setNewDriver] = useState({ pincode: '', name: '' });

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
    // Dynamically import xlsx only when needed to avoid large bundle size if possible, 
    // but since we are refactoring, we'll keep it simple for now and assume it's imported at top or we can import here.
    // Ideally we should import at top. Let's assume we import utils and writeFile from 'xlsx' at top.
    // I need to add that import to the top of this file content.
    import('xlsx').then(({ utils, writeFile }) => {
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
    });
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
    <BrowserRouter>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-slate-50/50">
          <Sidebar collapsible="icon" className="border-r border-slate-200">
            <SidebarHeader className="h-14 flex items-center px-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-200">
                  <Fuel size={18} />
                </div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-bold text-slate-900">HDA ECO</span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider px-4 mb-2">Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="px-2 gap-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Dashboard">
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "bg-slate-100 text-blue-600 font-semibold" : "text-slate-600"}>
                          <TrendingUp size={18} />
                          <span>Dashboard</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Station Status">
                        <NavLink to="/station" className={({ isActive }) => isActive ? "bg-slate-100 text-blue-600 font-semibold" : "text-slate-600"}>
                          <Warehouse size={18} />
                          <span>Station Status</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Transactions">
                        <NavLink to="/transactions" className={({ isActive }) => isActive ? "bg-slate-100 text-blue-600 font-semibold" : "text-slate-600"}>
                          <List size={18} />
                          <span>Transactions</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Management">
                        <NavLink to="/management" className={({ isActive }) => isActive ? "bg-slate-100 text-blue-600 font-semibold" : "text-slate-600"}>
                          <Settings size={18} />
                          <span>Management</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator className="mx-4 my-2 opacity-50" />

              <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider px-4 mb-2">Data Operations</SidebarGroupLabel>
                <SidebarGroupContent className="px-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <input type="file" onChange={handleFileChange} className="hidden" id="file-upload-sidebar" />
                    {file ? (
                       <Button 
                        onClick={handleUpload} 
                        disabled={loading}
                        className="w-full h-8 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
                      >
                        {loading ? 'Processing...' : 'Confirm Upload'}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => document.getElementById('file-upload-sidebar')?.click()} 
                        disabled={loading}
                        className="w-full h-8 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                      >
                        One-stop Import
                      </Button>
                    )}
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-slate-100 group-data-[collapsible=icon]:hidden">
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2 px-2">
                    <Badge variant="outline" className="w-full justify-center text-[10px] font-bold text-slate-500 border-slate-200 bg-slate-50">
                      INTERNAL TOOLING ONLY
                    </Badge>
                 </div>
                 <a 
                   href="https://github.com/KilianSen" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors"
                 >
                   <span>Made by KilianSen</span>
                   <Github size={10} />
                 </a>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex-1 flex flex-col min-w-0 bg-transparent">
            <main className="flex-1 p-6 md:p-10 overflow-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                  <DashboardView 
                    stats={stats} 
                    chartData={chartData} 
                    timeframe={timeframe} 
                    setTimeframe={setTimeframe}
                    customStart={customStart}
                    setCustomStart={setCustomStart}
                    customEnd={customEnd}
                    setCustomEnd={setCustomEnd}
                  />
                } />
                <Route path="/transactions" element={
                  <TransactionsView 
                    transactions={transactions}
                    stats={stats}
                    deleteTransaction={deleteTransaction}
                    exportToCSV={exportToCSV}
                    exportToExcel={exportToExcel}
                  />
                } />
                <Route path="/transactions/new" element={
                  <TransactionEditView 
                    latestDate={latestDate}
                    fetchData={fetchData}
                    fetchLatestDate={fetchLatestDate}
                  />
                } />
                <Route path="/transactions/:id/edit" element={
                  <TransactionEditView 
                    latestDate={latestDate}
                    fetchData={fetchData}
                    fetchLatestDate={fetchLatestDate}
                  />
                } />
                <Route path="/station" element={
                  <StationView stats={stats} fetchData={fetchData} />
                } />
                <Route path="/management" element={
                  <ManagementView 
                    uniqueVehicles={uniqueVehicles}
                    uniqueDrivers={uniqueDrivers}
                    newVehicle={newVehicle}
                    setNewVehicle={setNewVehicle}
                    addVehicle={addVehicle}
                    deleteVehicle={deleteVehicle}
                    saveVehicleName={saveVehicleName}
                    newDriver={newDriver}
                    setNewDriver={setNewDriver}
                    addDriver={addDriver}
                    deleteDriver={deleteDriver}
                    saveDriverName={saveDriverName}
                    toggleUnitMode={toggleUnitMode}
                    stats={stats}
                  />
                } />
              </Routes>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </BrowserRouter>
  );
}

export default App;
