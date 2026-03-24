# Implementación: Múltiples Locaciones de Consultorio ✅

## Estado: Completado

Se ha implementado soporte completo para que un profesional pueda gestionar múltiples locaciones de consultorio con configuraciones independientes.

---

## Backend (NestJS)

### Nuevas Entidades
- **`ProfessionalLocation`** (`professional-location.entity.ts`)
  - Tabla: `professional_locations`
  - Campos claves:
    - `name`: Nombre de la locación (ej: "Consultorio Centro")
    - `address`: Dirección (opcional)
    - `phone`: Teléfono (opcional)
    - `weeklySchedule`: Horarios por día (JSONB)
    - `appointmentRules`: Duraciones, pausas, etc. (JSONB)
    - `isMainLocation`: Flag para locación principal
    - `isActive`: Soft-delete support
  - Índices: `(professionalId, isActive)`, `(tenantId)`
  - Constraint: Nombre único por profesional

### Actualización de Entidades
- **`Professional`**: Agregada relación `OneToMany` → `locations`

### Controlador
- **`ProfessionalLocationsController`** (`professional-locations.controller.ts`)
  - `GET /professionals/:id/locations` - Listar todas
  - `GET /professionals/:id/locations/:locationId` - Obtener una
  - `POST /professionals/:id/locations` - Crear
  - `PATCH /professionals/:id/locations/:locationId` - Actualizar
  - `DELETE /professionals/:id/locations/:locationId` - Soft-delete

### Servicio
- **`ProfessionalLocationsService`** (`professional-locations.service.ts`)
  - `getLocationsByProfessional()` - Lista activas, ordenadas por principal
  - `getLocationById()` - Obtiene una específica
  - `createLocation()` - Con validación de nombre único y auto-main
  - `updateLocation()` - Con cambio de principal
  - `deleteLocation()` - Soft-delete con validación (mínimo 1 activa)

### DTOs
- **`CreateProfessionalLocationDto`**
- **`UpdateProfessionalLocationDto`**
- **`ProfessionalLocationResponseDto`**

### Módulo
- Registradas nuevas entidad, servicio y controlador en `ProfessionalsModule`

### Migration
- **`008_professional_locations.sql`**
  - Crea tabla con índices y constraints
  - Migra datos existentes: crea locación "Consultorio Principal" para cada profesional con su schedule_config actual

---

## Frontend (Next.js)

### Server Actions
- **`professionals.ts`** - Extendido con:
  - `getProfessionalLocations(professionalId)`
  - `getProfessionalLocation(professionalId, locationId)`
  - `createProfessionalLocation(professionalId, payload)`
  - `updateProfessionalLocation(professionalId, locationId, payload)`
  - `deleteProfessionalLocation(professionalId, locationId)`
  - Versiones "Auto" que resuelven `professionalId` desde sesión
  - `resolveProfessionalIdFromSession()` - Helper para resolver ID automáticamente
  - `fetchWithAuth()` - Wrapper que inyecta JWT

### Interfaces/Types
```typescript
interface ProfessionalLocation {
  id: string;
  professionalId: string;
  tenantId: string;
  name: string;
  address?: string;
  phone?: string;
  weeklySchedule: Record<string, unknown>;
  appointmentRules: Record<string, unknown>;
  isMainLocation: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Componentes Cliente

#### `LocationSelector` (`components/professional/LocationSelector.tsx`)
- **Propósito**: Selector de locaciones activas + crear nueva + eliminar
- **Funcionalidades**:
  - Lista todas las locaciones del profesional
  - Selecciona una como activa (destaca con color)
  - Botón "+ Nueva" para crear locación
  - Botón "✕" para eliminar (si hay >1)
  - Validación de nombre requerido
  - Feedback de errores
- **Props**: `locations`, `selectedLocationId`, callbacks de create/delete/select

#### `AgendaForm` (`components/professional/AgendaForm.tsx`)
- **Propósito**: Editar horarios y reglas de turnos de una locación
- **Campos**:
  - Duración de consultas (minutos)
  - Bloques para atención urgente
  - Pausa entre consultas
  - Aviso previo para reservas
- **Acciones**: Save con feedback

#### `ConfigForm` (`components/professional/ConfigForm.tsx`)
- **Propósito**: Editar datos de perfil y coberturas
- **Campos**:
  - Especialidad (select)
  - Descripción profesional (textarea)
  - Checkboxes de coberturas aceptadas
- **Acciones**: Save con feedback

### Componentes por Página

#### Página `/agenda` (Server Component)
```typescript
// page.tsx (Server Component)
async function ProfessionalAgendaPage()
  → render <AgendaPageClient initialLocations={...} />

// (components)/AgendaPageClient.tsx (Client Component)
export function AgendaPageClient({ initialLocations })
  → render <LocationSelector /> + <AgendaForm />
```

#### Página `/config` (Server Component)
```typescript
// page.tsx (Server Component)
async function ProfessionalConfigPage()
  → render <ConfigPageClient initialLocations={...} />

// (components)/ConfigPageClient.tsx (Client Component)
export function ConfigPageClient({ initialLocations })
  → render <LocationSelector /> + <ConfigForm />
```

---

## Arquitectura / Patrones

### Server Components + Client Components
- **Server Component**: Página principal (`.tsx` en raíz del folder)
  - Fetch de datos via Server Actions
  - Pasa props iniciales a cliente
  - No hace interacción directa
- **Client Components**: Bajo `(components)/`
  - `*Client.tsx`: Gestor de estado y composición
  - `*Form.tsx`: Campos editables + botones
  - `LocationSelector.tsx`: Selector especializado
  - Todos usan `'use client'`

### JWT / Auth
- **Getión de Token**: `getAuthToken()` en Server Actions (server-only)
- **Inyección de JWT**: `fetchWithAuth()` automáticamente agrega header
- **Token nunca se expone** al cliente

### UX / Coherencia Visual
- **Colores**: Degradado emerald/lime/teal (existente)
- **Bordes**: emerald-200 para secciones, slate para inputs
- **Feedback**: Mensajes de status (success/error) en secciones amber
- **Interacción**: Botones con estados (disabled durante carga)
- **Responsivo**: `md:grid-cols-2` en forms, `md:col-span-2` para full-width

---

## Validaciones

### Backend
- ✅ Nombre de locación único por profesional
- ✅ Mínimo 1 locación activa (no permitir eliminar la última)
- ✅ Al eliminar principal, auto-asigna siguiente
- ✅ Al crear principal nueva, desactiva la anterior
- ✅ JWT requerido en todos los endpoints

### Frontend
- ✅ TypeScript strict (type-check pasa al 100%)
- ✅ Nombre requerido para crear locación
- ✅ Confirmación antes de eliminar
- ✅ Estados de carga (isLoading flag)
- ✅ Mensajes de error claros

---

## Testing

- ✅ Frontend `pnpm type-check` - **PASS**
- ✅ Sin errores de compilación TypeScript

---

## Pasos Siguientes (Opcional)

1. **Ejecutar Migration**
   ```bash
   npm run migration:run  # en backend
   ```

2. **Probar Flujo Completo**
   - Login → Dashboard Profesional → Agenda/Config
   - Crear locación → Editar → Guardar → Verificar

3. **Backend Tests**
   ```bash
   npm test -- professional-locations.service.spec.ts
   ```

---

## Archivos Modificados/Creados

### Backend
- ✅ NEW: `professional-location.entity.ts`
- ✅ NEW: `professional-locations.service.ts`
- ✅ NEW: `professional-locations.controller.ts`
- ✅ EDIT: `professional.entity.ts` (+ OneToMany)
- ✅ EDIT: `professionals.module.ts` (registros)
- ✅ NEW: `dto/professional-location.dto.ts`
- ✅ NEW: `database/migrations/008_professional_locations.sql`

### Frontend
- ✅ EDIT: `app/actions/professionals.ts` (+ location actions)
- ✅ NEW: `components/professional/LocationSelector.tsx`
- ✅ NEW: `components/professional/AgendaForm.tsx`
- ✅ NEW: `components/professional/ConfigForm.tsx`
- ✅ EDIT: `app/dashboard/professional/agenda/page.tsx` (→ Server Component)
- ✅ NEW: `app/dashboard/professional/agenda/(components)/AgendaPageClient.tsx`
- ✅ EDIT: `app/dashboard/professional/config/page.tsx` (→ Server Component)
- ✅ NEW: `app/dashboard/professional/config/(components)/ConfigPageClient.tsx`

---

## Resumen

✅ **Arquitectura completa implementada**
- Backend: Entidades, DTOs, Servicio, Controlador, Migration
- Frontend: Server & Client Components, Server Actions, UI coherente
- Auth: JWT inyectado automáticamente, nunca expuesto
- UX: Múltiples locaciones con selector intuitivo
- Validaciones: Backend + Frontend
- TypeScript: 100% Safe

**Ready to test end-to-end** 🚀
