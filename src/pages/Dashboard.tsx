import { 
  Fuel, 
  Car, 
  TrendingUp, 
  List,  
  Clock,
  Activity,
  Zap,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { Stats, VehicleStat, DriverStat } from '../types';
import { motion, type Variants } from 'motion/react';
import { EntityTag } from '@/components/EntityTag';
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export function DashboardView({ 
  stats, 
  chartData, 
  timeframe, 
  setTimeframe, 
  customStart, 
  setCustomStart, 
  customEnd, 
  setCustomEnd 
}: {
  stats: Stats;
  chartData: { date: string; amount: number }[];
  timeframe: string;
  setTimeframe: (t: 'all' | 'today' | 'month' | 'year' | 'custom') => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (e: string) => void;
}) {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10"
    >
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground font-medium">Performance and consumption insights.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="inline-flex items-center rounded-lg bg-muted/50 p-1">
            {(['all', 'today', 'month', 'year', 'custom'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  timeframe === t 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'all' ? 'All Time' : t === 'today' ? 'Today' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {timeframe === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg"
            >
              <input type="date" className="bg-transparent border-none text-xs w-28 focus:ring-0" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <ArrowRight size={12} className="text-muted-foreground" />
              <input type="date" className="bg-transparent border-none text-xs w-28 focus:ring-0" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </motion.div>
          )}
        </div>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Fuel" value={`${stats.total_fuel?.toFixed(1) || 0} L`} icon={<Fuel size={18} />} />
        <StatCard title="Est. Cost" value={`€ ${stats.total_cost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`} icon={<TrendingUp size={18} />} />
        <StatCard title="Active Fleet" value={stats.total_vehicles || 0} icon={<Car size={18} />} />
        <StatCard title="Transactions" value={stats.total_transactions || 0} icon={<List size={18} />} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard small title="Efficiency" tooltip="Fleet average consumption" value={`${stats.advanced?.fleet_efficiency || '0'} ${stats.unit_mode === 'hours' ? 'L/h' : 'L/100km'}`} icon={<Zap size={14} />} />
        <StatCard small title="Forecast" tooltip="Next 30 days projection" value={`~${stats.advanced?.forecast_next_month || '0'} L`} icon={<TrendingUp size={14} />} />
        <StatCard small title="Peak Hour" tooltip="Highest traffic hour" value={stats.advanced?.peak_hour || 'N/A'} icon={<Clock size={14} />} />
        <StatCard small title="Busiest Day" tooltip="Highest traffic day" value={stats.advanced?.peak_day || 'N/A'} icon={<Activity size={14} />} />
      </div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-3 border-none bg-muted/20 shadow-none">
          <CardHeader className="px-6 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Consumption Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeframe === 'all' && stats.by_month ? [...stats.by_month].reverse() : chartData}>
                <XAxis 
                  dataKey={timeframe === 'all' ? 'month' : 'date'} 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => timeframe === 'all' ? val : val.split('-').slice(1).reverse().join('.')} 
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--muted)/0.5)'}} 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} 
                  formatter={(value: number) => [`${value.toFixed(2)} L`, 'Amount']}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none bg-muted/20 shadow-none">
          <CardHeader className="px-6 pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="space-y-1">
              {stats.recent_activity?.slice(0, 6).map((t, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (i * 0.05) }}
                  key={i} 
                  className="flex items-center gap-4 px-6 py-3 hover:bg-muted/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{t.vehicle_name || t.vehicle_id}</p>
                    <p className="text-[10px] text-muted-foreground">{t.date}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary">{t.amount.toFixed(1)}L</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <StatsListCard title="Vehicles" items={stats.by_vehicle} mode={stats.unit_mode} type="vehicle" />
        <StatsListCard title="Operators" items={stats.by_driver} type="driver" />
      </motion.div>
    </motion.div>
  );
}

function StatCard({ title, value, icon, small, tooltip }: { title: string, value: string | number, icon: React.ReactNode, small?: boolean, tooltip?: string }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className={cn("border-none shadow-none bg-muted/30", small ? "p-4" : "p-6")}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className={cn("text-muted-foreground font-medium", small ? "text-[10px] uppercase tracking-wider" : "text-sm")}>{title}</p>
              {tooltip && <InfoTooltip content={tooltip} />}
            </div>
            <p className={cn("font-bold tracking-tight", small ? "text-lg" : "text-3xl")}>{value}</p>
          </div>
          <div className={cn("rounded-full flex items-center justify-center bg-background text-primary shadow-sm", small ? "h-8 w-8" : "h-12 w-12")}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function StatsListCard({ title, items, mode, type }: { title: string, items?: (VehicleStat | DriverStat)[], mode?: string, type: 'vehicle' | 'driver' }) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-1">{title}</h3>
      <div className="space-y-6">
        {items?.slice(0, 10).map((item, i) => {
          const v = item as VehicleStat;
          const d = item as DriverStat;
          const color = item.color || 'hsl(var(--primary))';
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + (i * 0.05) }}
              key={i} 
              className="group space-y-3"
            >
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <EntityTag 
                    type={type}
                    id={type === 'vehicle' ? v.id : d.pincode}
                    name={item.name}
                    color={item.color}
                    stat={item}
                    unitMode={mode as any}
                  />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block ml-8">
                    {type === 'vehicle' 
                      ? `${v.distance.toLocaleString()} ${mode === 'hours' ? 'h' : 'km'}`
                      : `${d.count} refuels`}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-sm font-bold block text-primary">
                    {item.total_fuel.toFixed(1)} L
                    <span className="text-[10px] text-muted-foreground ml-2">
                      € {item.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {type === 'vehicle' ? `${v.efficiency} ${mode === 'hours' ? 'L/h' : 'L/100km'}` : `AVG: ${d.avg_per_refuel}L`}
                  </span>
                </div>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.total_fuel / (items[0].total_fuel || 1)) * 100}%` }}
                  transition={{ duration: 1, delay: 0.8 + (i * 0.05), ease: "easeOut" }}
                  className="h-full transition-all"
                  style={{ 
                    backgroundColor: color
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
