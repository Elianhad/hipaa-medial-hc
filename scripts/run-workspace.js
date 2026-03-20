const { spawn } = require('node:child_process');
const path = require('node:path');
const { getCommandName, getRunArgs } = require('./package-manager');

const [, , workspace, scriptName, ...extraArgs] = process.argv;
const useShell = process.platform === 'win32';

if (!workspace || !scriptName) {
    console.error('Usage: node scripts/run-workspace.js <workspace> <script> [args...]');
    process.exit(1);
}

const child = spawn(getCommandName(), getRunArgs(workspace, scriptName, extraArgs), {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: useShell,
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});