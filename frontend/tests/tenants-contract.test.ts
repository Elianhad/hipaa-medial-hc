import test from 'node:test';
import assert from 'node:assert/strict';

const backendUrl = process.env.API_BASE_URL ?? 'http://localhost:4000/v1';

test('GET /tenants/by-subdomain/:slug should return independent tenant shape', async () => {
    const response = await fetch(`${backendUrl}/tenants/by-subdomain/drfulano`);

    assert.equal(response.ok, true, `Expected 2xx, got ${response.status}`);

    const data = await response.json();

    // Required fields for independent tenants
    assert.ok(data.id, 'Should have id');
    assert.ok(data.type === 'independent', 'Should have type=independent');
    assert.ok(data.subdomain === 'drfulano', 'Should have subdomain');
    assert.ok(data.tenantName, 'Should have tenantName');

    // Professional-specific enrichment fields
    assert.ok(typeof data.name === 'string', 'Should have name (professional name)');
    assert.ok(typeof data.specialty === 'string', 'Should have specialty');
    assert.ok(typeof data.bio === 'string', 'Should have bio');
    assert.ok(typeof data.consultationFee === 'string' || typeof data.consultationFee === 'number', 'Should have consultationFee');

    // Optional fields
    assert.ok(data.photoUrl === null || typeof data.photoUrl === 'string', 'photoUrl should be null or string');
    assert.ok(data.logoUrl === null || typeof data.logoUrl === 'string', 'logoUrl should be null or string');
});

test('GET /tenants/by-subdomain/:slug should return organization tenant shape', async () => {
    const response = await fetch(`${backendUrl}/tenants/by-subdomain/clinica-demo`);

    assert.equal(response.ok, true, `Expected 2xx, got ${response.status}`);

    const data = await response.json();

    // Required fields for organization tenants
    assert.ok(data.id, 'Should have id');
    assert.ok(data.type === 'organization', 'Should have type=organization');
    assert.ok(data.subdomain === 'clinica-demo', 'Should have subdomain');
    assert.ok(data.tenantName || data.name, 'Should have tenantName or name');

    // Organization-specific fields
    assert.ok(data.logoUrl === null || typeof data.logoUrl === 'string', 'logoUrl should be null or string');
    assert.ok(data.settings === undefined || typeof data.settings === 'object', 'settings should be undefined or object');
});

test('GET /tenants/by-subdomain/:slug with unicode characters should render accents correctly', async () => {
    const response = await fetch(`${backendUrl}/tenants/by-subdomain/drfulano`);

    assert.equal(response.ok, true);

    const data = await response.json();

    // Verify accented characters are present in returned data
    const fullText = JSON.stringify(data);

    // Check for expected accent characters in demo data
    assert.ok(
        fullText.includes('á') || fullText.includes('é') || fullText.includes('í') || fullText.includes('ó') || fullText.includes('ú'),
        'Should contain at least one accented character in response',
    );

    // Verify no mojibake (question marks replacing accents)
    assert.equal(
        fullText.match(/\?{2,}/g),
        null,
        'Should not contain double question marks (sign of encoding corruption)',
    );
});
