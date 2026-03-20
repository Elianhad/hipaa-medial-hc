import test from 'node:test';
import assert from 'node:assert/strict';

import {
    canAccessOrganizationPortal,
    canAccessProfessionalPortal,
    extractRoles,
    hasAnyRole,
} from '../src/lib/auth/roles';

test('extractRoles should normalize and de-duplicate roles from claims', () => {
    const user = {
        roles: ['Professional', 'Org_Admin', 'professional'],
        role: 'Org Staff',
    };

    const roles = extractRoles(user);

    assert.deepEqual(
        roles.sort(),
        ['professional', 'orgadmin', 'orgstaff'].sort(),
    );
});

test('extractRoles should read namespaced claims', () => {
    const user = {
        'https://hipaa-hce.example.com/roles': ['Tenant_Prof'],
    };

    const roles = extractRoles(user);

    assert.deepEqual(roles, ['tenantprof']);
});

test('hasAnyRole should return true when one role matches', () => {
    assert.equal(hasAnyRole(['a', 'b', 'professional'], ['orgadmin', 'professional']), true);
});

test('canAccessProfessionalPortal should support legacy and new roles', () => {
    assert.equal(canAccessProfessionalPortal(['professional']), true);
    assert.equal(canAccessProfessionalPortal(['tenantprof']), true);
    assert.equal(canAccessProfessionalPortal(['orgadmin']), false);
});

test('canAccessOrganizationPortal should support org admin/staff roles', () => {
    assert.equal(canAccessOrganizationPortal(['orgadmin']), true);
    assert.equal(canAccessOrganizationPortal(['orgstaff']), true);
    assert.equal(canAccessOrganizationPortal(['tenantorg']), true);
    assert.equal(canAccessOrganizationPortal(['professional']), false);
});
