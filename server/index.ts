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

const db = new Database('database.db');

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
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS drivers (
    pincode TEXT PRIMARY KEY,
    name TEXT
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
`);

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

interface QueryParams {
  start?: string;
  end?: string;
  limit?: number;
}

app.get('/api/stats', (req, res) => {
  const { start, end } = req.query;
  console.log('Stats params:', { start, end });
  
  const queryParams: QueryParams = {};
  let dateFilter = '';
  if (start && end) {
    dateFilter = 'WHERE date BETWEEN :start AND :end';
    queryParams.start = start as string;
    queryParams.end = end as string;
  }

  const stats = db.prepare(`
    SELECT 
      SUM(amount) as total_fuel,
      COUNT(*) as total_transactions,
      (SELECT COUNT(DISTINCT vehicle_id) FROM transactions ${dateFilter}) as total_vehicles
    FROM transactions
    ${dateFilter}
  `).get(queryParams) as { total_fuel: number | null; total_transactions: number; total_vehicles: number };

  const unitMode = db.prepare("SELECT value FROM settings WHERE key = 'unit_mode'").get()?.value || 'km';

  const byVehicle = db.prepare(`
    SELECT 
      v.name, 
      t.vehicle_id as id, 
      SUM(t.amount) as total_fuel, 
      COUNT(*) as count,
      MAX(t.mileage) - MIN(t.mileage) as distance
    FROM transactions t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    ${dateFilter}
    GROUP BY t.vehicle_id
    ORDER BY total_fuel DESC
    LIMIT 10
  `).all(queryParams).map((v: { name: string; id: string; total_fuel: number; count: number; distance: number }) => {
    let efficiency = 0;
    if (v.distance > 0) {
      efficiency = unitMode === 'km' 
        ? (v.total_fuel / v.distance) * 100 
        : v.total_fuel / v.distance;
    }
    return { ...v, efficiency: efficiency.toFixed(2) };
  });

  const byDriver = db.prepare(`
    SELECT 
      d.name, 
      t.pincode, 
      SUM(t.amount) as total_fuel, 
      COUNT(*) as count
    FROM transactions t
    LEFT JOIN drivers d ON t.pincode = d.pincode
    ${dateFilter}
    GROUP BY t.pincode
    ORDER BY total_fuel DESC
    LIMIT 10
  `).all(queryParams).map((d: { name: string; pincode: string; total_fuel: number; count: number }) => ({
    ...d,
    avg_per_refuel: (d.total_fuel / d.count).toFixed(2)
  }));

  const recentActivity = db.prepare(`
    SELECT t.*, v.name as vehicle_name, d.name as driver_name
    FROM transactions t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN drivers d ON t.pincode = d.pincode
    ${dateFilter}
    ORDER BY t.date DESC, t.time DESC
    LIMIT 5
  `).all(queryParams);

  const byMonth = db.prepare(`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as amount
    FROM transactions
    ${dateFilter}
    GROUP BY month
    ORDER BY month DESC
  `).all(queryParams);

  res.json({ 
    total_fuel: stats.total_fuel || 0,
    total_transactions: stats.total_transactions || 0,
    total_vehicles: stats.total_vehicles || 0,
    unit_mode: unitMode, 
    by_vehicle: byVehicle, 
    by_driver: byDriver, 
    recent_activity: recentActivity, 
    by_month: byMonth 
  });
});

app.get('/api/vehicles', (req, res) => {
  const rows = db.prepare('SELECT * FROM vehicles').all();
  res.json(rows);
});

app.post('/api/vehicles', (req, res) => {
  const { id, name, description } = req.body;
  db.prepare('INSERT OR REPLACE INTO vehicles (id, name, description) VALUES (?, ?, ?)').run(id, name, description);
  res.sendStatus(200);
});

app.delete('/api/vehicles/:id', (req, res) => {
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  res.sendStatus(200);
});

app.get('/api/drivers', (req, res) => {
  const rows = db.prepare('SELECT * FROM drivers').all();
  res.json(rows);
});

app.post('/api/drivers', (req, res) => {
  const { pincode, name } = req.body;
  db.prepare('INSERT OR REPLACE INTO drivers (pincode, name) VALUES (?, ?)').run(pincode, name);
  res.sendStatus(200);
});

app.delete('/api/drivers/:pincode', (req, res) => {
  db.prepare('DELETE FROM drivers WHERE pincode = ?').run(req.params.pincode);
  res.sendStatus(200);
});

app.get('/api/transactions', (req, res) => {
  const { start, end, limit } = req.query;
  console.log('Transactions params:', { start, end, limit });
  
  const queryParams: QueryParams = {};
  let dateFilter = '';
  if (start && end) {
    dateFilter = 'WHERE date BETWEEN :start AND :end';
    queryParams.start = start as string;
    queryParams.end = end as string;
  }

  let query = `
    SELECT t.*, v.name as vehicle_name, d.name as driver_name
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

  const rows = db.prepare(query).all(queryParams);
  res.json(rows);
});

app.post('/api/transactions', (req, res) => {
  const { id, sequence, pincode, vehicle_id, mileage, amount, product_id, date, time } = req.body;
  if (id) {
    db.prepare(`
      UPDATE transactions SET 
        sequence = ?, pincode = ?, vehicle_id = ?, mileage = ?, 
        amount = ?, product_id = ?, date = ?, time = ?
      WHERE id = ?
    `).run(sequence, pincode, vehicle_id, mileage, amount, product_id, date, time, id);
  } else {
    db.prepare(`
      INSERT INTO transactions 
      (sequence, pincode, vehicle_id, mileage, amount, product_id, date, time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sequence, pincode, vehicle_id, mileage, amount, product_id, date, time);
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
    console.log(`File ${fileName} already processed, skipping.`);
    if (filePath.includes('uploads/')) fs.unlinkSync(filePath);
    return;
  }

  const content = fileContent.toString('utf-8');
  const lines = content.split(/\r?\n/);
  
  // Detect file type
  let isDefinitionFile = false;
  for (const line of lines) {
    if (!line.trim() || line.startsWith('Version')) continue;
    if (line.startsWith('1,') || line.startsWith('2,')) {
      isDefinitionFile = true;
      break;
    }
    if (line.startsWith('01,')) {
      break;
    }
  }

  try {
    if (isDefinitionFile) {
      processDefinitions(lines);
    } else {
      processTransactions(lines);
    }
    db.prepare('INSERT INTO processed_files (hash, filename) VALUES (?, ?)').run(hash, fileName);
  } catch (err) {
    console.error('Error processing file:', err);
  } finally {
    if (filePath.includes('uploads/')) fs.unlinkSync(filePath);
  }
}

function processTransactions(lines: string[]) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions 
    (sequence, pincode, vehicle_id, mileage, amount, product_id, date, time, raw_line)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data) => {
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
  const insertVehicle = db.prepare(`
    INSERT OR IGNORE INTO vehicles (id, description) VALUES (?, ?)
  `);
  const insertDriver = db.prepare(`
    INSERT OR IGNORE INTO drivers (pincode) VALUES (?)
  `);

  const transaction = db.transaction((data) => {
    for (const line of data) {
      if (!line.trim() || (!line.startsWith('1,') && !line.startsWith('2,'))) continue;
      const parts = line.split(',');
      if (parts.length < 3) continue;

      const type = parts[0].trim();
      const id = parts[1].trim();
      const info = parts[2].trim();

      if (type === '1') {
        // Driver: info is usually the pincode
        insertDriver.run(info);
      } else if (type === '2') {
        // Vehicle: id is the vehicle ID, info is the tag/description
        insertVehicle.run(id, info);
      }
    }
  });

  transaction(lines);
}

// Cleanup invalid data from previous imports
db.prepare("DELETE FROM transactions WHERE length(date) < 10").run();

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
  
  // Import local files if they exist
  const filesToImport = ['DATA0001.TXT', 'DATAOUT.TXT'];
  filesToImport.forEach(file => {
    const filePath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`Found local ${file}, importing...`);
      processFile(filePath);
    }
  });
});
