# HIPAA HCE — Historia Clínica Electrónica Multi-Tenant

Plataforma de Historia Clínica Electrónica (HCE) multi-tenant, conforme a **HIPAA** e integrada con **FHIR R4** (AWS HealthLake).

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router), TailwindCSS |
| Backend | Node.js, NestJS (arquitectura modular) |
| Base de Datos | PostgreSQL con Row-Level Security (RLS) |
| Autenticación | Auth0 (roles: SuperAdmin, TenantOrg, TenantProf, Paciente) |
| Almacenamiento | AWS S3 (SSE-KMS, encriptado at-rest) |
| Estándar Clínico | FHIR R4 → AWS HealthLake |
| Identidad (mock) | MockRENAPER — simula API gubernamental argentina |

---

## Arquitectura

```
                ┌─────────────────────────────┐
                │        Subdominio            │
                │  clinica.miproyecto.com      │
                └────────────┬────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │          Next.js Frontend            │
          │  Portal Paciente / Prof / Org        │
          └──────────────────┬──────────────────┘
                             │ JWT (Auth0)
          ┌──────────────────▼──────────────────┐
          │        NestJS Backend (API)           │
          │                                      │
          │  TenantMiddleware → SET CONFIG RLS   │
          │                                      │
          │  ┌──────────┐  ┌──────────────────┐ │
          │  │ Patients │  │ ClinicalRecords  │ │
          │  │ (global) │  │ (HCOP / SOAP)    │ │
          │  └──────────┘  └────────┬─────────┘ │
          │                         │            │
          │  ┌──────────────────────▼──────────┐ │
          │  │       FhirService (facade)       │ │
          │  └──────────────────────┬──────────┘ │
          └─────────────────────────┼────────────┘
                                    │
          ┌─────────────────────────▼────────────┐
          │          AWS HealthLake (FHIR R4)     │
          │  Patient / Encounter / Condition /    │
          │  Observation resources                │
          └──────────────────────────────────────┘
                    │
          ┌─────────▼───────────────┐
          │  PostgreSQL + RLS       │
          │  app.current_tenant_id  │
          └─────────────────────────┘
```

---

## Estructura del Proyecto

```
hipaa-medial-hc/
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql     # Schema + RLS policies
│
├── backend/                           # NestJS API
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   ├── database.config.ts
│   │   │   ├── auth.config.ts
│   │   │   └── aws.config.ts
│   │   ├── common/
│   │   │   ├── decorators/            # @TenantId(), @CurrentUser(), @Roles()
│   │   │   ├── guards/                # RolesGuard
│   │   │   ├── interceptors/          # AuditInterceptor (HIPAA)
│   │   │   ├── enums/                 # UserRole
│   │   │   └── middleware/            # TenantMiddleware (sets RLS vars)
│   │   └── modules/
│   │       ├── auth/                  # Auth0 JWT strategy
│   │       ├── tenants/               # Tenant entity
│   │       ├── patients/
│   │       │   ├── patient.entity.ts
│   │       │   ├── patients.service.ts
│   │       │   ├── patients.controller.ts
│   │       │   └── mock-renaper.service.ts  ← RENAPER mock
│   │       ├── professionals/         # Professional + User entities
│   │       ├── appointments/          # Appointment entity
│   │       ├── clinical-records/
│   │       │   ├── clinical-evolution.entity.ts
│   │       │   ├── problem.entity.ts
│   │       │   ├── clinical-records.service.ts   # HCOP logic
│   │       │   └── clinical-records.controller.ts
│   │       ├── fhir/
│   │       │   ├── fhir.service.ts    # Facade → AWS HealthLake
│   │       │   └── fhir.controller.ts
│   │       ├── storage/
│   │       │   └── storage.service.ts # AWS S3 (SSE-KMS)
│   │       ├── billing/               # Billing/audit module (stub)
│   │       └── audit/
│   │           └── audit-log.entity.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                          # Next.js App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   └── dashboard/
│   │   │       ├── patient/page.tsx           # Portal Paciente
│   │   │       ├── professional/page.tsx      # Portal Profesional
│   │   │       └── organization/page.tsx      # Portal Organización
│   │   └── components/
│   │       └── forms/
│   │           ├── PatientRegistrationForm.tsx  # RENAPER + locked fields
│   │           └── SoapEvolutionForm.tsx        # HCOP SOAP form
│   ├── package.json
│   └── next.config.js
│
└── docs/
    └── fhir-examples/
        └── evolution-bundle.json    # FHIR R4 Transaction Bundle example
```

---

## Base de Datos — RLS (Row-Level Security)

El aislamiento multi-tenant se implementa con **PostgreSQL RLS**:

1. Cada tabla con datos de tenant tiene columna `tenant_id`.
2. El `TenantMiddleware` de NestJS ejecuta:
   ```sql
   SELECT set_config('app.current_tenant_id', '<uuid>', TRUE),
          set_config('app.current_user_auth0_sub', '<sub>', TRUE),
          set_config('app.user_role', '<role>', TRUE)
   ```
3. Las políticas RLS filtran automáticamente:
   ```sql
   CREATE POLICY evolutions_tenant_isolation ON clinical_evolutions
     USING (tenant_id = current_tenant_id());
   ```
4. La tabla `patients` es **global** — protegida por `patient_tenants`:
   ```sql
   CREATE POLICY patients_tenant_access ON patients FOR SELECT
     USING (
       EXISTS (SELECT 1 FROM patient_tenants pt
               WHERE pt.patient_id = patients.id
                 AND pt.tenant_id = current_tenant_id())
       OR auth0_sub = current_setting('app.current_user_auth0_sub', TRUE)
     );
   ```

---

## MockRENAPER — Verificación de Identidad

El `MockRenaperService` simula la API gubernamental argentina RENAPER:

- Recibe `DNI + sexo registral`.
- Devuelve: `firstName`, `lastName`, `birthDate`, `photoUrl`.
- En el frontend, estos campos se **auto-completan y bloquean** para edición.
- En producción: reemplazar `lookup()` con un HTTP call autenticado al endpoint real de RENAPER.

Datos de prueba disponibles:

| DNI | Sexo | Nombre | Apellido |
|-----|------|--------|---------|
| 12345678 | M | Juan | Pérez |
| 87654321 | F | María | González |
| 11223344 | M | Carlos | Rodríguez |
| 55667788 | F | Ana | Martínez |
| 99887766 | X | Alex | López |

---

## FHIR R4 — Evolución Médica

Ver [`docs/fhir-examples/evolution-bundle.json`](docs/fhir-examples/evolution-bundle.json) para el payload completo.

El `FhirService` construye y envía un **Transaction Bundle** con:
- `Encounter` — sesión de consulta
- `Condition` — diagnóstico (ICD-10 codificado)
- `Observation` ×4 — secciones SOAP (LOINC codificadas)

---

## Variables de Entorno

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=app_user
DB_PASSWORD=secret
DB_NAME=hipaa_hce
DB_SSL=false

# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.hipaa-hce.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_CLINICAL=hipaa-hce-clinical-files
AWS_HEALTHLAKE_DATASTORE_ID=...
AWS_HEALTHLAKE_ENDPOINT=https://healthlake.us-east-1.amazonaws.com/datastore/.../r4

# App
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Ejecucion Local

Instalar dependencias desde la raiz del repositorio:

```bash
npm install
```

o con pnpm:

```bash
pnpm install
```

Levantar frontend y backend juntos desde la raiz:

```bash
npm run dev
```

o con pnpm:

```bash
pnpm run dev
```

Levantar cada servicio por separado:

```bash
npm run dev:frontend
npm run dev:backend
```

o con pnpm:

```bash
pnpm run dev:frontend
pnpm run dev:backend
```

---

## Flujo de Entrada (Landing + Dashboard)

Documentacion de flujo y reglas RBAC de UI:

- [docs/entry-flow.md](docs/entry-flow.md)
- [docs/role-claims-contract.md](docs/role-claims-contract.md)

Tests de flujo frontend:

```bash
pnpm --dir frontend run test:flow
pnpm --dir frontend run test:smoke
pnpm --dir frontend run test
```

---

## Roles

| Rol | Acceso |
|-----|--------|
| `SuperAdmin` | Todos los tenants (bypass RLS) |
| `TenantOrg` | Su tenant — gestión de profesionales y auditoría |
| `TenantProf` | Su tenant — agenda y registros clínicos |
| `Paciente` | Sus propios registros (multi-tenant consolidado) |

---

## Seguridad HIPAA

- **Encriptación at-rest**: S3 SSE-KMS + PostgreSQL tablespace encryption
- **Encriptación in-transit**: TLS 1.2+ (enforced en prod)
- **Audit logging**: `AuditInterceptor` registra toda operación de escritura
- **RLS**: Aislamiento de datos por tenant a nivel de base de datos
- **Soft-delete**: `deleted_at` en registros clínicos (nunca se borran definitivamente)
- **Access tokens cortos**: Auth0 JWT con expiración de 1h
