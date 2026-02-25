import { 
    Fuel, 
    Car, 
    TrendingUp, 
    List,  Clock,
  Activity,
  Zap,
  ArrowRight
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
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { Stats, VehicleStat, DriverStat, Transaction } from '../types';

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
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm font-medium"> operational insights and fuel analytics</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {(['all', 'today', 'month', 'year', 'custom'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  timeframe === t 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'all' ? 'All' : t === 'today' ? 'Today' : t === 'month' ? 'Month' : t === 'year' ? 'Year' : 'Custom'}
              </button>
            ))}
          </div>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              <input type="date" className="bg-transparent border-none rounded px-2 py-1 text-[10px] focus:ring-0 w-28" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <ArrowRight size={12} className="text-slate-300" />
              <input type="date" className="bg-transparent border-none rounded px-2 py-1 text-[10px] focus:ring-0 w-28" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Fuel Consumed" value={`${stats.total_fuel?.toFixed(1) || 0} L`} icon={<Fuel size={18} />} color="blue" />
        <StatCard title="Active Vehicle Fleet" value={stats.total_vehicles || 0} icon={<Car size={18} />} color="green" />
        <StatCard title="Transaction Records" value={stats.total_transactions || 0} icon={<List size={18} />} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Global Efficiency" 
          tooltip="Average fuel consumption across the entire fleet."
          value={`${stats.advanced?.fleet_efficiency || '0'} ${stats.unit_mode === 'hours' ? 'L/h' : 'L/100km'}`} 
          icon={<Zap size={18} />} 
          color="yellow" 
        />
        <StatCard 
          title="30-Day Forecast" 
          tooltip="Estimated future consumption based on historical daily averages."
          value={`~${stats.advanced?.forecast_next_month || '0'} L`} 
          icon={<TrendingUp size={18} />} 
          color="orange" 
        />
        <StatCard 
          title="Peak Hour" 
          tooltip="The hour of the day with the highest frequency of transactions."
          value={stats.advanced?.peak_hour || 'N/A'} 
          icon={<Clock size={18} />} 
          color="red" 
        />
        <StatCard 
          title="Busiest Day" 
          tooltip="The day of the week with the highest frequency of transactions."
          value={stats.advanced?.peak_day || 'N/A'} 
          icon={<Activity size={18} />} 
          color="indigo" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="py-4 px-6 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {timeframe === 'all' ? 'Historical Monthly Consumption' : 'Daily Trend Analysis'}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold bg-white">{timeframe.toUpperCase()}</Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pt-6 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeframe === 'all' && stats.by_month ? [...stats.by_month].reverse() : chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey={timeframe === 'all' ? 'month' : 'date'} 
                  fontSize={10} 
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => timeframe === 'all' ? val : val.split('-').slice(1).reverse().join('.')} 
                  stroke="#94a3b8"
                  dy={10}
                />
                <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} stroke="#94a3b8" />
                <Tooltip 
                  cursor={false} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }} 
                  formatter={(value: number) => [`${value.toFixed(2)} L`, 'Amount']}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="py-4 px-6 border-b border-slate-100 bg-white">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {stats.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((t: Transaction, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-4 hover:bg-slate-50/80 transition-colors">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                      <Car size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{t.vehicle_name || t.vehicle_id}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{t.date}</p>
                    </div>
                    <Badge variant="secondary" className="font-mono font-bold text-blue-600 text-[10px]">{t.amount.toFixed(1)}L</Badge>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center">
                  <p className="text-xs text-slate-400 italic">No activity recorded</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsListCard title="Top Vehicles by Usage" items={stats.by_vehicle} mode={stats.unit_mode} type="vehicle" />
        <StatsListCard title="Top Operators by Efficiency" items={stats.by_driver} type="driver" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, tooltip }: { title: string, value: string | number, icon: React.ReactNode, color: 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'red' | 'indigo', tooltip?: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
    indigo: 'text-indigo-600 bg-indigo-50'
  };
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-xs font-medium text-slate-500">{title}</p>
            {tooltip && <InfoTooltip content={tooltip} />}
          </div>
          <div className="text-xl font-bold text-slate-900">{value}</div>
        </div>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsListCard({ title, items, mode, type }: { title: string, items?: (VehicleStat | DriverStat)[], mode?: string, type: 'vehicle' | 'driver' }) {
  return (
    <Card className="shadow-xl shadow-slate-200/50 border-none">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {items?.map((item, i) => {
          const v = item as VehicleStat;
          const d = item as DriverStat;
          return (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700">{item.name || (type === 'vehicle' ? v.id : d.pincode)}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                    {type === 'vehicle' 
                      ? `${v.distance.toLocaleString()} ${mode === 'hours' ? 'hours' : 'km'} utilized`
                      : `${d.count} refuel operations`}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-black block ${type === 'vehicle' ? 'text-blue-600' : 'text-green-600'}`}>{item.total_fuel.toFixed(1)} L</span>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                    {type === 'vehicle' ? `${v.efficiency} ${mode === 'hours' ? 'L/h' : 'L/100km'}` : `AVG: ${d.avg_per_refuel} L`}
                  </span>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${type === 'vehicle' ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-green-400 to-green-600'}`}
                  style={{ width: `${(item.total_fuel / (items[0].total_fuel || 1)) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
