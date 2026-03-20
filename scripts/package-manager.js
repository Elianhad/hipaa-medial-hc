const processManager = (() => {
    const userAgent = process.env.npm_config_user_agent || '';

    if (userAgent.includes('pnpm/')) {
        return 'pnpm';
    }

    return 'npm';
})();

function getCommandName() {
    if (process.platform === 'win32') {
        return `${processManager}.cmd`;
    }

    return processManager;
}

function getRunArgs(workspace, scriptName, extraArgs = []) {
    if (processManager === 'pnpm') {
        return ['--dir', workspace, 'run', scriptName, ...extraArgs];
    }

    return ['--prefix', workspace, 'run', scriptName, ...extraArgs];
}

module.exports = {
    getCommandName,
    getRunArgs,
    processManager,
};