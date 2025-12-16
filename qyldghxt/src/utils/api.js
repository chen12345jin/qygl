import axios from 'axios'

function getServerUrl() {
  const v = localStorage.getItem('SERVER_URL') || ''
  return v.trim()
}

function buildApiBase(base) {
  const raw = base == null ? '' : String(base).trim()
  if (!raw) return ''
  const noTrailing = raw.replace(/\/+$/, '')
  if (/\/api$/i.test(noTrailing)) return noTrailing
  return `${noTrailing}/api`
}

function getEnvBase() {
  const v = import.meta.env?.VITE_API_BASE_URL
  return (v && String(v).trim()) || ''
}

function getWindowBase() {
  if (typeof window === 'undefined') return ''
  const cfg = window.SERVER_CONFIG
  if (!cfg || !cfg.BASE_URL) return ''
  return String(cfg.BASE_URL).trim()
}

function resolveBaseURL() {
  const serverUrl = getServerUrl()
  if (serverUrl) {
    return buildApiBase(serverUrl)
  }
  const envBase = getEnvBase()
  if (envBase) {
    return buildApiBase(envBase)
  }
  const windowBase = getWindowBase()
  if (windowBase) {
    return buildApiBase(windowBase)
  }
  // Always use relative path for development to work with Vite proxy
  return '/api'
}

export const api = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = {}
  }
  const sTok = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : ''
  const lTok = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : ''
  const token = sTok || lTok || ''
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  let username = ''
  let role = ''
  try {
    const storedUser =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('currentUser') : null
    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      const parsed = JSON.parse(storedUser)
      if (parsed && typeof parsed === 'object') {
        username = parsed.username || parsed.realName || ''
        role = parsed.role || ''
      }
    }
  } catch (_) {}
  if (!username) {
    try {
      const localUser =
        typeof localStorage !== 'undefined' ? localStorage.getItem('currentUser') : null
      if (localUser && localUser !== 'undefined' && localUser !== 'null') {
        const parsedLocal = JSON.parse(localUser)
        if (parsedLocal && typeof parsedLocal === 'object') {
          username = parsedLocal.username || parsedLocal.realName || ''
          role = role || parsedLocal.role || ''
        }
      }
    } catch (_) {}
  }
  if (username) {
    config.headers['X-User-Name'] = encodeURIComponent(String(username))
  }
  if (role) {
    config.headers['X-User-Role'] = encodeURIComponent(String(role))
  }
  config.baseURL = resolveBaseURL()
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const disable = typeof window !== 'undefined' && window.SERVER_CONFIG && window.SERVER_CONFIG.DISABLE_LOGIN === true
    if (error.response?.status === 401) {
      try {
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('currentUser')
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
      } catch (_) {}
      if (!disable) {
        if (typeof window !== 'undefined') {
          window.location.hash = '#/login'
        }
      }
    }
    return Promise.reject(error)
  }
)
