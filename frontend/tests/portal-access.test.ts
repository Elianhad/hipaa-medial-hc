import test from 'node:test';
import assert from 'node:assert/strict';

import { getPortalAccessState, LANDING_PORTALS } from '../src/lib/auth/portal-access';

test('landing portals should include the three expected entries', () => {
    assert.equal(LANDING_PORTALS.length, 3);
    assert.deepEqual(LANDING_PORTALS.map((portal) => portal.id), ['patient', 'professional', 'organization']);
});

test('patient portal should always expose links', () => {
    const loggedOut = getPortalAccessState('patient', false, []);
    const loggedIn = getPortalAccessState('patient', true, ['professional']);

    assert.equal(loggedOut.showLinks, true);
    assert.equal(loggedOut.showLoginCta, false);
    assert.equal(loggedOut.accessDenied, false);

    assert.equal(loggedIn.showLinks, true);
    assert.equal(loggedIn.showLoginCta, false);
    assert.equal(loggedIn.accessDenied, false);
});

test('professional portal should show login CTA when logged out', () => {
    const state = getPortalAccessState('professional', false, []);

    assert.equal(state.showLinks, false);
    assert.equal(state.showLoginCta, true);
    assert.equal(state.accessDenied, false);
});

test('professional portal should allow links when professional role exists', () => {
    const state = getPortalAccessState('professional', true, ['professional']);

    assert.equal(state.showLinks, true);
    assert.equal(state.showLoginCta, false);
    assert.equal(state.accessDenied, false);
});

test('organization portal should deny when logged in without org role', () => {
    const state = getPortalAccessState('organization', true, ['professional']);

    assert.equal(state.showLinks, false);
    assert.equal(state.showLoginCta, false);
    assert.equal(state.accessDenied, true);
});
