import { api } from './api'

const CACHE_KEY = 'APP_LOCALE_PREFS'

const detectDefaults = () => {
  try {
    const language = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'zh-CN'
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
    return { language, timeZone }
  } catch {
    return { language: 'zh-CN', timeZone: 'Asia/Shanghai' }
  }
}

export const applyLocalePrefs = (prefs) => {
  const safe = { ...(detectDefaults()), ...(prefs || {}) }
  try { if (typeof window !== 'undefined') window.APP_LOCALE = safe } catch {}
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(safe)) } catch {}
  return safe
}

export const getLocalePrefs = () => {
  try {
    if (typeof window !== 'undefined' && window.APP_LOCALE) return window.APP_LOCALE
  } catch {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return detectDefaults()
}

export const loadLocalePrefs = async () => {
  try {
    const res = await api.get('/system-settings')
    const items = Array.isArray(res?.data) ? res.data : []
    const systemRec = items.find(s => s.key === 'system')
    const language = systemRec?.value?.language
    const timeZone = systemRec?.value?.timezone
    return applyLocalePrefs({ language, timeZone })
  } catch {
    return applyLocalePrefs(detectDefaults())
  }
}

const toDate = (val) => {
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    const ms = val < 1e12 ? val * 1000 : val
    const d = new Date(ms)
    return isNaN(d) ? null : d
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d)) return d
    const norm = val.replace(' ', 'T')
    const d2 = new Date(norm)
    return isNaN(d2) ? null : d2
  }
  return null
}

export const formatDateTime = (value, opts = {}) => {
  if (value === null || value === undefined) return '-'
  const d = toDate(value)
  if (!d) return typeof value === 'string' ? value : '-'
  const { language, timeZone } = getLocalePrefs()
  const options = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
    timeZone,
    ...opts
  }
  try {
    return new Intl.DateTimeFormat(language, options).format(d)
  } catch {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  }
}

export const formatDate = (value, opts = {}) => {
  if (value === null || value === undefined) return '-'
  const d = toDate(value)
  if (!d) return typeof value === 'string' ? value : '-'
  const { language, timeZone } = getLocalePrefs()
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone, ...opts }
  try {
    return new Intl.DateTimeFormat(language, options).format(d)
  } catch {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

