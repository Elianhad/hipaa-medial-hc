import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'app_user',
  password: process.env.DB_PASSWORD,
  name: process.env.DB_NAME ?? 'hipaa_hce',
  ssl: process.env.DB_SSL === 'true',
}));
