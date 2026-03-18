import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  auth0Domain: process.env.AUTH0_DOMAIN,
  auth0Audience: process.env.AUTH0_AUDIENCE,
  auth0ClientId: process.env.AUTH0_CLIENT_ID,
  auth0ClientSecret: process.env.AUTH0_CLIENT_SECRET,
  auth0ManagementAudience: process.env.AUTH0_MANAGEMENT_AUDIENCE,
}));
