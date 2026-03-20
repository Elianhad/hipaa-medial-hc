#!/usr/bin/env node
/**
 * seed.js — runs database/seeds/001_demo_data.sql against the local Docker DB.
 *
 * Usage (from repo root or backend/):
 *   node scripts/seed.js
 *   # or via pnpm from backend/:
 *   pnpm run seed
 *
 * Reads DB credentials from backend/.env.local (or environment vars).
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Load backend/.env.local ────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '..', 'backend', '.env.local');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}

const host = process.env.DB_HOST ?? 'localhost';
const port = process.env.DB_PORT ?? '5433';
const user = process.env.DB_USERNAME ?? 'app_user';
const password = process.env.DB_PASSWORD ?? 'app_password';
const dbName = process.env.DB_NAME ?? 'hipaa_hce';

const seedFile = path.resolve(__dirname, '..', 'database', 'seeds', '001_demo_data.sql');

if (!fs.existsSync(seedFile)) {
    console.error(`❌  Seed file not found: ${seedFile}`);
    process.exit(1);
}

const connString = `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
const seedSQL = fs.readFileSync(seedFile, 'utf8');
const seedPayload = `SET client_encoding TO 'UTF8';\n${seedSQL}`;

console.log(`🌱  Running seed against ${host}:${port}/${dbName} …`);

/**
 * Try psql on PATH first; if not found, fall back to docker exec.
 * This lets the script work both in CI (psql available) and local
 * dev (psql not on PATH but Docker is running).
 */
function runViaPsql() {
    execSync(`psql "${connString}" -f "${seedFile}"`, {
        encoding: 'utf8',
        stdio: 'inherit',
        env: {
            ...process.env,
            PGPASSWORD: password,
            PGCLIENTENCODING: 'UTF8',
        },
    });
}

function runViaDocker() {
    // Find the running postgres container
    const containerName = 'hipaa-postgres';
    execSync(
        `docker exec -i ${containerName} psql -U ${user} -d ${dbName}`,
        {
            encoding: 'utf8',
            input: seedPayload,
            stdio: ['pipe', 'inherit', 'inherit'],
        },
    );
}

try {
    try {
        runViaPsql();
    } catch (psqlErr) {
        console.log('  psql unavailable or failed — falling back to docker exec …');
        runViaDocker();
    }
} catch (err) {
    console.error('❌  Seed failed:\n');
    console.error(err.stderr || err.message);
    process.exit(1);
}
