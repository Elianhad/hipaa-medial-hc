import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const routes = ['/', '/dashboard', '/booking/drfulano', '/org/clinica-demo'];

for (const route of routes) {
    test(`smoke route should respond for ${route}`, async () => {
        const response = await fetch(`${baseUrl}${route}`);

        assert.equal(
            response.ok,
            true,
            `Expected 2xx for ${route}, got ${response.status}`,
        );
    });
}
