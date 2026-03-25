---
applyTo: "backend/src/**/*.ts"
---

# Backend Conventions (NestJS + TypeORM)

## 1. DTO Naming and Contracts
- Use `Create*Dto`, `Update*Dto`, `Query*Dto`, `*ResponseDto` naming.
- Avoid `any`; use explicit interfaces/types for service and controller contracts.
- Keep DTOs in module-level `dto/` folders when available.

## 2. Pagination Standard
- Query DTO fields: `page`, `limit`, `search`, `sortBy`, `sortOrder`.
- Defaults: `page=1`, `limit=20`, max `limit=100`.
- Response contract:
  - `data`: list of records
  - `meta`: `{ page, limit, total, totalPages }`

## 3. HTTP Error Handling
- Validation/input errors: `BadRequestException`.
- Missing records: `NotFoundException`.
- Duplicates/conflicts: `ConflictException`.
- Forbidden access/tenant breach: `ForbiddenException`.
- Unexpected errors: log safely and throw `InternalServerErrorException` when needed.

## 4. Multi-tenant Safety
- Scope tenant-bound queries by `tenantId`.
- Never expose cross-tenant data unless explicitly authorized and documented.

## 5. Module Integration Discipline
- If a public service method signature changes, update:
  - provider exports in the source module
  - imports and call sites in consumer modules
  - impacted tests

## 6. Testing Baseline
- Cover happy path plus at least one failure path per new public method.
- Include explicit tests for tenant isolation and not-found behavior when applicable.
