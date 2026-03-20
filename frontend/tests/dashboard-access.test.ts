import test from 'node:test';
import assert from 'node:assert/strict';

import { getDashboardCardStates } from '../src/lib/auth/dashboard-access';

test('dashboard cards should always include patient, professional, organization', () => {
    const cards = getDashboardCardStates([]);

    assert.equal(cards.length, 3);
    assert.deepEqual(cards.map((card) => card.id), ['patient', 'professional', 'organization']);
});

test('patient card should always be enabled', () => {
    const anonymousCards = getDashboardCardStates([]);
    const profCards = getDashboardCardStates(['professional']);

    assert.equal(anonymousCards.find((card) => card.id === 'patient')?.enabled, true);
    assert.equal(profCards.find((card) => card.id === 'patient')?.enabled, true);
});

test('professional card should be enabled only with professional-compatible roles', () => {
    const withProfessional = getDashboardCardStates(['professional']);
    const withLegacyProfessional = getDashboardCardStates(['tenantprof']);
    const withoutProfessional = getDashboardCardStates(['orgadmin']);

    assert.equal(withProfessional.find((card) => card.id === 'professional')?.enabled, true);
    assert.equal(withLegacyProfessional.find((card) => card.id === 'professional')?.enabled, true);
    assert.equal(withoutProfessional.find((card) => card.id === 'professional')?.enabled, false);
});

test('organization card should be enabled only with organization-compatible roles', () => {
    const withOrgAdmin = getDashboardCardStates(['orgadmin']);
    const withOrgStaff = getDashboardCardStates(['orgstaff']);
    const withoutOrg = getDashboardCardStates(['professional']);

    assert.equal(withOrgAdmin.find((card) => card.id === 'organization')?.enabled, true);
    assert.equal(withOrgStaff.find((card) => card.id === 'organization')?.enabled, true);
    assert.equal(withoutOrg.find((card) => card.id === 'organization')?.enabled, false);
});
