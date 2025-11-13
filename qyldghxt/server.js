// Minimal Express backend for qyldghxt
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

const app = express()
const PORT = 5004

app.use(express.json())
app.use(cors())
const upload = multer({ storage: multer.memoryStorage() })

// Create HTTP server and bind Socket.IO
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  path: '/socket.io',
  cors: {
    origin: 'http://localhost:3003',
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
  { id: 1, username: 'admin', password: 'admin123', role: '管理员', status: '启用', lastLogin: '从未登录' },
  { id: 2, username: 'user', password: 'user123', role: '普通用户', status: '启用', lastLogin: '从未登录' }
]

// 5W2H Action Plans
let actionPlans = [
  {
    id: 1,
    year: new Date().getFullYear(),
    what: '拓展线上销售渠道',
    why: '提升销售额与品牌影响力',
    who: '市场部',
    when: '2025-03-01',
    where: '总部及各电商平台',
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
    what: '引入OKR绩效管理',
    why: '提升团队目标对齐与执行力',
    who: '人力资源部',
    when: '2025-04-15',
    where: '公司内部',
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
let departmentTargets = [
  {
    id: 1,
    year: new Date().getFullYear(),
    department_id: 2,
    department: '市场部',
    target_level: 'B',
    target_type: 'sales',
    target_name: '销售目标',
    target_value: 1200,
    unit: '万元',
    quarter: 'Q1',
    month: 3,
    current_value: 300,
    responsible_person: '王五',
    description: '一季度线上渠道销售指标',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    year: new Date().getFullYear(),
    department_id: 3,
    department: '研发部',
    target_level: 'A',
    target_type: 'efficiency',
    target_name: '效率目标',
    target_value: 85,
    unit: '%',
    quarter: 'Q2',
    month: 6,
    current_value: 60,
    responsible_person: '赵六',
    description: '代码质量与交付效率提升',
    created_at: new Date().toISOString()
  }
]

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
  res.json(departments)
})

app.post('/api/departments', (req, res) => {
  const { name } = req.body || {}
  if (!name) return res.status(400).json({ error: '部门名称不能为空' })
  const id = departments.length ? Math.max(...departments.map(d => d.id)) + 1 : 1
  const dept = { id, name }
  departments.push(dept)
  res.status(201).json(dept)
})

app.put('/api/departments/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = departments.findIndex(d => d.id === id)
  if (index === -1) return res.status(404).json({ error: '部门不存在' })
  departments[index] = { ...departments[index], ...req.body }
  res.json(departments[index])
})

app.delete('/api/departments/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = departments.findIndex(d => d.id === id)
  if (index === -1) return res.status(404).json({ error: '部门不存在' })
  departments.splice(index, 1)
  res.status(204).end()
})

// Employees
app.get('/api/employees', (req, res) => {
  res.json(employees)
})

app.post('/api/employees', (req, res) => {
  const data = req.body || {}
  if (!data.name || !data.employee_id || !data.department) {
    return res.status(400).json({ error: '姓名、工号和部门为必填项' })
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
  const index = employees.findIndex(e => e.id === id)
  if (index === -1) return res.status(404).json({ error: '员工不存在' })
  employees[index] = { ...employees[index], ...req.body }
  res.json(employees[index])
})

app.delete('/api/employees/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = employees.findIndex(e => e.id === id)
  if (index === -1) return res.status(404).json({ error: '员工不存在' })
  employees.splice(index, 1)
  res.status(204).end()
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
  // Required fields based on UI usage
  const required = ['year', 'what', 'why', 'who', 'when', 'department']
  const missing = required.filter(k => !data[k] && data[k] !== 0)
  if (missing.length) {
    return res.status(400).json({ error: `缺少必填项: ${missing.join(', ')}` })
  }

  const id = actionPlans.length ? Math.max(...actionPlans.map(p => p.id)) + 1 : 1
  const plan = {
    id,
    year: Number(data.year),
    what: String(data.what || ''),
    why: String(data.why || ''),
    who: String(data.who || ''),
    when: String(data.when || ''),
    where: String(data.where || ''),
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
  res.status(204).end()
})

// Simple Auth
const demoUsers = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    email: 'admin@company.com',
    department: '技术部',
    permissions: ['admin', '系统管理', '用户管理', '数据查看', '报表导出']
  },
  {
    id: 2,
    username: 'user',
    password: 'user123',
    role: 'user',
    email: 'user@company.com',
    department: '市场部',
    permissions: ['数据查看']
  }
]

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }

  const found = demoUsers.find(u => u.username === String(username) && u.password === String(password))
  if (!found) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }

  const token = Buffer.from(`${found.username}:${Date.now()}`).toString('base64')
  const { password: _omit, ...safeUser } = found
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
  res.status(204).end()
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

httpServer.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`)
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
  const user = { id, username: String(data.username), password: String(data.password), role: String(data.role), status: data.status || '启用', lastLogin: '从未登录' }
  users.push(user)
  res.status(201).json(user)
})

app.put('/api/users/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = users.findIndex(u => u.id === id)
  if (index === -1) return res.status(404).json({ error: '用户不存在' })
  users[index] = { ...users[index], ...req.body }
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
  const { year, department, category, status, month } = req.query || {}
  let result = [...annualWorkPlans]
  if (year) result = result.filter(p => String(p.year) === String(year))
  if (department) result = result.filter(p => (p.department_name || p.department) === department)
  if (category) result = result.filter(p => p.category === category)
  if (status) result = result.filter(p => p.status === status)
  if (month) result = result.filter(p => String(p.month) === String(month))
  res.json(result)
})

app.post('/api/annual-work-plans', (req, res) => {
  const data = req.body || {}
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
  const index = annualWorkPlans.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ error: '年度工作计划不存在' })
  annualWorkPlans.splice(index, 1)
  res.status(204).end()
})

// Major Events
app.get('/api/major-events', (req, res) => {
  const { year, event_type, importance, status } = req.query || {}
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
  const index = majorEvents.findIndex(e => e.id === id)
  if (index === -1) return res.status(404).json({ error: '大事件不存在' })
  majorEvents.splice(index, 1)
  res.status(204).end()
})

// Monthly Progress
app.get('/api/monthly-progress', (req, res) => {
  const { year, month, department, status } = req.query || {}
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
    responsible_person: data.responsible_person || ''
  }
  monthlyProgress.push(item)
  res.status(201).json(item)
})

app.put('/api/monthly-progress/:id', (req, res) => {
  const id = Number(req.params.id)
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
  const index = monthlyProgress.findIndex(p => p.id === id)
  if (index === -1) return res.status(404).json({ error: '月度推进计划不存在' })
  monthlyProgress.splice(index, 1)
  res.status(204).end()
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
  res.status(204).end()
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
  res.status(204).end()
})

// System Settings
app.get('/api/system-settings', (req, res) => res.json(systemSettings))
app.post('/api/system-settings', (req, res) => {
  const id = systemSettings.length ? Math.max(...systemSettings.map(s => s.id)) + 1 : 1
  const setting = { id, ...req.body }
  systemSettings.push(setting)
  res.status(201).json(setting)
})
app.put('/api/system-settings/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = systemSettings.findIndex(s => s.id === id)
  if (index === -1) return res.status(404).json({ error: '系统设置不存在' })
  systemSettings[index] = { ...systemSettings[index], ...req.body }
  res.json(systemSettings[index])
})
app.delete('/api/system-settings/:id', (req, res) => {
  const id = Number(req.params.id)
  const index = systemSettings.findIndex(s => s.id === id)
  if (index === -1) return res.status(404).json({ error: '系统设置不存在' })
  systemSettings.splice(index, 1)
  res.status(204).end()
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
  res.json({ filename: req.file.originalname, size: req.file.size })
})
