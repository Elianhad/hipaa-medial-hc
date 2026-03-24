# Diseño: Múltiples Locaciones de Consultorio

## Problema Actual
El dashboard profesional solo permite configurar una agenda única. Un profesional puede trabajar en múltiples consultorios con horarios y configuraciones diferentes (ej: Lunes-Miércoles en Clínica A, Jueves-Viernes en Clínica B).

## Solución Arquitectónica

### 1. Modelo de Base de Datos
Agregar tabla `ProfessionalLocation` con relación 1:N con `Professional`:

```sql
CREATE TABLE professional_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    
    -- Identificación de la locación
    name VARCHAR(255) NOT NULL,  -- "Consultorio Centro", "Clínica Barrio"
    address VARCHAR(512),
    phone VARCHAR(20),
    
    -- Configuración específica de la locación
    weekly_schedule JSONB,  -- Misma estructura que antes
    appointment_rules JSONB,  -- duration, urgentBlock, breakMinutes, etc.
    is_main_location BOOLEAN DEFAULT false,  -- Flag para locación principal
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_professional_location_name 
        UNIQUE (professional_id, name)
);
```

### 2. Cambios en Entity (Backend)
`Professional` dejará de tener:
- `weeklySchedule` 
- `appointmentRules`

En su lugar, relación:
```typescript
@OneToMany(() => ProfessionalLocation, loc => loc.professional)
locations: ProfessionalLocation[];
```

### 3. API Endpoints (Backend)

#### GET /professionals/:id/locations
Lista todas las locaciones del profesional.

```json
{
  "data": [
    {
      "id": "loc-1",
      "name": "Consultorio Centro",
      "address": "Av. Corrientes 1234",
      "phone": "+54912345678",
      "isMainLocation": true,
      "weeklySchedule": { ... },
      "appointmentRules": { ... },
      "isActive": true
    },
    {
      "id": "loc-2",
      "name": "Clínica Norte",
      "weeklySchedule": { ... }
    }
  ]
}
```

#### POST /professionals/:id/locations
Crear nueva locación.

#### PATCH /professionals/:id/locations/:locationId
Actualizar locación existente.

#### DELETE /professionals/:id/locations/:locationId
Soft-delete de locación (set `is_active = false`).

### 4. Refactor de Component (Frontend)

**Antes:**
```tsx
const config = await getProfessionalConfig();
setDuration(config.appointmentRules?.duration);
```

**Después:**
```tsx
const locations = await getProfessionalLocations();
const [selectedLocation, setSelectedLocation] = useState(locations[0]);

// Dropdown en UI para seleccionar locación
<select onChange={(e) => setSelectedLocation(
  locations.find(l => l.id === e.target.value)
)}>
  {locations.map(loc => <option key={loc.id}>{loc.name}</option>)}
</select>

// Mostrar config de la locación seleccionada
{selectedLocation && (
  <AgendaForm 
    schedule={selectedLocation.weeklySchedule} 
    rules={selectedLocation.appointmentRules}
  />
)}
```

### 5. Impacto en Board/Appointments

Cuando se listan citas (`/appointments/professional/{id}/today`), el backend debe retornar también `locationId`:

```json
{
  "items": [
    {
      "id": "appt-1",
      "patientName": "Juan Pérez",
      "locationId": "loc-1",
      "locationName": "Consultorio Centro",
      "scheduledAt": "2026-03-23T14:30:00Z"
    }
  ]
}
```

Esto permite agrupar citas por locación en la UI si es necesario.

### 6. Migración Gradual

**Fase 1 (Corto Plazo):**
- ADD columnas nuevas a `Professional` sin eliminar las antiguas
- Crear tabla `ProfessionalLocation`
- Migrar datos existentes: crear una locación "por defecto" para cada profesional con su schedule/rules actuales

**Fase 2:**
- Desplegar refactor de componentes
- Deprecar endpoints antiguos de config

**Fase 3:**
- Eliminar columnas antiguas de `Professional`

### 7. Server Action (Ejemplo)

```typescript
export async function getProfessionalLocations(): Promise<ProfessionalLocation[]> {
    const professionalId = await resolveProfessionalIdFromSession();
    return fetchWithAuth<ProfessionalLocation[]>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/locations`
    );
}

export async function patchProfessionalLocation(
    locationId: string,
    payload: Partial<ProfessionalLocation>
): Promise<ProfessionalLocation> {
    const professionalId = await resolveProfessionalIdFromSession();
    return fetchWithAuth<ProfessionalLocation>(
        `${PROFESSIONAL_API_BASE_URL}/professionals/${professionalId}/locations/${locationId}`,
        {
            method: 'PATCH',
            body: JSON.stringify(payload),
        }
    );
}
```

## Ventajas

✅ Un profesional puede gestionar N consultorios sin límite  
✅ Cada locación tiene su propia configuración de horarios  
✅ La UI es limpia (dropdown para seleccionar locación)  
✅ Backend puede agrupar citas por locación  
✅ Migracion sin breaking changes (fase gradual)  

## Estimación

- Backend entity + controller: 2-3 HS
- Frontend components: 1-2 HS
- Tests: 1 H
- **Total: ~5 HS**
