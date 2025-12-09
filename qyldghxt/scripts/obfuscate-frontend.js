import fs from 'fs'
import path from 'path'

const distDir = path.join(process.cwd(), 'dist')

function listFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  const entries = fs.readdirSync(dir)
  for (const name of entries) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) out.push(...listFiles(full))
    else out.push(full)
  }
  return out
}

async function obfuscateJs(file) {
  const code = fs.readFileSync(file, 'utf8')
  try {
    const terserMod = await import('terser')
    const { minify } = terserMod
    const result = await minify(code, {
      mangle: true,
      compress: {
        passes: 2,
        dead_code: true,
        drop_console: true
      }
    })
    if (result && result.code) {
      fs.writeFileSync(file, result.code)
      console.log('✅ 前端混淆压缩:', path.relative(distDir, file))
    }
  } catch (e) {
    console.warn('⚠️ 前端混淆失败，保留原文件:', path.relative(distDir, file), e?.message || e)
  }
}

async function run() {
  if (!fs.existsSync(distDir)) {
    console.error('❌ 未找到 dist 目录，请先执行 vite build')
    process.exit(1)
  }
  const files = listFiles(distDir)
  const jsFiles = files.filter(f => f.endsWith('.js'))
  for (const f of jsFiles) {
    await obfuscateJs(f)
  }
  console.log('✅ 前端代码混淆完成')
}

run()
