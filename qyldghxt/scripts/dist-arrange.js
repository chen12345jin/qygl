import fs from 'fs'
import path from 'path'

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'))
const productName = (pkg.build && pkg.build.productName) || pkg.name || 'App'
const version = pkg.version || '0.0.0'

const azbDir = path.join(process.cwd(), 'azb')
const versionRoot = path.join(azbDir, version)
const targetReleaseRoot = path.join(versionRoot, 'release')
// Electron Builder outputs client artifacts into client/release_final
const sourceReleaseDir = path.join(process.cwd(), 'client', 'release_final')
const frontendDst = targetReleaseRoot
// Backend artifacts are prepared separately into targetReleaseRoot/server
const updatesDst = path.join(process.cwd(), 'server', 'updates')

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }) }

function moveDir(src, dst) {
  if (!fs.existsSync(src)) return
  ensureDir(dst)
  const entries = fs.readdirSync(src)
  for (const name of entries) {
    const s = path.join(src, name)
    const d = path.join(dst, name)
    const stat = fs.statSync(s)
    if (stat.isDirectory()) {
      ensureDir(d)
      moveDir(s, d)
    } else {
      // Copy file, overwrite if exists
      fs.copyFileSync(s, d)
    }
  }
}

// Flatten helper: if frontendDst contains an extra nested "client" folder, move its contents up
function flattenIfNestedClient(dst) {
  const nested = path.join(dst, 'client')
  if (fs.existsSync(nested)) {
    const items = fs.readdirSync(nested)
    for (const name of items) {
      const from = path.join(nested, name)
      const to = path.join(dst, name)
      const stat = fs.statSync(from)
      if (stat.isDirectory()) {
        moveDir(from, to)
      } else {
        fs.copyFileSync(from, to)
      }
    }
    // remove nested folder after moving
    fs.rmSync(nested, { recursive: true, force: true })
    console.log('Flattened nested client folder in frontend release output')
  }
}

ensureDir(versionRoot)
ensureDir(targetReleaseRoot)
ensureDir(frontendDst)
ensureDir(updatesDst)

// Move Electron Builder output (release folder)
if (fs.existsSync(sourceReleaseDir) && fs.readdirSync(sourceReleaseDir).length > 0) {
  console.log(`Moving frontend artifacts from ${sourceReleaseDir} to ${frontendDst}`)
  moveDir(sourceReleaseDir, frontendDst)
  // ensure no double client nesting
  flattenIfNestedClient(frontendDst)
} else {
  console.warn('⚠️ No release folder found. Frontend build might have failed or skipped.')
}

const clientReleaseDir = path.join(process.cwd(), 'azb', version, 'release', 'client')
if (fs.existsSync(clientReleaseDir)) {
  const files = fs.readdirSync(clientReleaseDir)
  for (const name of files) {
    if (name.endsWith('.exe') || name === 'latest.yml') {
      const src = path.join(clientReleaseDir, name)
      const dst = path.join(updatesDst, name)
      fs.copyFileSync(src, dst)
      console.log(`Copied update artifact ${name} to ${updatesDst}`)
    }
  }
}

// write version files under version folder
fs.writeFileSync(path.join(versionRoot, 'version.json'), JSON.stringify({
  productName,
  version,
  buildTime: new Date().toISOString()
}, null, 2))

fs.writeFileSync(path.join(versionRoot, 'version.txt'), `${productName} ${version}`)

console.log(`Arranged distribution at: ${targetReleaseRoot}`)
