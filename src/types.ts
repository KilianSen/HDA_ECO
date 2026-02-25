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
  color?: string;
  cost?: number;
}

export interface VehicleStat {
  name: string;
  id: string;
  total_fuel: number;
  total_cost: number;
  count: number;
  efficiency: string;
  distance: number;
  current_mileage?: number;
  first_seen?: string;
  last_seen?: string;
  color?: string;
}

export interface DriverStat {
  name: string;
  pincode: string;
  total_fuel: number;
  total_cost: number;
  count: number;
  avg_per_refuel: string;
  first_seen?: string;
  last_seen?: string;
  color?: string;
}

export interface Stats {
  total_fuel: number;
  total_cost: number;
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
    fill_history?: { date: string; level: number }[];
    avg_price: number;
    total_spend: number;
    inventory_value: number;
  };
}

export interface StationDelivery {
  id: number;
  date: string;
  amount: number;
  price_per_liter?: number;
  notes?: string;
}
