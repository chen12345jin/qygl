import fs from 'fs'
import path from 'path'

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'))
const version = pkg.version || '1.0.0'
const azbDir = path.join(process.cwd(), 'azb')
const versionRoot = path.join(azbDir, version)
const releaseDir = path.join(versionRoot, 'release')
const serverSourceDir = path.join(releaseDir, 'server-source')
const serverRoot = path.join(releaseDir, 'server')
const winUnpackedDir = path.join(serverRoot, 'win-unpacked')

console.log('--- Building Backend Package Structure ---')
console.log(`Source: ${serverSourceDir}`)
console.log(`Target: ${winUnpackedDir}`)

if (!fs.existsSync(serverSourceDir)) {
    console.error(`Error: Server source directory ${serverSourceDir} not found! Run npm run build:server-pkg first.`)
    process.exit(1)
}

// 1. Clean and Create Target Directory
if (fs.existsSync(winUnpackedDir)) {
    fs.rmSync(winUnpackedDir, { recursive: true, force: true })
}
fs.mkdirSync(winUnpackedDir, { recursive: true })
fs.mkdirSync(path.join(winUnpackedDir, 'resources'), { recursive: true })

// 2. Copy all files from server-source
const files = fs.readdirSync(serverSourceDir)
for (const file of files) {
    const src = path.join(serverSourceDir, file)
    const dst = path.join(winUnpackedDir, file)
    
    if (fs.lstatSync(src).isDirectory()) {
         fs.cpSync(src, dst, { recursive: true })
    } else {
         fs.copyFileSync(src, dst)
    }
    console.log(`Copied ${file}`)
}

// 3. Add NSSM (Service Manager)
// Check multiple locations for nssm.exe
const nssmLocations = [
    path.join(process.cwd(), 'nssm-2.24', 'win64', 'nssm.exe'),
    path.join(process.cwd(), 'server', 'nssm.exe'),
    path.join(process.cwd(), 'tools', 'nssm.exe')
]

let nssmFound = false
for (const loc of nssmLocations) {
    if (fs.existsSync(loc)) {
        fs.copyFileSync(loc, path.join(winUnpackedDir, 'nssm.exe'))
        console.log(`Copied nssm.exe from ${loc}`)
        nssmFound = true
        break
    }
}

if (!nssmFound) {
    console.warn('Warning: nssm.exe not found! Service installation might fail.')
}

// 4. Ensure .env exists
const envFile = path.join(winUnpackedDir, '.env')
if (!fs.existsSync(envFile)) {
    const defaultEnv = `PORT=5004
ENABLE_AUTH=false
JWT_SECRET=production-secret-change-me-immediately
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=enterprise_planning
`
    fs.writeFileSync(envFile, defaultEnv)
    console.log('Created default .env file')
}

// 5. Ensure EnterpriseServer.xml for nssm exists (optional but good for service config)
// We will rely on nssm install commands in the installer script usually, but having a config helps.

console.log('Backend structure ready for packaging.')
