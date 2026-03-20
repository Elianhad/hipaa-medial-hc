const { spawn } = require('node:child_process');
const path = require('node:path');
const { getCommandName, getRunArgs, processManager } = require('./package-manager');

const rootDir = path.resolve(__dirname, '..');
const useShell = process.platform === 'win32';
const processes = [
    { name: 'backend', script: 'start:dev' },
    { name: 'frontend', script: 'dev' },
];

const children = processes.map(({ name, script }) => {
    const child = spawn(getCommandName(), getRunArgs(name, script), {
        cwd: rootDir,
        stdio: 'inherit',
        shell: useShell,
    });

    child.on('exit', (code) => {
        if (code && code !== 0) {
            shutdown(code);
        }
    });

    return child;
});

let isShuttingDown = false;

function shutdown(exitCode = 0) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    for (const child of children) {
        if (!child.killed) {
            child.kill('SIGINT');
        }
    }

    process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log(`Starting backend and frontend with ${processManager}...`);