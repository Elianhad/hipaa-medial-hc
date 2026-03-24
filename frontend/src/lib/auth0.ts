import { Auth0Client } from '@auth0/nextjs-auth0/server';

const authorizationParameters: { audience?: string; scope?: string } = {
    scope: process.env.AUTH0_SCOPE,
};

if (process.env.AUTH0_AUDIENCE) {
    authorizationParameters.audience = process.env.AUTH0_AUDIENCE;
}

export const auth0 = new Auth0Client({
    authorizationParameters,
});
