# Persistencia e Interoperabilidad HL7 FHIR

## Mapeo FHIR

### Problema → Condition

- Entidad local: `problems`
- Recurso FHIR: `Condition`
- Campos principales:
  - `title` → `Condition.code.text`
  - `snomed_ct_code` → `Condition.code.coding[system=http://snomed.info/sct]`
  - `icd10_code` → `Condition.code.coding[system=http://hl7.org/fhir/sid/icd-10]`
  - `clinical_status` → `Condition.clinicalStatus`
  - `category` → `Condition.category`
  - `onset_date` → `Condition.onsetDateTime`
  - `resolution_date` → `Condition.abatementDateTime`
  - `closure_summary` → `Condition.note`

Regla clave:

- El hilo clínico vive en un solo `Condition` persistente. No se crea un Condition nuevo por cada evolución.

### Evolución → ClinicalImpression + Observation

- Entidad local: `clinical_evolutions`
- Recursos FHIR:
  - `ClinicalImpression` para la síntesis clínica del acto
  - `Observation` para narrativas dirigidas y tendencia

Mapeo:

- `anamnesis_narrative` → `ClinicalImpression.description`
- `clinical_assessment` → `ClinicalImpression.summary`
- `problem_id` → `ClinicalImpression.problem.reference`
- `objective_findings` → `Observation.valueString` con LOINC narrativo
- `action_plan` → `Observation.valueString` con LOINC de plan de cuidados
- `trend` → `Observation.valueCodeableConcept`
- `trend_score` → `Observation.component.valueInteger`

### Órdenes → MedicationRequest o ServiceRequest

- Entidad local: `medical_orders`
- Reglas:
  - `type=medication` → `MedicationRequest`
  - `type=laboratory|imaging` → `ServiceRequest`

Mapeo mínimo:

- `detail` → `medicationCodeableConcept.text` o `ServiceRequest.code.text`
- `order_status` → `status`
- `problem_id` → `reasonReference`
- `evolution_id` y `encounter_id` → `encounter`

## Lógica de Estados

El estado clínico se persiste localmente en `problems.clinical_status` y se traduce a FHIR con esta tabla:

| UI / dominio | Base local | FHIR Condition.clinicalStatus |
|---|---|---|
| Activo | `active` | `active` |
| Resuelto | `resolved` | `resolved` |
| Inactivo / controlado | `inactive` | `inactive` |
| Recurrente | `recurrent` | `recurrence` |

Implementación aplicada:

- función SQL `map_problem_clinical_status_to_fhir(...)`
- trigger `trg_enqueue_problem_fhir_sync`
- outbox `integration_outbox`

Flujo:

1. El médico cambia el estado en la UI.
2. La API actualiza `problems.clinical_status`.
3. El trigger inserta un evento `problem.updated` en `integration_outbox`.
4. Un worker de integración consume el evento y ejecuta `PUT /Condition/{id}`.
5. `Condition.clinicalStatus` y `abatementDateTime` quedan sincronizados.

Este patrón evita que una transacción clínica dependa en línea de HealthLake o del servidor FHIR externo.

## Semántica y servidor terminológico

Se agregó un cliente básico en [backend/src/modules/fhir/terminology.service.ts](backend/src/modules/fhir/terminology.service.ts).

Qué hace:

- valida códigos explícitos usando `CodeSystem/$lookup`
- busca conceptos por texto usando `ValueSet/$expand?filter=`
- prioriza SNOMED CT cuando el problema es clínico y detallado
- conserva ICD-10/11 como codificación secundaria para estadística, facturación o reporting

Regla operativa recomendada:

1. El médico escribe el nombre del problema.
2. La UI consulta el servidor terminológico.
3. El backend guarda:
   - texto clínico visible
   - código SNOMED CT preferente cuando exista
   - ICD-10/11 secundario cuando corresponda
4. Si no hay match exacto, el problema puede quedar provisionalmente como sintomático, pero con flag `validated=false` hasta codificación definitiva.

## Persistencia de la Tendencia

La tendencia no debe vivir en `problems`; debe vivir en cada `clinical_evolutions`.

Persistencia implementada:

- `clinical_evolutions.trend` como enum clínico
- `clinical_evolutions.trend_score` como columna generada:
  - `worsening = -1`
  - `stable = 0`
  - `improving = 1`
  - `resolution = 2`

Uso:

- la UI puede dibujar una serie temporal por `problem_id`
- la capa analítica no depende de NLP para interpretar progreso
- el recurso FHIR `Observation` de tendencia replica tanto la etiqueta clínica como el score numérico

Consulta típica para una gráfica:

```sql
SELECT
  problem_id,
  evolution_date,
  evolution_time,
  trend,
  trend_score
FROM clinical_evolutions
WHERE tenant_id = $1
  AND problem_id = $2
  AND deleted_at IS NULL
ORDER BY evolution_date, evolution_time;
```

## Artefactos agregados

- [backend/src/modules/fhir/fhir.service.ts](backend/src/modules/fhir/fhir.service.ts)
- [backend/src/modules/fhir/terminology.service.ts](backend/src/modules/fhir/terminology.service.ts)
- [database/migrations/004_fhir_persistence_outbox.sql](database/migrations/004_fhir_persistence_outbox.sql)

## Nota de arquitectura

Los triggers no deben invocar el endpoint FHIR directamente. Deben producir eventos transaccionales en la base y dejar la Plan: Integración Medplum OSS por fases
Enfoque recomendado: consolidar primero MVP estable de OAuth2 + Patient + consistencia de outbox, luego habilitar lectura segura y recién después activar bidireccionalidad controlada.

Steps

Fase 0. Baseline técnico
Normalizar configuración Medplum en bootstrap y documentación.
Definir contrato único de eventos outbox entre SQL y worker.
Fase 1. MVP OAuth2 + Patient
Integrar sync de Patient en alta/actualización local.
Guardar referencia FHIR del paciente localmente.
Definir fallback no bloqueante si Medplum cae.
Fase 2. Lectura y búsqueda segura
Endpoints de búsqueda Patient/Condition con filtros mínimos.
Validación de tenant en lecturas de recursos.
Fase 3. Bidireccionalidad controlada
Ingesta Medplum a local con watermark incremental.
Detección de duplicados e idempotencia.
Política de resolución de conflictos documentada y testeada.
Fase 4. Operación y observabilidad
Métricas de outbox/backlog/reintentos.
Runbook de recuperación y reconciliación por tenant.
Fase 5. Validación final y rollout
Pruebas de integración multi-tenant y conflictos.
Habilitación gradual por feature flag/tenant.sincronización externa a un consumidor idempotente. Eso preserva consistencia clínica y reduce fallas por dependencias remotas.
