#!/usr/bin/env node

import { spawn } from 'child_process';

const processRunner = spawn('python3', ['server.py'], {
  stdio: 'inherit'
});

processRunner.on('exit', (code) => {
  process.exit(code);
});
