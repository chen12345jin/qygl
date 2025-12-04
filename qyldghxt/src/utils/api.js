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
  const server = getServerUrl()
  if (server) return server.replace(/\/+$/,'') + '/api'
  const env = getEnvBase()
  if (env) return env
  return '/api'
}

export const api = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.baseURL = resolveBaseURL()
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
