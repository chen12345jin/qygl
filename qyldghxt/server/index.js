import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import dotenv from 'dotenv';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const BACKUP_DIR = path.join(__dirname, '../backups');
const UPDATES_DIR = path.join(__dirname, '../public/updates');
const SYSTEM_SETTINGS_FILE = path.join(__dirname, '../temp_store/system_settings.json');
const AUDIT_LOG_FILE = path.join(__dirname, '../temp_store/audit_logs.json');
const DEPARTMENT_TARGETS_FILE = path.join(__dirname, '../temp_store/department_targets.json');
const ANNUAL_WORK_PLANS_FILE = path.join(__dirname, '../temp_store/annual_work_plans.json');
const MAJOR_EVENTS_FILE = path.join(__dirname, '../temp_store/major_events.json');
const MONTHLY_PROGRESS_FILE = path.join(__dirname, '../temp_store/monthly_progress.json');
const ACTION_PLANS_FILE = path.join(__dirname, '../temp_store/action_plans.json');
const DEPARTMENTS_FILE = path.join(__dirname, '../temp_store/departments.json');
const EMPLOYEES_FILE = path.join(__dirname, '../temp_store/employees.json');
const USERS_FILE = path.join(__dirname, '../temp_store/users.json');
const TARGET_TYPES_FILE = path.join(__dirname, '../temp_store/target_types.json');
const ROLES_FILE = path.join(__dirname, '../temp_store/roles.json');
const TEMPLATES_FILE = path.join(__dirname, '../temp_store/templates.json');
const NOTIFICATIONS_FILE = path.join(__dirname, '../temp_store/notifications.json');
const COMPANY_INFO_FILE = path.join(__dirname, '../temp_store/company_info.json');
const upload = multer({ storage: multer.memoryStorage() });

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const PORT = 5004;

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
if (!fs.existsSync(UPDATES_DIR)) {
  fs.mkdirSync(UPDATES_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));
app.use('/backups', express.static(BACKUP_DIR));
app.use('/updates', express.static(UPDATES_DIR));

app.use((req, res, next) => {
  if (!req.path || !req.path.startsWith('/api')) {
    return next();
  }
  const start = Date.now();
  const method = req.method || '';
  const ip = req.ip;
  const ua = req.headers && req.headers['user-agent'] ? req.headers['user-agent'] : '';
  const rawUsername =
    (req.headers && (req.headers['x-user-name'] || req.headers['x-username'])) || '';
  const rawRole =
    (req.headers && (req.headers['x-user-role'] || req.headers['x-role'])) || '';
  const username = typeof rawUsername === 'string' ? rawUsername : '';
  const role = typeof rawRole === 'string' ? rawRole : '';
  const query = req.query || {};
  let body = null;
  if (method !== 'GET' && method !== 'HEAD') {
    if (req.path === '/api/login') {
      const b = req.body || {};
      body = { username: b.username || '' };
    } else if (req.path === '/api/upload') {
      const b = req.body || {};
      body = { ...b };
      if (body.file) {
        delete body.file;
      }
    } else {
      body = req.body || {};
    }
  }
  res.on('finish', () => {
    if (res.locals && res.locals.auditLogged) {
      return;
    }
    const status = res.statusCode || 200;
    const durationMs = Date.now() - start;
    appendAuditLog({
      username,
      role,
      method,
      path: req.path || '',
      status,
      duration_ms: durationMs,
      ip,
      ua,
      query,
      body
    });
  });
  next();
});

const mockData = {
  annual_work_plans: [],
  major_events: [],
  monthly_progress: [],
  departments: [
    {
      id: 1,
      name: '技术部',
      code: 'TECH',
      parent_id: null,
      status: 'active',
      created_at: '2025-01-01T00:00:00.000Z'
    },
    {
      id: 2,
      name: '销售部',
      code: 'SALES',
      parent_id: null,
      status: 'active',
      created_at: '2025-01-01T00:00:00.000Z'
    },
    {
      id: 3,
      name: '市场部',
      code: 'MARKET',
      parent_id: null,
      status: 'active',
      created_at: '2025-01-01T00:00:00.000Z'
    },
    {
      id: 4,
      name: '人事部',
      code: 'HR',
      parent_id: null,
      status: 'active',
      created_at: '2025-01-01T00:00:00.000Z'
    }
  ],
  employees: [],
  action_plans: [],
  notifications: [],
  users: [
    {
      id: 1,
      username: 'admin',
      password: '$2a$10$jGBUZS.KkPpiXRzsHlNDYOizztF6nrRIcp8aYIeBxZEVVuuqaN2wW',
      role: '管理员',
      department: '技术部',
      status: '启用',
      lastLogin: '2025-12-15T00:00:00.000Z'
    }
  ],
  target_types: [],
  templates: [],
  roles: []
};

function getNextId(list) {
  if (!Array.isArray(list) || list.length === 0) return 1;
  return list.reduce((max, item) => (item.id && item.id > max ? item.id : max), 0) + 1;
}

function maskSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitive(item));
  }
  const result = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('webhook') ||
      lower.includes('appkey')
    ) {
      result[key] = value ? '***' : value;
    } else if (value && typeof value === 'object') {
      result[key] = maskSensitive(value);
    } else {
      result[key] = value;
    }
  });
  return result;
}

function sanitizeSystemSettingItem(item) {
  if (!item || typeof item !== 'object') return item;
  const result = { ...item };
  const key = result.key;
  if (!key) return result;
  let value = result.value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      value = parsed;
    } catch (e) {}
  }
  if (value && typeof value === 'object') {
    if (key === 'integration') {
      const v = { ...value };
      if (Object.prototype.hasOwnProperty.call(v, 'dingtalkAppKey')) v.dingtalkAppKey = '';
      if (Object.prototype.hasOwnProperty.call(v, 'dingtalkAppSecret')) v.dingtalkAppSecret = '';
      if (Object.prototype.hasOwnProperty.call(v, 'emailPassword')) v.emailPassword = '';
      result.value = v;
    } else if (key === 'dingtalk_webhook') {
      const v = { ...value };
      if (Object.prototype.hasOwnProperty.call(v, 'webhookUrl')) v.webhookUrl = '';
      if (Object.prototype.hasOwnProperty.call(v, 'accessToken')) v.accessToken = '';
      if (Object.prototype.hasOwnProperty.call(v, 'secret')) v.secret = '';
      result.value = v;
    } else {
      result.value = value;
    }
  }
  return result;
}

function sanitizeAuditLogItem(item) {
  if (!item || typeof item !== 'object') return item;
  const result = { ...item };
  if (result.body && typeof result.body === 'string') {
    try {
      const parsed = JSON.parse(result.body);
      const masked = maskSensitive(parsed);
      result.body = JSON.stringify(masked);
    } catch (e) {
      if (typeof result.path === 'string' && result.path.indexOf('/api/system-settings') === 0) {
        result.body = '';
      }
    }
  } else if (result.body && typeof result.body === 'object') {
    const masked = maskSensitive(result.body);
    result.body = masked;
  }
  return result;
}

function cleanupSystemData() {
  const list = loadSystemSettings();
  const array = Array.isArray(list) ? list : [];
  const byKey = {};
  array.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const key = item.key;
    if (!key) return;
    const prev = byKey[key];
    if (!prev) {
      byKey[key] = item;
    } else {
      const prevTime = new Date(prev.created_at || 0).getTime();
      const currTime = new Date(item.created_at || 0).getTime();
      if (currTime >= prevTime) {
        byKey[key] = item;
      }
    }
  });
  const cleanedSettings = Object.values(byKey).map((item) => sanitizeSystemSettingItem(item));
  cleanedSettings.sort((a, b) => {
    const aId = typeof a.id === 'number' ? a.id : 0;
    const bId = typeof b.id === 'number' ? b.id : 0;
    return aId - bId;
  });
  saveSystemSettings(cleanedSettings);
  const logs = loadAuditLogs();
  if (Array.isArray(logs) && logs.length > 0) {
    const cleanedLogs = logs.map((item) => sanitizeAuditLogItem(item));
    saveAuditLogs(cleanedLogs);
  }
}

function loadJsonArrayFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      if (Array.isArray(fallback)) {
        return [...fallback];
      }
      return [];
    }
    const txt = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(txt);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (_) {
    if (Array.isArray(fallback)) {
      return [...fallback];
    }
    return [];
  }
}

function saveJsonArrayFile(filePath, list) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (_) {}
}

function loadSystemSettings() {
  try {
    if (!fs.existsSync(SYSTEM_SETTINGS_FILE)) return [];
    const txt = fs.readFileSync(SYSTEM_SETTINGS_FILE, 'utf-8');
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveSystemSettings(list) {
  try {
    const dir = path.dirname(SYSTEM_SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SYSTEM_SETTINGS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (_) {}
}

function loadAuditLogs() {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) return [];
    const txt = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveAuditLogs(list) {
  try {
    const dir = path.dirname(AUDIT_LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (_) {}
}

function loadDepartmentTargets() {
  try {
    if (!fs.existsSync(DEPARTMENT_TARGETS_FILE)) return [];
    const txt = fs.readFileSync(DEPARTMENT_TARGETS_FILE, 'utf-8');
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveDepartmentTargets(list) {
  try {
    const dir = path.dirname(DEPARTMENT_TARGETS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DEPARTMENT_TARGETS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (_) {}
}

function loadAnnualWorkPlans() {
  try {
    if (!fs.existsSync(ANNUAL_WORK_PLANS_FILE)) return [];
    const txt = fs.readFileSync(ANNUAL_WORK_PLANS_FILE, 'utf-8');
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveAnnualWorkPlans(list) {
  try {
    const dir = path.dirname(ANNUAL_WORK_PLANS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ANNUAL_WORK_PLANS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (_) {}
}

function loadMajorEvents() {
  try {
    if (!fs.existsSync(MAJOR_EVENTS_FILE)) return [];
    const txt = fs.readFileSync(MAJOR_EVENTS_FILE, 'utf-8');
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveMajorEvents(list) {
  try {
    const dir = path.dirname(MAJOR_EVENTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MAJOR_EVENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (_) {}
}

function loadMonthlyProgress() {
  try {
    if (!fs.existsSync(MONTHLY_PROGRESS_FILE)) return [];
    const txt = fs.readFileSync(MONTHLY_PROGRESS_FILE, 'utf-8');
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveMonthlyProgress(list) {
  try {
    const dir = path.dirname(MONTHLY_PROGRESS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MONTHLY_PROGRESS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (_) {}
}

function loadActionPlans() {
  try {
    if (!fs.existsSync(ACTION_PLANS_FILE)) return [];
    const txt = fs.readFileSync(ACTION_PLANS_FILE, 'utf-8');
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveActionPlans(list) {
  try {
    const dir = path.dirname(ACTION_PLANS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ACTION_PLANS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (_) {}
}

function loadDepartmentsStore() {
  return loadJsonArrayFile(DEPARTMENTS_FILE, mockData.departments);
}

function saveDepartmentsStore(list) {
  saveJsonArrayFile(DEPARTMENTS_FILE, list);
}

function loadEmployeesStore() {
  return loadJsonArrayFile(EMPLOYEES_FILE, mockData.employees);
}

function saveEmployeesStore(list) {
  saveJsonArrayFile(EMPLOYEES_FILE, list);
}

function loadUsersStore() {
  return loadJsonArrayFile(USERS_FILE, mockData.users);
}

function saveUsersStore(list) {
  saveJsonArrayFile(USERS_FILE, list);
}

function getUserPermissions(user) {
  if (!user || typeof user !== 'object') return [];
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }
  // 特殊处理：admin用户默认拥有所有权限
  if (user.username === 'admin') {
    return ['admin'];
  }
  if (typeof user.role === 'string') {
    const roleName = user.role;
    const roles = loadRolesStore();
    const roleRec = Array.isArray(roles)
      ? roles.find((r) => r && (r.name === roleName || r.code === roleName))
      : null;
    if (roleRec && Array.isArray(roleRec.permissions) && roleRec.permissions.length > 0) {
      return roleRec.permissions;
    }
  }
  return [];
}

function generateJwtToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    department: user.department,
    permissions: getUserPermissions(user)
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function loadTargetTypesStore() {
  return loadJsonArrayFile(TARGET_TYPES_FILE, mockData.target_types);
}

function saveTargetTypesStore(list) {
  saveJsonArrayFile(TARGET_TYPES_FILE, list);
}

function loadRolesStore() {
  return loadJsonArrayFile(ROLES_FILE, mockData.roles || []);
}

function saveRolesStore(list) {
  saveJsonArrayFile(ROLES_FILE, list);
}

function loadTemplatesStore() {
  return loadJsonArrayFile(TEMPLATES_FILE, mockData.templates);
}

function saveTemplatesStore(list) {
  saveJsonArrayFile(TEMPLATES_FILE, list);
}

function loadNotificationsStore() {
  return loadJsonArrayFile(NOTIFICATIONS_FILE, mockData.notifications);
}

function saveNotificationsStore(list) {
  saveJsonArrayFile(NOTIFICATIONS_FILE, list);
}

function loadCompanyInfoStore() {
  try {
    if (!fs.existsSync(COMPANY_INFO_FILE)) {
      return null;
    }
    const txt = fs.readFileSync(COMPANY_INFO_FILE, 'utf-8');
    const data = JSON.parse(txt);
    if (data && typeof data === 'object') {
      return data;
    }
    return null;
  } catch (_) {
    return null;
  }
}

function saveCompanyInfoStore(info) {
  try {
    const dir = path.dirname(COMPANY_INFO_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(COMPANY_INFO_FILE, JSON.stringify(info || {}, null, 2), 'utf-8');
  } catch (_) {}
}

function shouldWriteAuditLog() {
  const list = loadSystemSettings();
  const rec = Array.isArray(list) ? list.find((s) => s && s.key === 'security') : null;
  if (!rec || !rec.value) return true;
  let value = rec.value;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (_) {
      value = {};
    }
  }
  if (value && Object.prototype.hasOwnProperty.call(value, 'auditLog')) {
    return !!value.auditLog;
  }
  return true;
}

// API路径到操作描述的映射表 - 必须在appendAuditLog之前定义
const API_PATH_MAPPING = {
  '/api/login': { action: '用户登录', description: '用户登录系统' },
  '/api/annual-work-plans': { action: '年度工作落地规划', description: '操作年度工作落地规划' },
  '/api/major-events': { action: '大事件', description: '操作大事件' },
  '/api/monthly-progress': { action: '月度推进计划', description: '操作月度推进计划' },
  '/api/action-plans': { action: '行动计划', description: '操作行动计划' },
  '/api/departments': { action: '部门管理', description: '操作部门信息' },
  '/api/employees': { action: '员工管理', description: '操作员工信息' },
  '/api/users': { action: '用户管理', description: '操作用户账号' },
  '/api/roles': { action: '角色管理', description: '操作角色权限' },
  '/api/target-types': { action: '目标类型', description: '操作目标类型' },
  '/api/department-targets': { action: '部门目标分解', description: '操作部门目标分解' },
  '/api/notifications': { action: '通知管理', description: '操作系统通知' },
  '/api/system-settings': { action: '系统设置', description: '操作系统设置' },
  '/api/company-info': { action: '公司信息', description: '操作公司信息' },
  '/api/templates': { action: '模板管理', description: '操作模板' },
  '/api/admin/backups': { action: '备份管理', description: '操作系统备份' },
  '/api/admin/backup': { action: '创建备份', description: '创建系统备份' },
  '/api/admin/cleanup-data': { action: '数据清理', description: '清理系统数据' },
  '/api/dingtalk/employees': { action: '钉钉员工', description: '获取钉钉员工列表' },
  '/api/departments/sync-dingtalk': { action: '同步钉钉部门', description: '从钉钉同步部门数据' },
  '/api/employees/sync-dingtalk': { action: '同步钉钉员工', description: '从钉钉同步员工数据' },
  '/api/upload': { action: '文件上传', description: '上传文件' },
  '/api/logs': { action: '系统日志', description: '操作日志记录' }
};

// 从请求体中提取关键信息 - 必须在appendAuditLog之前定义
function extractKeyInfo(body) {
  if (!body || typeof body !== 'object') return '';
  
  const keyFields = ['name', 'title', 'username', 'department', 'role', 'year', 'status'];
  const info = [];
  
  for (const field of keyFields) {
    if (body[field] && typeof body[field] === 'string' && body[field].trim() !== '') {
      info.push(`${field}: ${body[field]}`);
    }
  }
  
  return info.length > 0 ? ` (${info.join(', ')})` : '';
}

function appendAuditLog(entry) {
  try {
    if (!shouldWriteAuditLog()) return;
    let safeBody = entry.body;
    if (safeBody && typeof safeBody === 'object') {
      safeBody = maskSensitive(safeBody);
    }
    const list = loadAuditLogs();
    const id = getNextId(list);
    const now = new Date().toISOString();
    
    // 生成详细的操作描述
    let details = entry.details;
    if (!details) {
      const method = (entry.method || '').toUpperCase();
      const path = entry.path || '';
      
      // 查找路径映射
      let mappedAction = '未知操作';
      for (const [apiPath, mapping] of Object.entries(API_PATH_MAPPING)) {
        if (path.startsWith(apiPath)) {
          mappedAction = mapping.action;
          break;
        }
      }
      
      // 根据HTTP方法生成详细描述
      let methodText = '';
      switch (method) {
        case 'GET':
          methodText = '查看';
          break;
        case 'POST':
          methodText = '创建';
          break;
        case 'PUT':
        case 'PATCH':
          methodText = '更新';
          break;
        case 'DELETE':
          methodText = '删除';
          break;
        default:
          methodText = '操作';
      }
      
      // 从请求体中提取关键信息
      let bodyInfo = '';
      try {
        const body = typeof safeBody === 'string' ? JSON.parse(safeBody) : safeBody;
        bodyInfo = extractKeyInfo(body);
      } catch (e) {
        // 忽略解析错误
      }
      
      details = `${methodText}${mappedAction}${bodyInfo}`;
    }
    
    const item = {
      id,
      created_at: entry.created_at || now,
      username: entry.username || '系统',
      role: entry.role || '',
      method: entry.method || '',
      path: entry.path || '',
      status: entry.status ?? 200,
      duration_ms: entry.duration_ms ?? 0,
      ip: entry.ip || '',
      ua: entry.ua || '',
      query: entry.query
        ? typeof entry.query === 'string'
          ? entry.query
          : JSON.stringify(entry.query)
        : '{}',
      body: safeBody
        ? typeof safeBody === 'string'
          ? safeBody
          : JSON.stringify(safeBody)
        : '',
      details // 直接存储生成的详细描述
    };
    if (entry.action_type) {
      item.action_type = entry.action_type;
    }
    if (entry.ip_address) {
      item.ip_address = entry.ip_address;
    }
    list.unshift(item);
    saveAuditLogs(list);
  } catch (_) {}
}

function loadDingTalkConfigFromFile() {
  try {
    const filePath = path.join(__dirname, '../config/dingtalk_config.json');
    if (!fs.existsSync(filePath)) return {};
    const txt = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(txt);
    return data && typeof data === 'object' ? data : {};
  } catch (_) {
    return {};
  }
}

function getDingTalkConfig() {
  const fileCfg = loadDingTalkConfigFromFile();
  const list = loadSystemSettings();
  const integrationRecord = Array.isArray(list) ? list.find((s) => s && s.key === 'integration') : null;
  let integration = {};
  if (integrationRecord && integrationRecord.value) {
    try {
      integration =
        typeof integrationRecord.value === 'string'
          ? JSON.parse(integrationRecord.value)
          : integrationRecord.value || {};
    } catch (_) {
      integration = {};
    }
  }
  const appKey = String(integration.dingtalkAppKey || process.env.DINGTALK_APP_KEY || fileCfg.appKey || '').trim();
  const appSecret = String(
    integration.dingtalkAppSecret || process.env.DINGTALK_APP_SECRET || fileCfg.appSecret || ''
  ).trim();
  const rootDeptId =
    integration.dingtalkRootDeptId || process.env.DINGTALK_ROOT_DEPT_ID || fileCfg.rootDeptId || 1;
  const defaultDeptId =
    integration.dingtalkDeptId || process.env.DINGTALK_DEPT_ID || fileCfg.defaultDeptId || rootDeptId || 1;
  return {
    appKey,
    appSecret,
    rootDeptId: Number(rootDeptId) || 1,
    defaultDeptId: Number(defaultDeptId) || 1
  };
}

async function getDingTalkAccessToken() {
  const cfg = getDingTalkConfig();
  if (!cfg.appKey || !cfg.appSecret) {
    throw new Error('未配置钉钉应用Key或Secret');
  }
  const url = 'https://oapi.dingtalk.com/gettoken';
  const resp = await axios.get(url, {
    params: {
      appkey: cfg.appKey,
      appsecret: cfg.appSecret
    }
  });
  const data = resp.data || {};
  if (data.errcode !== 0) {
    throw new Error(data.errmsg || '获取钉钉access_token失败');
  }
  return {
    accessToken: data.access_token,
    config: cfg
  };
}

async function fetchDingTalkDepartments(accessToken, rootDeptId) {
  const url = 'https://oapi.dingtalk.com/department/list';
  const resp = await axios.get(url, {
    params: {
      access_token: accessToken,
      id: rootDeptId,
      fetch_child: true
    }
  });
  const data = resp.data || {};
  if (data.errcode !== 0) {
    throw new Error(data.errmsg || '获取钉钉部门列表失败');
  }
  const list = Array.isArray(data.department) ? data.department : [];
  return list;
}

async function fetchDingTalkEmployees(accessToken, departments) {
  const url = 'https://oapi.dingtalk.com/user/list';
  const all = [];
  const deptList = Array.isArray(departments) ? departments : [];
  for (const dept of deptList) {
    const deptId = dept && typeof dept.id !== 'undefined' ? dept.id : null;
    if (!deptId) continue;
    const resp = await axios.get(url, {
      params: {
        access_token: accessToken,
        department_id: deptId,
        offset: 0,
        size: 100
      }
    });
    const data = resp.data || {};
    if (data.errcode !== 0) {
      continue;
    }
    const list = Array.isArray(data.userlist) ? data.userlist : [];
    for (const u of list) {
      all.push(u);
    }
  }
  return all;
}

async function listBackupFiles() {
  try {
    const files = await fsp.readdir(BACKUP_DIR);
    const jsonFiles = files.filter(name => name.toLowerCase().endsWith('.json'));
    const items = [];
    for (const name of jsonFiles) {
      const full = path.join(BACKUP_DIR, name);
      const stat = await fsp.stat(full);
      items.push({
        name,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
        url: `/backups/${encodeURIComponent(name)}`
      });
    }
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return items;
  } catch (e) {
    return [];
  }
}

function applyBackupSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  if (Array.isArray(snapshot.annual_work_plans)) {
    mockData.annual_work_plans = snapshot.annual_work_plans;
    saveAnnualWorkPlans(snapshot.annual_work_plans);
  }
  if (Array.isArray(snapshot.major_events)) {
    mockData.major_events = snapshot.major_events;
    saveMajorEvents(snapshot.major_events);
  }
  if (Array.isArray(snapshot.monthly_progress)) {
    mockData.monthly_progress = snapshot.monthly_progress;
    saveMonthlyProgress(snapshot.monthly_progress);
  }
  if (Array.isArray(snapshot.action_plans)) {
    mockData.action_plans = snapshot.action_plans;
    saveActionPlans(snapshot.action_plans);
  }
  if (Array.isArray(snapshot.departments)) {
    saveDepartmentsStore(snapshot.departments);
  }
  if (Array.isArray(snapshot.employees)) {
    saveEmployeesStore(snapshot.employees);
  }
  if (Array.isArray(snapshot.notifications)) {
    saveNotificationsStore(snapshot.notifications);
  }
  if (Array.isArray(snapshot.users)) {
    saveUsersStore(snapshot.users);
  }
  if (Array.isArray(snapshot.target_types)) {
    saveTargetTypesStore(snapshot.target_types);
  }
  if (Array.isArray(snapshot.templates)) {
    saveTemplatesStore(snapshot.templates);
  }
  if (Array.isArray(snapshot.department_targets)) {
    saveDepartmentTargets(snapshot.department_targets);
  }
  if (Array.isArray(snapshot.system_settings)) {
    saveSystemSettings(snapshot.system_settings);
  }
  if (Array.isArray(snapshot.audit_logs)) {
    saveAuditLogs(snapshot.audit_logs);
  }
  if (snapshot.company_info && typeof snapshot.company_info === 'object') {
    saveCompanyInfoStore(snapshot.company_info);
  }
}

app.get('/api/annual-work-plans', (req, res) => {
  const { year } = req.query;
  const list = loadAnnualWorkPlans();
  let filtered = Array.isArray(list) ? [...list] : [];
  if (year) {
    const y = parseInt(year, 10);
    if (!Number.isNaN(y)) {
      filtered = filtered.filter((item) => Number(item.year) === y);
    }
  }
  res.json(filtered);
});

app.post('/api/annual-work-plans', (req, res) => {
  try {
    const body = req.body || {};
    const list = loadAnnualWorkPlans();
    const id = getNextId(list);
    const now = new Date().toISOString();
    const item = {
      id,
      created_at: now,
      ...body
    };
    if (body.year !== undefined && body.year !== null) {
      const y = parseInt(body.year, 10);
      if (!Number.isNaN(y)) {
        item.year = y;
      }
    }
    list.push(item);
    saveAnnualWorkPlans(list);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: '保存年度工作落地规划失败' });
  }
});

app.put('/api/annual-work-plans/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    const list = loadAnnualWorkPlans();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: '年度工作落地规划记录不存在' });
      return;
    }
    const updated = {
      ...list[index],
      ...body
    };
    if (body.year !== undefined && body.year !== null) {
      const y = parseInt(body.year, 10);
      if (!Number.isNaN(y)) {
        updated.year = y;
      }
    }
    list[index] = updated;
    saveAnnualWorkPlans(list);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: '更新年度工作落地规划失败' });
  }
});

app.delete('/api/annual-work-plans/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const list = loadAnnualWorkPlans();
    const next = list.filter((item) => item.id !== id);
    const deleted = next.length !== list.length;
    if (!deleted) {
      res.status(404).json({ success: false, error: '年度工作落地规划记录不存在' });
      return;
    }
    saveAnnualWorkPlans(next);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: '删除年度工作落地规划记录失败' });
  }
});

app.get('/api/target-types', (req, res) => {
  const list = loadTargetTypesStore();
  res.json(list);
});

app.post('/api/target-types', (req, res) => {
  const now = new Date().toISOString();
  const body = req.body || {};
  const list = loadTargetTypesStore();
  const id = getNextId(list);
  const item = {
    id,
    createdAt: now,
    isActive: body.isActive !== undefined ? !!body.isActive : true,
    ...body
  };
  list.push(item);
  saveTargetTypesStore(list);
  res.json(item);
});

app.put('/api/target-types/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadTargetTypesStore();
  const index = list.findIndex(t => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Target type not found' });
    return;
  }
  const body = req.body || {};
  list[index] = { ...list[index], ...body };
  saveTargetTypesStore(list);
  res.json(list[index]);
});

app.delete('/api/target-types/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadTargetTypesStore();
  const next = list.filter(t => t.id !== id);
  const deleted = next.length !== list.length;
  if (deleted) {
    saveTargetTypesStore(next);
  }
  if (!deleted) {
    res.status(404).json({ error: 'Target type not found' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/major-events', (req, res) => {
  const { year, month, event_type, importance, status, responsible_department } = req.query;
  const list = loadMajorEvents();
  let filtered = Array.isArray(list) ? [...list] : [];
  
  // 按年份筛选
  if (year) {
    const y = parseInt(year, 10);
    if (!Number.isNaN(y)) {
      filtered = filtered.filter((item) => Number(item.year) === y);
    }
  }
  
  // 按月份筛选
  if (month) {
    const m = String(month).padStart(2, '0');
    filtered = filtered.filter((item) => {
      const plannedDate = item.planned_date || '';
      const actualDate = item.actual_date || '';
      return plannedDate.includes(`-${m}-`) || actualDate.includes(`-${m}-`);
    });
  }
  
  // 按事件类型筛选
  if (event_type) {
    filtered = filtered.filter((item) => item.event_type === event_type);
  }
  
  // 按重要性筛选
  if (importance) {
    filtered = filtered.filter((item) => item.importance === importance);
  }
  
  // 按状态筛选
  if (status) {
    filtered = filtered.filter((item) => item.status === status);
  }
  
  // 按负责部门筛选
  if (responsible_department) {
    filtered = filtered.filter((item) => {
      const dept = item.responsible_department || item.department_name || item.department || '';
      return dept === responsible_department;
    });
  }
  
  res.json(filtered);
});

app.post('/api/major-events', (req, res) => {
  try {
    const body = req.body || {};
    const list = loadMajorEvents();
    const id = getNextId(list);
    const now = new Date().toISOString();
    const item = {
      id,
      created_at: now,
      ...body
    };
    if (body.year !== undefined && body.year !== null) {
      const y = parseInt(body.year, 10);
      if (!Number.isNaN(y)) {
        item.year = y;
      }
    }
    list.push(item);
    saveMajorEvents(list);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: '保存大事件数据失败' });
  }
});

app.put('/api/major-events/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    const list = loadMajorEvents();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: '大事件记录不存在' });
      return;
    }
    const updated = {
      ...list[index],
      ...body
    };
    if (body.year !== undefined && body.year !== null) {
      const y = parseInt(body.year, 10);
      if (!Number.isNaN(y)) {
        updated.year = y;
      }
    }
    list[index] = updated;
    saveMajorEvents(list);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: '更新大事件数据失败' });
  }
});

app.delete('/api/major-events/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const list = loadMajorEvents();
    const next = list.filter((item) => item.id !== id);
    const deleted = next.length !== list.length;
    if (!deleted) {
      res.status(404).json({ success: false, error: '大事件记录不存在' });
      return;
    }
    saveMajorEvents(next);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: '删除大事件数据失败' });
  }
});

app.get('/api/monthly-progress', (req, res) => {
  const { year } = req.query;
  const list = loadMonthlyProgress();
  let filtered = Array.isArray(list) ? [...list] : [];
  if (year) {
    const y = parseInt(year, 10);
    if (!Number.isNaN(y)) {
      filtered = filtered.filter((item) => Number(item.year) === y);
    }
  }
  res.json(filtered);
});

app.post('/api/monthly-progress', (req, res) => {
  try {
    const now = new Date().toISOString();
    const body = req.body || {};
    const list = loadMonthlyProgress();
    const id = getNextId(list);
    const item = {
      id,
      created_at: now,
      ...body
    };
    if (body.year !== undefined && body.year !== null) {
      const y = parseInt(body.year, 10);
      if (!Number.isNaN(y)) {
        item.year = y;
      }
    }
    if (!item.status) {
      item.status = 'in_progress';
    }
    list.push(item);
    saveMonthlyProgress(list);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: '保存月度推进计划失败' });
  }
});

app.put('/api/monthly-progress/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    const list = loadMonthlyProgress();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: '月度推进计划记录不存在' });
      return;
    }
    const updated = {
      ...list[index],
      ...body
    };
    if (body.year !== undefined && body.year !== null) {
      const y = parseInt(body.year, 10);
      if (!Number.isNaN(y)) {
        updated.year = y;
      }
    }
    list[index] = updated;
    saveMonthlyProgress(list);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: '更新月度推进计划失败' });
  }
});

app.delete('/api/monthly-progress/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const list = loadMonthlyProgress();
    const next = list.filter((item) => item.id !== id);
    const deleted = next.length !== list.length;
    if (!deleted) {
      res.status(404).json({ success: false, error: '月度推进计划记录不存在' });
      return;
    }
    saveMonthlyProgress(next);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: '删除月度推进计划记录失败' });
  }
});

app.get('/api/employees', (req, res) => {
  const list = loadEmployeesStore();
  res.json(list);
});

app.post('/api/employees', (req, res) => {
  const now = new Date().toISOString();
  const body = req.body || {};
  const list = loadEmployeesStore();
  const id = getNextId(list);
  const item = {
    id,
    created_at: now,
    status: body.status || 'active',
    ...body
  };
  list.push(item);
  saveEmployeesStore(list);
  res.json(item);
});

app.put('/api/employees/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadEmployeesStore();
  const index = list.findIndex(e => e.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  const body = req.body || {};
  list[index] = { ...list[index], ...body };
  saveEmployeesStore(list);
  res.json(list[index]);
});

app.delete('/api/employees/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadEmployeesStore();
  const next = list.filter(e => e.id !== id);
  const deleted = next.length !== list.length;
  if (deleted) {
    saveEmployeesStore(next);
  }
  if (!deleted) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  res.json({ success: true });
});

// 模拟钉钉员工列表（用于预览）
app.get('/api/dingtalk/employees', async (req, res) => {
  try {
    const { accessToken, config } = await getDingTalkAccessToken();
    const departments = await fetchDingTalkDepartments(accessToken, config.rootDeptId);
    const deptMap = new Map();
    departments.forEach((d) => {
      if (d && typeof d.id !== 'undefined') {
        deptMap.set(d.id, d);
      }
    });
    const users = await fetchDingTalkEmployees(accessToken, departments);
    const list = [];
    const now = new Date().toISOString();
    users.forEach((u, idx) => {
      if (!u) return;
      const deptIds = Array.isArray(u.department) ? u.department : [];
      let deptName = '';
      if (deptIds.length > 0) {
        const d = deptMap.get(deptIds[0]);
        if (d && d.name) {
          deptName = d.name;
        }
      }
      list.push({
        id: idx + 1,
        name: u.name || '',
        employee_id: u.userid || u.jobnumber || '',
        department: deptName,
        position: u.position || '',
        phone: u.mobile || '',
        email: u.email || '',
        status: u.active === false ? 'inactive' : 'active',
        created_at: now
      });
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || '获取钉钉员工失败' });
  }
});

app.get('/api/dingtalk/departments', async (req, res) => {
  try {
    const { accessToken, config } = await getDingTalkAccessToken();
    const departments = await fetchDingTalkDepartments(accessToken, config.rootDeptId);
    const now = new Date().toISOString();
    const remoteToLocal = new Map();
    const list = [];
    departments.forEach((d, idx) => {
      if (!d) return;
      const localId = idx + 1;
      remoteToLocal.set(d.id, localId);
      list.push({
        id: localId,
        name: d.name || '',
        code: String(d.id || ''),
        parent_id: null,
        status: 'active',
        created_at: now
      });
    });
    list.forEach((item) => {
      const remoteDept = departments.find((d) => String(d.id || '') === item.code);
      if (remoteDept && remoteDept.parentid) {
        const parentLocalId = remoteToLocal.get(remoteDept.parentid) || null;
        item.parent_id = parentLocalId;
      }
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || '获取钉钉部门失败' });
  }
});

app.post('/api/employees/sync-dingtalk', async (req, res) => {
  try {
    const { accessToken, config } = await getDingTalkAccessToken();
    const departments = await fetchDingTalkDepartments(accessToken, config.rootDeptId);
    const deptMap = new Map();
    departments.forEach((d) => {
      if (d && typeof d.id !== 'undefined') {
        deptMap.set(d.id, d);
      }
    });
    const users = await fetchDingTalkEmployees(accessToken, departments);
    const list = [];
    const now = new Date().toISOString();
    users.forEach((u, idx) => {
      if (!u) return;
      const deptIds = Array.isArray(u.department) ? u.department : [];
      let deptName = '';
      if (deptIds.length > 0) {
        const d = deptMap.get(deptIds[0]);
        if (d && d.name) {
          deptName = d.name;
        }
      }
      list.push({
        id: idx + 1,
        name: u.name || '',
        employee_id: u.userid || u.jobnumber || '',
        department: deptName,
        position: u.position || '',
        phone: u.mobile || '',
        email: u.email || '',
        status: u.active === false ? 'inactive' : 'active',
        created_at: now
      });
    });
    saveEmployeesStore(list);
    res.json({
      success: true,
      count: list.length,
      employees: list
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || '同步钉钉员工失败' });
  }
});

app.get('/api/users', (req, res) => {
  const list = loadUsersStore();
  res.json(list);
});

app.post('/api/users', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const body = req.body || {};
    const list = loadUsersStore();
    const id = getNextId(list);
    let password = body.password || '';
    if (password) {
      const salt = await bcrypt.genSalt(10);
      password = await bcrypt.hash(password, salt);
    }
    const item = {
      id,
      created_at: now,
      lastLogin: body.lastLogin || '从未登录',
      status: body.status || '启用',
      ...body,
      password
    };
    list.push(item);
    saveUsersStore(list);
    const safeItem = { ...item };
    if (safeItem.password) {
      safeItem.password = '***';
    }
    res.json(safeItem);
  } catch (e) {
    res.status(500).json({ error: '创建用户失败' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const list = loadUsersStore();
    const index = list.findIndex(user => user.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const body = req.body || {};
    const updated = { ...list[index], ...body };
    if (body.password !== undefined) {
      let password = body.password || '';
      if (password) {
        const salt = await bcrypt.genSalt(10);
        password = await bcrypt.hash(password, salt);
      }
      updated.password = password;
    }
    list[index] = updated;
    saveUsersStore(list);
    const safeItem = { ...updated };
    if (safeItem.password) {
      safeItem.password = '***';
    }
    res.json(safeItem);
  } catch (e) {
    res.status(500).json({ error: '更新用户失败' });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadUsersStore();
  const next = list.filter(user => user.id !== id);
  const deleted = next.length !== list.length;
  if (!deleted) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  saveUsersStore(next);
  res.json({ success: true });
});

app.get('/api/departments', (req, res) => {
  const { type } = req.query;
  const list = loadDepartmentsStore();
  let result = list;
  
  if (type) {
    // 为每个部门添加默认的type字段，默认为'DEPT'
    result = result.map(dept => ({
      ...dept,
      type: dept.type || 'DEPT'
    })).filter(dept => dept.type === type);
  } else {
    // 为每个部门添加默认的type字段，默认为'DEPT'
    result = result.map(dept => ({
      ...dept,
      type: dept.type || 'DEPT'
    }));
  }
  
  // 为每个部门添加parent_name字段，显示上级部门名称
  const deptMap = new Map();
  result.forEach(dept => {
    deptMap.set(dept.id, dept.name);
  });
  
  const resultWithParentName = result.map(dept => {
    let parent_name = null;
    if (dept.parent_id && deptMap.has(dept.parent_id)) {
      parent_name = deptMap.get(dept.parent_id);
    }
    return {
      ...dept,
      parent_name
    };
  });
  
  res.json(resultWithParentName);
});

app.post('/api/departments', (req, res) => {
  const now = new Date().toISOString();
  const body = req.body || {};
  const list = loadDepartmentsStore();
  const id = getNextId(list);
  const item = {
    id,
    created_at: now,
    status: body.status || 'active',
    ...body
  };
  list.push(item);
  saveDepartmentsStore(list);
  res.json(item);
});

app.put('/api/departments/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadDepartmentsStore();
  const index = list.findIndex(dept => dept.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Department not found' });
    return;
  }
  const body = req.body || {};
  list[index] = { ...list[index], ...body };
  saveDepartmentsStore(list);
  res.json(list[index]);
});

app.delete('/api/departments/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadDepartmentsStore();
  const next = list.filter(dept => dept.id !== id);
  const deleted = next.length !== list.length;
  if (deleted) {
    saveDepartmentsStore(next);
  }
  if (!deleted) {
    res.status(404).json({ error: 'Department not found' });
    return;
  }
  res.json({ success: true });
});

// 模拟从钉钉同步部门到系统
app.post('/api/departments/sync-dingtalk', async (req, res) => {
  try {
    const { accessToken, config } = await getDingTalkAccessToken();
    const departments = await fetchDingTalkDepartments(accessToken, config.rootDeptId);
    const remoteToLocal = new Map();
    const now = new Date().toISOString();
    const list = [];
    departments.forEach((d, idx) => {
      if (!d) return;
      const localId = idx + 1;
      remoteToLocal.set(d.id, localId);
      list.push({
        id: localId,
        name: d.name || '',
        code: String(d.id || ''),
        parent_id: null,
        manager: '',
        status: 'active',
        created_at: now
      });
    });
    list.forEach((item) => {
      const remoteDept = departments.find((d) => String(d.id || '') === item.code);
      if (remoteDept && remoteDept.parentid) {
        const parentLocalId = remoteToLocal.get(remoteDept.parentid) || null;
        item.parent_id = parentLocalId;
      }
    });
    saveDepartmentsStore(list);
    res.json({
      success: true,
      count: list.length,
      departments: list
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || '同步钉钉部门失败' });
  }
});

// 角色管理 API
app.get('/api/roles', (req, res) => {
  const list = loadRolesStore();
  res.json(list);
});

app.post('/api/roles', (req, res) => {
  const now = new Date().toISOString();
  const body = req.body || {};
  const list = loadRolesStore();
  const id = getNextId(list);
  const item = {
    id,
    created_at: now,
    ...body
  };
  list.push(item);
  saveRolesStore(list);
  res.json(item);
});

app.put('/api/roles/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadRolesStore();
  const index = list.findIndex(role => role.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Role not found' });
    return;
  }
  const body = req.body || {};
  const updatedRole = { ...list[index], ...body };
  list[index] = updatedRole;
  saveRolesStore(list);
  
  // 自动更新所有关联该角色的用户权限
  const users = loadUsersStore();
  const roleName = updatedRole.name;
  const updatedUsers = users.map(user => {
    // 如果用户的角色名称匹配当前更新的角色，更新其权限
    if (user.role === roleName) {
      return { ...user, permissions: updatedRole.permissions };
    }
    return user;
  });
  
  // 保存更新后的用户数据
  saveUsersStore(updatedUsers);
  
  res.json(updatedRole);
});

app.delete('/api/roles/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadRolesStore();
  const next = list.filter(role => role.id !== id);
  const deleted = next.length !== list.length;
  if (deleted) {
    saveRolesStore(next);
  }
  if (!deleted) {
    res.status(404).json({ error: 'Role not found' });
    return;
  }
  res.json({ success: true });
});

function mapAuditRecordToLogView(rec) {
  if (!rec || typeof rec !== 'object') return null;
  const createdAt = rec.created_at || rec.time || new Date().toISOString();
  const username = rec.username || '系统';
  const ipAddress = rec.ip_address || rec.ip || '';
  const httpStatus = typeof rec.status === 'number' ? rec.status : 200;
  const status = httpStatus >= 200 && httpStatus < 300 ? 'success' : 'fail';
  let actionType = rec.action_type;
  if (!actionType) {
    const method = (rec.method || '').toUpperCase();
    const path = rec.path || '';
    if (path.includes('/login')) {
      actionType = 'LOGIN';
    } else if (method === 'GET') {
      actionType = 'VIEW';
    } else if (method === 'POST') {
      actionType = 'CREATE';
    } else if (method === 'PUT' || method === 'PATCH') {
      actionType = 'UPDATE';
    } else if (method === 'DELETE') {
      actionType = 'DELETE';
    } else {
      actionType = method || 'VIEW';
    }
  }
  let details = rec.details;
  if (!details) {
    const method = (rec.method || '').toUpperCase();
    const path = rec.path || '';
    
    // 查找路径映射
    let mappedAction = '未知操作';
    let mappedDescription = '';
    for (const [apiPath, mapping] of Object.entries(API_PATH_MAPPING)) {
      if (path.startsWith(apiPath)) {
        mappedAction = mapping.action;
        mappedDescription = mapping.description;
        break;
      }
    }
    
    // 根据HTTP方法生成详细描述
    let methodText = '';
    switch (method) {
      case 'GET':
        methodText = '查看';
        break;
      case 'POST':
        methodText = '创建';
        break;
      case 'PUT':
      case 'PATCH':
        methodText = '更新';
        break;
      case 'DELETE':
        methodText = '删除';
        break;
      default:
        methodText = '操作';
    }
    
    // 从请求体中提取关键信息
    let bodyInfo = '';
    try {
      const body = typeof rec.body === 'string' ? JSON.parse(rec.body) : rec.body;
      bodyInfo = extractKeyInfo(body);
    } catch (e) {
      // 忽略解析错误
    }
    
    details = `${methodText}${mappedAction}${bodyInfo}`;
  }
  return {
    id: rec.id,
    created_at: createdAt,
    username,
    ip_address: ipAddress,
    action_type: actionType,
    details,
    status
  };
}

app.get('/api/logs', (req, res) => {
  const { page, pageSize, username, type, startDate, endDate } = req.query;
  const all = loadAuditLogs();
  const mapped = all
    .map((rec) => mapAuditRecordToLogView(rec))
    .filter((x) => x && x.id !== undefined);
  let filtered = mapped;
  if (username && String(username).trim()) {
    const kw = String(username).trim().toLowerCase();
    filtered = filtered.filter((it) => String(it.username || '').toLowerCase().includes(kw));
  }
  if (type && String(type).trim()) {
    const t = String(type).trim().toUpperCase();
    filtered = filtered.filter((it) => String(it.action_type || '').toUpperCase() === t);
  }
  if (startDate) {
    const s = new Date(startDate);
    if (!Number.isNaN(s.getTime())) {
      filtered = filtered.filter((it) => {
        const d = new Date(it.created_at);
        return !Number.isNaN(d.getTime()) && d >= s;
      });
    }
  }
  if (endDate) {
    const e = new Date(endDate);
    if (!Number.isNaN(e.getTime())) {
      const end = new Date(e.getTime());
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((it) => {
        const d = new Date(it.created_at);
        return !Number.isNaN(d.getTime()) && d <= end;
      });
    }
  }
  // 按创建时间倒序排序，最新日志显示在前面
  filtered.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });
  const p = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 20;
  const total = filtered.length;
  const start = (p - 1) * size;
  const endIdx = start + size;
  const data = filtered.slice(start, endIdx);
  res.json({
    data,
    total,
    page: p,
    pageSize: size
  });
});

app.delete('/api/logs/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) {
    res.status(400).json({ success: false, error: '无效的日志ID' });
    return;
  }
  const list = loadAuditLogs();
  const next = list.filter((it) => it.id !== id);
  const deleted = next.length !== list.length;
  if (!deleted) {
    res.status(404).json({ success: false, error: '日志不存在' });
    return;
  }
  saveAuditLogs(next);
  res.json({ success: true });
});

app.delete('/api/logs', (req, res) => {
  saveAuditLogs([]);
  res.json({ success: true });
});

app.get('/api/action-plans', (req, res) => {
  const { year, department, status } = req.query;
  const list = loadActionPlans();
  let filtered = Array.isArray(list) ? [...list] : [];
  if (year) {
    const y = parseInt(year, 10);
    if (!Number.isNaN(y)) {
      filtered = filtered.filter((item) => Number(item.year) === y);
    }
  }
  if (department) {
    filtered = filtered.filter((item) => item.department === department);
  }
  if (status) {
    filtered = filtered.filter((item) => item.status === status);
  }
  res.json(filtered);
});

app.post('/api/action-plans', (req, res) => {
  try {
    const now = new Date().toISOString();
    const body = req.body || {};
    const list = loadActionPlans();
    const id = getNextId(list);
    const item = {
      id,
      created_at: now,
      ...body
    };
    if (body.year !== undefined && body.year !== null) {
      const y = parseInt(body.year, 10);
      if (!Number.isNaN(y)) {
        item.year = y;
      }
    }
    list.push(item);
    saveActionPlans(list);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: '保存行动计划失败' });
  }
});

app.put('/api/action-plans/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    const list = loadActionPlans();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: '行动计划不存在' });
      return;
    }
    const updated = {
      ...list[index],
      ...body
    };
    if (body.year !== undefined && body.year !== null) {
      const y = parseInt(body.year, 10);
      if (!Number.isNaN(y)) {
        updated.year = y;
      }
    }
    list[index] = updated;
    saveActionPlans(list);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: '更新行动计划失败' });
  }
});

app.delete('/api/action-plans/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const list = loadActionPlans();
    const next = list.filter((item) => item.id !== id);
    const deleted = next.length !== list.length;
    if (!deleted) {
      res.status(404).json({ success: false, error: '行动计划不存在' });
      return;
    }
    saveActionPlans(next);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: '删除行动计划失败' });
  }
});

app.get('/api/system-settings', (req, res) => {
  const list = loadSystemSettings();
  res.json(list);
});

app.post('/api/system-settings', (req, res) => {
  const list = loadSystemSettings();
  const body = req.body || {};
  const now = new Date().toISOString();
  const key = body.key;
  let item = null;
  if (key) {
    const index = list.findIndex((s) => s && s.key === key);
    if (index !== -1) {
      const existing = list[index];
      const merged = { ...existing, ...body };
      merged.id = existing.id;
      merged.created_at = existing.created_at || now;
      list[index] = merged;
      item = merged;
    }
  }
  if (!item) {
    const id = getNextId(list);
    item = {
      id,
      created_at: now,
      ...body
    };
    list.push(item);
  }
  saveSystemSettings(list);
  appendAuditLog({
    username: body.operator || '',
    role: body.role || '',
    method: 'POST',
    path: '/api/system-settings',
    status: 201,
    ip: req.ip,
    ua: req.headers['user-agent'] || '',
    query: req.query || {},
    body,
    action_type: 'CREATE',
    details: '新增系统设置'
  });
  if (!res.locals) {
    res.locals = {};
  }
  res.locals.auditLogged = true;
  res.status(201).json(item);
});

app.put('/api/system-settings/:id', (req, res) => {
  const list = loadSystemSettings();
  const id = parseInt(req.params.id, 10);
  const index = list.findIndex(s => s.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Setting not found' });
    return;
  }
  const body = req.body || {};
  list[index] = { ...list[index], ...body };
  saveSystemSettings(list);
  appendAuditLog({
    username: body.operator || '',
    role: body.role || '',
    method: 'PUT',
    path: `/api/system-settings/${id}`,
    status: 200,
    ip: req.ip,
    ua: req.headers['user-agent'] || '',
    query: req.query || {},
    body,
    action_type: 'UPDATE',
    details: '更新系统设置'
  });
  if (!res.locals) {
    res.locals = {};
  }
  res.locals.auditLogged = true;
  res.json(list[index]);
});

app.delete('/api/system-settings/:id', (req, res) => {
  const list = loadSystemSettings();
  const id = parseInt(req.params.id, 10);
  const next = list.filter(s => s.id !== id);
  const deleted = next.length !== list.length;
  if (!deleted) {
    res.status(404).json({ error: 'Setting not found' });
    return;
  }
  saveSystemSettings(next);
  appendAuditLog({
    username: '',
    role: '',
    method: 'DELETE',
    path: `/api/system-settings/${id}`,
    status: 200,
    ip: req.ip,
    ua: req.headers['user-agent'] || '',
    query: req.query || {},
    body: {},
    action_type: 'DELETE',
    details: '删除系统设置'
  });
  if (!res.locals) {
    res.locals = {};
  }
  res.locals.auditLogged = true;
  res.json({ success: true });
});

// Department Targets API
app.get('/api/department-targets', (req, res) => {
  try {
    const list = loadDepartmentTargets();
    let filtered = Array.isArray(list) ? [...list] : [];

    const { year, department, targetType, target_level } = req.query || {};

    if (year) {
      const y = parseInt(year, 10);
      if (!Number.isNaN(y)) {
        filtered = filtered.filter((item) => Number(item.year) === y);
      }
    }

    if (department) {
      filtered = filtered.filter((item) => {
        const deptName = item.department || item.department_name || '';
        return deptName === department;
      });
    }

    if (targetType) {
      filtered = filtered.filter((item) => item.target_type === targetType);
    }

    if (target_level) {
      filtered = filtered.filter((item) => item.target_level === target_level);
    }

    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: '加载部门目标分解数据失败' });
  }
});

app.post('/api/department-targets', (req, res) => {
  try {
    const body = req.body || {};
    const list = loadDepartmentTargets();
    const id = getNextId(list);
    const now = new Date().toISOString();

    const departments = loadDepartmentsStore();
    let departmentName = body.department || '';
    if (!departmentName && body.department_id && Array.isArray(departments)) {
      const d = departments.find((item) => item.id === body.department_id);
      if (d && d.name) {
        departmentName = d.name;
      }
    }

    const item = {
      id,
      created_at: now,
      year: body.year ? parseInt(body.year, 10) : null,
      department_id: body.department_id || null,
      department: departmentName,
      department_name: departmentName,
      target_level: body.target_level || '',
      target_type: body.target_type || '',
      target_name: body.target_name || '',
      target_value: body.target_value !== undefined && body.target_value !== null
        ? Number(body.target_value)
        : null,
      unit: body.unit || '',
      month: body.month !== undefined && body.month !== null ? Number(body.month) : null,
      quarter: body.quarter || '',
      current_value: body.current_value !== undefined && body.current_value !== null
        ? Number(body.current_value)
        : null,
      status: body.status || '',
      completion_rate: body.completion_rate || '',
      responsible_person: body.responsible_person || '',
      description: body.description || ''
    };

    list.push(item);
    saveDepartmentTargets(list);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: '保存部门目标分解数据失败' });
  }
});

app.put('/api/department-targets/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    const list = loadDepartmentTargets();
    const index = list.findIndex((item) => item.id === id);

    if (index === -1) {
      res.status(404).json({ error: '部门目标分解记录不存在' });
      return;
    }

    const departments = loadDepartmentsStore();
    let departmentName = body.department || list[index].department || '';
    if (!departmentName && body.department_id && Array.isArray(departments)) {
      const d = departments.find((item) => item.id === body.department_id);
      if (d && d.name) {
        departmentName = d.name;
      }
    }

    const updated = {
      ...list[index],
      ...body,
      year: body.year !== undefined && body.year !== null
        ? parseInt(body.year, 10)
        : list[index].year,
      department_id: body.department_id !== undefined
        ? body.department_id
        : list[index].department_id || null,
      department: departmentName || list[index].department || '',
      department_name: departmentName || list[index].department_name || '',
      target_value: body.target_value !== undefined && body.target_value !== null
        ? Number(body.target_value)
        : list[index].target_value,
      month: body.month !== undefined && body.month !== null
        ? Number(body.month)
        : list[index].month,
      current_value: body.current_value !== undefined && body.current_value !== null
        ? Number(body.current_value)
        : list[index].current_value
    };

    list[index] = updated;
    saveDepartmentTargets(list);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: '更新部门目标分解数据失败' });
  }
});

app.delete('/api/department-targets/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const list = loadDepartmentTargets();
    const next = list.filter((item) => item.id !== id);
    const deleted = next.length !== list.length;

    if (!deleted) {
      res.status(404).json({ success: false, error: '部门目标分解记录不存在' });
      return;
    }

    saveDepartmentTargets(next);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: '删除部门目标分解数据失败' });
  }
});

// Notifications API
app.get('/api/notifications', (req, res) => {
  const list = loadNotificationsStore();
  res.json(list);
});

app.post('/api/notifications', (req, res) => {
  const list = loadNotificationsStore();
  const newNotification = {
    id: list.length + 1,
    ...req.body,
    created_at: new Date().toISOString()
  };
  list.push(newNotification);
  saveNotificationsStore(list);
  res.json(newNotification);
});

app.put('/api/notifications/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const list = loadNotificationsStore();
  const index = list.findIndex(notification => notification.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...req.body };
    saveNotificationsStore(list);
    res.json(list[index]);
  } else {
    res.status(404).json({ error: 'Notification not found' });
  }
});

app.delete('/api/notifications/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const list = loadNotificationsStore();
  const next = list.filter(notification => notification.id !== id);
  const deleted = next.length !== list.length;
  if (deleted) {
    saveNotificationsStore(next);
  }
  res.json({ success: true });
});

app.post('/api/notifications/send', (req, res) => {
  const list = loadNotificationsStore();
  const newNotification = {
    id: list.length + 1,
    ...req.body,
    status: 'unread',
    created_at: new Date().toISOString()
  };
  list.push(newNotification);
  saveNotificationsStore(list);
  res.json(newNotification);
});

app.post('/api/dingtalk/test-connection', async (req, res) => {
  const body = req.body || {};
  const webhookUrl = body.webhookUrl || '';
  if (!webhookUrl || typeof webhookUrl !== 'string') {
    res.status(400).json({ success: false, message: '缺少有效的Webhook地址', error: '缺少Webhook地址' });
    return;
  }
  try {
    // 发送测试消息到钉钉
    const response = await axios.post(webhookUrl, {
      msgtype: 'text',
      text: {
        content: '测试消息：连接成功'
      }
    });
    res.json({ success: true, message: '连接正常', response: response.data });
  } catch (error) {
    console.error('DingTalk connection test failed:', error);
    res.status(500).json({ success: false, message: '连接失败', error: error.message });
  }
});

app.post('/api/dingtalk/send-message', async (req, res) => {
  const body = req.body || {};
  const webhookUrl = body.webhookUrl || '';
  const msgtype = body.msgtype || 'text';
  
  if (!webhookUrl || typeof webhookUrl !== 'string') {
    res.status(400).json({ success: false, message: '缺少有效的Webhook地址', error: '缺少Webhook地址' });
    return;
  }
  
  try {
    // 构建消息体
    let message;
    
    if (msgtype === 'text') {
      // 处理前端发送的title和content格式
      if (body.title && body.content) {
        message = {
          msgtype: 'text',
          text: {
            content: `${body.title}\n${body.content}`
          }
        };
      } else {
        // 处理直接发送content的情况
        const content = body.content || '测试消息';
        message = {
          msgtype: 'text',
          text: { content }
        };
      }
    } else {
      // 处理其他消息类型
      message = { msgtype, ...body };
    }
    
    // 发送消息到钉钉
    const response = await axios.post(webhookUrl, message);
    res.json({ success: true, message: '消息已发送', response: response.data });
  } catch (error) {
    console.error('DingTalk message send failed:', error);
    res.status(500).json({ success: false, message: '消息发送失败', error: error.message });
  }
});

// 文件上传 API
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: '未收到文件' });
    }
    
    // 这里只是一个示例，实际应用中应该保存文件到磁盘或云存储
    const fileInfo = {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };
    
    res.json({ success: true, file: fileInfo });
  } catch (error) {
    res.status(500).json({ error: '文件上传失败' });
  }
});

// Login API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    appendAuditLog({
      username: username || '',
      role: '',
      method: 'POST',
      path: '/api/login',
      status: 400,
      ip: req.ip,
      ua: req.headers['user-agent'] || '',
      query: req.query || {},
      body: { username },
      action_type: 'LOGIN',
      details: '登录失败：缺少用户名或密码'
    });
    if (!res.locals) {
      res.locals = {};
    }
    res.locals.auditLogged = true;
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  const users = loadUsersStore();
  const user = users.find(u => u.username === username);
  
  if (!user) {
    appendAuditLog({
      username,
      role: '',
      method: 'POST',
      path: '/api/login',
      status: 401,
      ip: req.ip,
      ua: req.headers['user-agent'] || '',
      query: req.query || {},
      body: { username },
      action_type: 'LOGIN',
      details: '登录失败：用户名或密码错误'
    });
    if (!res.locals) {
      res.locals = {};
    }
    res.locals.auditLogged = true;
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  let passwordOk = false;
  const storedPassword = user.password || '';
  if (storedPassword && (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$'))) {
    try {
      passwordOk = await bcrypt.compare(password, storedPassword);
    } catch (e) {
      passwordOk = false;
    }
  } else {
    // Fallback for plain text passwords (development only)
    passwordOk = (password === storedPassword);
  }

  if (!passwordOk) {
    appendAuditLog({
      username,
      role: '',
      method: 'POST',
      path: '/api/login',
      status: 401,
      ip: req.ip,
      ua: req.headers['user-agent'] || '',
      query: req.query || {},
      body: { username },
      action_type: 'LOGIN',
      details: '登录失败：用户名或密码错误'
    });
    if (!res.locals) {
      res.locals = {};
    }
    res.locals.auditLogged = true;
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = generateJwtToken(user);
  const permissions = getUserPermissions(user);

  const payload = {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      department: user.department,
      permissions
    }
  };
  appendAuditLog({
    username: user.username,
    role: user.role,
    method: 'POST',
    path: '/api/login',
    status: 200,
    ip: req.ip,
    ua: req.headers['user-agent'] || '',
    query: req.query || {},
    body: { username: user.username },
    action_type: 'LOGIN',
    details: '用户登录系统'
  });
   if (!res.locals) {
     res.locals = {};
   }
   res.locals.auditLogged = true;
  res.json(payload);
});

// Socket.io connection
let onlineUsers = [];

io.on('connection', (socket) => {
  console.log('A user connected');
  
  // 添加新用户到在线列表
  onlineUsers.push(socket.id);
  
  // 向所有客户端发送在线用户数
  io.emit('user-online', onlineUsers);
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
    // 从在线列表中移除用户
    onlineUsers = onlineUsers.filter(id => id !== socket.id);
    // 向所有客户端发送更新后的在线用户数
    io.emit('user-online', onlineUsers);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/company-info', (req, res) => {
  const stored = loadCompanyInfoStore();
  if (stored) {
    res.json(stored);
    return;
  }
  res.json({
    name: '示例公司',
    short_name: '示例公司',
    code: 'DEMO',
    address: '',
    contact: '',
    phone: '',
    email: ''
  });
});

app.put('/api/company-info', (req, res) => {
  const body = req.body || {};
  saveCompanyInfoStore(body);
  res.json(body);
});

app.get('/api/integration/status', (req, res) => {
  res.json({
    dingtalkConfigured: false,
    dingtalkEnabled: false
  });
});

app.get('/api/organization/tree', (req, res) => {
  const list = loadDepartmentsStore();
  const items = list.map(d => ({
    id: d.id,
    name: d.name,
    code: d.code,
    parent_id: d.parent_id || null,
    type: (d.type || 'DEPT').toUpperCase(),
    manager: d.manager || '',
    status: d.status || 'active',
    created_at: d.created_at
  }));
  const byId = {};
  const roots = [];
  for (const item of items) {
    byId[item.id] = { ...item, children: [] };
  }
  for (const item of items) {
    const pid = item.parent_id;
    if (pid && byId[pid]) {
      byId[pid].children.push(byId[item.id]);
    } else {
      roots.push(byId[item.id]);
    }
  }
  res.json(roots);
});

// Templates API
app.get('/api/templates', (req, res) => {
  const list = loadTemplatesStore();
  res.json(list);
});

app.post('/api/templates', (req, res) => {
  const now = new Date().toISOString();
  const body = req.body || {};
  const list = loadTemplatesStore();
  const id = getNextId(list);
  const item = {
    id,
    created_at: now,
    updated_at: now,
    ...body
  };
  list.push(item);
  saveTemplatesStore(list);
  res.json(item);
});

app.put('/api/templates/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadTemplatesStore();
  const index = list.findIndex(template => template.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  const body = req.body || {};
  list[index] = {
    ...list[index],
    ...body,
    updated_at: new Date().toISOString()
  };
  saveTemplatesStore(list);
  res.json(list[index]);
});

app.delete('/api/templates/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const list = loadTemplatesStore();
  const next = list.filter(template => template.id !== id);
  const deleted = next.length !== list.length;
  if (deleted) {
    saveTemplatesStore(next);
  }
  if (!deleted) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/admin/cleanup-data', (req, res) => {
  try {
    cleanupSystemData();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '数据清理失败' });
  }
});

app.get('/api/admin/backups', async (req, res) => {
  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10);
  const all = await listBackupFiles();
  const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
  const end = Number.isFinite(limit) && limit > 0 ? start + limit : undefined;
  const items = all.slice(start, end);
  res.json({ items, total: all.length });
});

app.post('/api/admin/backup', async (req, res) => {
  try {
    const now = new Date();
    const pad = (n) => (n < 10 ? `0${n}` : String(n));
    const name = `system-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;
    const snapshot = {
      createdAt: now.toISOString(),
      annual_work_plans: loadAnnualWorkPlans(),
      major_events: loadMajorEvents(),
      monthly_progress: loadMonthlyProgress(),
      departments: loadDepartmentsStore(),
      employees: loadEmployeesStore(),
      action_plans: loadActionPlans(),
      notifications: loadNotificationsStore(),
      users: loadUsersStore(),
      target_types: loadTargetTypesStore(),
      templates: loadTemplatesStore(),
      department_targets: loadDepartmentTargets(),
      system_settings: loadSystemSettings(),
      audit_logs: loadAuditLogs(),
      company_info: loadCompanyInfoStore() || null
    };
    const full = path.join(BACKUP_DIR, name);
    await fsp.writeFile(full, JSON.stringify(snapshot, null, 2), 'utf-8');
    res.json({ path: full, name });
  } catch (e) {
    res.status(500).json({ error: '备份失败' });
  }
});

app.post('/api/admin/backups/restore', async (req, res) => {
  try {
    const name = (req.body && req.body.name) || '';
    if (!name) {
      res.status(400).json({ error: '缺少备份文件名' });
      return;
    }
    const full = path.join(BACKUP_DIR, name);
    const content = await fsp.readFile(full, 'utf-8');
    const snapshot = JSON.parse(content);
    applyBackupSnapshot(snapshot);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '备份恢复失败' });
  }
});

app.post('/api/admin/backups/restore-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ error: '未收到备份文件' });
      return;
    }
    const content = req.file.buffer.toString('utf-8');
    const snapshot = JSON.parse(content);
    applyBackupSnapshot(snapshot);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: '备份文件解析失败' });
  }
});

app.get('/api/admin/backups/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const full = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(full)) {
      res.status(404).json({ error: '备份文件不存在' });
      return;
    }
    await fsp.unlink(full);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '删除备份失败' });
  }
});

app.delete('/api/admin/backups/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const full = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(full)) {
      res.status(404).json({ error: '备份文件不存在' });
      return;
    }
    await fsp.unlink(full);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '删除备份失败' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 自动备份功能
let autoBackupInterval = null;

function startAutoBackup() {
  try {
    // 清除现有的定时器
    if (autoBackupInterval) {
      clearInterval(autoBackupInterval);
      autoBackupInterval = null;
    }
    
    // 获取系统设置
    const settings = loadSystemSettings();
    const systemRec = settings.find(s => s && s.key === 'system');
    const autoBackupEnabled = systemRec?.value?.autoBackup ?? false;
    const backupInterval = systemRec?.value?.backupInterval ?? 24; // 默认24小时
    
    if (autoBackupEnabled) {
      console.log(`自动备份已启用，每 ${backupInterval} 小时执行一次`);
      const intervalMs = backupInterval * 60 * 60 * 1000;
      
      autoBackupInterval = setInterval(async () => {
        try {
          console.log('开始执行自动备份...');
          const now = new Date();
          const pad = (n) => (n < 10 ? `0${n}` : String(n));
          const name = `auto-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;
          
          const snapshot = {
            createdAt: now.toISOString(),
            annual_work_plans: loadAnnualWorkPlans(),
            major_events: loadMajorEvents(),
            monthly_progress: loadMonthlyProgress(),
            departments: loadDepartmentsStore(),
            employees: loadEmployeesStore(),
            action_plans: loadActionPlans(),
            notifications: loadNotificationsStore(),
            users: loadUsersStore(),
            target_types: loadTargetTypesStore(),
            templates: loadTemplatesStore(),
            department_targets: loadDepartmentTargets(),
            system_settings: loadSystemSettings(),
            audit_logs: loadAuditLogs(),
            company_info: loadCompanyInfoStore() || null
          };
          
          const full = path.join(BACKUP_DIR, name);
          await fsp.writeFile(full, JSON.stringify(snapshot, null, 2), 'utf-8');
          console.log(`自动备份成功：${name}`);
        } catch (e) {
          console.error('自动备份失败：', e);
        }
      }, intervalMs);
    } else {
      console.log('自动备份已禁用');
    }
  } catch (e) {
    console.error('初始化自动备份失败：', e);
  }
}

// 启动服务器后初始化自动备份
if (!process.env.RUN_DATA_CLEANUP_ONLY) {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // 延迟5秒启动自动备份，确保服务器完全启动
    setTimeout(startAutoBackup, 5000);
  });
}

// 提供API端点，用于重新加载自动备份设置
app.post('/api/admin/backup/reload', (req, res) => {
  try {
    startAutoBackup();
    res.json({ success: true, message: '自动备份设置已重新加载' });
  } catch (e) {
    res.status(500).json({ success: false, error: '重新加载自动备份设置失败' });
  }
});

export { cleanupSystemData };
