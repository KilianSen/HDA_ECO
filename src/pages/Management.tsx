import { Car, User, Plus, Trash2, TrendingUp, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Stats } from '../types';

import { motion, AnimatePresence } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

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
  uniqueVehicles: { id: string, name: string, color?: string }[];
  uniqueDrivers: { pincode: string, name: string, color?: string }[];
  newVehicle: { id: string, name: string, color?: string };
  setNewVehicle: (v: { id: string, name: string, color?: string }) => void;
  addVehicle: () => void;
  deleteVehicle: (id: string) => void;
  saveVehicleName: (id: string, name: string, color?: string) => void;
  newDriver: { pincode: string, name: string, color?: string };
  setNewDriver: (d: { pincode: string, name: string, color?: string }) => void;
  addDriver: () => void;
  deleteDriver: (pincode: string) => void;
  saveDriverName: (pincode: string, name: string, color?: string) => void;
  toggleUnitMode: () => void;
  stats: Stats;
}) {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12"
    >
       <motion.header variants={itemVariants} className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight">Management</h1>
        <p className="text-muted-foreground font-medium">Configure master data and system settings.</p>
      </motion.header>

      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-none bg-muted/30 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Mileage Unit Mode</h3>
              <p className="text-sm font-medium leading-relaxed max-w-lg">
                Set the primary unit for all distance calculations. This will affect efficiency metrics globally.
              </p>
            </div>
            <Button 
              variant="default" 
              onClick={toggleUnitMode}
              className="gap-4 h-12 px-8 min-w-[200px] justify-between rounded-xl font-bold shadow-lg shadow-primary/10"
            >
              <div className="flex items-center gap-3">
                {stats.unit_mode === 'hours' ? <Clock size={18} /> : <TrendingUp size={18} />}
                <span>{stats.unit_mode === 'hours' ? 'Hours' : 'Kilometers'}</span>
              </div>
              <div className="bg-primary-foreground/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">SWITCH</div>
            </Button>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div variants={itemVariants} className="space-y-8">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <Car size={24} className="text-primary" />
              <h3 className="text-xl font-bold tracking-tight">Vehicles</h3>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-3">
              <input type="text" placeholder="ID" className="w-20 bg-muted border-none rounded-xl px-4 py-2 text-xs font-black placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/10 outline-none uppercase" value={newVehicle.id} onChange={(e) => setNewVehicle({...newVehicle, id: e.target.value})} />
              <input type="text" placeholder="Alias Name" className="flex-1 bg-muted border-none rounded-xl px-4 py-2 text-xs font-bold placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/10 outline-none" value={newVehicle.name} onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})} />
              <input type="color" className="h-10 w-10 p-1 bg-muted rounded-xl border-none cursor-pointer" value={newVehicle.color || '#3b82f6'} onChange={(e) => setNewVehicle({...newVehicle, color: e.target.value})} />
              <Button size="icon" className="h-10 w-10 p-0 rounded-xl bg-primary shadow-lg shadow-primary/10" onClick={addVehicle}>
                <Plus size={18} strokeWidth={2.5} />
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border divide-y divide-muted/50 overflow-hidden">
            <AnimatePresence initial={false}>
              {uniqueVehicles.map((v) => (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  key={v.id} 
                  className="flex items-center gap-4 p-5 hover:bg-muted/5 group transition-colors"
                >
                  <div className="font-mono text-[10px] font-black text-muted-foreground bg-muted h-7 px-2 rounded-lg flex items-center justify-center border border-muted-foreground/10">{v.id}</div>
                  <input type="text" defaultValue={v.name} placeholder="— Unnamed Asset" className="flex-1 bg-transparent border-none p-0 text-sm font-bold focus:ring-0 text-foreground placeholder:text-muted-foreground/30" onBlur={(e) => saveVehicleName(v.id, e.target.value, v.color)} />
                  <input type="color" defaultValue={v.color || '#3b82f6'} className="h-6 w-6 p-0.5 bg-transparent rounded cursor-pointer border-none" onChange={(e) => saveVehicleName(v.id, v.name, e.target.value)} />
                  <button onClick={() => deleteVehicle(v.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-2">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-8">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <User size={24} className="text-primary" />
              <h3 className="text-xl font-bold tracking-tight">Operators</h3>
            </div>
          </div>
          
           <div className="space-y-3">
            <div className="flex gap-3">
              <input type="text" placeholder="PIN" className="w-20 bg-muted border-none rounded-xl px-4 py-2 text-xs font-black placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/10 outline-none uppercase" value={newDriver.pincode} onChange={(e) => setNewDriver({...newDriver, pincode: e.target.value})} />
              <input type="text" placeholder="Full Name" className="flex-1 bg-muted border-none rounded-xl px-4 py-2 text-xs font-bold placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/10 outline-none" value={newDriver.name} onChange={(e) => setNewDriver({...newDriver, name: e.target.value})} />
              <input type="color" className="h-10 w-10 p-1 bg-muted rounded-xl border-none cursor-pointer" value={newDriver.color || '#10b981'} onChange={(e) => setNewDriver({...newDriver, color: e.target.value})} />
              <Button size="icon" className="h-10 w-10 p-0 rounded-xl bg-primary shadow-lg shadow-primary/10" onClick={addDriver}>
                <Plus size={18} strokeWidth={2.5} />
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border divide-y divide-muted/50 overflow-hidden">
            <AnimatePresence initial={false}>
              {uniqueDrivers.map((d) => (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  key={d.pincode} 
                  className="flex items-center gap-4 p-5 hover:bg-muted/5 group transition-colors"
                >
                  <div className="font-mono text-[10px] font-black text-muted-foreground bg-muted h-7 px-2 rounded-lg flex items-center justify-center border border-muted-foreground/10">{d.pincode}</div>
                  <input type="text" defaultValue={d.name} placeholder="— Unnamed Operator" className="flex-1 bg-transparent border-none p-0 text-sm font-bold focus:ring-0 text-foreground placeholder:text-muted-foreground/30" onBlur={(e) => saveDriverName(d.pincode, e.target.value, d.color)} />
                  <input type="color" defaultValue={d.color || '#10b981'} className="h-6 w-6 p-0.5 bg-transparent rounded cursor-pointer border-none" onChange={(e) => saveDriverName(d.pincode, d.name, e.target.value)} />
                  <button onClick={() => deleteDriver(d.pincode)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-2">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
