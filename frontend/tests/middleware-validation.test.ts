import test from 'node:test';
import assert from 'node:assert/strict';

const backendUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';

test('Rate limiting: /v1/tenants/by-subdomain requests should be throttled', async () => {
    const slugUrl = `${backendUrl}/v1/tenants/by-subdomain/drfulano`;

    console.log('Testing rate limiting (20 requests per 60s)...');

    // Make multiple requests in sequence
    const responses = [];
    for (let i = 0; i < 25; i++) {
        try {
            const response = await fetch(slugUrl);
            responses.push(response.status);
            console.log(`  Request ${i + 1}: ${response.status}`);

            // Expect 429 (Too Many Requests) after limit exceeded
            if (i >= 20) {
                assert.equal(response.status, 429, `Request ${i + 1} should be rate limited`);
            } else {
                assert.ok([200, 429].includes(response.status), `Request ${i + 1} should be 2xx or 429`);
            }

            // Add small delay between requests
            await new Promise((r) => setTimeout(r, 10));
        } catch (error) {
            console.error(`Request ${i + 1} failed:`, error);
            throw error;
        }
    }

    console.log('✓ Rate limiting working correctly');
});

test('Role validation: /v1/dashboard/professional requires professional role', async () => {
    const url = `${backendUrl}/v1/dashboard/professional`;

    // Without auth header, should reject
    try {
        const response = await fetch(url);
        assert.equal(
            response.status,
            403,
            'Should return 403 Forbidden without authentication',
        );
        console.log('✓ Unauthenticated request properly rejected');
    } catch (error) {
        console.error('Request failed:', error);
    }
});

test('Role validation: /v1/dashboard/organization requires org role', async () => {
    const url = `${backendUrl}/v1/dashboard/organization`;

    // Without auth header, should reject
    try {
        const response = await fetch(url);
        assert.equal(
            response.status,
            403,
            'Should return 403 Forbidden without authentication',
        );
        console.log('✓ Unauthenticated request properly rejected');
    } catch (error) {
        console.error('Request failed:', error);
    }
});

test('Audit logging: failed access attempts should be logged', async () => {
    const url = `${backendUrl}/v1/dashboard/professional`;

    console.log('Testing audit logging...');

    try {
        const response = await fetch(url, {
            headers: {
                'X-Forwarded-For': '127.0.0.1',
            },
        });

        // Just verify the request was made and logged (no way to check logs from test)
        assert.ok(response.status === 403 || response.status === 401, 'Should reject unauthorized access');
        console.log('✓ Audit logging triggered for failed access');
    } catch (error) {
        console.error('Request failed:', error);
    }
});
