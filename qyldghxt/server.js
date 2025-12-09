// Minimal Express backend for qyldghxt
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import axios from 'axios'
// import path from 'path' (duplicate removed)
import { promises as fs } from 'fs'
import fsSync from 'fs'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import path from 'path'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Load environment variables for local/dev and production
dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const app = express()
const PORT = Number(process.env.PORT || 5004)
const ENABLE_AUTH = String(process.env.ENABLE_AUTH || '').toLowerCase() === 'true'
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret-change-me'

app.use(express.json({ limit: '50mb' }))
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], credentials: true }))
const uploadsDir = path.join(process.cwd(), 'uploads')
try { fsSync.mkdirSync(uploadsDir, { recursive: true }) } catch (_) {}
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}-${safeName}`)
  }
})
const upload = multer({ storage: diskStorage })
app.use('/uploads', express.static(uploadsDir))
if (ENABLE_AUTH) {
  const openPaths = new Set([
    '/api/login',
    '/api/health',
    '/api/integration/status'
  ])
  app.use((req, res, next) => {
    if (openPaths.has(req.path) || req.path.startsWith('/uploads') || req.path.startsWith('/backups')) return next()
    const auth = req.headers['authorization'] || ''
    const m = auth.match(/^Bearer\s+(.+)$/)
    if (!m) return res.status(401).json({ error: '未提供授权令牌' })
    try {
      const payload = jwt.verify(m[1], JWT_SECRET)
      req.user = payload
      return next()
    } catch (_) {
      return res.status(401).json({ error: '令牌无效或已过期' })
    }
  })
}

// Config directory and DingTalk config persistence
const CONFIG_DIR = path.join(process.cwd(), 'config')
try { fsSync.mkdirSync(CONFIG_DIR, { recursive: true }) } catch (_) {}
const DINGTALK_CONFIG_PATH = path.join(CONFIG_DIR, 'dingtalk_config.json')

async function loadDingTalkConfigFromFile() {
  try {
    const raw = await fs.readFile(DINGTALK_CONFIG_PATH, 'utf-8')
    const obj = JSON.parse(raw || '{}')
    const appKey = String(obj.appKey || '')
    const appSecret = String(obj.appSecret || '')
    if (!appKey && !appSecret) return
    const key = 'integration'
    const existing = systemSettings.find(s => s && s.key === key)
    if (existing) {
      existing.value = {
        ...existing.value,
        dingtalkEnabled: true,
        dingtalkAppKey: appKey,
        dingtalkAppSecret: appSecret
      }
    } else {
      const id = systemSettings.length ? Math.max(...systemSettings.map(s => s.id || 0)) + 1 : 1
      systemSettings.push({ id, key, value: { dingtalkEnabled: true, dingtalkAppKey: appKey, dingtalkAppSecret: appSecret } })
    }
    console.log('Loaded DingTalk config from file')
  } catch (_) {
    // ignore when file not found or parse error
  }
}

async function saveDingTalkConfigToFileFromSettings() {
  const rec = systemSettings.find(s => s && s.key === 'integration' && s.value)
  const v = rec && rec.value
  const appKey = String(v?.dingtalkAppKey || '')
  const appSecret = String(v?.dingtalkAppSecret || '')
  if (!appKey && !appSecret) return
  const payload = { appKey, appSecret }
  try {
    await fs.writeFile(DINGTALK_CONFIG_PATH, JSON.stringify(payload, null, 2), 'utf-8')
    console.log('Persisted DingTalk config to', DINGTALK_CONFIG_PATH)
  } catch (e) {
    console.error('Persist DingTalk config failed:', e?.message || e)
  }
}
const DB_ENABLED = process.env.DB_ENABLED === 'true'
let dbPool = null
async function initDB() {
  if (!DB_ENABLED) return
  dbPool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'planning_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })
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
  )`)
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
  )`)
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
  )`)
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
  )`)
  try {
    await dbPool.query('ALTER TABLE departments MODIFY id BIGINT PRIMARY KEY')
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
  )`)
}
// helper: build safe update SQL from whitelist
function buildSafeUpdate(incoming, allowed) {
  const fields = Object.keys(incoming).filter(k => allowed.includes(k))
  if (!fields.length) return { setSql: '', values: [] }
  const setSql = fields.map(k => `${k} = ?`).join(', ')
  const values = fields.map(k => incoming[k])
  return { setSql, values }
}

async function start() {
  try { await initDB() } catch (e) { console.error('DB init failed:', e?.message || e) }
  try { await loadDingTalkConfigFromFile() } catch (_) {}
  httpServer.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`)
  })
}
start()
// DingTalk helpers
async function getDingTalkAccessToken() {
  let appKey = process.env.DINGTALK_APP_KEY
  let appSecret = process.env.DINGTALK_APP_SECRET
  if (!appKey || !appSecret) {
    try {
      const rec = systemSettings.find(s => s && s.key === 'integration' && s.value)
      if (rec && rec.value) {
        appKey = String(rec.value.dingtalkAppKey || '')
        appSecret = String(rec.value.dingtalkAppSecret || '')
      }
    } catch (_) {}
  }
  if (!appKey || !appSecret) {
    throw new Error('未配置钉钉APP Key/Secret，请在环境变量或系统设置中配置')
  }
  const resp = await axios.get('https://oapi.dingtalk.com/gettoken', {
    params: { appkey: appKey, appsecret: appSecret }
  })
  const data = resp?.data || {}
  if (data.errcode !== 0 || !data.access_token) {
    const msg = data.errmsg || '获取钉钉access_token失败'
    const sub = data.sub_code ? ` [sub_code=${data.sub_code}]` : ''
    throw new Error(`${msg}${sub}`)
  }
  return String(data.access_token)
}

// Create HTTP server and bind Socket.IO
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  path: '/socket.io',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Track online users by joined room names
const onlineRooms = new Set()

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id)

  socket.on('join-room', (room) => {
    if (!room) return
    socket.join(room)
    socket.data.room = room
    onlineRooms.add(room)
    // Broadcast online users list
    io.emit('user-online', Array.from(onlineRooms))
  })

  socket.on('data-update', ({ room, ...payload }) => {
    const targetRoom = room || socket.data.room
    if (targetRoom) {
      io.to(targetRoom).emit('data-updated', payload)
    }
  })

  socket.on('disconnect', () => {
    const room = socket.data.room
    if (room && onlineRooms.has(room)) {
      onlineRooms.delete(room)
      io.emit('user-online', Array.from(onlineRooms))
    }
    console.log('Socket disconnected:', socket.id)
  })
})

// In-memory data stores
let departments = [
  { id: 1, name: '人力资源部' },
  { id: 2, name: '市场部' },
  { id: 3, name: '研发部' }
]

let employees = [
  {
    id: 1,
    name: '张三',
    employee_id: 'E001',
    department: '人力资源部',
    position: '专员',
    phone: '13800000001',
    email: 'zhangsan@example.com',
    status: 'active'
  },
  {
    id: 2,
    name: '李四',
    employee_id: 'E002',
    department: '市场部',
    position: '经理',
    phone: '13800000002',
    email: 'lisi@example.com',
    status: 'active'
  }
]

// Users
let users = [
  { id: 1, username: 'admin', password: 'admin123', role: '管理员', status: '启用', lastLogin: '从未登录', permissions: ['admin','系统管理','用户管理','数据查看','报表导出'] },
  { id: 2, username: 'user', password: 'user123', role: '普通用户', status: '启用', lastLogin: '从未登录', permissions: ['数据查看'] }
]

// 5W2H Action Plans
let actionPlans = [
  {
    id: 1,
    year: new Date().getFullYear(),
    goal: '扩大线上销售目标（SMART）',
    what: '拓展线上销售渠道',
    why: '提升销售额与品牌影响力',
    who: '市场部',
    when: '2025-03-01',
    how: '投放广告、优化店铺、联合促销',
    how_much: 50000,
    department: '市场部',
    priority: 'high',
    status: 'in_progress',
    progress: 30,
    expected_result: '月度线上销售额提升20%',
    actual_result: '',
    remarks: ''
  },
  {
    id: 2,
    year: new Date().getFullYear(),
    goal: '导入OKR覆盖试点部门（SMART）',
    what: '引入OKR绩效管理',
    why: '提升团队目标对齐与执行力',
    who: '人力资源部',
    when: '2025-04-15',
    how: '制定OKR流程、培训、试点运行',
    how_much: 20000,
    department: '人力资源部',
    priority: 'medium',
    status: 'not_started',
    progress: 0,
    expected_result: '试点部门OKR覆盖率达100%',
    actual_result: '',
    remarks: ''
  }
]

// Department Targets (in-memory)
let departmentTargets = []

// Annual Work Plans
let annualWorkPlans = []

// Major Events
let majorEvents = []

// Monthly Progress
let monthlyProgress = []

// Templates
let templates = []

// Target Types
let targetTypes = []

// System Settings
let systemSettings = []

// Company Info
let companyInfo = {
  name: '泉州太禾服饰有限公司',
  legalPerson: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  establishDate: ''
}

// Departments
app.get('/api/departments', (req, res) => {
  if (DB_ENABLED && dbPool) {
    dbPool.query('SELECT id, name, code, parent_id, manager, phone, email, status, description FROM departments ORDER BY id ASC')
      .then(([rows]) => res.json(rows))
      .catch(() => res.status(500).json([]))
    return
  }
  res.json(departments)
})

app.post('/api/departments', (req, res) => {
  const { name, code, parent_id, manager, phone, email, status, description } = req.body || {}
  if (!name) return res.status(400).json({ error: '部门名称不能为空' })
  if (DB_ENABLED && dbPool) {
    (async () => {
      try {
        const [ret] = await dbPool.query(
          'INSERT INTO departments (name, code, parent_id, manager, phone, email, status, description) VALUES (?,?,?,?,?,?,?,?)',
          [String(name), code || null, parent_id !== undefined ? Number(parent_id) : null, manager || null, phone || null, email || null, status || 'active', description || null]
        )
        res.status(201).json({ id: ret.insertId, name, code: code || null, parent_id: parent_id !== undefined ? Number(parent_id) : null, manager: manager || null, phone: phone || null, email: email || null, status: status || 'active', description: description || null })
      } catch (e) {
        res.status(500).json({ error: '数据库写入失败' })
      }
    })()
    return
  }
  if (!globalThis.__deptId) {
    globalThis.__deptId = departments.length ? Math.max(...departments.map(d => d.id)) + 1 : 1
  }
  const id = globalThis.__deptId++
  const dept = { id, name, code: code || undefined, parent_id: parent_id !== undefined ? Number(parent_id) : undefined, manager, phone, email, status: status || 'active', description }
  departments.push(dept)
  res.status(201).json(dept)
})

app.put('/api/departments/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
    const incoming = { ...req.body }
    const allowed = ['name','code','parent_id','manager','phone','email','status','description']
    const { setSql, values } = buildSafeUpdate(incoming, allowed)
    if (!setSql) return res.status(400).json({ error: '无有效更新字段' })
    values.push(id)
    dbPool.query(`UPDATE departments SET ${setSql} WHERE id = ?`, values)
      .then(() => res.json({ id, ...incoming }))
      .catch(() => res.status(500).json({ error: '数据库更新失败' }))
    return
  }
  const index = departments.findIndex(d => d.id === id)
  if (index === -1) return res.status(404).json({ error: '部门不存在' })
  departments[index] = { ...departments[index], ...req.body }
  res.json(departments[index])
})

app.delete('/api/departments/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
  dbPool.query('DELETE FROM departments WHERE id = ?', [id])
      .then(() => res.json({ success: true }))
      .catch(() => res.status(500).json({ error: '数据库删除失败' }))
    return
  }
  const index = departments.findIndex(d => d.id === id)
  if (index === -1) return res.status(404).json({ error: '部门不存在' })
  departments.splice(index, 1)
  res.json({ success: true })
})

app.get('/api/dingtalk/departments', async (req, res) => {
  try {
    const appKey = process.env.DINGTALK_APP_KEY
    const appSecret = process.env.DINGTALK_APP_SECRET
    if (!appKey || !appSecret) {
      return res.status(500).json({ error: '未配置钉钉APP Key/Secret，请在环境变量中设置 DINGTALK_APP_KEY / DINGTALK_APP_SECRET' })
    }
    const rootId = Number(req.query.root_dept_id || process.env.DINGTALK_ROOT_DEPT_ID || 1)
    const tokenResp = await axios.get('https://oapi.dingtalk.com/gettoken', {
      params: { appkey: appKey, appsecret: appSecret }
    })
    if (!tokenResp.data || tokenResp.data.errcode !== 0 || !tokenResp.data.access_token) {
      return res.status(500).json({ error: tokenResp.data?.errmsg || '获取钉钉access_token失败' })
    }
    const accessToken = tokenResp.data.access_token
    const out = []
    async function collect(parentId) {
      let cursor = 0
      const size = 100
      while (true) {
        const r = await axios.post(`https://oapi.dingtalk.com/topapi/v2/department/listsub?access_token=${accessToken}`,
          { dept_id: parentId, cursor, size },
          { headers: { 'Content-Type': 'application/json' } }
        )
        if (r.data?.errcode !== 0) {
          return res.status(500).json({ error: r.data?.errmsg || '获取钉钉部门列表失败' })
        }
        const result = r.data?.result || {}
        const list = Array.isArray(result.list) ? result.list : []
        out.push(...list.map(d => ({ dept_id: d.dept_id, name: d.name, parent_id: d.parent_id, order: d.order })))
        const hasMore = Boolean(result.has_more)
        if (!hasMore) break
        cursor = Number(result.next_cursor || 0)
      }
      const children = out.filter(d => d.parent_id === parentId).map(d => d.dept_id)
      for (const child of children) {
        await collect(child)
      }
    }
    await collect(rootId)
    const seen = new Set()
    const uniq = []
    for (const d of out) {
      const k = String(d.dept_id)
      if (!seen.has(k)) {
        seen.add(k)
        uniq.push({ id: d.dept_id, name: d.name || '', parent_id: d.parent_id || null, code: String(d.dept_id) })
      }
    }
    res.json(uniq)
  } catch (err) {
    res.status(500).json({ error: '钉钉部门同步失败', details: err?.response?.data?.errmsg || err?.message || '未知错误' })
  }
})

app.post('/api/departments/sync-dingtalk', async (req, res) => {
  console.log('>>> [部门同步] BFS 队列扫描启动')
  const startTime = Date.now()
  try {
    const accessToken = await getDingTalkAccessToken()
    const rootId = Number(req.body?.root_dept_id || process.env.DINGTALK_ROOT_DEPT_ID || 1)
    const queue = [rootId]
    const seen = new Set()
    const allDepts = []
    while (queue.length) {
      const currentId = queue.shift()
      if (seen.has(currentId)) continue
      seen.add(currentId)
      try {
        const detailRes = await axios.post(`https://oapi.dingtalk.com/topapi/v2/department/get?access_token=${accessToken}`, { dept_id: currentId })
        if (detailRes.data.errcode === 0) {
          const d = detailRes.data.result
          allDepts.push({ id: d.dept_id, name: d.name, parent_id: d.parent_id ?? null, code: String(d.dept_id) })
          if (currentId === rootId && d.name) companyInfo = { ...companyInfo, name: d.name }
        }
      } catch (_) {}
      let cursor = 0
      let foundChild = false
      while (true) {
        try {
          const listRes = await axios.post(`https://oapi.dingtalk.com/topapi/v2/department/listsub?access_token=${accessToken}`, { dept_id: currentId, cursor, size: 100 })
          if (listRes.data.errcode !== 0) break
          const sub = listRes.data.result?.list || []
          if (sub.length > 0) foundChild = true
          for (const s of sub) {
            if (!seen.has(s.dept_id)) queue.push(s.dept_id)
          }
          if (!listRes.data.result?.has_more) break
          cursor = listRes.data.result?.next_cursor || 0
        } catch (e) { break }
      }
      if (currentId === rootId && !foundChild) {
        console.error('!!! 根部门无子部门返回，请检查钉钉通讯录权限范围是否包含全部员工或所有子层级')
      }
    }
    if (DB_ENABLED && dbPool) {
      const sql = 'INSERT INTO departments (id, name, code, parent_id, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code), parent_id=VALUES(parent_id), status=VALUES(status)'
      for (const d of allDepts) {
        await dbPool.query(sql, [Number(d.id), String(d.name || ''), String(d.code || ''), d.parent_id !== null ? Number(d.parent_id) : null, 'active'])
      }
      return res.json({ success: true, count: allDepts.length, timeMs: Date.now() - startTime })
    }
    departments = allDepts.map(d => ({ id: Number(d.id), name: String(d.name || ''), code: String(d.code || ''), parent_id: d.parent_id !== null ? Number(d.parent_id) : null }))
    res.json({ success: true, count: departments.length, timeMs: Date.now() - startTime })
  } catch (err) {
    console.error('部门同步致命错误:', err)
    res.status(500).json({ error: err.message })
  }
})

// Employees
app.get('/api/employees', async (req, res) => {
  if (DB_ENABLED && dbPool) {
    try {
      const [emps] = await dbPool.query('SELECT id, employee_id, name, department, position, phone, email, status FROM employees ORDER BY id ASC')
      const [depts] = await dbPool.query('SELECT id, name FROM departments')
      const idToName = new Map(depts.map(d => [Number(d.id), String(d.name || '')]))
      const result = emps.map(e => {
        const deptStr = String(e.department || '')
        let deptName = deptStr
        if (/^\d+$/.test(deptStr)) {
          const id = Number(deptStr)
          deptName = idToName.get(id) || deptStr
        }
        return { ...e, department: deptName }
      })
      return res.json(result)
    } catch (_) {
      return res.status(500).json([])
    }
  }
  res.json(employees)
})

app.post('/api/employees', (req, res) => {
  const data = req.body || {}
  if (!data.name || !data.employee_id || !data.department) {
    return res.status(400).json({ error: '姓名、工号和部门为必填项' })
  }
  if (DB_ENABLED && dbPool) {
    dbPool.query(
      'INSERT INTO employees (employee_id, name, department, position, phone, email, status) VALUES (?,?,?,?,?,?,?)',
      [String(data.employee_id), String(data.name), String(data.department), data.position || null, data.phone || null, data.email || null, data.status || 'active']
    ).then(([ret]) => res.status(201).json({ id: ret.insertId, ...data }))
     .catch(() => res.status(500).json({ error: '数据库写入失败' }))
    return
  }
  const id = employees.length ? Math.max(...employees.map(e => e.id)) + 1 : 1
  const emp = {
    id,
    name: data.name,
    employee_id: data.employee_id,
    department: data.department,
    position: data.position || '',
    phone: data.phone || '',
    email: data.email || '',
    status: data.status || 'active'
  }
  employees.push(emp)
  res.status(201).json(emp)
})

app.put('/api/employees/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
    const incoming = { ...req.body }
    const allowed = ['employee_id','name','department','position','phone','email','status']
    const { setSql, values } = buildSafeUpdate(incoming, allowed)
    if (!setSql) return res.status(400).json({ error: '无有效更新字段' })
    values.push(id)
    dbPool.query(`UPDATE employees SET ${setSql} WHERE id = ?`, values)
      .then(() => res.json({ id, ...incoming }))
      .catch(() => res.status(500).json({ error: '数据库更新失败' }))
    return
  }
  const index = employees.findIndex(e => e.id === id)
  if (index === -1) return res.status(404).json({ error: '员工不存在' })
  employees[index] = { ...employees[index], ...req.body }
  res.json(employees[index])
})

app.delete('/api/employees/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
  dbPool.query('DELETE FROM employees WHERE id = ?', [id])
      .then(() => res.json({ success: true }))
      .catch(() => res.status(500).json({ error: '数据库删除失败' }))
    return
  }
  const index = employees.findIndex(e => e.id === id)
  if (index === -1) return res.status(404).json({ error: '员工不存在' })
  employees.splice(index, 1)
  res.json({ success: true })
})

app.get('/api/dingtalk/employees', async (req, res) => {
  try {
    const appKey = process.env.DINGTALK_APP_KEY
    const appSecret = process.env.DINGTALK_APP_SECRET
    if (!appKey || !appSecret) {
      return res.status(500).json({ error: '未配置钉钉APP Key/Secret，请在环境变量中设置 DINGTALK_APP_KEY / DINGTALK_APP_SECRET' })
    }
    const all = String(req.query.all || '').toLowerCase() === 'true'
    const rootId = Number(req.query.root_dept_id || process.env.DINGTALK_ROOT_DEPT_ID || 1)
    const deptId = Number(req.query.dept_id || process.env.DINGTALK_DEPT_ID || rootId)

    const tokenResp = await axios.get('https://oapi.dingtalk.com/gettoken', {
      params: { appkey: appKey, appsecret: appSecret }
    })
    if (!tokenResp.data || tokenResp.data.errcode !== 0 || !tokenResp.data.access_token) {
      return res.status(500).json({ error: tokenResp.data?.errmsg || '获取钉钉access_token失败' })
    }
    const accessToken = tokenResp.data.access_token

    const size = 100
    const allUsers = []

    async function fetchUsers(dept) {
      let cursor = 0
      while (true) {
        const listResp = await axios.post(`https://oapi.dingtalk.com/topapi/v2/user/list?access_token=${accessToken}`,
          { dept_id: dept, cursor, size },
          { headers: { 'Content-Type': 'application/json' } }
        )
        const result = listResp.data?.result || {}
        if (listResp.data?.errcode !== 0) {
          return res.status(500).json({ error: listResp.data?.errmsg || '获取钉钉部门用户列表失败' })
        }
        const list = Array.isArray(result.list) ? result.list : []
        allUsers.push(...list)
        const hasMore = Boolean(result.has_more)
        if (!hasMore) break
        cursor = Number(result.next_cursor || 0)
      }
    }

    if (all) {
      const out = []
      async function collect(parentId) {
        let cursor = 0
        while (true) {
          const r = await axios.post(`https://oapi.dingtalk.com/topapi/v2/department/listsub?access_token=${accessToken}`,
            { dept_id: parentId, cursor, size },
            { headers: { 'Content-Type': 'application/json' } }
          )
          if (r.data?.errcode !== 0) {
            return res.status(500).json({ error: r.data?.errmsg || '获取钉钉部门列表失败' })
          }
          const result = r.data?.result || {}
          const list = Array.isArray(result.list) ? result.list : []
          out.push(...list.map(d => ({ dept_id: d.dept_id, parent_id: d.parent_id })))
          const hasMore = Boolean(result.has_more)
          if (!hasMore) break
          cursor = Number(result.next_cursor || 0)
        }
        const children = out.filter(d => d.parent_id === parentId).map(d => d.dept_id)
        for (const child of children) {
          await collect(child)
        }
      }
      await collect(rootId)
      const deptIds = new Set([rootId, ...out.map(d => d.dept_id)])
      for (const id of deptIds) {
        await fetchUsers(id)
      }
    } else {
      await fetchUsers(deptId)
    }

    let deptName = ''
    try {
      const deptResp = await axios.post(`https://oapi.dingtalk.com/topapi/v2/department/get?access_token=${accessToken}`,
        { dept_id: deptId },
        { headers: { 'Content-Type': 'application/json' } }
      )
      if (deptResp.data?.errcode === 0) {
        deptName = deptResp.data?.result?.name || ''
      }
    } catch (_) {}

    const mapped = allUsers.map(u => ({
      id: u.userid,
      name: u.name || '',
      employee_id: u.userid || '',
      department: deptName || (Array.isArray(u.dept_id_list) && u.dept_id_list.length ? String(u.dept_id_list[0]) : ''),
      position: u.title || '',
      phone: u.mobile || '',
      email: u.email || u.org_email || '',
      status: (u.active === true || u.active === 'true') ? 'active' : 'inactive'
    }))

    res.json(mapped)
  } catch (err) {
    console.error('DingTalk sync error:', err?.response?.data || err?.message || err)
    res.status(500).json({ error: '钉钉员工信息同步失败', details: err?.response?.data?.errmsg || err?.message || '未知错误' })
  }
})

// DingTalk: full org tree (departments + employees) with pagination + recursion
app.get('/api/dingtalk/org-tree', async (req, res) => {
  try {
    const rootId = Number(req.query.root_dept_id || process.env.DINGTALK_ROOT_DEPT_ID || 1)
    const accessToken = await getDingTalkAccessToken()

    const size = 100

    async function getAllUsersInDept(deptId) {
      const allUsers = []
      let cursor = 0
      while (true) {
        const r = await axios.post(`https://oapi.dingtalk.com/topapi/v2/user/list?access_token=${accessToken}`,
          { dept_id: deptId, cursor, size },
          { headers: { 'Content-Type': 'application/json' } }
        )
        const data = r.data || {}
        if (data.errcode !== 0) {
          const msg = data.errmsg || '获取钉钉部门用户列表失败'
          const sub = data.sub_code ? ` [sub_code=${data.sub_code}]` : ''
          throw new Error(`${msg}${sub}`)
        }
        const result = data.result || {}
        const list = Array.isArray(result.list) ? result.list : []
        allUsers.push(...list)
        const hasMore = Boolean(result.has_more)
        if (!hasMore) break
        cursor = Number(result.next_cursor || 0)
      }
      return allUsers
    }

    async function listSubDepartments(deptId) {
      const out = []
      let cursor = 0
      while (true) {
        const r = await axios.post(`https://oapi.dingtalk.com/topapi/v2/department/listsub?access_token=${accessToken}`,
          { dept_id: deptId, cursor, size },
          { headers: { 'Content-Type': 'application/json' } }
        )
        const data = r.data || {}
        if (data.errcode !== 0) {
          const msg = data.errmsg || '获取钉钉部门列表失败'
          const sub = data.sub_code ? ` [sub_code=${data.sub_code}]` : ''
          throw new Error(`${msg}${sub}`)
        }
        const result = data.result || {}
        const list = Array.isArray(result.list) ? result.list : []
        out.push(...list.map(d => ({ dept_id: d.dept_id, name: d.name, parent_id: d.parent_id })))
        const hasMore = Boolean(result.has_more)
        if (!hasMore) break
        cursor = Number(result.next_cursor || 0)
      }
      return out
    }

    async function buildFullOrgTree(deptId, deptName) {
      const [subDepts, users] = await Promise.all([
        listSubDepartments(deptId),
        getAllUsersInDept(deptId)
      ])

      const node = {
        id: Number(deptId),
        name: String(deptName || ''),
        employees: users.map(u => ({
          id: u.userid,
          name: u.name,
          title: u.title,
          avatar: u.avatar || ''
        })),
        children: []
      }

      if (subDepts.length) {
        const children = await Promise.all(subDepts.map(async (sd) => {
          const child = await buildFullOrgTree(sd.dept_id, sd.name)
          return child
        }))
        node.children = children
      }

      return node
    }

    const rootNode = await buildFullOrgTree(rootId, '公司总部')
    res.json([rootNode])
  } catch (err) {
    res.status(500).json({ error: '钉钉组织树同步失败', details: err?.message || '未知错误' })
  }
})

app.post('/api/employees/sync-dingtalk', async (req, res) => {
  console.log('>>> [员工同步] 基于部门表扫描启动')
  const startTime = Date.now()
  try {
    const accessToken = await getDingTalkAccessToken()
    let targetDeptIds = []
    const idToName = new Map()
    if (DB_ENABLED && dbPool) {
      try {
        const [rows] = await dbPool.query('SELECT id, name FROM departments')
        targetDeptIds = rows.map(r => Number(r.id))
        rows.forEach(r => idToName.set(Number(r.id), String(r.name || '')))
      } catch (_) {}
    }
    if (!targetDeptIds.length) {
      const rootId = Number(req.body?.root_dept_id || process.env.DINGTALK_ROOT_DEPT_ID || 1)
      targetDeptIds = [rootId]
      try {
        const r = await axios.post(`https://oapi.dingtalk.com/topapi/v2/department/get?access_token=${accessToken}`, { dept_id: rootId })
        if (r.data.errcode === 0) idToName.set(rootId, r.data.result.name)
      } catch (_) {}
    }
    const allEmployees = []
    const seenUsers = new Set()
    for (const deptId of targetDeptIds) {
      const deptName = idToName.get(deptId) || '未知部门'
      let cursor = 0
      while (true) {
        try {
          const r = await axios.post(`https://oapi.dingtalk.com/topapi/v2/user/list?access_token=${accessToken}`, { dept_id: deptId, cursor, size: 100 })
          if (r.data.errcode !== 0) break
          const list = r.data.result?.list || []
          for (const u of list) {
            if (seenUsers.has(u.userid)) continue
            seenUsers.add(u.userid)
            allEmployees.push({ userid: u.userid, name: u.name, department: deptName, position: u.title || '', mobile: u.mobile || '', email: u.email || u.org_email || '', active: u.active })
          }
          if (!r.data.result?.has_more) break
          cursor = r.data.result?.next_cursor || 0
        } catch (e) { break }
      }
    }
    if (DB_ENABLED && dbPool) {
      const sql = 'INSERT INTO employees (employee_id, name, department, position, phone, email, status) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), department=VALUES(department), position=VALUES(position), phone=VALUES(phone), status=VALUES(status)'
      for (const e of allEmployees) {
        await dbPool.query(sql, [String(e.userid), String(e.name || ''), String(e.department || ''), e.position || null, e.mobile || null, e.email || null, e.active ? 'active' : 'inactive'])
      }
      return res.json({ success: true, count: allEmployees.length, timeMs: Date.now() - startTime })
    }
    employees = allEmployees.map((e, i) => ({ id: i + 1, employee_id: String(e.userid), name: String(e.name || ''), department: String(e.department || ''), position: e.position || '', phone: e.mobile || '', email: e.email || '', status: e.active ? 'active' : 'inactive' }))
    res.json({ success: true, count: employees.length, timeMs: Date.now() - startTime })
  } catch (err) {
    console.error('员工同步致命错误:', err)
    res.status(500).json({ error: err.message })
  }
})

// Action Plans
app.get('/api/action-plans', (req, res) => {
  const { year, department, status, priority } = req.query || {}
  let result = [...actionPlans]
  if (year) result = result.filter(p => String(p.year) === String(year))
  if (department) result = result.filter(p => p.department === department)
  if (status) result = result.filter(p => p.status === status)
  if (priority) result = result.filter(p => p.priority === priority)
  res.json(result)
})

app.post('/api/action-plans', (req, res) => {
  const data = req.body || {}
  const required = ['year', 'goal', 'what', 'who', 'when', 'department']
  const missing = required.filter(k => !data[k] && data[k] !== 0)
  if (missing.length) {
    return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` })
  }

  const id = actionPlans.length ? Math.max(...actionPlans.map(p => p.id)) + 1 : 1
  const plan = {
    id,
    year: Number(data.year),
    goal: String(data.goal || ''),
    what: String(data.what || ''),
    why: String(data.why || ''),
    who: String(data.who || ''),
    when: String(data.when || ''),
    how: String(data.how || ''),
    how_much: data.how_much !== undefined ? Number(data.how_much) : null,
    department: String(data.department || ''),
    priority: data.priority || 'medium',
    status: data.status || 'not_started',
    progress: data.progress !== undefined ? Number(data.progress) : 0,
    expected_result: data.expected_result || '',
    actual_result: data.actual_result || '',
    remarks: data.remarks || ''
  }
  actionPlans.push(plan)
  res.status(201).json(plan)
})

app.put('/api/action-plans/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = actionPlans.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ error: '行动计划不存在' })
  const incoming = { ...req.body }
  if (incoming.year !== undefined) incoming.year = Number(incoming.year)
  if (incoming.how_much !== undefined) incoming.how_much = Number(incoming.how_much)
  if (incoming.progress !== undefined) incoming.progress = Number(incoming.progress)
  actionPlans[index] = { ...actionPlans[index], ...incoming }
  res.json(actionPlans[index])
})

app.delete('/api/action-plans/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = actionPlans.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ error: '行动计划不存在' })
  actionPlans.splice(index, 1)
  res.json({ success: true })
})

// Simple Auth
const demoUsers = []

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }

  const found = users.find(u => u.username === String(username) && u.password === String(password) && u.status !== '禁用')
  if (!found) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }

  const token = jwt.sign({ id: found.id, username: found.username, role: found.role }, JWT_SECRET, { expiresIn: '2h' })
  const { password: _omit, ...safeUser } = found
  const idx = users.findIndex(u => u.username === String(username))
  if (idx !== -1) {
    users[idx] = { ...users[idx], lastLogin: new Date().toISOString() }
  }
  res.json({ token, user: safeUser })
})

// Department Targets
app.get('/api/department-targets', (req, res) => {
  const { year, department, targetType } = req.query || {}
  let result = [...departmentTargets]

  if (year) result = result.filter(t => String(t.year) === String(year))
  if (department) result = result.filter(t => t.department === department)
  if (targetType) result = result.filter(t => t.target_type === targetType)

  res.json(result)
})

app.post('/api/department-targets', (req, res) => {
  const data = req.body || {}

  // Basic validation aligned with UI requirements
  const required = ['year', 'department_id', 'target_type']
  const missing = required.filter(k => !data[k] && data[k] !== 0)
  if (missing.length) {
    return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` })
  }

  const id = departmentTargets.length ? Math.max(...departmentTargets.map(t => t.id)) + 1 : 1
  const dept = departments.find(d => d.id === Number(data.department_id))
  const target = {
    id,
    year: Number(data.year),
    department_id: Number(data.department_id),
    department: dept ? dept.name : '',
    target_level: data.target_level || 'A',
    target_type: data.target_type || '',
    target_name: data.target_name || '',
    target_value: data.target_value !== undefined ? Number(data.target_value) : null,
    unit: data.unit || '',
    quarter: data.quarter || null,
    month: data.month !== undefined ? Number(data.month) : null,
    current_value: data.current_value !== undefined ? Number(data.current_value) : 0,
    responsible_person: data.responsible_person || '',
    description: data.description || '',
    created_at: new Date().toISOString()
  }
  departmentTargets.push(target)
  res.status(201).json(target)
})

app.put('/api/department-targets/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = departmentTargets.findIndex(t => t.id === id)
  if (index === -1) return res.status(404).json({ error: '部门目标不存在' })

  const incoming = { ...req.body }
  if (incoming.year !== undefined) incoming.year = Number(incoming.year)
  if (incoming.department_id !== undefined) {
    incoming.department_id = Number(incoming.department_id)
    const dept = departments.find(d => d.id === incoming.department_id)
    incoming.department = dept ? dept.name : departmentTargets[index].department
  }
  if (incoming.target_value !== undefined) incoming.target_value = Number(incoming.target_value)
  if (incoming.month !== undefined) incoming.month = Number(incoming.month)
  if (incoming.current_value !== undefined) incoming.current_value = Number(incoming.current_value)

  departmentTargets[index] = { ...departmentTargets[index], ...incoming }
  res.json(departmentTargets[index])
})

app.delete('/api/department-targets/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = departmentTargets.findIndex(t => t.id === id)
  if (index === -1) return res.status(404).json({ error: '部门目标不存在' })
  departmentTargets.splice(index, 1)
  res.json({ success: true })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/integration/status', (req, res) => {
  const envOK = Boolean(process.env.DINGTALK_APP_KEY && process.env.DINGTALK_APP_SECRET)
  let uiOK = false
  try {
    const rec = systemSettings.find(s => s && s.key === 'integration' && s.value)
    uiOK = Boolean(rec && rec.value && rec.value.dingtalkAppKey && rec.value.dingtalkAppSecret)
  } catch (_) {}
  res.json({ dingtalkConfigured: envOK || uiOK })
})

// Admin: create simple JSON backup of in-memory data
app.post('/api/admin/backup', async (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), 'backups')
    await fs.mkdir(backupDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `system-backup-${ts}.json`
    const filepath = path.join(backupDir, filename)
    const payload = {
      meta: {
        generated_at: new Date().toISOString(),
        version: '1.0.0'
      },
      companyInfo,
      departments,
      employees,
      users,
      actionPlans,
      departmentTargets,
      annualWorkPlans,
      majorEvents,
      monthlyProgress,
      templates,
      targetTypes,
      systemSettings
    }
    await fs.writeFile(filepath, JSON.stringify(payload, null, 2), 'utf-8')
    res.json({ success: true, path: filepath })
  } catch (err) {
    console.error('Backup failed:', err)
    res.status(500).json({ success: false, error: 'Backup failed' })
  }
})

// Serve backups statically
app.use('/backups', express.static(path.join(process.cwd(), 'backups')))
app.use('/api/backups', express.static(path.join(process.cwd(), 'backups')))

// List backups
app.get('/api/admin/backups', async (req, res) => {
  try {
    const dir = path.join(process.cwd(), 'backups')
    try { await fs.mkdir(dir, { recursive: true }) } catch (_) {}
    const files = await fs.readdir(dir)
    const items = await Promise.all(files.map(async (name) => {
      const full = path.join(dir, name)
      const stat = await fs.stat(full)
      return {
        name,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        url: `/api/backups/${encodeURIComponent(name)}`
      }
    }))
    // sort by mtime desc
    items.sort((a, b) => new Date(b.mtime) - new Date(a.mtime))
    res.json({ success: true, items })
  } catch (err) {
    console.error('List backups failed:', err)
    res.status(500).json({ success: false, error: 'List backups failed' })
  }
})
// Users
app.get('/api/users', (req, res) => {
  res.json(users)
})

app.post('/api/users', (req, res) => {
  const data = req.body || {}
  if (!data.username || !data.password || !data.role) {
    return res.status(400).json({ error: '用户名、密码、角色为必填项' })
  }
  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1
  const user = { id, username: String(data.username), password: String(data.password), role: String(data.role), status: data.status || '启用', lastLogin: '从未登录', permissions: Array.isArray(data.permissions) ? data.permissions : [] }
  users.push(user)
  res.status(201).json(user)
})

app.put('/api/users/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = users.findIndex(u => u.id === id)
  if (index === -1) return res.status(404).json({ error: '用户不存在' })
  const incoming = { ...req.body }
  if (incoming.permissions && !Array.isArray(incoming.permissions)) incoming.permissions = []
  users[index] = { ...users[index], ...incoming }
  res.json(users[index])
})

app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = users.findIndex(u => u.id === id)
  if (index === -1) return res.status(404).json({ error: '用户不存在' })
  users.splice(index, 1)
  res.status(204).end()
})

// Annual Work Plans
app.get('/api/annual-work-plans', (req, res) => {
  const { year, department, category, status, month, sheet_type } = req.query || {}
  if (DB_ENABLED && dbPool) {
    const where = []
    const params = []
    if (year) { where.push('year = ?'); params.push(Number(year)) }
    if (department) { where.push('(department_name = ? OR department = ?)'); params.push(department, department) }
    if (category) { where.push('category = ?'); params.push(category) }
    if (status) { where.push('status = ?'); params.push(status) }
    if (month) { where.push('month = ?'); params.push(Number(month)) }
    if (sheet_type) { where.push('sheet_type = ?'); params.push(sheet_type) }
    const sql = `SELECT * FROM annual_work_plans${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`
    dbPool.query(sql, params).then(([rows]) => res.json(rows)).catch(() => res.status(500).json([]))
    return
  }
  let result = [...annualWorkPlans]
  if (year) result = result.filter(p => String(p.year) === String(year))
  if (department) result = result.filter(p => (p.department_name || p.department) === department)
  if (category) result = result.filter(p => p.category === category)
  if (status) result = result.filter(p => p.status === status)
  if (month) result = result.filter(p => String(p.month) === String(month))
  if (sheet_type) result = result.filter(p => p.sheet_type === sheet_type)
  res.json(result)
})

app.post('/api/annual-work-plans', (req, res) => {
  const data = req.body || {}

  // 当前端传入 sheet_type（planning/events/monthly/action）时，兼容保存各表数据结构
  if (data.sheet_type) {
    if (DB_ENABLED && dbPool) {
      const payload = {
        sheet_type: String(data.sheet_type),
        year: data.year !== undefined ? Number(data.year) : new Date().getFullYear(),
        month: data.month !== undefined ? Number(data.month) : null,
        department_id: data.department_id !== undefined ? Number(data.department_id) : null,
        department_name: data.department_name || null,
        plan_name: data.plan_name || null,
        category: data.category || null,
        priority: data.priority || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        budget: data.budget !== undefined ? Number(data.budget) : null,
        status: data.status || null,
        responsible_person: data.responsible_person || null
      }
      const keys = Object.keys(payload)
      const placeholders = keys.map(() => '?').join(',')
      const values = keys.map(k => payload[k])
      dbPool.query(`INSERT INTO annual_work_plans (${keys.join(',')}) VALUES (${placeholders})`, values)
        .then(([ret]) => res.status(201).json({ id: ret.insertId, ...payload }))
        .catch(() => res.status(500).json({ error: '数据库写入失败' }))
      return
    }
    const id = annualWorkPlans.length ? Math.max(...annualWorkPlans.map(p => p.id)) + 1 : 1
    const plan = {
      id,
      sheet_type: String(data.sheet_type),
      year: data.year !== undefined ? Number(data.year) : new Date().getFullYear(),
      month: data.month !== undefined ? Number(data.month) : null,
      ...data
    }
    annualWorkPlans.push(plan)
    return res.status(201).json(plan)
  }

  // 兼容原有年度计划结构
  const required = ['year', 'plan_name', 'department_id']
  const missing = required.filter(k => !data[k] && data[k] !== 0)
  if (missing.length) return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` })

  const id = annualWorkPlans.length ? Math.max(...annualWorkPlans.map(p => p.id)) + 1 : 1
  const plan = {
    id,
    year: Number(data.year),
    department_id: Number(data.department_id),
    department_name: data.department_name || '',
    plan_name: String(data.plan_name || ''),
    month: data.month !== undefined ? Number(data.month) : null,
    category: data.category || '',
    priority: data.priority || 'medium',
    start_date: data.start_date || '',
    end_date: data.end_date || '',
    budget: data.budget !== undefined ? Number(data.budget) : null,
    status: data.status || 'planning',
    responsible_person: data.responsible_person || ''
  }
  annualWorkPlans.push(plan)
  res.status(201).json(plan)
})

app.put('/api/annual-work-plans/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
    const incoming = { ...req.body }
    const allowed = ['sheet_type','year','month','department_id','department_name','plan_name','category','priority','start_date','end_date','budget','status','responsible_person']
    const { setSql, values } = buildSafeUpdate(incoming, allowed)
    if (!setSql) return res.status(400).json({ error: '无有效更新字段' })
    values.push(id)
    dbPool.query(`UPDATE annual_work_plans SET ${setSql} WHERE id = ?`, values)
      .then(() => res.json({ id, ...incoming }))
      .catch(() => res.status(500).json({ error: '数据库更新失败' }))
    return
  }
  const index = annualWorkPlans.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ error: '年度工作计划不存在' })
  const incoming = { ...req.body }
  if (incoming.year !== undefined) incoming.year = Number(incoming.year)
  if (incoming.month !== undefined) incoming.month = Number(incoming.month)
  if (incoming.budget !== undefined) incoming.budget = Number(incoming.budget)
  if (incoming.department_id !== undefined) incoming.department_id = Number(incoming.department_id)
  annualWorkPlans[index] = { ...annualWorkPlans[index], ...incoming }
  res.json(annualWorkPlans[index])
})

app.delete('/api/annual-work-plans/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
  dbPool.query('DELETE FROM annual_work_plans WHERE id = ?', [id])
      .then(() => res.json({ success: true }))
      .catch(() => res.status(500).json({ error: '数据库删除失败' }))
    return
  }
  const index = annualWorkPlans.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ error: '年度工作计划不存在' })
  annualWorkPlans.splice(index, 1)
  res.json({ success: true })
})

// Major Events
app.get('/api/major-events', (req, res) => {
  const { year, event_type, importance, status } = req.query || {}
  if (DB_ENABLED && dbPool) {
    const where = []
    const params = []
    if (year) { where.push('year = ?'); params.push(Number(year)) }
    if (event_type) { where.push('event_type = ?'); params.push(event_type) }
    if (importance) { where.push('importance = ?'); params.push(importance) }
    if (status) { where.push('status = ?'); params.push(status) }
    const sql = `SELECT * FROM major_events${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`
    dbPool.query(sql, params).then(([rows]) => res.json(rows)).catch(() => res.status(500).json([]))
    return
  }
  let result = [...majorEvents]
  if (year) result = result.filter(e => String(e.year) === String(year))
  if (event_type) result = result.filter(e => e.event_type === event_type)
  if (importance) result = result.filter(e => e.importance === importance)
  if (status) result = result.filter(e => e.status === status)
  res.json(result)
})

app.post('/api/major-events', (req, res) => {
  const data = req.body || {}
  const required = ['year', 'event_name', 'department_id']
  const missing = required.filter(k => !data[k] && data[k] !== 0)
  if (missing.length) return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` })
  if (DB_ENABLED && dbPool) {
    const payload = {
      year: Number(data.year),
      event_name: String(data.event_name || ''),
      event_type: data.event_type || null,
      importance: data.importance || 'medium',
      planned_date: data.planned_date || null,
      actual_date: data.actual_date || null,
      department_id: Number(data.department_id),
      responsible_department: data.responsible_department || null,
      responsible_person: data.responsible_person || null,
      status: data.status || 'planning',
      budget: data.budget !== undefined ? Number(data.budget) : null,
      actual_cost: data.actual_cost !== undefined ? Number(data.actual_cost) : null,
      description: data.description || null
    }
    const keys = Object.keys(payload)
    const placeholders = keys.map(() => '?').join(',')
    const values = keys.map(k => payload[k])
    dbPool.query(`INSERT INTO major_events (${keys.join(',')}) VALUES (${placeholders})`, values)
      .then(([ret]) => res.status(201).json({ id: ret.insertId, ...payload }))
      .catch(() => res.status(500).json({ error: '数据库写入失败' }))
    return
  }
  const id = majorEvents.length ? Math.max(...majorEvents.map(e => e.id)) + 1 : 1
  const event = {
    id,
    year: Number(data.year),
    event_name: String(data.event_name || ''),
    event_type: data.event_type || '',
    importance: data.importance || 'medium',
    planned_date: data.planned_date || '',
    actual_date: data.actual_date || '',
    department_id: Number(data.department_id),
    responsible_department: data.responsible_department || '',
    responsible_person: data.responsible_person || '',
    status: data.status || 'planning',
    budget: data.budget !== undefined ? Number(data.budget) : null,
    actual_cost: data.actual_cost !== undefined ? Number(data.actual_cost) : null,
    description: data.description || ''
  }
  majorEvents.push(event)
  res.status(201).json(event)
})

app.put('/api/major-events/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
    const incoming = { ...req.body }
    const allowed = ['year','event_name','event_type','importance','planned_date','actual_date','department_id','responsible_department','responsible_person','status','budget','actual_cost','description']
    const { setSql, values } = buildSafeUpdate(incoming, allowed)
    if (!setSql) return res.status(400).json({ error: '无有效更新字段' })
    values.push(id)
    dbPool.query(`UPDATE major_events SET ${setSql} WHERE id = ?`, values)
      .then(() => res.json({ id, ...incoming }))
      .catch(() => res.status(500).json({ error: '数据库更新失败' }))
    return
  }
  const index = majorEvents.findIndex(e => e.id === id)
  if (index === -1) return res.status(404).json({ error: '大事件不存在' })
  const incoming = { ...req.body }
  if (incoming.year !== undefined) incoming.year = Number(incoming.year)
  if (incoming.department_id !== undefined) incoming.department_id = Number(incoming.department_id)
  if (incoming.budget !== undefined) incoming.budget = Number(incoming.budget)
  if (incoming.actual_cost !== undefined) incoming.actual_cost = Number(incoming.actual_cost)
  majorEvents[index] = { ...majorEvents[index], ...incoming }
  res.json(majorEvents[index])
})

app.delete('/api/major-events/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
  dbPool.query('DELETE FROM major_events WHERE id = ?', [id])
      .then(() => res.json({ success: true }))
      .catch(() => res.status(500).json({ error: '数据库删除失败' }))
    return
  }
  const index = majorEvents.findIndex(e => e.id === id)
  if (index === -1) return res.status(404).json({ error: '大事件不存在' })
  majorEvents.splice(index, 1)
  res.json({ success: true })
})

// Monthly Progress
app.get('/api/monthly-progress', (req, res) => {
  const { year, month, department, status } = req.query || {}
  if (DB_ENABLED && dbPool) {
    const where = []
    const params = []
    if (year) { where.push('year = ?'); params.push(Number(year)) }
    if (month) { where.push('month = ?'); params.push(Number(month)) }
    if (department) { where.push('department = ?'); params.push(department) }
    if (status) { where.push('status = ?'); params.push(status) }
    const sql = `SELECT * FROM monthly_progress${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`
    dbPool.query(sql, params).then(([rows]) => res.json(rows)).catch(() => res.status(500).json([]))
    return
  }
  let result = [...monthlyProgress]
  if (year) result = result.filter(p => String(p.year) === String(year))
  if (month) result = result.filter(p => String(p.month) === String(month))
  if (department) result = result.filter(p => p.department === department)
  if (status) result = result.filter(p => p.status === status)
  res.json(result)
})

app.post('/api/monthly-progress', (req, res) => {
  const data = req.body || {}
  const required = ['year', 'month', 'task_name']
  const missing = required.filter(k => !data[k] && data[k] !== 0)
  if (missing.length) return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` })
  if (DB_ENABLED && dbPool) {
    const payload = {
      year: Number(data.year),
      month: Number(data.month),
      department: data.department || null,
      task_name: data.task_name || '',
      target_value: data.target_value !== undefined ? Number(data.target_value) : null,
      actual_value: data.actual_value !== undefined ? Number(data.actual_value) : null,
      status: data.status || 'on_track',
      responsible_person: data.responsible_person || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      key_activities: data.key_activities || null,
      achievements: data.achievements || null,
      challenges: data.challenges || null,
      next_month_plan: data.next_month_plan || null,
      support_needed: data.support_needed || null
    }
    const keys = Object.keys(payload)
    const placeholders = keys.map(() => '?').join(',')
    const values = keys.map(k => payload[k])
    dbPool.query(`INSERT INTO monthly_progress (${keys.join(',')}) VALUES (${placeholders})`, values)
      .then(([ret]) => res.status(201).json({ id: ret.insertId, ...payload }))
      .catch(() => res.status(500).json({ error: '数据库写入失败' }))
    return
  }
  const id = monthlyProgress.length ? Math.max(...monthlyProgress.map(p => p.id)) + 1 : 1
  const item = {
    id,
    year: Number(data.year),
    month: Number(data.month),
    department: data.department || '',
    task_name: data.task_name || '',
    target_value: data.target_value !== undefined ? Number(data.target_value) : null,
    actual_value: data.actual_value !== undefined ? Number(data.actual_value) : null,
    status: data.status || 'on_track',
    responsible_person: data.responsible_person || '',
    start_date: data.start_date || '',
    end_date: data.end_date || '',
    key_activities: data.key_activities || '',
    achievements: data.achievements || '',
    challenges: data.challenges || '',
    next_month_plan: data.next_month_plan || '',
    support_needed: data.support_needed || ''
  }
  monthlyProgress.push(item)
  res.status(201).json(item)
})

app.put('/api/monthly-progress/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
    const incoming = { ...req.body }
    const allowed = ['year','month','department','task_name','target_value','actual_value','status','responsible_person','start_date','end_date','key_activities','achievements','challenges','next_month_plan','support_needed']
    const { setSql, values } = buildSafeUpdate(incoming, allowed)
    if (!setSql) return res.status(400).json({ error: '无有效更新字段' })
    values.push(id)
    dbPool.query(`UPDATE monthly_progress SET ${setSql} WHERE id = ?`, values)
      .then(() => res.json({ id, ...incoming }))
      .catch(() => res.status(500).json({ error: '数据库更新失败' }))
    return
  }
  const index = monthlyProgress.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ error: '月度推进计划不存在' })
  const incoming = { ...req.body }
  if (incoming.year !== undefined) incoming.year = Number(incoming.year)
  if (incoming.month !== undefined) incoming.month = Number(incoming.month)
  if (incoming.target_value !== undefined) incoming.target_value = Number(incoming.target_value)
  if (incoming.actual_value !== undefined) incoming.actual_value = Number(incoming.actual_value)
  monthlyProgress[index] = { ...monthlyProgress[index], ...incoming }
  res.json(monthlyProgress[index])
})

app.delete('/api/monthly-progress/:id', (req, res) => {
  const id = Number(req.params.id)
  if (DB_ENABLED && dbPool) {
  dbPool.query('DELETE FROM monthly_progress WHERE id = ?', [id])
      .then(() => res.json({ success: true }))
      .catch(() => res.status(500).json({ error: '数据库删除失败' }))
    return
  }
  const index = monthlyProgress.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ error: '月度推进计划不存在' })
  monthlyProgress.splice(index, 1)
  res.json({ success: true })
})

// Templates
app.get('/api/templates', (req, res) => res.json(templates))
app.post('/api/templates', (req, res) => {
  const id = templates.length ? Math.max(...templates.map(t => t.id)) + 1 : 1
  const tpl = { id, ...req.body }
  templates.push(tpl)
  res.status(201).json(tpl)
})
app.put('/api/templates/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = templates.findIndex(t => t.id === id)
  if (index === -1) return res.status(404).json({ error: '模板不存在' })
  templates[index] = { ...templates[index], ...req.body }
  res.json(templates[index])
})
app.delete('/api/templates/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = templates.findIndex(t => t.id === id)
  if (index === -1) return res.status(404).json({ error: '模板不存在' })
  templates.splice(index, 1)
  res.json({ success: true })
})

// Target Types
app.get('/api/target-types', (req, res) => res.json(targetTypes))
app.post('/api/target-types', (req, res) => {
  const id = targetTypes.length ? Math.max(...targetTypes.map(t => t.id)) + 1 : 1
  const item = { id, ...req.body }
  targetTypes.push(item)
  res.status(201).json(item)
})
app.put('/api/target-types/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = targetTypes.findIndex(t => t.id === id)
  if (index === -1) return res.status(404).json({ error: '目标类型不存在' })
  targetTypes[index] = { ...targetTypes[index], ...req.body }
  res.json(targetTypes[index])
})
app.delete('/api/target-types/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = targetTypes.findIndex(t => t.id === id)
  if (index === -1) return res.status(404).json({ error: '目标类型不存在' })
  targetTypes.splice(index, 1)
  res.json({ success: true })
})

// System Settings
app.get('/api/system-settings', (req, res) => res.json(systemSettings))
app.post('/api/system-settings', async (req, res) => {
  const id = systemSettings.length ? Math.max(...systemSettings.map(s => s.id)) + 1 : 1
  const setting = { id, ...req.body }
  systemSettings.push(setting)
  try { await saveDingTalkConfigToFileFromSettings() } catch (_) {}
  res.status(201).json(setting)
})
app.put('/api/system-settings/:id', async (req, res) => {
  const id = Number(req.params.id)
  const index = systemSettings.findIndex(s => s.id === id)
  if (index === -1) return res.status(404).json({ error: '系统设置不存在' })
  systemSettings[index] = { ...systemSettings[index], ...req.body }
  try { await saveDingTalkConfigToFileFromSettings() } catch (_) {}
  res.json(systemSettings[index])
})
app.delete('/api/system-settings/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = systemSettings.findIndex(s => s.id === id)
  if (index === -1) return res.status(404).json({ error: '系统设置不存在' })
  systemSettings.splice(index, 1)
  res.json({ success: true })
})

// Notifications
let notifications = []
app.get('/api/notifications', (req, res) => {
  res.json(notifications)
})
app.post('/api/notifications', (req, res) => {
  const data = req.body || {}
  const required = ['title', 'message']
  const missing = required.filter(k => !data[k] && data[k] !== 0)
  if (missing.length) return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` })
  const id = notifications.length ? Math.max(...notifications.map(n => n.id)) + 1 : 1
  const item = {
    id,
    type: data.type || 'info',
    title: String(data.title || ''),
    message: String(data.message || data.content || ''),
    published_at: data.published_at || new Date().toISOString(),
    read: Boolean(data.read)
  }
  notifications.push(item)
  res.status(201).json(item)
})
app.put('/api/notifications/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = notifications.findIndex(n => n.id === id)
  if (index === -1) return res.status(404).json({ error: '通知不存在' })
  notifications[index] = { ...notifications[index], ...req.body }
  res.json(notifications[index])
})
app.delete('/api/notifications/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = notifications.findIndex(n => n.id === id)
  if (index === -1) return res.status(404).json({ error: '通知不存在' })
  notifications.splice(index, 1)
  res.status(204).end()
})

// Database backup (in-memory snapshot to JSON files)
function backupSnapshot() {
  try {
    const stamp = new Date()
    const dirName = `${stamp.getFullYear()}${String(stamp.getMonth()+1).padStart(2,'0')}${String(stamp.getDate()).padStart(2,'0')}-${String(stamp.getHours()).padStart(2,'0')}${String(stamp.getMinutes()).padStart(2,'0')}${String(stamp.getSeconds()).padStart(2,'0')}`
    const backupsRoot = path.join(process.cwd(), 'backups')
    const targetDir = path.join(backupsRoot, dirName)
    fs.mkdirSync(targetDir, { recursive: true })
    const datasets = {
      departments,
      employees,
      users,
      actionPlans,
      departmentTargets,
      annualWorkPlans,
      majorEvents,
      monthlyProgress,
      templates,
      targetTypes,
      systemSettings,
      companyInfo,
      notifications
    }
    for (const [name, data] of Object.entries(datasets)) {
      fs.writeFileSync(path.join(targetDir, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8')
    }
    return { ok: true, dir: targetDir, files: Object.keys(datasets) }
  } catch (e) {
    console.error('Backup snapshot failed:', e)
    return { ok: false, error: e?.message || String(e) }
  }
}

app.post('/api/admin/backup', (req, res) => {
  const result = backupSnapshot()
  if (result.ok) {
    return res.json({ success: true, path: result.dir, files: result.files })
  }
  return res.status(500).json({ success: false, error: result.error || '备份失败' })
})

// Company Info
app.get('/api/company-info', (req, res) => {
  res.json(companyInfo)
})
app.put('/api/company-info', (req, res) => {
  companyInfo = { ...companyInfo, ...req.body }
  res.json(companyInfo)
})

// Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' })
  const fileUrl = `/uploads/${encodeURIComponent(path.basename(req.file.filename))}`
  res.json({ filename: req.file.filename, size: req.file.size, url: fileUrl })
})

// 404 handler (register at the end)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

// server start moved to start() above
