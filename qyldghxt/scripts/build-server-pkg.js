import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version || '0.0.0';
const azbDir = path.join(rootDir, 'azb');
const serverSourceDir = path.join(azbDir, version, 'release', 'server-source');

// Clean and create directories
if (fs.existsSync(serverSourceDir)) {
  fs.rmSync(serverSourceDir, { recursive: true, force: true });
}
fs.mkdirSync(serverSourceDir, { recursive: true });

console.log('1. Building backend executable with pkg...');
try {
  // Using npx pkg to bundle server/index.js (CommonJS)
  // Note: Assuming node18-win-x64 target.
  const outputExe = path.join(serverSourceDir, 'backend-service.exe');
  execSync(`npx pkg server/index.js --targets node18-win-x64 --output "${outputExe.replace(/\\/g, '/')}"`, {
    stdio: 'inherit',
    cwd: rootDir
  });
} catch (e) {
  console.error('Pkg build failed:', e.message);
  process.exit(1);
}

console.log('2. Copying configuration files...');
// Copy .env
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  fs.copyFileSync(envPath, path.join(serverSourceDir, '.env'));
} else {
  console.warn('Warning: .env file not found. Creating a default one.');
  fs.writeFileSync(path.join(serverSourceDir, '.env'), 'PORT=5004\nDB_ENABLED=true\nDB_HOST=localhost\nDB_USER=root\nDB_PASSWORD=\nDB_NAME=planning_system\n');
}

console.log('3. Creating scripts...');
// Create start_server.bat
const batContent = `@echo off
cd /d "%~dp0"
title Enterprise Planning System Server
echo Starting Backend Service...
echo Please keep this window open.
backend-service.exe
pause
`;
fs.writeFileSync(path.join(serverSourceDir, 'start_server.bat'), batContent);

// Create install_service.bat
const installBat = `@echo off
setlocal
cd /d "%~dp0"
if not exist logs mkdir logs

echo Installing services...

REM Install MySQL service if mysql exists
if exist "%~dp0mysql\bin\mysqld.exe" (
  echo Installing MySQL service QYGL_MySQL
  "%~dp0mysql\bin\mysqld.exe" --install QYGL_MySQL
  sc start QYGL_MySQL
) else (
  echo MySQL bin not found, skip MySQL service installation.
)

REM Install backend service with NSSM
if exist "%~dp0nssm.exe" (
  echo Installing backend service QYGL_Backend
  "%~dp0nssm.exe" install QYGL_Backend "%~dp0backend-service.exe"
  "%~dp0nssm.exe" set QYGL_Backend AppDirectory "%~dp0"
  "%~dp0nssm.exe" set QYGL_Backend AppStdout "%~dp0logs\service.log"
  "%~dp0nssm.exe" set QYGL_Backend AppStderr "%~dp0logs\error.log"
  "%~dp0nssm.exe" start QYGL_Backend
  echo Backend service installed and started.
) else (
  echo nssm.exe not found. Please place nssm.exe in this folder and rerun.
)

echo Done.
pause
endlocal
`;
fs.writeFileSync(path.join(serverSourceDir, 'install_service.bat'), installBat);

// Create uninstall_service.bat
const uninstallBat = `@echo off
setlocal
cd /d "%~dp0"

echo Stopping and removing services...

REM Stop backend service
if exist "%~dp0nssm.exe" (
  "%~dp0nssm.exe" stop QYGL_Backend
  "%~dp0nssm.exe" remove QYGL_Backend confirm
) else (
  echo nssm.exe not found, cannot remove backend service automatically.
)

REM Stop and remove MySQL service
sc stop QYGL_MySQL >nul 2>&1
sc delete QYGL_MySQL >nul 2>&1

echo Done.
pause
endlocal
`;
fs.writeFileSync(path.join(serverSourceDir, 'uninstall_service.bat'), uninstallBat);

// Create db-mysql.sql (Simplified version based on server.js)
const sqlContent = `-- Database Initialization Script
-- The server automatically creates tables if they don't exist.
-- This file is for reference or manual initialization.

CREATE DATABASE IF NOT EXISTS planning_system;
USE planning_system;

CREATE TABLE IF NOT EXISTS annual_work_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sheet_type VARCHAR(32) NULL,
    year INT,
    month INT NULL,
    department_id INT NULL,
    department_name VARCHAR(255) NULL,
    plan_name VARCHAR(255) NULL,
    category VARCHAR(64) NULL,
    priority VARCHAR(32) NULL,
    start_date VARCHAR(32) NULL,
    end_date VARCHAR(32) NULL,
    budget DECIMAL(14,2) NULL,
    status VARCHAR(32) NULL,
    responsible_person VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS major_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT,
    event_name VARCHAR(255) NULL,
    event_type VARCHAR(64) NULL,
    importance VARCHAR(32) NULL,
    planned_date VARCHAR(32) NULL,
    actual_date VARCHAR(32) NULL,
    department_id INT NULL,
    responsible_department VARCHAR(255) NULL,
    responsible_person VARCHAR(255) NULL,
    status VARCHAR(32) NULL,
    budget DECIMAL(14,2) NULL,
    actual_cost DECIMAL(14,2) NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT,
    month INT,
    department VARCHAR(255) NULL,
    task_name VARCHAR(255) NULL,
    target_value DECIMAL(14,2) NULL,
    actual_value DECIMAL(14,2) NULL,
    status VARCHAR(32) NULL,
    responsible_person VARCHAR(255) NULL,
    start_date VARCHAR(32) NULL,
    end_date VARCHAR(32) NULL,
    key_activities TEXT NULL,
    achievements TEXT NULL,
    challenges TEXT NULL,
    next_month_plan TEXT NULL,
    support_needed TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) UNIQUE,
    parent_id BIGINT NULL,
    manager VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    email VARCHAR(255) NULL,
    status VARCHAR(32) DEFAULT 'active',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(64) UNIQUE,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NULL,
    position VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    email VARCHAR(255) NULL,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
fs.writeFileSync(path.join(serverSourceDir, 'db-mysql.sql'), sqlContent);

console.log('4. Preparing MySQL folder...');
const mysqlDir = path.join(serverSourceDir, 'mysql');
if (!fs.existsSync(mysqlDir)) {
  fs.mkdirSync(mysqlDir);
  // Create a README so the folder isn't empty and user knows what to do
  fs.writeFileSync(path.join(mysqlDir, 'README.txt'), 'Please copy the "mysql" folder (containing bin, data, share, etc.) here before running the installer builder if you want to bundle MySQL.');
}

console.log('Server Source preparation complete.');
console.log(`Files are in: ${serverSourceDir}`);

// 5. Copy server/node_modules into server-source for packaging (avoid EBUSY from live node_modules)
try {
  const nmSrc = path.join(rootDir, 'server', 'node_modules');
  const nmDst = path.join(serverSourceDir, 'node_modules');
  if (fs.existsSync(nmDst)) fs.rmSync(nmDst, { recursive: true, force: true });
  if (fs.existsSync(nmSrc)) {
    console.log('Copying server/node_modules → server-source/node_modules ...');
    fs.cpSync(nmSrc, nmDst, { recursive: true });
    console.log('node_modules copied.');
  } else {
    console.warn('server/node_modules not found, skipping copy.');
  }
} catch (e) {
  console.warn('Copy node_modules failed:', e?.message || e);
}
