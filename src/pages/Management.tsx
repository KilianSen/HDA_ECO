import { Car, User, Plus, Trash2, Settings, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Stats } from '../types';

export function ManagementView({ 
  uniqueVehicles, 
  uniqueDrivers, 
  newVehicle, 
  setNewVehicle, 
  addVehicle, 
  deleteVehicle, 
  saveVehicleName, 
  newDriver, 
  setNewDriver, 
  addDriver, 
  deleteDriver, 
  saveDriverName,
  toggleUnitMode,
  stats
}: {
  uniqueVehicles: { id: string, name: string }[];
  uniqueDrivers: { pincode: string, name: string }[];
  newVehicle: { id: string, name: string };
  setNewVehicle: (v: { id: string, name: string }) => void;
  addVehicle: () => void;
  deleteVehicle: (id: string) => void;
  saveVehicleName: (id: string, name: string) => void;
  newDriver: { pincode: string, name: string };
  setNewDriver: (d: { pincode: string, name: string }) => void;
  addDriver: () => void;
  deleteDriver: (pincode: string) => void;
  saveDriverName: (pincode: string, name: string) => void;
  toggleUnitMode: () => void;
  stats: Stats;
}) {
  return (
    <div className="space-y-6">
       <header>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Management</h2>
        <p className="text-muted-foreground text-sm font-medium">Configure master data and system settings</p>
      </header>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Settings size={16} className="text-purple-500" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Mileage Unit Mode</p>
              <CardDescription>
                Choose between Hours (h) or Kilometers (km) for all distance calculations.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={toggleUnitMode}
              className="gap-3 min-w-[140px] justify-between border-slate-200"
            >
              <div className="flex items-center gap-2">
                {stats.unit_mode === 'hours' ? <Clock size={16} className="text-blue-500" /> : <TrendingUp size={16} className="text-blue-500" />}
                <span className="font-semibold">{stats.unit_mode === 'hours' ? 'Hours' : 'Kilometers'}</span>
              </div>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-slate-100 text-slate-500 font-bold">SWITCH</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Car size={16} className="text-blue-500" />
              Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-3 border-b border-slate-100 bg-slate-50/30">
              <div className="flex gap-2">
                <input type="text" placeholder="ID" className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500" value={newVehicle.id} onChange={(e) => setNewVehicle({...newVehicle, id: e.target.value})} />
                <input type="text" placeholder="New Vehicle Name" className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500" value={newVehicle.name} onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})} />
                <Button size="sm" className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-500" onClick={addVehicle}>
                  <Plus size={16} />
                </Button>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
              {uniqueVehicles.map((v: { id: string, name: string }) => (
                <div key={v.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 group">
                  <div className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{v.id}</div>
                  <input type="text" defaultValue={v.name} placeholder="Unnamed" className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 text-slate-700 font-medium placeholder:text-slate-300" onBlur={(e) => saveVehicleName(v.id, e.target.value)} />
                  <button onClick={() => deleteVehicle(v.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User size={16} className="text-green-500" />
              Drivers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="p-3 border-b border-slate-100 bg-slate-50/30">
              <div className="flex gap-2">
                <input type="text" placeholder="PIN" className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-green-500" value={newDriver.pincode} onChange={(e) => setNewDriver({...newDriver, pincode: e.target.value})} />
                <input type="text" placeholder="New Driver Name" className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-green-500" value={newDriver.name} onChange={(e) => setNewDriver({...newDriver, name: e.target.value})} />
                <Button size="sm" className="h-8 w-8 p-0 bg-green-600 hover:bg-green-500" onClick={addDriver}>
                  <Plus size={16} />
                </Button>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
              {uniqueDrivers.map((d: { pincode: string, name: string }) => (
                <div key={d.pincode} className="flex items-center gap-3 p-3 hover:bg-slate-50 group">
                  <div className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{d.pincode}</div>
                  <input type="text" defaultValue={d.name} placeholder="Unnamed" className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 text-slate-700 font-medium placeholder:text-slate-300" onBlur={(e) => saveDriverName(d.pincode, e.target.value)} />
                  <button onClick={() => deleteDriver(d.pincode)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
