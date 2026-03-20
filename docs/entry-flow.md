# Flujo de Entrada y Acceso por Rol

Este documento resume el flujo actual de navegación para que otro desarrollador (o agente de IA) pueda continuar el trabajo sin re-descubrir reglas de negocio.

## Objetivo de UX

- La landing (`/`) comunica producto y características.
- El acceso a portales profesionales/organizacionales no expone navegación interna sin sesión.
- Existe un punto único de entrada autenticada: ` /dashboard `.

## Mapa de Flujo

1. Usuario anónimo entra a `/`.
2. Desde el hero:
- CTA principal: `Ingresar` (`/api/auth/login`).
- CTA secundaria: `Conocer portales` (`/#portals`).
3. En tarjetas de portal:
- Paciente: muestra accesos base.
- Profesional y Organización: muestran solo `Ingresar` si no hay sesión.
4. Tras login, el usuario llega a `/dashboard`.
5. En `/dashboard` ve entradas por portal según roles.

## Reglas de Acceso

### Portal Paciente
- Disponible siempre en la UI.
- No depende de rol para mostrarse.

### Portal Profesional
- Sin sesión: botón `Ingresar`.
- Con sesión y rol profesional: muestra accesos internos.
- Con sesión sin rol profesional: muestra mensaje de acceso no habilitado.

### Portal Organización
- Sin sesión: botón `Ingresar`.
- Con sesión y rol org (`OrgAdmin`, `OrgStaff`, `TenantOrg`): muestra accesos internos.
- Con sesión sin rol org: muestra mensaje de acceso no habilitado.

## Fuente de Verdad Técnica

- Extracción/normalización de roles:
  - `frontend/src/lib/auth/roles.ts`
- Definición de tarjetas de portal + estado de acceso:
  - `frontend/src/lib/auth/portal-access.ts`
- Definición de estados de cards de dashboard:
  - `frontend/src/lib/auth/dashboard-access.ts`
- Landing:
  - `frontend/src/app/page.tsx`
- Dashboard unificado:
  - `frontend/src/app/dashboard/page.tsx`

## Tests de Flujo

Se agregaron tests automatizados en frontend:

- `frontend/tests/auth-roles.test.ts`
- `frontend/tests/portal-access.test.ts`

Comandos:

```bash
pnpm --dir frontend run test:flow
pnpm --dir frontend run test
pnpm --dir frontend run type-check
```

## Notas de Continuidad

1. Si cambia el namespace de claims de Auth0, actualizar `ROLE_CLAIM_KEYS` en `roles.ts`.
2. Si se modifica la visibilidad de tarjetas, actualizar `getPortalAccessState()` y sus tests.
3. Mantener la lógica de acceso fuera de componentes para facilitar testing y evitar regresiones.
