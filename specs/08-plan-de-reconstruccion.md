---
id: 08-plan-de-reconstruccion
status: review
version: 1.0
last_updated: 2026-11-14
depends_on:
  - 00-vision
  - 01-actores-y-casos-de-uso
  - 02-requisitos-funcionales
  - 03-modelo-de-dominio
  - 04-requisitos-no-funcionales
  - 05-contratos
  - 06-ui-y-experiencia
  - 07-criterios-de-aceptacion
---

# Plan de reconstrucción

## 1. Fases

### Fase 0 — Fundaciones (pre-implementación)

**Objetivo:** dejar listo el esqueleto del proyecto y el schema nuevo.

- [ ] Crear repositorio con estructura de carpetas (`src/core`, `src/shared`,
      `src/modules`, `specs`, `tests`).
- [ ] Configurar Vite + Vitest + ESLint + Prettier + JSDoc.
- [ ] Crear `package.json`, `vite.config.js`, `vitest.config.js`, `.env.example`.
- [ ] Escribir `schema_v1.0.0.sql` completo (todas las tablas del modelo v1.0).
- [ ] Escribir los RPCs del `05-contratos.md`.
- [ ] Configurar Supabase proyecto (dev).
- [ ] Correr schema en Supabase.
- [ ] Escribir `system_health_check()` y verificar.
- [ ] Crear primer usuario admin.
- [ ] Setup de tests: `tests/core/`, `tests/modules/`, `tests/e2e/` (manual).

**Entregable:** proyecto vacío que arranca, conecta a Supabase y pasa un test trivial.

### Fase 1 — Core + Auth + Shared

**Objetivo:** la capa pura testeable y el login funcionando.

- [ ] `src/core/formatters.js` + tests.
- [ ] `src/core/cadena.js` + tests.
- [ ] `src/core/estadoInsumo.js` + tests.
- [ ] `src/core/costos.js` + tests.
- [ ] `src/core/cobertura.js` + tests.
- [ ] `src/core/fifo.js` + tests.
- [ ] `src/core/trazabilidad.js` + tests.
- [ ] `src/shared/http/client.js` (wrapper de Supabase).
- [ ] `src/shared/http/errores.js` (`traducirError`).
- [ ] `src/shared/auth/` (login, logout, sesión, roles).
- [ ] `src/shared/ui/` (Panel, Table, Badge, Modal, Toast, Button, Input).
- [ ] `src/shared/router.js`.
- [ ] `src/styles/` (tokens, base, componentes).
- [ ] Pantalla de login funcional.
- [ ] Layout principal (sidebar + contenido).

**Entregable:** login + dashboard vacío + tests de `core/` verdes.

### Fase 2 — Catálogo

**Objetivo:** CRUD de insumos, subproductos, PT, proveedores, categorías.

- [ ] Módulo Configuración (categorías, unidades, umbrales, prefijos, etiquetas).
- [ ] Módulo Insumos.
- [ ] Módulo Productos & BOM.
- [ ] Módulo Proveedores.
- [ ] Dashboard básico (KPIs).

**Entregable:** catálogo completo y dashboard con datos reales.

### Fase 3 — Inventario

**Objetivo:** entrada, salidas, ajustes, kardex.

- [ ] Módulo Entrada mercancía (simple + multi-lote).
- [ ] Módulo Auditoría (salidas, ajustes, conteo físico).
- [ ] Módulo Kardex.
- [ ] Módulo Mermas.

**Entregable:** inventario completo con FIFO funcionando.

### Fase 4 — Producción

**Objetivo:** OP, entregas, producción de subproductos.

- [ ] Módulo Producción subproducto.
- [ ] Módulo Cargar orden (crear OP + cobertura).
- [ ] Módulo Entregas (parcial/total).
- [ ] Módulo Novedades.
- [ ] Módulo Consolidado MP (MRP).

**Entregable:** ciclo de producción completo.

### Fase 5 — Esterilización

**Objetivo:** envío y recepción de central, reproceso.

- [ ] Módulo Envío a central.
- [ ] Módulo Recepción desde central.
- [ ] Módulo Reproceso.
- [ ] Actualización de Dashboard con KPIs de esterilización.

**Entregable:** ciclo de esterilización completo.

### Fase 6 — Salidas

**Objetivo:** despachos y devoluciones.

- [ ] Módulo Despachos.
- [ ] Módulo Devoluciones (insumo + PT).

**Entregable:** ciclo de salida completo.

### Fase 7 — Análisis

**Objetivo:** reportes y análisis.

- [ ] Módulo Compras.
- [ ] Módulo Costos OP.
- [ ] Módulo Rentabilidad.
- [ ] Módulo Histórico.
- [ ] Módulo Órdenes de Compra.
- [ ] Módulo Programación.
- [ ] Módulo Evaluación Proveedores.

**Entregable:** todos los reportes funcionando.

### Fase 8 — Trazabilidad y Bodega

**Objetivo:** trazabilidad estricta y zonificación.

- [ ] Módulo Trazabilidad (forward + backward).
- [ ] Módulo Bodega PT (escaneo + mapa).

**Entregable:** trazabilidad estricta verificable.

### Fase 9 — Sistema

**Objetivo:** usuarios, backup, notificaciones.

- [ ] Módulo Usuarios.
- [ ] Módulo Backup.
- [ ] Sistema de notificaciones (campana + user_preferences).

**Entregable:** sistema completo.

### Fase 10 — Pulido y release

**Objetivo:** calidad, performance, documentación.

- [ ] E2E-001 a E2E-010 pasando.
- [ ] Smoke tests manuales pasando.
- [ ] Cobertura de tests ≥ 80% en `core/`.
- [ ] Auditoría de seguridad (XSS, RLS, RPCs).
- [ ] Performance: carga inicial < 3s, módulo < 1.5s.
- [ ] `MANUAL.md` actualizado.
- [ ] `CHANGELOG.md` con v1.0.0.
- [ ] Deploy a producción.

**Entregable:** v1.0.0 en producción.

## 2. Orden de implementación dentro de cada fase

Para cada módulo:

1. Escribir/refinar el spec (`02-requisitos-funcionales.md`).
2. Escribir los tests de `core/` (si aplica).
3. Escribir `repository.js` (queries Supabase).
4. Escribir `service.js` (lógica + llamadas a `core/`).
5. Escribir `view.js` (render + eventos).
6. Escribir `index.js` (entry point).
7. Verificar CAs del spec.
8. Actualizar `07-criterios-de-aceptacion.md` si hay nuevos E2E.

## 3. Decisiones de migración

Como no hay datos en producción, el schema se rediseña libremente. Estas son
las decisiones sobre qué se mantiene, qué se descarta y qué se agrega.

### 3.1 Se mantiene igual

- Stack: vanilla JS + Supabase.
- Auth: Supabase Auth.
- RLS por rol.
- Impresión HTML/CSS nativa desde el navegador.
- Chart.js, JSZip, QR, JsBarcode, html5-qrcode.
- Estructura de grupos del sidebar (con ajustes).
- Atajos de teclado.
- Tema dark/light.

### 3.2 Se renombra

| Actual | Nuevo | Razón |
|---|---|---|
| "Entrada mercancía" (insumo + subproducto) | "Entrada mercancía" (solo insumo) | El subproducto se mueve a "Producción subproducto". |
| `insumo_lotes` | `insumo_lotes` (se mantiene) | Sin cambio de nombre. |
| `lotes_pt` (nuevo) | — | Lote de PT con lote_op + lote_eo. |
| `movimientos_inventario` | `movimientos` | Unificada para insumos, subproductos y PT. |
| `entregas_op.lote_entrega` | (eliminado) | El lote del PT es siempre `ordenes.lote`. |

### 3.3 Se descarta

| Actual | Razón |
|---|---|
| Pseudo-lote `SIN LOTE` | Reemplazado por `requiere_lote = false` (RN-FIFO-002). |
| `insumo_lotes` para subproductos | Los subproductos no tienen lote (P4). Usan `subproducto_producciones`. |
| `planificar_consumo_subproducto` | Reemplazado por `simular_consumo_pt`. |
| `registrar_lotes_entrada` | Nunca usado. |
| Base64 de logos en `sys_config` | Migrado a Supabase Storage (bucket `logos`). |
| `localStorage` para config global | `sys_config` en Supabase es la única fuente. `localStorage` solo para tema, sidebar y tab activo. |
| `localStorage` para notificaciones | `user_preferences` en Supabase (nueva tabla). |
| Checkbox "Recordar usuario y contraseña" | Ya eliminado en v2.5.1 (seguridad). |

### 3.4 Se agrega

| Nuevo | Razón |
|---|---|
| `categorias` + `categoria_id` en catálogo | Categorización (papelería, materia prima, etc.). |
| `requiere_lote` + `requiere_vencimiento` | Flag por insumo para trazabilidad. |
| `subproducto_producciones` | Tracking de producciones standalone (sin lote). |
| `lotes_pt` | Lote de PT con `lote_op` + `lote_eo`. |
| `cargas_eo` + `carga_eo_items` | Esterilización N:M. |
| `movimientos` unificada | Reemplaza `movimientos_inventario` y cubre PT. |
| `trazar_forward` / `trazar_backward` | Trazabilidad estricta. |
| `user_preferences` | Notificaciones por usuario. |
| Flags `requiere_esterilizacion` en PT | Solo estériles pasan por central. |
| Módulos "Envío a central", "Recepción desde central", "Producción subproducto" | Separación de responsabilidades. |

### 3.5 Funcionalidad que se elimina de la UI

Ninguna. Todos los módulos actuales se mantienen (con reubicación de
subproducto).

### 3.6 Funcionalidad huérfana

- **"Crear proveedor inline"** desde Entrada mercancía: se mantiene como
  botón que abre el modal de proveedor (apilado).
- **"Crear insumo inline"** desde Productos & BOM: se mantiene con modal
  apilado.
- **"Crear subproducto inline"** desde Productos & BOM: se mantiene con modal
  apilado.
- **"Refrescar" (botón spinning)** en todos los módulos: se mantiene.
- **"Exportar CSV"** en todos los listados: se mantiene.

## 4. Checklist de paridad

Antes de declarar v1.0.0, verificar:

- [ ] Los 29 módulos están implementados.
- [ ] Los 54 RFs están cubiertos.
- [ ] Los 148 CAs están verificados (manual o automatizado).
- [ ] Los 10 E2E están pasando.
- [ ] Los smoke tests manuales están pasando.
- [ ] La cobertura de tests de `core/` ≥ 80%.
- [ ] La auditoría de seguridad no tiene hallazgos críticos.
- [ ] `MANUAL.md` está actualizado.
- [ ] `CHANGELOG.md` tiene la entrada de v1.0.0.
- [ ] El backup se genera correctamente.

## 5. Riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| RSK-001 | Bug en FIFO descuadra inventario real | Media | Alto | Tests exhaustivos en `core/fifo.js` + E2E-001. |
| RSK-002 | Bug en auto-producción recursiva | Media | Alto | Tests de ciclos + profundidad máxima. |
| RSK-003 | RLS mal configurado deja pasar escrituras | Baja | Alto | `system_health_check()` + auditoría. |
| RSK-004 | Pérdida de datos en migración | Baja | Alto | No hay datos en producción; schema nuevo. |
| RSK-005 | Impresión Zebra no coincide con tamaño físico | Media | Medio | Documentar configuración de driver. |
| RSK-006 | Performance degradada en listados grandes | Media | Medio | Paginación desde día 1. |
| RSK-007 | Trazabilidad estricta no cubre todos los casos | Media | Alto | E2E-001 + E2E-007 + tests de `core/trazabilidad.js`. |
| RSK-008 | Scope creep (agregar features no spec-eadas) | Alta | Medio | Toda feature nueva va a v1.1+. |

## 6. Definition of Done

Un módulo está "done" cuando:

- [ ] El spec está en `status: approved`.
- [ ] Los RFs del módulo están implementados.
- [ ] Los CAs del módulo están verificados (manual o test).
- [ ] Los tests de `core/` relacionados están verdes.
- [ ] El módulo es responsive (desktop, tablet, móvil).
- [ ] El módulo respeta RLS (probar con los 3 roles).
- [ ] El módulo no tiene warnings de ESLint.
- [ ] El módulo tiene JSDoc en funciones de `core/`.
- [ ] El módulo se documentó en `MANUAL.md`.
- [ ] El módulo aparece en `CHANGELOG.md`.

## 7. Post-MVP

Una vez v1.0.0 en producción:

1. **Port .NET:** Blazor Hybrid, PostgreSQL + API .NET, iOS incluido.
2. **Trazabilidad granular por entrega** (llenar `movimientos.entrega_id`).
3. **FEFO opcional** para insumos con vencimiento (si INVIMA lo exige).
4. **Sincronización offline** (SQLite local + merge).
5. **Multi-bodega.**
6. **Escaneo móvil de insumos y lotes** (ZXing).
7. **Notificaciones push.**

## 8. Estado de los specs

| Spec | Estado | Versión |
|---|---|---|
| 00-vision | draft | 0.4 |
| 00-formato | approved | 1.0 |
| 01-actores-y-casos-de-uso | review | 1.0 |
| 02-requisitos-funcionales | review | 1.0 |
| 03-modelo-de-dominio | approved | 1.0 |
| 04-requisitos-no-funcionales | review | 1.0 |
| 05-contratos | review | 1.0 |
| 06-ui-y-experiencia | review | 1.0 |
| 07-criterios-de-aceptacion | review | 1.0 |
| 08-plan-de-reconstruccion | review | 1.0 |