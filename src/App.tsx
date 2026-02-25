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
  Warehouse,
  Github
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
} from "@/components/ui/sidebar";

import { DashboardView } from './pages/Dashboard';
import { TransactionsView } from './pages/Transactions';
import { TransactionEditView } from './pages/TransactionEdit';
import { ManagementView } from './pages/Management';
import { StationView } from './pages/Station';
import { TutorialOverlay } from './components/TutorialOverlay';
import type { Transaction, Stats } from './types';
import { cn } from '@/lib/utils';

function App() {
  // ... (keep all state and functions)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ total_fuel: 0, total_cost: 0, total_transactions: 0, total_vehicles: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'month' | 'year' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [latestDate, setLatestDate] = useState<string | null>(null);

  // Management State
  const [newVehicle, setNewVehicle] = useState({ id: '', name: '', color: '#3b82f6' });
  const [newDriver, setNewDriver] = useState({ pincode: '', name: '', color: '#10b981' });

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

  const saveVehicleName = async (id: string, name: string, color?: string) => {
    try {
      await axios.post('http://localhost:3001/api/vehicles', { id, name, color });
      fetchData();
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const saveDriverName = async (pincode: string, name: string, color?: string) => {
    try {
      await axios.post('http://localhost:3001/api/drivers', { pincode, name, color });
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
      setNewVehicle({ id: '', name: '', color: '#3b82f6' });
      fetchData();
    } catch (error) {
      console.error('Error adding vehicle:', error);
    }
  };

  const addDriver = async () => {
    if (!newDriver.pincode) return;
    try {
      await axios.post('http://localhost:3001/api/drivers', newDriver);
      setNewDriver({ pincode: '', name: '', color: '#10b981' });
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
      name: transactions.find(t => t.vehicle_id === id)?.vehicle_name || '',
      color: transactions.find(t => t.vehicle_id === id)?.color
    }));

  const uniqueDrivers = Array.from(new Set(transactions.map(t => t.pincode)))
    .map(pincode => ({ 
      pincode, 
      name: transactions.find(t => t.pincode === pincode)?.driver_name || '',
      color: transactions.find(t => t.pincode === pincode)?.color
    }));

  return (
    <BrowserRouter>
      <TutorialOverlay />
      <SidebarProvider style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
        <div className="flex h-screen w-full bg-background font-sans antialiased overflow-hidden">
          <Sidebar collapsible="none" className="border-r bg-muted/30 h-full">
            <SidebarHeader className="h-16 flex items-center px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Fuel size={18} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-base tracking-tight uppercase">HDA ECO</span>
              </div>
            </SidebarHeader>
            <SidebarContent className="px-2 pt-4">
              <SidebarGroup>
                <SidebarMenu className="gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/dashboard" className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                        <TrendingUp size={16} />
                        <span className="text-[11px] font-black uppercase tracking-wider">Dashboard</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/station" className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                        <Warehouse size={16} />
                        <span className="text-[11px] font-black uppercase tracking-wider">Station</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/transactions" className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                        <List size={16} />
                        <span className="text-[11px] font-black uppercase tracking-wider">Transactions</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/management" className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                        <Settings size={16} />
                        <span className="text-[11px] font-black uppercase tracking-wider">Management</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t bg-muted/10 overflow-hidden">
              <div className="space-y-4 text-center">
                <input type="file" onChange={handleFileChange} className="hidden" id="file-upload-sidebar" />
                <Button 
                  onClick={() => file ? handleUpload() : document.getElementById('file-upload-sidebar')?.click()} 
                  disabled={loading}
                  variant={file ? "default" : "outline"}
                  className="w-full h-10 text-[10px] font-black uppercase tracking-widest"
                >
                  {loading ? '...' : file ? 'Confirm' : 'Import'}
                </Button>
                
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-destructive/60">
                      Internal Use Only
                    </span>
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-40">
                      v1.0.0
                    </span>
                  </div>

                  <a 
                    href="https://github.com/KilianSen" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest opacity-60 hover:opacity-100"
                  >
                    <span>By KilianSen</span>
                    <Github size={10} />
                  </a>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex-1 bg-background overflow-hidden">
            <main className="h-full p-8 md:p-12 w-full max-w-screen-2xl mx-auto overflow-y-auto">
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
                    setNewVehicle={(v) => setNewVehicle({ ...v, color: v.color || '#3b82f6' })}
                    addVehicle={addVehicle}
                    deleteVehicle={deleteVehicle}
                    saveVehicleName={saveVehicleName}
                    newDriver={newDriver}
                    setNewDriver={(d) => setNewDriver({ ...d, color: d.color || '#10b981' })}
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
