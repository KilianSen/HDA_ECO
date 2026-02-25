export interface Transaction {
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

export interface VehicleStat {
  name: string;
  id: string;
  total_fuel: number;
  count: number;
  efficiency: string;
  distance: number;
}

export interface DriverStat {
  name: string;
  pincode: string;
  total_fuel: number;
  count: number;
  avg_per_refuel: string;
}

export interface Stats {
  total_fuel: number;
  total_transactions: number;
  total_vehicles: number;
  unit_mode?: 'km' | 'hours';
  by_vehicle?: VehicleStat[];
  by_driver?: DriverStat[];
  recent_activity?: Transaction[];
  by_month?: { month: string; amount: number }[];
  advanced?: {
    fleet_efficiency: string;
    forecast_next_month: string;
    peak_hour: string;
    peak_day: string;
  };
  station?: {
    current_level: number;
    capacity: number;
    days_remaining: number;
    fill_percentage: number;
  };
}

export interface StationDelivery {
  id: number;
  date: string;
  amount: number;
  notes?: string;
}
