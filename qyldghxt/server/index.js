// Minimal Express backend for qyldghxt
const express = require('express');
const cors = require('cors');
const multer = require('multer');
let axios = null;
const fs = require('fs').promises;
const fsSync = require('fs');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Load environment variables for local/dev and production
// Key: Determine if it's dev or packed environment
// process.cwd() points to the exe folder after packaging
const envPath = path.join(process.cwd(), '.env'); 
dotenv.config({ path: envPath });
console.log("Loading config file path:", envPath);
console.log('DingTalk config check:', {
  appKey: process.env.DINGTALK_APP_KEY ? 'loaded' : 'missing',
  appSecret: process.env.DINGTALK_APP_SECRET ? 'loaded' : 'missing'
});

const app = express();
const PORT = Number(process.env.PORT || 5004);
const ENABLE_AUTH = String(process.env.ENABLE_AUTH || '').toLowerCase() === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret-change-me';

app.use(express.json({ limit: '50mb' }));
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], credentials: true }));
const uploadsDir = path.join(process.cwd(), 'uploads');
try { fsSync.mkdirSync(uploadsDir, { recursive: true }) } catch (_) {}
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}-${safeName}`)
  }
});
const upload = multer({ storage: diskStorage });
app.use('/uploads', express.static(uploadsDir));
if (ENABLE_AUTH) {
  const openPaths = new Set([
    '/api/login',
    '/api/health',
    '/api/integration/status'
  ]);
  app.use((req, res, next) => {
    // Explicitly allow login and health checks, ignoring potential trailing slashes
    const p = req.path.replace(/\/+$/, '');
    if (
      openPaths.has(p) || 
      p === '/api/login' || 
      p.startsWith('/api/login') ||
      req.path.startsWith('/uploads') || 
      req.path.startsWith('/backups')
    ) return next();

    const auth = req.headers['authorization'] || '';
    const m = auth.match(/^Bearer\s+(.+)$/);
    if (!m) {
      console.log(`[Auth] Blocked request to ${req.path} - No token`);
      return res.status(401).json({ error: '未提供授权令牌' });
    }
    try {
      const payload = jwt.verify(m[1], JWT_SECRET);
      req.user = payload;
      return next();
    } catch (e) {
      console.log(`[Auth] Blocked request to ${req.path} - Invalid token: ${e.message}`);
      return res.status(401).json({ error: '令牌无效或已过期' });
    }
  });
}

// --- Routes ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/login', async (req, res) => {
  console.log('[Login] Attempt:', req.body);
  const { username, password } = req.body || {};
  
  // Hardcoded admin
  if (username === 'admin' && password === '123456') {
    console.log('[Login] Success for admin');
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({
      token,
      user: { username, name: '管理员', role: 'admin', permissions: ['admin'] }
    });
  }
  
  console.log('[Login] Failed for:', username);
  return res.status(401).json({ error: '用户名或密码错误 (默认: admin/123456)' });
});

// Generic CRUD helper
const createCrudRoutes = (table, pathName) => {
  app.get(`/api/${pathName}`, async (req, res) => {
    if (!dbPool) return res.json([]);
    try {
      const [rows] = await dbPool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post(`/api/${pathName}`, async (req, res) => {
    if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
    try {
      const keys = Object.keys(req.body).filter(k => k !== 'id' && k !== 'created_at');
      if (keys.length === 0) return res.status(400).json({ error: 'No data' });
      const values = keys.map(k => req.body[k]);
      const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
      const [ret] = await dbPool.query(sql, values);
      res.json({ id: ret.insertId, ...req.body });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put(`/api/${pathName}/:id`, async (req, res) => {
    if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
    try {
      const keys = Object.keys(req.body).filter(k => k !== 'id' && k !== 'created_at');
      if (keys.length === 0) return res.json({ success: true });
      const setSql = keys.map(k => `${k}=?`).join(',');
      const values = [...keys.map(k => req.body[k]), req.params.id];
      await dbPool.query(`UPDATE ${table} SET ${setSql} WHERE id=?`, values);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

app.delete(`/api/${pathName}/:id`, async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    await dbPool.query(`DELETE FROM ${table} WHERE id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
};

// Register routes
createCrudRoutes('departments', 'departments');
createCrudRoutes('employees', 'employees');
createCrudRoutes('annual_work_plans', 'plans'); // Assuming /api/plans? Need to check frontend
// Check DataContext for other routes...
// It seems /api/departments is correct.
// For annual plans, I'd need to check, but let's stick to what we know.

// --- Business routes required by client ---
// Monthly Progress
app.get('/api/monthly-progress', async (req, res) => {
  if (!dbPool) return res.json([]);
  try {
    const { year, month, department, status } = req.query || {};
    const where = [];
    const values = [];
    if (year) { where.push('year = ?'); values.push(Number(year)); }
    if (month) { where.push('month = ?'); values.push(Number(month)); }
    if (department) { where.push('department = ?'); values.push(String(department)); }
    if (status) { where.push('status = ?'); values.push(String(status)); }
    const sql = `SELECT * FROM monthly_progress${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
    const [rows] = await dbPool.query(sql, values);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/monthly-progress', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    const data = req.body || {};
    const required = ['year', 'month', 'task_name'];
    const missing = required.filter(k => !data[k] && data[k] !== 0);
    if (missing.length) return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` });
    const keys = [
      'year','month','department','task_name','target_value','actual_value','status','responsible_person','start_date','end_date','key_activities','achievements','challenges','next_month_plan','support_needed'
    ];
    const values = keys.map(k => data[k] ?? null);
    const placeholders = keys.map(() => '?').join(',');
    const [ret] = await dbPool.query(`INSERT INTO monthly_progress (${keys.join(',')}) VALUES (${placeholders})`, values);
    res.status(201).json({ id: ret.insertId, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/monthly-progress/:id', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    const allowed = ['year','month','department','task_name','target_value','actual_value','status','responsible_person','start_date','end_date','key_activities','achievements','challenges','next_month_plan','support_needed'];
    const { setSql, values } = buildSafeUpdate(req.body || {}, allowed);
    if (!setSql) return res.json({ success: true });
    await dbPool.query(`UPDATE monthly_progress SET ${setSql} WHERE id=?`, [...values, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/monthly-progress/:id', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    await dbPool.query('DELETE FROM monthly_progress WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Department Targets
app.get('/api/department-targets', async (req, res) => {
  if (!dbPool) return res.json([]);
  try {
    const { year, department, targetType } = req.query || {};
    const where = [];
    const values = [];
    if (year) { where.push('year = ?'); values.push(Number(year)); }
    if (department) { where.push('department = ?'); values.push(String(department)); }
    if (targetType) { where.push('target_type = ?'); values.push(String(targetType)); }
    const sql = `SELECT * FROM department_targets${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
    const [rows] = await dbPool.query(sql, values);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/department-targets', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    const data = req.body || {};
    const required = ['year', 'department_id', 'target_type'];
    const missing = required.filter(k => !data[k] && data[k] !== 0);
    if (missing.length) return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` });
    const deptName = data.department || null;
    const keys = ['year','department_id','department','target_level','target_type','target_name','target_value','unit','quarter','month','current_value','responsible_person','description'];
    const values = keys.map(k => data[k] ?? (k==='department'?deptName:null));
    const placeholders = keys.map(() => '?').join(',');
    const [ret] = await dbPool.query(`INSERT INTO department_targets (${keys.join(',')}) VALUES (${placeholders})`, values);
    res.status(201).json({ id: ret.insertId, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/department-targets/:id', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    const allowed = ['year','department_id','department','target_level','target_type','target_name','target_value','unit','quarter','month','current_value','responsible_person','description'];
    const { setSql, values } = buildSafeUpdate(req.body || {}, allowed);
    if (!setSql) return res.json({ success: true });
    await dbPool.query(`UPDATE department_targets SET ${setSql} WHERE id=?`, [...values, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/department-targets/:id', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    await dbPool.query('DELETE FROM department_targets WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Action Plans
app.get('/api/action-plans', async (req, res) => {
  if (!dbPool) return res.json([]);
  try {
    const { year, department, status, priority } = req.query || {};
    const where = [];
    const values = [];
    if (year) { where.push('year = ?'); values.push(Number(year)); }
    if (department) { where.push('department = ?'); values.push(String(department)); }
    if (status) { where.push('status = ?'); values.push(String(status)); }
    if (priority) { where.push('priority = ?'); values.push(String(priority)); }
    const sql = `SELECT * FROM action_plans${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
    const [rows] = await dbPool.query(sql, values);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/action-plans', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    const data = req.body || {};
    const required = ['year', 'goal', 'what', 'who', 'when', 'department'];
    const missing = required.filter(k => !data[k] && data[k] !== 0);
    if (missing.length) return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` });
    const keys = ['year','goal','what','why','who','when','how','how_much','department','priority','status','progress','expected_result','actual_result','remarks'];
    const values = keys.map(k => data[k] ?? null);
    const placeholders = keys.map(() => '?').join(',');
    const [ret] = await dbPool.query(`INSERT INTO action_plans (${keys.join(',')}) VALUES (${placeholders})`, values);
    res.status(201).json({ id: ret.insertId, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/action-plans/:id', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    const allowed = ['year','goal','what','why','who','when','how','how_much','department','priority','status','progress','expected_result','actual_result','remarks'];
    const { setSql, values } = buildSafeUpdate(req.body || {}, allowed);
    if (!setSql) return res.json({ success: true });
    await dbPool.query(`UPDATE action_plans SET ${setSql} WHERE id=?`, [...values, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/action-plans/:id', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    await dbPool.query('DELETE FROM action_plans WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const DB_ENABLED = process.env.DB_ENABLED === 'true';
let dbPool = null;
async function initDB() {
  if (!DB_ENABLED) return;
  dbPool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'planning_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  await dbPool.query(`CREATE TABLE IF NOT EXISTS annual_work_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sheet_type VARCHAR(32) NULL,
    year INT,
    month INT NULL,
    department_id INT NULL,
    department_name VARCHAR(255) NULL,
    plan_name VARCHAR(255) NULL,
    category VARCHAR(64) NULL,
    priority VARCHAR(32) NULL,
    start_date VARCHAR(32) NULL,
    end_date VARCHAR(32) NULL,
    budget DECIMAL(14,2) NULL,
    status VARCHAR(32) NULL,
    responsible_person VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbPool.query(`CREATE TABLE IF NOT EXISTS major_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT,
    event_name VARCHAR(255) NULL,
    event_type VARCHAR(64) NULL,
    importance VARCHAR(32) NULL,
    planned_date VARCHAR(32) NULL,
    actual_date VARCHAR(32) NULL,
    department_id INT NULL,
    responsible_department VARCHAR(255) NULL,
    responsible_person VARCHAR(255) NULL,
    status VARCHAR(32) NULL,
    budget DECIMAL(14,2) NULL,
    actual_cost DECIMAL(14,2) NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbPool.query(`CREATE TABLE IF NOT EXISTS monthly_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT,
    month INT,
    department VARCHAR(255) NULL,
    task_name VARCHAR(255) NULL,
    target_value DECIMAL(14,2) NULL,
    actual_value DECIMAL(14,2) NULL,
    status VARCHAR(32) NULL,
    responsible_person VARCHAR(255) NULL,
    start_date VARCHAR(32) NULL,
    end_date VARCHAR(32) NULL,
    key_activities TEXT NULL,
    achievements TEXT NULL,
    challenges TEXT NULL,
    next_month_plan TEXT NULL,
    support_needed TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbPool.query(`CREATE TABLE IF NOT EXISTS department_targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT,
    department_id INT NULL,
    department VARCHAR(255) NULL,
    target_level VARCHAR(32) NULL,
    target_type VARCHAR(64) NULL,
    target_name VARCHAR(255) NULL,
    target_value DECIMAL(14,2) NULL,
    unit VARCHAR(64) NULL,
    quarter INT NULL,
    month INT NULL,
    current_value DECIMAL(14,2) NULL,
    responsible_person VARCHAR(255) NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbPool.query(`CREATE TABLE IF NOT EXISTS action_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT,
    goal VARCHAR(255) NULL,
    what VARCHAR(255) NULL,
    why VARCHAR(255) NULL,
    who VARCHAR(255) NULL,
    when VARCHAR(64) NULL,
    how TEXT NULL,
    how_much DECIMAL(14,2) NULL,
    department VARCHAR(255) NULL,
    priority VARCHAR(32) NULL,
    status VARCHAR(32) NULL,
    progress INT NULL,
    expected_result TEXT NULL,
    actual_result TEXT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbPool.query(`CREATE TABLE IF NOT EXISTS departments (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) UNIQUE,
    parent_id BIGINT NULL,
    manager VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    email VARCHAR(255) NULL,
    status VARCHAR(32) DEFAULT 'active',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  try {
    await dbPool.query('ALTER TABLE departments MODIFY id BIGINT PRIMARY KEY');
  } catch (_) {}
  await dbPool.query(`CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(64) UNIQUE,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NULL,
    position VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    email VARCHAR(255) NULL,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbPool.query(`CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    \`key\` VARCHAR(128) NOT NULL,
    value TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}
// helper: build safe update SQL from whitelist
function buildSafeUpdate(incoming, allowed) {
  const fields = Object.keys(incoming).filter(k => allowed.includes(k));
  if (!fields.length) return { setSql: '', values: [] };
  const setSql = fields.map(k => `${k} = ?`).join(', ');
  const values = fields.map(k => incoming[k]);
  return { setSql, values };
}

// DingTalk helpers
async function getDingTalkAccessToken() {
  if (!axios) axios = require('axios');
  let appKey = process.env.DINGTALK_APP_KEY;
  let appSecret = process.env.DINGTALK_APP_SECRET;
  if ((!appKey || !appSecret) && dbPool) {
    try {
      const [rows] = await dbPool.query('SELECT value FROM system_settings WHERE `key`=? LIMIT 1', ['integration']);
      const v = rows && rows[0] && rows[0].value ? rows[0].value : null;
      if (v) {
        try {
          const obj = JSON.parse(v);
          appKey = String(obj.dingtalkAppKey || appKey || '');
          appSecret = String(obj.dingtalkAppSecret || appSecret || '');
        } catch (_) {}
      }
    } catch (_) {}
  }
  if (!appKey || !appSecret) {
    throw new Error('未配置钉钉APP Key/Secret，请在环境变量或系统设置中配置');
  }
  const resp = await axios.get('https://oapi.dingtalk.com/gettoken', {
    params: { appkey: appKey, appsecret: appSecret }
  });
  const data = resp?.data || {};
  if (data.errcode !== 0 || !data.access_token) {
    const msg = data.errmsg || '获取钉钉access_token失败';
    const sub = data.sub_code ? ` [sub_code=${data.sub_code}]` : '';
    throw new Error(`${msg}${sub}`);
  }
  return String(data.access_token);
}

app.get('/api/integration/status', async (req, res) => {
  let ok = Boolean(process.env.DINGTALK_APP_KEY && process.env.DINGTALK_APP_SECRET);
  if (!ok && dbPool) {
    try {
      const [rows] = await dbPool.query('SELECT value FROM system_settings WHERE `key`=? LIMIT 1', ['integration']);
      const v = rows && rows[0] && rows[0].value ? rows[0].value : null;
      if (v) {
        try {
          const obj = JSON.parse(v);
          ok = Boolean(obj.dingtalkAppKey && obj.dingtalkAppSecret);
        } catch (_) {}
      }
    } catch (_) {}
  }
  res.json({ dingtalkConfigured: ok });
});

app.get('/api/system-settings', async (req, res) => {
  if (!dbPool) return res.json([]);
  try {
    const [rows] = await dbPool.query('SELECT id, `key`, value, created_at FROM system_settings ORDER BY id DESC');
    const out = rows.map(r => ({ id: r.id, key: r.key, value: safeParse(r.value) }));
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/system-settings', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    const k = String(req.body?.key || '').trim();
    const v = req.body?.value !== undefined ? JSON.stringify(req.body.value) : 'null';
    if (!k) return res.status(400).json({ error: 'Missing key' });
    const [ret] = await dbPool.query('INSERT INTO system_settings (`key`, value) VALUES (?, ?)', [k, v]);
    res.status(201).json({ id: ret.insertId, key: k, value: req.body.value });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/system-settings/:id', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    const id = Number(req.params.id);
    const k = String(req.body?.key || '').trim();
    const v = req.body?.value !== undefined ? JSON.stringify(req.body.value) : 'null';
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await dbPool.query('UPDATE system_settings SET `key`=?, value=? WHERE id=?', [k, v, id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/system-settings/:id', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'DB not connected' });
  try {
    await dbPool.query('DELETE FROM system_settings WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function safeParse(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch (_) { return null; }
}

// Create HTTP server and bind Socket.IO
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  path: '/socket.io',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Track online users by joined room names
const onlineRooms = new Set();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join-room', (room) => {
    if (!room) return;
    socket.join(room);
    socket.data.room = room;
    onlineRooms.add(room);
    // Broadcast online users list
    io.emit('user-online', Array.from(onlineRooms));
  });

  socket.on('data-update', ({ room, ...payload }) => {
    const targetRoom = room || socket.data.room;
    if (targetRoom) {
      io.to(targetRoom).emit('data-updated', payload);
    }
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (room && onlineRooms.has(room)) {
      onlineRooms.delete(room);
      io.emit('user-online', Array.from(onlineRooms));
    }
    console.log('Socket disconnected:', socket.id);
  });
});

// Start server
async function start() {
  try { await initDB(); } catch (e) { console.error('DB init failed:', e?.message || e); }
  httpServer.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
  });
}
start();
