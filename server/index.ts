import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
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

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/hdaeco'
});

// Initialize database
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        sequence TEXT,
        pincode TEXT,
        vehicle_id TEXT,
        mileage INTEGER,
        amount REAL,
        product_id TEXT,
        date TEXT,
        time TEXT,
        raw_line TEXT UNIQUE
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
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      INSERT INTO settings (key, value) VALUES ('unit_mode', 'km') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('tank_capacity', '10000') ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS station_deliveries (
        id SERIAL PRIMARY KEY,
        date TEXT,
        amount REAL,
        price_per_liter REAL,
        notes TEXT
      );
    `);

    // Migration: Ensure columns exist
    const tables = {
      vehicles: ['color'],
      drivers: ['color'],
      station_deliveries: ['price_per_liter']
    };

    for (const [table, columns] of Object.entries(tables)) {
      for (const column of columns) {
        const checkColumn = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [table, column]);

        if (checkColumn.rowCount === 0) {
          console.log(`Migrating: Adding ${column} to ${table}`);
          const type = column === 'price_per_liter' ? 'REAL' : 'TEXT';
          await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

const upload = multer({ dest: 'uploads/' });

// API Endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings');
    const settings = result.rows.reduce((acc: { [key: string]: string }, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Station Endpoints
app.get('/api/station/deliveries', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM station_deliveries ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

app.post('/api/station/deliveries', async (req, res) => {
  try {
    const { id, date, amount, price_per_liter, notes } = req.body;
    const roundedAmount = Math.round((amount || 0) * 100) / 100;
    const roundedPrice = Math.round((price_per_liter || 0) * 1000) / 1000;
    if (id) {
      await pool.query('UPDATE station_deliveries SET date = $1, amount = $2, price_per_liter = $3, notes = $4 WHERE id = $5', [date, roundedAmount, roundedPrice, notes, id]);
    } else {
      await pool.query('INSERT INTO station_deliveries (date, amount, price_per_liter, notes) VALUES ($1, $2, $3, $4)', [date, roundedAmount, roundedPrice, notes]);
    }
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save delivery' });
  }
});

app.delete('/api/station/deliveries/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM station_deliveries WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete delivery' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const { start, end } = req.query;
    let dateFilter = '';
    const params: any[] = [];
    if (start && end) {
      dateFilter = 'WHERE date BETWEEN $1 AND $2';
      params.push(start, end);
    }

    // 1. Get Base Data
    const allDeliveriesRes = await pool.query('SELECT date, amount, price_per_liter FROM station_deliveries ORDER BY date ASC, id ASC');
    const allTransactionsRes = await pool.query('SELECT id, vehicle_id, pincode, amount, date, time FROM transactions ORDER BY date ASC, time ASC, id ASC');

    const allDeliveries = allDeliveriesRes.rows;
    const allTransactions = allTransactionsRes.rows;

    // 2. Chronological Cost Calculation
    let currentTankVolume = 0;
    let currentTankValue = 0;
    let currentAvgPrice = 0;

    const transactionCosts = new Map<number, { price: number, cost: number }>();
    const fillHistory: { date: string, level: number }[] = [];

    const events: { type: 'delivery' | 'transaction', date: string, data: any }[] = [
      ...allDeliveries.map(d => ({ type: 'delivery' as const, date: d.date, data: d })),
      ...allTransactions.map(t => ({ type: 'transaction' as const, date: t.date, data: t }))
    ].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.type !== b.type) return a.type === 'delivery' ? -1 : 1;
      return 0;
    });

    events.forEach(event => {
      if (event.type === 'delivery') {
        const d = event.data;
        const amount = d.amount || 0;
        const price = d.price_per_liter || currentAvgPrice;
        
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
      
      const lastHistory = fillHistory[fillHistory.length - 1];
      if (lastHistory && lastHistory.date === event.date) {
        lastHistory.level = Math.round(currentTankVolume * 100) / 100;
      } else {
        fillHistory.push({ date: event.date, level: Math.round(currentTankVolume * 100) / 100 });
      }
    });

    // 3. Stats for requested timeframe
    const statsRes = await pool.query(`
      SELECT SUM(amount) as total_fuel, COUNT(*) as total_transactions,
      (SELECT COUNT(DISTINCT vehicle_id) FROM transactions ${dateFilter}) as total_vehicles
      FROM transactions ${dateFilter}
    `, params);
    const stats = statsRes.rows[0];

    const filteredIdsRes = await pool.query(`SELECT id FROM transactions ${dateFilter}`, params);
    const filteredIds = filteredIdsRes.rows.map(r => r.id);
    const totalCost = filteredIds.reduce((sum, id) => sum + (transactionCosts.get(id)?.cost || 0), 0);

    const unitModeRes = await pool.query("SELECT value FROM settings WHERE key = 'unit_mode'");
    const unitMode = unitModeRes.rows[0]?.value || 'km';

    const byVehicleRes = await pool.query(`
      SELECT 
        v.name, v.color, t.vehicle_id as id, SUM(t.amount) as total_fuel, COUNT(*) as count,
        MAX(t.mileage) - MIN(t.mileage) as distance, MAX(t.mileage) as current_mileage,
        MIN(t.date) as first_seen, MAX(t.date) as last_seen,
        STRING_AGG(t.id::text, ',') as trans_ids
      FROM transactions t LEFT JOIN vehicles v ON t.vehicle_id = v.id ${dateFilter} GROUP BY t.vehicle_id, v.name, v.color ORDER BY total_fuel DESC
    `, params);

    const byVehicle = byVehicleRes.rows.map((v) => {
      const ids = v.trans_ids.split(',').map(Number);
      const cost = ids.reduce((sum: number, id: number) => sum + (transactionCosts.get(id)?.cost || 0), 0);
      let efficiency = 0;
      if (v.distance > 0) {
        efficiency = unitMode === 'km' ? (v.total_fuel / v.distance) * 100 : v.total_fuel / v.distance;
      }
      return { ...v, total_fuel: Math.round(v.total_fuel * 100) / 100, total_cost: Math.round(cost * 100) / 100, efficiency: efficiency.toFixed(2) };
    });

    const byDriverRes = await pool.query(`
      SELECT d.name, d.color, t.pincode, SUM(t.amount) as total_fuel, COUNT(*) as count,
      MIN(t.date) as first_seen, MAX(t.date) as last_seen,
      STRING_AGG(t.id::text, ',') as trans_ids
      FROM transactions t LEFT JOIN drivers d ON t.pincode = d.pincode ${dateFilter} GROUP BY t.pincode, d.name, d.color ORDER BY total_fuel DESC
    `, params);

    const byDriver = byDriverRes.rows.map((d) => {
      const ids = d.trans_ids.split(',').map(Number);
      const cost = ids.reduce((sum: number, id: number) => sum + (transactionCosts.get(id)?.cost || 0), 0);
      return { ...d, total_fuel: Math.round(d.total_fuel * 100) / 100, total_cost: Math.round(cost * 100) / 100, avg_per_refuel: (d.total_fuel / d.count).toFixed(2) };
    });

    const recentActivityRes = await pool.query(`
      SELECT t.*, v.name as vehicle_name, v.color as color, d.name as driver_name
      FROM transactions t LEFT JOIN vehicles v ON t.vehicle_id = v.id LEFT JOIN drivers d ON t.pincode = d.pincode ${dateFilter}
      ORDER BY t.date DESC, t.time DESC LIMIT 5
    `, params);

    const recentActivity = recentActivityRes.rows.map(t => ({
      ...t,
      cost: Math.round((transactionCosts.get(t.id)?.cost || 0) * 100) / 100
    }));

    const byMonthRes = await pool.query(`
      SELECT SUBSTR(date, 1, 7) as month, SUM(amount) as amount, STRING_AGG(id::text, ',') as trans_ids
      FROM transactions ${dateFilter} GROUP BY month ORDER BY month DESC
    `, params);

    const byMonth = byMonthRes.rows.map(m => {
      const ids = m.trans_ids.split(',').map(Number);
      const cost = ids.reduce((sum: number, id: number) => sum + (transactionCosts.get(id)?.cost || 0), 0);
      return { ...m, amount: Math.round(m.amount * 100) / 100, cost: Math.round(cost * 100) / 100 };
    });

    const totalSpend = allDeliveries.reduce((acc, d) => acc + (d.amount * (d.price_per_liter || 0)), 0);
    const tankCapacityRes = await pool.query("SELECT value FROM settings WHERE key = 'tank_capacity'");
    const tankCapacity = parseFloat(tankCapacityRes.rows[0]?.value || '10000');
    
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stats calculation failed' });
  }
});

app.get('/api/vehicles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehicles');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const { id, name, description, color } = req.body;
    await pool.query('INSERT INTO vehicles (id, name, description, color) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, color = EXCLUDED.color', [id, name, description, color]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save vehicle' });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

app.get('/api/drivers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drivers');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

app.post('/api/drivers', async (req, res) => {
  try {
    const { pincode, name, color } = req.body;
    await pool.query('INSERT INTO drivers (pincode, name, color) VALUES ($1, $2, $3) ON CONFLICT (pincode) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color', [pincode, name, color]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save driver' });
  }
});

app.delete('/api/drivers/:pincode', async (req, res) => {
  try {
    await pool.query('DELETE FROM drivers WHERE pincode = $1', [req.params.pincode]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const { start, end, limit } = req.query;
    let dateFilter = '';
    const params: any[] = [];
    if (start && end) {
      dateFilter = 'WHERE date BETWEEN $1 AND $2';
      params.push(start, end);
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
      params.push(parseInt(limit as string));
      query += ` LIMIT $${params.length}`;
    }

    const rowsRes = await pool.query(query, params);
    const rows = rowsRes.rows;
    
    const allDeliveriesRes = await pool.query('SELECT date, amount, price_per_liter FROM station_deliveries ORDER BY date ASC, id ASC');
    const allTransactionsRes = await pool.query('SELECT id, amount, date FROM transactions ORDER BY date ASC, id ASC');
    
    const allDeliveries = allDeliveriesRes.rows;
    const allTransactions = allTransactionsRes.rows;

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
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { id, sequence, pincode, vehicle_id, mileage, amount, product_id, date, time } = req.body;
    const roundedAmount = Math.round((amount || 0) * 100) / 100;
    if (id) {
      await pool.query(`UPDATE transactions SET sequence = $1, pincode = $2, vehicle_id = $3, mileage = $4, amount = $5, product_id = $6, date = $7, time = $8 WHERE id = $9`, [sequence, pincode, vehicle_id, mileage, roundedAmount, product_id, date, time, id]);
    } else {
      await pool.query(`INSERT INTO transactions (sequence, pincode, vehicle_id, mileage, amount, product_id, date, time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [sequence, pincode, vehicle_id, mileage, roundedAmount, product_id, date, time]);
    }
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save transaction' });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  try {
    await processFile(req.file.path);
    res.send({ message: 'File processed successfully' });
  } catch (err) {
    res.status(500).send('File processing failed');
  }
});

async function processFile(filePath: string) {
  const fileContent = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(fileContent).digest('hex');
  const fileName = path.basename(filePath);
  
  const alreadyProcessed = await pool.query('SELECT 1 FROM processed_files WHERE hash = $1', [hash]);
  if (alreadyProcessed.rowCount !== 0) {
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
    if (isDefinitionFile) await processDefinitions(lines);
    else await processTransactions(lines);
    await pool.query('INSERT INTO processed_files (hash, filename) VALUES ($1, $2)', [hash, fileName]);
  } catch (err) { 
    console.error('Error processing file:', err);
    throw err;
  } finally { 
    if (filePath.includes('uploads/')) fs.unlinkSync(filePath); 
  }
}

async function processTransactions(lines: string[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const line of lines) {
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
      // PostgreSQL doesn't have INSERT OR IGNORE by default in the same way, using ON CONFLICT
      // But transactions don't have a unique constraint other than ID, so we might need one or just insert.
      // Assuming raw_line could be unique or just normal insert.
      await client.query(`INSERT INTO transactions (sequence, pincode, vehicle_id, mileage, amount, product_id, date, time, raw_line) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (raw_line) DO NOTHING`, 
        [sequence, pincode, vehicle_id, mileage, amount, product_id, date, time, line.trim()]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function processDefinitions(lines: string[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const line of lines) {
      if (!line.trim() || (!line.startsWith('1,') && !line.startsWith('2,'))) continue;
      const parts = line.split(',');
      if (parts.length < 3) continue;
      const type = parts[0].trim();
      const id = parts[1].trim();
      const info = parts[2].trim();
      if (type === '1') {
        await client.query(`INSERT INTO drivers (pincode) VALUES ($1) ON CONFLICT (pincode) DO NOTHING`, [info]);
      } else if (type === '2') {
        await client.query(`INSERT INTO vehicles (id, description) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [id, info]);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

app.use(express.static(path.join(__dirname, '../dist')));
app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

async function start() {
  let authenticated = false;
  let retries = 5;
  while (!authenticated && retries > 0) {
    try {
      await initDb();
      authenticated = true;
    } catch (err) {
      console.error(`Database connection failed. Retrying... (${retries} left)`);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000)); // Wait 5 seconds
    }
  }

  if (!authenticated) {
    console.error("Could not connect to database. Exiting.");
    process.exit(1);
  }

  await pool.query("DELETE FROM transactions WHERE LENGTH(date) < 10");
  
  app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
    const filesToImport = ['DATA0001.TXT', 'DATAOUT.TXT'];
    filesToImport.forEach(async (file) => {
      const filePath = path.resolve(__dirname, '..', file);
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        try {
          await processFile(filePath);
        } catch (err) {
          console.error(`Failed to import ${file}:`, err);
        }
      }
    });
  });
}

start().catch(console.error);
