const { spawn } = require('node:child_process');
const path = require('node:path');
const { getCommandName, getRunArgs } = require('./package-manager');

const [, , scriptName, ...extraArgs] = process.argv;
const useShell = process.platform === 'win32';
const workspaces = ['backend', 'frontend'];

if (!scriptName) {
    console.error('Usage: node scripts/run-many.js <script> [args...]');
    process.exit(1);
}

async function runWorkspace(workspace) {
    return new Promise((resolve, reject) => {
        const child = spawn(getCommandName(), getRunArgs(workspace, scriptName, extraArgs), {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'inherit',
            shell: useShell,
        });

        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`${workspace} exited with code ${code}`));
        });
    });
}

(async () => {
    for (const workspace of workspaces) {
        await runWorkspace(workspace);
    }
})().catch((error) => {
    console.error(error.message);
    process.exit(1);
});