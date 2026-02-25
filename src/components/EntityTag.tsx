import React from 'react';
import { 
  HoverCard, 
  HoverCardContent, 
  HoverCardTrigger 
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  User, 
  Calendar, 
  Hash, 
  Activity, 
  Fuel, 
  Euro,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VehicleStat, DriverStat } from '../types';

interface EntityTagProps {
  type: 'vehicle' | 'driver';
  id: string;
  name?: string;
  color?: string;
  stat?: VehicleStat | DriverStat;
  unitMode?: 'km' | 'hours';
}

export function EntityTag({ type, id, name, color, stat, unitMode }: EntityTagProps) {
  const Icon = type === 'vehicle' ? Car : User;
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="inline-flex items-center gap-2 cursor-pointer group">
          <div 
            className="h-6 w-6 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
            style={{ backgroundColor: color || 'hsl(var(--muted))', color: color ? 'white' : 'hsl(var(--muted-foreground))' }}
          >
            <Icon size={12} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              {name || (type === 'vehicle' ? 'Unnamed Asset' : 'Unnamed Operator')}
            </span>
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-tighter">
              {id}
            </span>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 border-none shadow-2xl rounded-[1.5rem] overflow-hidden bg-card animate-in zoom-in-95 duration-200">
        <div 
          className="h-24 w-full p-6 flex items-end relative"
          style={{ backgroundColor: color || 'hsl(var(--primary))' }}
        >
          <div className="absolute top-4 right-6 opacity-20 text-white">
            <Icon size={64} strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-0.5">
            <h4 className="text-white text-lg font-black tracking-tight leading-none">
              {name || id}
            </h4>
            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">
              {type === 'vehicle' ? 'Vehicle Asset' : 'Fleet Operator'} • {id}
            </p>
          </div>
        </div>
        
        <div className="p-6 space-y-6 bg-card">
          {stat ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <StatItem 
                  label="Fuel Volume" 
                  value={`${stat.total_fuel.toFixed(1)} L`} 
                  icon={<Fuel size={12} />} 
                />
                <StatItem 
                  label="Est. Cost" 
                  value={`€ ${stat.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                  icon={<Euro size={12} />} 
                />
                {type === 'vehicle' ? (
                  <>
                    <StatItem 
                      label="Utilization" 
                      value={`${(stat as VehicleStat).distance.toLocaleString()} ${unitMode || 'km'}`} 
                      icon={<Gauge size={12} />} 
                    />
                    <StatItem 
                      label="Efficiency" 
                      value={`${(stat as VehicleStat).efficiency} ${unitMode === 'hours' ? 'L/h' : 'L/100km'}`} 
                      icon={<Activity size={12} />} 
                    />
                  </>
                ) : (
                  <>
                    <StatItem 
                      label="Refuels" 
                      value={`${stat.count} operations`} 
                      icon={<Hash size={12} />} 
                    />
                    <StatItem 
                      label="Avg Refuel" 
                      value={`${(stat as DriverStat).avg_per_refuel} L`} 
                      icon={<Activity size={12} />} 
                    />
                  </>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={10} />
                    <span>First Seen</span>
                  </div>
                  <span className="text-foreground">{stat.first_seen || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Activity size={10} />
                    <span>Last Active</span>
                  </div>
                  <span className="text-foreground">{stat.last_seen || 'N/A'}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground italic font-medium">No detailed statistics available for current timeframe.</p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function StatItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 opacity-40">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-black tracking-tight">{value}</p>
    </div>
  );
}
