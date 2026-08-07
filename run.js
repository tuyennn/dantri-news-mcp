#!/usr/bin/env node

import { spawnSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const venvPath = path.join(__dirname, '.venv');

function fail(message, code = 1) {
    console.error(`[dantri-news-mcp] ${message}`);
    process.exit(code);
}

function getVenvPythonPath() {
    return process.platform === 'win32'
        ? path.join(venvPath, 'Scripts', 'python.exe')
        : path.join(venvPath, 'bin', 'python');
}

/**
 * Find a usable Python >= 3.10.
 */
function findSystemPython() {
    const candidates =
        process.platform === 'win32'
            ? [
                { command: 'py', prefix: ['-3'] },
                { command: 'python', prefix: [] },
                { command: 'python3', prefix: [] }
            ]
            : [
                { command: 'python3', prefix: [] },
                { command: 'python', prefix: [] }
            ];

    for (const candidate of candidates) {
        const result = spawnSync(
            candidate.command,
            [
                ...candidate.prefix,
                '-c',
                'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)'
            ],
            {
                stdio: 'ignore'
            }
        );

        if (!result.error && result.status === 0) {
            return candidate;
        }
    }

    fail(
        'Python 3.10+ was not found. ' +
        'Install Python 3 and python3-venv in the environment running MCP.'
    );
}

/**
 * Run setup commands.
 *
 * IMPORTANT:
 * stdout of this Node process belongs to MCP.
 *
 * Therefore BOTH stdout + stderr of setup commands
 * are redirected to parent STDERR (fd 2).
 */
function runSetup(command, args, errorMessage) {
    const result = spawnSync(command, args, {
        cwd: __dirname,

        // stdin ignored
        // child stdout -> parent stderr
        // child stderr -> parent stderr
        stdio: ['ignore', 2, 2],

        env: process.env
    });

    if (result.error) {
        fail(`${errorMessage}: ${result.error.message}`);
    }

    if (result.status !== 0) {
        fail(
            `${errorMessage} (exit code ${result.status ?? 'unknown'})`,
            result.status ?? 1
        );
    }
}

/**
 * Check whether required Python modules already exist.
 *
 * This also handles a previous partially-created .venv.
 */
function dependenciesAvailable(pythonPath) {
    const result = spawnSync(
        pythonPath,
        [
            '-c',
            'import mcp, feedparser, trafilatura, bs4, cachetools'
        ],
        {
            cwd: __dirname,
            stdio: 'ignore',
            env: process.env
        }
    );

    return !result.error && result.status === 0;
}

const systemPython = findSystemPython();
const pythonPath = getVenvPythonPath();

/**
 * Create/recreate the virtual environment.
 */
if (!fs.existsSync(pythonPath)) {
    // Remove broken/incomplete virtual environments.
    if (fs.existsSync(venvPath)) {
        fs.rmSync(venvPath, {
            recursive: true,
            force: true
        });
    }

    console.error(
        '[dantri-news-mcp] Creating Python virtual environment...'
    );

    runSetup(
        systemPython.command,
        [
            ...systemPython.prefix,
            '-m',
            'venv',
            venvPath
        ],
        'Failed to create Python virtual environment. ' +
        'On Debian/Ubuntu install python3-venv.'
    );
}

/**
 * Install dependencies only when necessary.
 */
if (!dependenciesAvailable(pythonPath)) {
    console.error(
        '[dantri-news-mcp] Installing Python dependencies...'
    );

    runSetup(
        pythonPath,
        [
            '-m',
            'pip',
            'install',
            '--disable-pip-version-check',
            '-r',
            path.join(__dirname, 'requirements.txt')
        ],
        'Failed to install Python dependencies'
    );
}

/**
 * Now start the real MCP process.
 *
 * From this moment onwards stdout is MCP JSON-RPC.
 */
const child = spawn(
    pythonPath,
    [
        '-u',
        path.join(__dirname, 'server.py')
    ],
    {
        cwd: __dirname,

        // This is intentionally inherited.
        // server.py IS the MCP stdio server.
        stdio: [
            'inherit',
            'inherit',
            'inherit'
        ],

        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'
        }
    }
);

child.on('error', (error) => {
    fail(
        `Failed to start Python MCP server: ${error.message}`
    );
});

child.on('exit', (code, signal) => {
    if (signal) {
        console.error(
            `[dantri-news-mcp] Python MCP server stopped by signal ${signal}`
        );

        process.exit(1);
    }

    process.exit(code ?? 0);
});

/**
 * Forward shutdown signals to Python.
 */
for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        if (!child.killed) {
            child.kill(signal);
        }
    });
}
