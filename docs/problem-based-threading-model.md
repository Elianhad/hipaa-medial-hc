# Modelo de Datos: Problem-Based Threading

## Objetivo

Este diseño transforma la historia clínica orientada a problemas ya existente en un modelo de hilos de resolución. La entidad primaria deja de ser la nota plana y pasa a ser el problema clínico. Cada evolución y cada orden médica queda anclada al mismo contexto clínico, lo que permite continuidad, cierre, recurrencia e interoperabilidad FHIR.

## Entidades núcleo

### 1. Paciente

- Un paciente puede tener muchos problemas.
- Conserva sus identificadores demográficos y administrativos como entidad raíz.

### 2. Problema

- Es la entidad padre del hilo clínico.
- Tiene título clínico legible y codificación estructurada.
- Separa naturaleza del problema de su estado clínico actual.

Campos recomendados:

- `id`
- `tenant_id`
- `patient_id`
- `title` como texto libre clínico
- `snomed_ct_code`
- `icd10_code`
- `category` = `acute | chronic | symptomatic`
- `clinical_status` = `active | resolved | inactive | recurrent`
- `onset_date`
- `resolution_date`
- `resolution_reason` = `cured | remission | controlled | diagnostic_error`
- `closure_summary`
- `recurrence_of_problem_id` para reabrir o reactivar un hilo previo

### 3. Evolución

- Pertenece siempre a un problema.
- Mantiene la escritura clínica natural mediante un bloque narrativo y campos dirigidos.

Campos recomendados:

- `id`
- `tenant_id`
- `patient_id`
- `professional_id`
- `appointment_id`
- `problem_id`
- `evolution_date`
- `evolution_time`
- `anamnesis_narrative` para `MC + EA`
- `objective_findings`
- `clinical_assessment`
- `action_plan`
- `trend` = `improving | stable | worsening | resolution`

### 4. Orden médica

- Pertenece a una evolución y a un problema.
- Nunca debe quedar huérfana del contexto clínico que la justifica.

Campos recomendados:

- `id`
- `tenant_id`
- `patient_id`
- `problem_id`
- `evolution_id`
- `ordered_by`
- `type` = `medication | laboratory | imaging`
- `detail`
- `order_status` = `draft | active | completed | cancelled`

## Reglas de integridad

- Un problema debe pertenecer a un único paciente dentro de un tenant.
- Una evolución debe referenciar un problema del mismo paciente y del mismo tenant.
- Una orden debe referenciar simultáneamente:
  - el problema al que responde
  - la evolución desde la cual fue emitida
  - el mismo paciente y tenant de ambos
- `resolution_date` no puede ser menor a `onset_date`.
- Si el problema está `resolved` o `inactive`, debe existir `resolution_date`.
- Si existe `resolution_reason`, el problema no puede seguir `active`.
- Si una orden está `completed`, debe registrar `completed_at`.
- Si una orden está `cancelled`, debe registrar `cancelled_at`.

## Modelo lógico SQL

El repo ahora incluye una migración incremental en [database/migrations/003_problem_based_threading.sql](database/migrations/003_problem_based_threading.sql) para acercar el esquema actual a este diseño sin romper compatibilidad. El siguiente DDL representa el modelo lógico objetivo desde cero:

```sql
CREATE TYPE problem_category AS ENUM ('acute', 'chronic', 'symptomatic');
CREATE TYPE problem_clinical_status AS ENUM ('active', 'resolved', 'inactive', 'recurrent');
CREATE TYPE evolution_trend AS ENUM ('improving', 'stable', 'worsening', 'resolution');
CREATE TYPE medical_order_type AS ENUM ('medication', 'laboratory', 'imaging');
CREATE TYPE medical_order_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE problem_resolution_reason AS ENUM ('cured', 'remission', 'controlled', 'diagnostic_error');

CREATE TABLE problems (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id              UUID NOT NULL REFERENCES patients(id),
    title                   VARCHAR(500) NOT NULL,
    snomed_ct_code          VARCHAR(32),
    icd10_code              VARCHAR(20),
    category                problem_category NOT NULL,
    clinical_status         problem_clinical_status NOT NULL DEFAULT 'active',
    onset_date              DATE,
    resolution_date         DATE,
    resolution_reason       problem_resolution_reason,
    closure_summary         TEXT,
    recurrence_of_problem_id UUID REFERENCES problems(id),
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id, tenant_id, patient_id)
);

CREATE TABLE clinical_evolutions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id              UUID NOT NULL REFERENCES patients(id),
    professional_id         UUID NOT NULL REFERENCES professionals(id),
    appointment_id          UUID REFERENCES appointments(id),
    problem_id              UUID NOT NULL,
    evolution_date          DATE NOT NULL,
    evolution_time          TIME NOT NULL,
    anamnesis_narrative     TEXT,
    objective_findings      TEXT,
    clinical_assessment     TEXT,
    action_plan             TEXT,
    trend                   evolution_trend,
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,
    UNIQUE (id, tenant_id, patient_id, problem_id),
    FOREIGN KEY (problem_id, tenant_id, patient_id)
      REFERENCES problems(id, tenant_id, patient_id)
);

CREATE TABLE medical_orders (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id              UUID NOT NULL REFERENCES patients(id),
    problem_id              UUID NOT NULL,
    evolution_id            UUID NOT NULL,
    ordered_by              UUID NOT NULL REFERENCES users(id),
    type                    medical_order_type NOT NULL,
    detail                  TEXT NOT NULL,
    order_status            medical_order_status NOT NULL DEFAULT 'active',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ,
    cancelled_at            TIMESTAMPTZ,
    FOREIGN KEY (problem_id, tenant_id, patient_id)
      REFERENCES problems(id, tenant_id, patient_id),
    FOREIGN KEY (evolution_id, tenant_id, patient_id, problem_id)
      REFERENCES clinical_evolutions(id, tenant_id, patient_id, problem_id)
);
```

## Mapeo HL7 FHIR

- `problems` → `Condition`
  - `title`, `snomed_ct_code`, `icd10_code`
  - `clinical_status`
  - `resolution_date` → `abatement[x]`
  - `closure_summary` → `Condition.note`
- `clinical_evolutions` → `ClinicalImpression` y `Observation`
  - `anamnesis_narrative`
  - `objective_findings`
  - `clinical_assessment`
  - `action_plan`
  - `trend`
- `medical_orders` → `MedicationRequest` o `ServiceRequest`

## Decisiones de diseño

- Se mantiene compatibilidad con el esquema actual de `subjective`, `objective`, `assessment` y `plan` para no romper el backend existente.
- Se agrega semántica clínica nueva con columnas explícitas para soportar la UI por hilos.
- Se usan claves foráneas compuestas para impedir enlaces cruzados entre pacientes o tenants distintos.
- Se deja preparada la base para cierre de problema, remisión y recurrencia sin perder trazabilidad histórica.

## Siguiente paso técnico

- Actualizar entidades y DTOs de NestJS para usar `category`, `clinical_status`, `trend` y `medical_orders` como parte del contrato API.
- Ajustar la sincronización FHIR para mapear cierre, recurrencia y órdenes a `Condition`, `ClinicalImpression`, `MedicationRequest` y `ServiceRequest`.