import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.join(__dirname, '..')

const sourceFile = path.join(root, 'server.js')
const destDir = path.join(root, 'server-dist')
const nodeModulesSrc = path.join(root, 'node_modules')
const nodeModulesDest = path.join(destDir, 'node_modules')

console.log('--- 开始构建服务端混淆代码 ---')

if (!fs.existsSync(sourceFile)) {
  console.error('❌ 未找到 server.js，无法混淆')
  process.exit(1)
}

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

const content = fs.readFileSync(sourceFile, 'utf8')
console.log('正在混淆: server.js')

async function obfuscateWrite(code, outPath) {
  try {
    const mod = await import('javascript-obfuscator')
    const JavaScriptObfuscator = mod.default || mod
    const result = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      target: 'node'
    })
    fs.writeFileSync(outPath, result.getObfuscatedCode())
    console.log('✅ 使用 javascript-obfuscator 完成混淆')
  } catch (e) {
    console.warn('⚠️ 无法使用 javascript-obfuscator，回退到 terser 压缩混淆:', e?.message || e)
    const terserMod = await import('terser')
    const { minify } = terserMod
    const result = await minify(code, { mangle: true, compress: true })
    fs.writeFileSync(outPath, result.code)
    console.log('✅ 使用 terser 完成压缩与变量混淆')
  }
}

await obfuscateWrite(content, path.join(destDir, 'server.js'))

console.log('--- 源码混淆完成，正在复制 node_modules (这可能需要一点时间) ---')
try {
  if (fs.existsSync(nodeModulesSrc)) {
    if (process.platform === 'win32') {
      try {
        execSync(`robocopy "${nodeModulesSrc}" "${nodeModulesDest}" /E /XD electron`, { stdio: 'inherit' })
      } catch (e) {
        // Robocopy returns non-zero exit codes on success (e.g. 1 means files copied).
        // We assume success if the error code is <= 7.
        if (e.status > 7) throw e;
      }
    } else {
      execSync(`cp -r "${nodeModulesSrc}" "${nodeModulesDest}"`, { stdio: 'inherit' })
    }
    console.log('✅ node_modules 复制完成')
  } else {
    console.warn('⚠️ 未检测到根目录 node_modules，跳过复制')
  }
} catch (error) {
  console.error('❌ 复制 node_modules 失败：', error?.message || error)
}

console.log('✅ 服务端构建完成！准备打包...')
