import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import path from 'path';

test('UTF-8 seed regression: accented characters should be preserved in database', async () => {
    const projectRoot = path.resolve(__dirname, '..');
    const backendRoot = path.resolve(projectRoot, 'backend');

    // Extract .env.local credentials
    const envPath = path.resolve(backendRoot, '.env.local');
    let host = 'localhost';
    let port = '5433';
    let user = 'app_user';
    let password = 'app_password';
    let dbName = 'hipaa_hce';

    try {
        const fs = require('fs');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const lines = content.split('\n');
            const envVars: Record<string, string> = {};
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const [key, val] = trimmed.split('=');
                if (key && val) {
                    envVars[key.trim()] = val.trim();
                }
            }
            host = envVars.DB_HOST || host;
            port = envVars.DB_PORT || port;
            user = envVars.DB_USERNAME || user;
            password = envVars.DB_PASSWORD || password;
            dbName = envVars.DB_NAME || dbName;
        }
    } catch {
        // Fallback to defaults
    }

    const connString = `postgresql://${user}:${password}@${host}:${port}/${dbName}`;

    // Query tenant name with accent
    let result: string;
    try {
        result = execSync(
            `psql "${connString}" -t -c "SELECT name FROM tenants WHERE subdomain='drfulano';"`,
            {
                encoding: 'utf8',
                env: { ...process.env, PGPASSWORD: password },
                stdio: 'pipe',
            },
        ).trim();
    } catch {
        // Fallback to docker
        result = execSync(
            `docker exec -i hipaa-postgres psql -U ${user} -d ${dbName} -t -c "SELECT name FROM tenants WHERE subdomain='drfulano';"`,
            {
                encoding: 'utf8',
                stdio: 'pipe',
            },
        ).trim();
    }

    // Check that we have the tenant name
    assert.ok(result, 'Should have found a tenant name for drfulano');

    // Check for expected accented characters
    const hasAccent = /[áéíóúñü]/.test(result);
    assert.equal(hasAccent, true, `Expected accented characters in tenant name, got: "${result}"`);

    // Check for mojibake (double question marks replacing accents)
    const hasMojibake = /\?{2,}/.test(result);
    assert.equal(hasMojibake, false, `Expected no mojibake (??), but found in: "${result}"`);

    console.log(`✓ Tenant name correctly stored: "${result}"`);
});
