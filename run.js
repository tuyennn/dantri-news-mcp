#!/usr/bin/env node

import { spawnSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const venvPath = path.join(__dirname, '.venv');

function getPythonPath() {
  if (process.platform === 'win32') {
    return path.join(venvPath, 'Scripts', 'python.exe');
  }

  return path.join(venvPath, 'bin', 'python');
}

if (!fs.existsSync(venvPath)) {
  console.error('Creating Python virtual environment...');

  let result = spawnSync('python3', ['-m', 'venv', '.venv'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status);
  }

  const pythonPath = getPythonPath();

  console.error('Installing Python dependencies...');

  result = spawnSync(
    pythonPath,
    ['-m', 'pip', 'install', '-r', 'requirements.txt'],
    {
      cwd: __dirname,
      stdio: 'inherit'
    }
  );

  if (result.status !== 0) {
    process.exit(result.status);
  }
}

const pythonPath = getPythonPath();

const child = spawn(
  pythonPath,
  ['server.py'],
  {
    cwd: __dirname,
    stdio: 'inherit'
  }
);

child.on('exit', (code) => {
  process.exit(code || 0);
});
