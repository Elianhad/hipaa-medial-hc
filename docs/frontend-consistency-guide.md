# Guia de Consistencia Frontend para Produccion

## Objetivo

Esta guia define el lenguaje visual, patrones de implementacion y criterios de calidad para mantener una experiencia consistente en los dashboards del proyecto.

Esta documentacion esta pensada para:

- Desarrolladores frontend/fullstack
- Agentes de IA que creen o editen interfaces

## Alcance

Aplica a:

- Rutas de dashboard de professional, organization, organization/staff y patient
- Componentes de UI reutilizados dentro de dashboard
- Formularios, tablas, modales, tarjetas de KPI y navegacion secundaria

No aplica (salvo decision explicita):

- Landing publica
- Flujos externos al dashboard

## Principios de Diseno

1. Consistencia semantica: cada color representa un tipo de informacion.
2. Legibilidad clinica: jerarquia tipografica clara, buen contraste y baja carga visual.
3. Modularidad: repetir patrones de componentes, no estilos ad hoc por pantalla.
4. Escalabilidad: cualquier vista nueva debe poder construirse con los bloques de esta guia.
5. Accesibilidad minima: foco visible, tamanos clickeables, estados claros.

## Sistema Semantico de Color

Usar siempre clases de Tailwind por semantica, no por gusto puntual.

- Sky: informacion operativa, agenda, filtros, contexto temporal.
  - border-sky-200, bg-sky-50/70, text-sky-700
- Emerald: estado activo, confirmacion, dominio clinico/pacientes.
  - border-emerald-200, bg-emerald-50/70, text-emerald-700
- Violet: estructura de equipo, configuracion profesional, datos de soporte.
  - border-violet-200, bg-violet-50/70, text-violet-700
- Amber: ciclo administrativo, legal, facturacion pendiente.
  - border-amber-200, bg-amber-50/70, text-amber-700
- Rose: errores, rechazos, indisponibilidad o riesgo.
  - border-rose-200, bg-rose-50/70, text-rose-700
- Slate: estructura neutra, tipografia base, contenedores de soporte.

## Layout Base de Dashboard

La atmosfera visual compartida vive en el layout de dashboard.
No duplicar backgrounds complejos dentro de cada pagina.

Patron esperado por pagina:

1. Main con espaciado vertical.
2. Contenedor max-w con space-y.
3. Header principal (rounded-3xl, bg-white/90, border-slate-200, shadow-sm).
4. Secciones de contenido por dominio semantico.

## Patrones Estandar

### 1) Header de pagina

Estructura:

- Label superior en uppercase con tracking amplio.
- H1 principal.
- Texto descriptivo.
- Chips de contexto (1 a 3 max).

Clases recomendadas:

- rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8
- text-xs uppercase tracking-[0.22em] text-slate-500
- mt-3 text-3xl font-bold text-slate-900
- mt-2 text-slate-600

### 2) Tarjetas KPI

- rounded-xl
- border semantico segun dominio
- bg semantico suave (50/60 o 50/70)
- numero principal en color semantico fuerte

### 3) Tablas

- Contenedor: rounded-2xl border semantico bg-white/90 shadow-sm overflow-hidden
- Thead: bg semantico suave + border inferior
- Rows: hover con tinte semantico leve
- Badges: siempre con border + bg + text semanticos

### 4) Formularios

- Contenedor de form: rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm
- Bloques de campos por dominio semantico
- Inputs/select/textarea unificados:
  - rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm
  - focus visible con ring semantico
- CTA primaria: color semantico del flujo

### 5) Modales

- Overlay: bg-black/40 + backdrop-blur-sm
- Contenedor: rounded-3xl border border-slate-200 + gradiente suave
- Header sticky con border inferior semantico
- Cuerpo con padding uniforme

### 6) Acciones secundarias

Unificar links y botones secundarios con estilo outlined:

- inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5
- text-sm font-medium text-slate-700
- hover:border-slate-400 hover:text-slate-900

No usar secundarias como simple texto suelto si cumplen funcion de navegacion importante.

## Reglas de Implementacion para IA y Devs

### Regla 1: No inventar patrones nuevos si ya existe uno

Antes de crear UI nueva, revisar componentes/paginas equivalentes del mismo dominio.

### Regla 2: Elegir una semantica principal por pantalla

Toda pantalla debe tener un color rector segun su funcion.

### Regla 3: Mantener densidad visual

- Evitar mezclar demasiados colores en la misma seccion.
- Evitar bloques visuales sin jerarquia.

### Regla 4: Estados de carga/error consistentes

- Carga: texto neutral o semantico suave
- Error: rose con borde
- Vacio: mensaje claro, centrado y legible

### Regla 5: Cambios pequenos y verificables

- Evitar refactors esteticos masivos sin objetivo funcional.
- Validar archivos tocados con analisis de errores.

## Checklist de QA Visual (Definition of Done)

Una tarea de frontend queda completa solo si cumple:

1. Usa el layout y header estandar del dashboard.
2. Respeta semantica de color del dominio.
3. Inputs y controles tienen foco visible.
4. Tablas tienen thead, hover y badges consistentes.
5. Modales siguen el patron compartido.
6. Botones secundarios usan estilo outlined comun.
7. No hay regresiones de TypeScript/lint en archivos modificados.
8. Responsive correcto en mobile y desktop.

## Flujo de Trabajo Recomendado

### Para desarrolladores

1. Identificar dominio (agenda, pacientes, billing, staff, etc.).
2. Elegir plantilla visual existente mas cercana.
3. Reutilizar clases y estructura.
4. Aplicar cambios incrementales.
5. Validar errores y revisar consistencia visual final.

### Para agentes de IA

1. Mapear archivos de referencia del dominio antes de editar.
2. Repetir patrones existentes (no improvisar componentes visuales nuevos).
3. Editar solo lo necesario para mantener bajo riesgo.
4. Validar errores en todos los archivos modificados.
5. Entregar resumen con rutas impactadas y criterios aplicados.

## Anti-Patrones (Evitar)

- Mezclar dark y light sin definicion de producto.
- Introducir colores fuera del mapa semantico sin aprobacion.
- Duplicar backgrounds complejos en cada pagina.
- Inputs con estilos distintos entre formularios similares.
- Botones secundarios inconsistentes entre vistas hermanas.
- Cambios visuales sin validacion de errores posterior.

## Mapa de Referencia Actual

Tomar como referencia de implementacion consistente:

- Layout global de dashboard:
  - frontend/src/app/dashboard/layout.tsx

- Formularios:
  - frontend/src/components/forms/PatientRegistrationForm.tsx
  - frontend/src/components/forms/SoapEvolutionForm.tsx
  - frontend/src/app/dashboard/professional/profile/(components)/ProfessionalProfileForm.tsx

- Organization:
  - frontend/src/app/dashboard/organization/page.tsx
  - frontend/src/app/dashboard/organization/agenda/page.tsx
  - frontend/src/app/dashboard/organization/staff/page.tsx
  - frontend/src/app/dashboard/organization/billing/page.tsx
  - frontend/src/app/dashboard/organization/pacientes/page.tsx

- Organization Staff:
  - frontend/src/app/dashboard/organization/staff/dashboard/page.tsx
  - frontend/src/app/dashboard/organization/staff/agenda/page.tsx
  - frontend/src/app/dashboard/organization/staff/pacientes/page.tsx

## Convencion de Evolucion

Si se necesita extender la guia:

1. Proponer cambio con ejemplo real (antes/despues).
2. Validar en al menos 2 vistas de distinto dominio.
3. Actualizar esta guia con nueva regla y anti-patron asociado.
4. Comunicar el cambio en PR description.

## Nota Final

Esta guia prioriza consistencia operacional y mantenibilidad para equipos mixtos (humanos + IA). Si un caso especial requiere desviacion, debe quedar justificado y documentado en el PR correspondiente.
