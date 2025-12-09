import fs from 'fs'
import path from 'path'

try {
  const p = path.join(process.resourcesPath || '', 'config.js')
  const code = fs.readFileSync(p, 'utf8')
  if (typeof window === 'undefined') global.window = {}
  eval(code)
} catch {
  if (typeof window === 'undefined') global.window = {}
  window.SERVER_CONFIG = { BASE_URL: 'http://localhost:5004', DISABLE_LOGIN: true }
}
