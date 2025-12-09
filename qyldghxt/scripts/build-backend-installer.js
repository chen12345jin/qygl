import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'))
const version = pkg.version || '0.0.0'
const azbDir = path.join(process.cwd(), 'azb')
const versionRoot = path.join(azbDir, version)
const releaseDir = path.join(versionRoot, 'release')
const serverRoot = path.join(releaseDir, 'server')
const winUnpackedSource = path.join(serverRoot, 'win-unpacked')
const tempOutput = path.join(process.cwd(), 'temp_installer_output')

console.log('--- Building Backend Installer with Electron Builder CLI ---')

// 1. Check source
if (!fs.existsSync(winUnpackedSource)) {
    console.error(`Error: ${winUnpackedSource} does not exist. Run build-backend.js first.`)
    process.exit(1)
}

// Ensure temp output is clean
if (fs.existsSync(tempOutput)) fs.rmSync(tempOutput, { recursive: true, force: true })
fs.mkdirSync(tempOutput, { recursive: true })

// 2. Create Config File
const configFile = path.join(tempOutput, 'builder-config.json')
const config = {
  appId: "com.qyldghxt.server",
  productName: "企业年度规划系统服务端",
  electronVersion: "32.2.0",
  directories: {
    output: tempOutput,
  },
  win: {
    target: "nsis",
    icon: "client/public/icon.ico",
    artifactName: "Server-Setup-${version}.exe",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    shortcutName: "企业年度规划系统服务端",
    runAfterFinish: false,
  },
  compression: "normal",
  files: ["**/*"], // Include all files in the prepackaged directory
  publish: {
    provider: "generic",
    url: "http://localhost/updates"
  }
}
fs.writeFileSync(configFile, JSON.stringify(config, null, 2))

// 3. Build using CLI
// We need to find the electron-builder binary.
// Since it's in devDependencies, it should be in node_modules/.bin/electron-builder
let builderPath = path.join(process.cwd(), 'node_modules', '.bin', 'electron-builder.cmd')
if (!fs.existsSync(builderPath)) {
    // try client/node_modules if not in root
    builderPath = path.join(process.cwd(), 'client', 'node_modules', '.bin', 'electron-builder.cmd')
}
if (!fs.existsSync(builderPath)) {
    // try just 'electron-builder' if in path (fallback)
    builderPath = 'electron-builder'
}

console.log(`Using builder: ${builderPath}`)

try {
    const cmd = `"${builderPath}" --win --x64 --prepackaged "${winUnpackedSource}" --config "${configFile}"`
    console.log(`Executing: ${cmd}`)
    execSync(cmd, { stdio: 'inherit' })
    console.log('Installer built successfully in temp location.')

    // 4. Move artifacts
    console.log('Moving artifacts to release/server...')
    const artifacts = fs.readdirSync(tempOutput)
    for (const file of artifacts) {
        if (file === 'win-unpacked' || file.startsWith('builder-debug') || file === 'builder-config.json') continue
        
        const src = path.join(tempOutput, file)
        const dst = path.join(serverRoot, file)
        
        if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true })
        fs.renameSync(src, dst)
        console.log(`Moved ${file}`)
    }
    
    // Clean temp
    // fs.rmSync(tempOutput, { recursive: true, force: true }) // Optional: keep for debug
    
    console.log('Backend packaging complete.')
} catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
}
