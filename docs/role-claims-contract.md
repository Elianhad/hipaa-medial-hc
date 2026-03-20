# Role Claims Contract

This document defines how UI role gating expects role claims to be present in the authenticated user payload.

## Why this exists

Role-gated navigation is used in:

- Landing portal cards
- Unified dashboard entries

If claim names change in Auth0, UI access can drift silently unless this contract is kept updated.

## Current accepted claim keys

Defined in frontend/src/lib/auth/roles.ts:

- roles
- role
- https://hipaa-hce.example.com/roles
- https://hipaa-hce.example.com/role
- https://hipaa-medial-hc.example.com/roles
- https://hipaa-medial-hc.example.com/role

## Normalization rules

- Values are normalized to lowercase.
- Spaces, underscores and hyphens are removed.
- Duplicate roles are removed.

Examples:

- Org Admin -> orgadmin
- tenant_prof -> tenantprof
- Org-Staff -> orgstaff

## Role compatibility mapping used by UI

Professional portal is enabled by any of:

- professional
- tenantprof

Organization portal is enabled by any of:

- orgadmin
- orgstaff
- tenantorg

Patient portal is always visible in the current UX.

## If Auth0 claim namespace changes

1. Update ROLE_CLAIM_KEYS in frontend/src/lib/auth/roles.ts.
2. Run frontend flow tests:

   pnpm --dir frontend run test:flow

3. Run dashboard access tests:

   pnpm --dir frontend run test tests/dashboard-access.test.ts

4. Manually verify:

- /
- /dashboard

## Related files

- frontend/src/lib/auth/roles.ts
- frontend/src/lib/auth/portal-access.ts
- frontend/src/lib/auth/dashboard-access.ts
- frontend/tests/auth-roles.test.ts
- frontend/tests/portal-access.test.ts
- frontend/tests/dashboard-access.test.ts
