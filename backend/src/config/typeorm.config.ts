import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local or .env without dotenv dependency
for (const envFile of ['.env.local', '.env']) {
    try {
        const content = readFileSync(resolve(__dirname, '../../', envFile), 'utf8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const idx = trimmed.indexOf('=');
                if (idx > 0) {
                    const key = trimmed.slice(0, idx).trim();
                    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
                    if (!process.env[key]) process.env[key] = val;
                }
            }
        }
    } catch {
        // file not found — fall through to next
    }
}

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'app_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? 'hipaa_hce',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations',
});
