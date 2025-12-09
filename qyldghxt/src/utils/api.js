import axios from 'axios'

function getServerUrl() {
  const v = localStorage.getItem('SERVER_URL') || ''
  return v.trim()
}

function getEnvBase() {
  const v = import.meta.env?.VITE_API_BASE_URL
  return (v && String(v).trim()) || ''
}

function resolveBaseURL() {
  if (import.meta.env?.DEV) return '/api'
  const fromStorage = getServerUrl()
  const fromWindow = (typeof window !== 'undefined' && window.SERVER_CONFIG && window.SERVER_CONFIG.BASE_URL) ? String(window.SERVER_CONFIG.BASE_URL).trim() : ''
  const base = (fromStorage || fromWindow || 'http://localhost:5004').replace(/\/+$/,'')
  return `${base}/api`
}

export const api = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const sTok = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : ''
  const lTok = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : ''
  const token = sTok || lTok || ''
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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
