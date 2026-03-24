import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const professionalSlug = process.env.SMOKE_PROFESSIONAL_SLUG ?? 'drfulano';
const organizationSlug = process.env.SMOKE_ORGANIZATION_SLUG ?? 'clinica-demo';
const routes = ['/', '/dashboard', `/booking/${professionalSlug}`, `/org/${organizationSlug}`];

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
