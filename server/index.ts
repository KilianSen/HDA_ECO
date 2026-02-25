import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'database.db'));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence TEXT,
    pincode TEXT,
    vehicle_id TEXT,
    mileage INTEGER,
    amount REAL,
    product_id TEXT,
    date TEXT,
    time TEXT,
    raw_line TEXT
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS drivers (
    pincode TEXT PRIMARY KEY,
    name TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS processed_files (
    hash TEXT PRIMARY KEY,
    filename TEXT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('unit_mode', 'km');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tank_capacity', '10000');

  CREATE TABLE IF NOT EXISTS station_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    amount REAL,
    price_per_liter REAL,
    notes TEXT
  );
`);

// Simple Migration: Ensure columns exist for existing databases
const migrate = () => {
  const tables = {
    vehicles: ['color'],
    drivers: ['color'],
    station_deliveries: ['price_per_liter']
  };

  for (const [table, columns] of Object.entries(tables)) {
    const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    const existingColumns = info.map(c => c.name);
    
    for (const column of columns) {
      if (!existingColumns.includes(column)) {
        console.log(`Migrating: Adding ${column} to ${table}`);
        const type = column === 'price_per_liter' ? 'REAL' : 'TEXT';
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
      }
    }
  }
};

migrate();

const upload = multer({ dest: 'uploads/' });

// API Endpoints
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
  const settings = rows.reduce((acc: { [key: string]: string }, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  res.sendStatus(200);
});

// Station Endpoints
app.get('/api/station/deliveries', (req, res) => {
  const rows = db.prepare('SELECT * FROM station_deliveries ORDER BY date DESC').all();
  res.json(rows);
});

app.post('/api/station/deliveries', (req, res) => {
  const { id, date, amount, price_per_liter, notes } = req.body;
  const roundedAmount = Math.round((amount || 0) * 100) / 100;
  const roundedPrice = Math.round((price_per_liter || 0) * 1000) / 1000;
  if (id) {
    db.prepare('UPDATE station_deliveries SET date = ?, amount = ?, price_per_liter = ?, notes = ? WHERE id = ?').run(date, roundedAmount, roundedPrice, notes, id);
  } else {
    db.prepare('INSERT INTO station_deliveries (date, amount, price_per_liter, notes) VALUES (?, ?, ?, ?)').run(date, roundedAmount, roundedPrice, notes);
  }
  res.sendStatus(200);
});

app.delete('/api/station/deliveries/:id', (req, res) => {
  db.prepare('DELETE FROM station_deliveries WHERE id = ?').run(req.params.id);
  res.sendStatus(200);
});

interface QueryParams {
  start?: string;
  end?: string;
  limit?: number;
}

app.get('/api/stats', (req, res) => {
  const { start, end } = req.query;
  const queryParams: QueryParams = {};
  let dateFilter = '';
  if (start && end) {
    dateFilter = 'WHERE date BETWEEN :start AND :end';
    queryParams.start = start as string;
    queryParams.end = end as string;
  }

  // 1. Get Base Data
  const allDeliveries = db.prepare('SELECT date, amount, price_per_liter FROM station_deliveries ORDER BY date ASC, id ASC').all() as { date: string, amount: number, price_per_liter: number | null }[];
  const allTransactions = db.prepare('SELECT id, vehicle_id, pincode, amount, date, time FROM transactions ORDER BY date ASC, time ASC, id ASC').all() as { id: number, vehicle_id: string, pincode: string, amount: number, date: string, time: string }[];

  // 2. Chronological Cost Calculation (The "Moving Tank Price")
  let currentTankVolume = 0;
  let currentTankValue = 0;
  let currentAvgPrice = 0;

  const transactionCosts = new Map<number, { price: number, cost: number }>();
  const fillHistory: { date: string, level: number }[] = [];

  // Combine events into a chronological timeline
  const events: { type: 'delivery' | 'transaction', date: string, data: any }[] = [
    ...allDeliveries.map(d => ({ type: 'delivery' as const, date: d.date, data: d })),
    ...allTransactions.map(t => ({ type: 'transaction' as const, date: t.date, data: t }))
  ].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.type !== b.type) return a.type === 'delivery' ? -1 : 1; // Deliveries before transactions on same day
    return 0;
  });

  events.forEach(event => {
    if (event.type === 'delivery') {
      const d = event.data;
      const amount = d.amount || 0;
      const price = d.price_per_liter || currentAvgPrice; // Fallback to current avg if not provided
      
      currentTankValue += (amount * price);
      currentTankVolume += amount;
      if (currentTankVolume > 0) {
        currentAvgPrice = currentTankValue / currentTankVolume;
      }
    } else {
      const t = event.data;
      const cost = t.amount * currentAvgPrice;
      transactionCosts.set(t.id, { price: currentAvgPrice, cost });
      
      currentTankVolume -= t.amount;
      currentTankValue -= cost;
      if (currentTankVolume <= 0) {
        currentTankVolume = 0;
        currentTankValue = 0;
      }
    }
    
    // Update Fill History
    const lastHistory = fillHistory[fillHistory.length - 1];
    if (lastHistory && lastHistory.date === event.date) {
      lastHistory.level = Math.round(currentTankVolume * 100) / 100;
    } else {
      fillHistory.push({ date: event.date, level: Math.round(currentTankVolume * 100) / 100 });
    }
  });

  // 3. Stats for requested timeframe
  const stats = db.prepare(`
    SELECT SUM(amount) as total_fuel, COUNT(*) as total_transactions,
    (SELECT COUNT(DISTINCT vehicle_id) FROM transactions ${dateFilter}) as total_vehicles
    FROM transactions ${dateFilter}
  `).get(queryParams) as { total_fuel: number | null; total_transactions: number; total_vehicles: number };

  // Financial timeframe calculation
  const filteredIds = (db.prepare(`SELECT id FROM transactions ${dateFilter}`).all(queryParams) as { id: number }[]).map(r => r.id);
  const totalCost = filteredIds.reduce((sum, id) => sum + (transactionCosts.get(id)?.cost || 0), 0);

  const unitMode = (db.prepare("SELECT value FROM settings WHERE key = 'unit_mode'").get() as { value: string } | undefined)?.value || 'km';

    const byVehicle = (db.prepare(`
      SELECT 
        v.name, v.color, t.vehicle_id as id, SUM(t.amount) as total_fuel, COUNT(*) as count,
        MAX(t.mileage) - MIN(t.mileage) as distance, MAX(t.mileage) as current_mileage,
        MIN(t.date) as first_seen, MAX(t.date) as last_seen,
        GROUP_CONCAT(t.id) as trans_ids
      FROM transactions t LEFT JOIN vehicles v ON t.vehicle_id = v.id ${dateFilter} GROUP BY t.vehicle_id ORDER BY total_fuel DESC
    `).all(queryParams) as any[]).map((v) => {
      const ids = v.trans_ids.split(',').map(Number);
      const cost = ids.reduce((sum: number, id: number) => sum + (transactionCosts.get(id)?.cost || 0), 0);
      let efficiency = 0;
      if (v.distance > 0) {
        efficiency = unitMode === 'km' ? (v.total_fuel / v.distance) * 100 : v.total_fuel / v.distance;
      }
      return { ...v, total_fuel: Math.round(v.total_fuel * 100) / 100, total_cost: Math.round(cost * 100) / 100, efficiency: efficiency.toFixed(2) };
    });
  
    const byDriver = (db.prepare(`
      SELECT d.name, d.color, t.pincode, SUM(t.amount) as total_fuel, COUNT(*) as count,
      MIN(t.date) as first_seen, MAX(t.date) as last_seen,
      GROUP_CONCAT(t.id) as trans_ids
      FROM transactions t LEFT JOIN drivers d ON t.pincode = d.pincode ${dateFilter} GROUP BY t.pincode ORDER BY total_fuel DESC
    `).all(queryParams) as any[]).map((d) => {
      const ids = d.trans_ids.split(',').map(Number);
      const cost = ids.reduce((sum: number, id: number) => sum + (transactionCosts.get(id)?.cost || 0), 0);
      return { ...d, total_fuel: Math.round(d.total_fuel * 100) / 100, total_cost: Math.round(cost * 100) / 100, avg_per_refuel: (d.total_fuel / d.count).toFixed(2) };
    });

  const recentActivity = (db.prepare(`
    SELECT t.*, v.name as vehicle_name, v.color as color, d.name as driver_name
    FROM transactions t LEFT JOIN vehicles v ON t.vehicle_id = v.id LEFT JOIN drivers d ON t.pincode = d.pincode ${dateFilter}
    ORDER BY t.date DESC, t.time DESC LIMIT 5
  `).all(queryParams) as any[]).map(t => ({
    ...t,
    cost: Math.round((transactionCosts.get(t.id)?.cost || 0) * 100) / 100
  }));

  const byMonth = (db.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as amount, GROUP_CONCAT(id) as trans_ids
    FROM transactions ${dateFilter} GROUP BY month ORDER BY month DESC
  `).all(queryParams) as any[]).map(m => {
    const ids = m.trans_ids.split(',').map(Number);
    const cost = ids.reduce((sum: number, id: number) => sum + (transactionCosts.get(id)?.cost || 0), 0);
    return { ...m, amount: Math.round(m.amount * 100) / 100, cost: Math.round(cost * 100) / 100 };
  });

  const totalSpend = allDeliveries.reduce((acc, d) => acc + (d.amount * (d.price_per_liter || 0)), 0);
  const tankCapacity = parseFloat((db.prepare("SELECT value FROM settings WHERE key = 'tank_capacity'").get() as { value: string } | undefined)?.value || '10000');
  
  res.json({ 
    total_fuel: Math.round((stats.total_fuel || 0) * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
    total_transactions: stats.total_transactions || 0,
    total_vehicles: stats.total_vehicles || 0,
    unit_mode: unitMode, 
    by_vehicle: byVehicle, 
    by_driver: byDriver, 
    recent_activity: recentActivity, 
    by_month: byMonth,
    station: {
      current_level: Math.round(currentTankVolume * 100) / 100,
      capacity: tankCapacity,
      fill_percentage: Math.round((currentTankVolume / tankCapacity) * 1000) / 10,
      fill_history: fillHistory,
      avg_price: Math.round(currentAvgPrice * 1000) / 1000,
      total_spend: Math.round(totalSpend * 100) / 100,
      inventory_value: Math.round(currentTankValue * 100) / 100
    },
    advanced: {
      fleet_efficiency: (byVehicle.reduce((acc, v) => acc + parseFloat(v.efficiency), 0) / (byVehicle.length || 1)).toFixed(2),
      forecast_next_month: "0"
    }
  });
});

app.get('/api/vehicles', (req, res) => {
  res.json(db.prepare('SELECT * FROM vehicles').all());
});

app.post('/api/vehicles', (req, res) => {
  const { id, name, description, color } = req.body;
  db.prepare('INSERT OR REPLACE INTO vehicles (id, name, description, color) VALUES (?, ?, ?, ?)').run(id, name, description, color);
  res.sendStatus(200);
});

app.delete('/api/vehicles/:id', (req, res) => {
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  res.sendStatus(200);
});

app.get('/api/drivers', (req, res) => {
  res.json(db.prepare('SELECT * FROM drivers').all());
});

app.post('/api/drivers', (req, res) => {
  const { pincode, name, color } = req.body;
  db.prepare('INSERT OR REPLACE INTO drivers (pincode, name, color) VALUES (?, ?, ?)').run(pincode, name, color);
  res.sendStatus(200);
});

app.delete('/api/drivers/:pincode', (req, res) => {
  db.prepare('DELETE FROM drivers WHERE pincode = ?').run(req.params.pincode);
  res.sendStatus(200);
});

app.get('/api/transactions', (req, res) => {
  const { start, end, limit } = req.query;
  const queryParams: QueryParams = {};
  let dateFilter = '';
  if (start && end) {
    dateFilter = 'WHERE date BETWEEN :start AND :end';
    queryParams.start = start as string;
    queryParams.end = end as string;
  }

  let query = `
    SELECT t.*, v.name as vehicle_name, v.color as color, d.name as driver_name
    FROM transactions t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN drivers d ON t.pincode = d.pincode
    ${dateFilter}
    ORDER BY t.date DESC, t.time DESC
  `;

  if (limit) {
    query += ` LIMIT :limit`;
    queryParams.limit = parseInt(limit as string);
  }

  const rows = db.prepare(query).all(queryParams) as any[];
  
  const allDeliveries = db.prepare('SELECT date, amount, price_per_liter FROM station_deliveries ORDER BY date ASC, id ASC').all() as { date: string, amount: number, price_per_liter: number | null }[];
  const allTransactions = db.prepare('SELECT id, amount, date FROM transactions ORDER BY date ASC, id ASC').all() as { id: number, amount: number, date: string }[];
  
  let vol = 0; let val = 0; let avg = 0;
  const priceMap = new Map<number, number>();
  const events = [
    ...allDeliveries.map(d => ({ type: 'd', date: d.date, data: d })),
    ...allTransactions.map(t => ({ type: 't', date: t.date, data: t }))
  ].sort((a,b) => a.date.localeCompare(b.date) || (a.type === 'd' ? -1 : 1));

  events.forEach(e => {
    if (e.type === 'd') {
      const d = e.data as { amount: number, price_per_liter: number | null };
      val += (d.amount * (d.price_per_liter || avg));
      vol += d.amount;
      if (vol > 0) avg = val / vol;
    } else {
      const t = e.data as { id: number, amount: number };
      priceMap.set(t.id, avg);
      vol -= t.amount;
      val -= (t.amount * avg);
    }
  });

  res.json(rows.map(r => ({ ...r, cost: Math.round((r.amount * (priceMap.get(r.id) || 0)) * 100) / 100 })));
});

app.post('/api/transactions', (req, res) => {
  const { id, sequence, pincode, vehicle_id, mileage, amount, product_id, date, time } = req.body;
  const roundedAmount = Math.round((amount || 0) * 100) / 100;
  if (id) {
    db.prepare(`UPDATE transactions SET sequence = ?, pincode = ?, vehicle_id = ?, mileage = ?, amount = ?, product_id = ?, date = ?, time = ? WHERE id = ?`).run(sequence, pincode, vehicle_id, mileage, roundedAmount, product_id, date, time, id);
  } else {
    db.prepare(`INSERT INTO transactions (sequence, pincode, vehicle_id, mileage, amount, product_id, date, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(sequence, pincode, vehicle_id, mileage, roundedAmount, product_id, date, time);
  }
  res.sendStatus(200);
});

app.delete('/api/transactions/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.sendStatus(200);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  processFile(req.file.path);
  res.send({ message: 'File processed successfully' });
});

function processFile(filePath: string) {
  const fileContent = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(fileContent).digest('hex');
  const fileName = path.basename(filePath);
  const alreadyProcessed = db.prepare('SELECT 1 FROM processed_files WHERE hash = ?').get(hash);
  if (alreadyProcessed) {
    if (filePath.includes('uploads/')) fs.unlinkSync(filePath);
    return;
  }
  const content = fileContent.toString('utf-8');
  const lines = content.split(/\r?\n/);
  let isDefinitionFile = false;
  for (const line of lines) {
    if (!line.trim() || line.startsWith('Version')) continue;
    if (line.startsWith('1,') || line.startsWith('2,')) { isDefinitionFile = true; break; }
    if (line.startsWith('01,')) break;
  }
  try {
    if (isDefinitionFile) processDefinitions(lines);
    else processTransactions(lines);
    db.prepare('INSERT INTO processed_files (hash, filename) VALUES (?, ?)').run(hash, fileName);
  } catch (err) { console.error('Error processing file:', err); }
  finally { if (filePath.includes('uploads/')) fs.unlinkSync(filePath); }
}

function processTransactions(lines: string[]) {
  const insert = db.prepare(`INSERT OR IGNORE INTO transactions (sequence, pincode, vehicle_id, mileage, amount, product_id, date, time, raw_line) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const transaction = db.transaction((data: string[]) => {
    for (const line of data) {
      if (!line.trim() || !line.startsWith('01,')) continue;
      const parts = line.split(',');
      if (parts.length < 11) continue;
      const sequence = parts[2]?.trim();
      const pincode = parts[3]?.trim();
      const vehicle_id = parts[4]?.trim();
      const mileage = parseInt(parts[6]?.trim() || '0');
      const amount = parseFloat(parts[7]?.trim() || '0');
      const product_id = parts[8]?.trim();
      const dateRaw = parts[9]?.trim();
      const time = parts[10]?.trim();
      let date = dateRaw;
      if (dateRaw && dateRaw.includes('.')) {
        const [d, m, y] = dateRaw.split('.');
        date = `20${y}-${m}-${d}`;
      }
      insert.run(sequence, pincode, vehicle_id, mileage, amount, product_id, date, time, line.trim());
    }
  });
  transaction(lines);
}

function processDefinitions(lines: string[]) {
  const insertVehicle = db.prepare(`INSERT OR IGNORE INTO vehicles (id, description) VALUES (?, ?)`);
  const insertDriver = db.prepare(`INSERT OR IGNORE INTO drivers (pincode) VALUES (?)`);
  const transaction = db.transaction((data: string[]) => {
    for (const line of data) {
      if (!line.trim() || (!line.startsWith('1,') && !line.startsWith('2,'))) continue;
      const parts = line.split(',');
      if (parts.length < 3) continue;
      const type = parts[0].trim();
      const id = parts[1].trim();
      const info = parts[2].trim();
      if (type === '1') insertDriver.run(info);
      else if (type === '2') insertVehicle.run(id, info);
    }
  });
  transaction(lines);
}

db.prepare("DELETE FROM transactions WHERE length(date) < 10").run();
app.use(express.static(path.join(__dirname, '../dist')));
app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
  const filesToImport = ['DATA0001.TXT', 'DATAOUT.TXT'];
  filesToImport.forEach(file => {
    const filePath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) processFile(filePath);
  });
});
