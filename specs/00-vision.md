---
id: 00-vision
status: approved
version: 1.0
last_updated: 2026-11-15
---

# AseptiQ — Visión del sistema

## 1. Objetivo

Reconstruir **AseptiQ**, sistema de gestión de inventario, producción, costos y trazabilidad de **Proclides Soluciones Estériles S.A.S.**, bajo un proceso de **Spec-Driven Development** con specs verificables, arquitectura modular y criterios de aceptación explícitos.

## 2. Problema

El sistema actual (v2.5.3) es funcional pero arrastra deuda estructural:

- Monolito JS vanilla de ~9.000 líneas sin build step.
- Sin tests automatizados.
- Sin tipado.
- Acoplamiento UI $\leftrightarrow$ RPC $\leftrightarrow$ DB sin contratos explícitos.
- Config con doble fuente de verdad (`sys_config` + `localStorage`).
- Trazabilidad aproximada, no estricta.

INVIMA exige trazabilidad estricta y FIFO. La app actual no la garantiza formalmente.

## 3. Alcance del MVP

**Dentro del alcance:**
- Los 25 módulos actuales + 2 nuevos:
  - **Producción de subproducto:** reemplaza "Entrada mercancía tipo subproducto".
  - **Recepción desde central:** entrada PT con Lote EO.
- **Trazabilidad estricta** con FIFO.
- **Lote EO** (esterilización) modelado como relación $N:M$ (cargas $\leftrightarrow$ OPs).
- **Categorización** de ítems (5 categorías predefinidas).
- Reescritura manteniendo el stack (vanilla JS + ES modules + Vite + Vitest + JSDoc + Supabase).
- Schema rediseñado desde cero.
- Impresión HTML/CSS nativa.

**Fuera del MVP:**
- Port .NET (post-MVP).
- Sincronización offline.
- Multi-bodega.
- Módulo de ventas.
- Escaneo móvil en bodega (se mantiene como está).

## 4. Actores

| Actor | Descripción | Necesita |
| :--- | :--- | :--- |
| **Admin** | Dirección técnica | Todo + gestión de usuarios + backup |
| **Operador** | Producción, bodega, compras | CRUD de catálogo y operación diaria |
| **Consulta** | Auditoría, gerencia | Ver, exportar e imprimir |
| **Central de esterilización** | Operación interna | Asignar Lote EO |
| **INVIMA** | Ente regulador | Trazabilidad estricta FIFO |

## 5. Decisiones arquitectónicas

- **Stack MVP:** vanilla JS + ES modules + Vite (build) + Vitest (tests) + JSDoc (tipado liviano) + Supabase.
- **Sin framework UI:** React, Vue y Svelte descartados.
- **Sin TypeScript:** JSDoc aporta el 80% del beneficio sin paso de compilación.
- **Estructura modular:** `src/core/` (lógica pura), `src/shared/` (UI/HTTP/Auth), `src/modules/` (un módulo por feature).
- **Backend:** Supabase (Postgres + Auth + RLS + RPCs) con schema rediseñado.
- **Impresión:** HTML/CSS nativo desde el navegador (como funciona actualmente).

## 6. Métricas de éxito

- 100% de flujos del manual cubiertos por criterios de aceptación.
- Trazabilidad estricta verificable: desde un Lote EO, obtener todos los insumos con sus lotes; desde un lote de insumo, obtener todos los Lotes EO afectados.
- Cero descuadres de inventario en un ciclo completo de prueba.
- Cobertura de tests de `src/core/` $\ge 80\%$.
- Cero hallazgos críticos de seguridad antes del release.

## 7. Restricciones

- INVIMA exige trazabilidad estricta y FIFO.
- Existen insumos sin lote (papelería, consumibles) y sin fecha de vencimiento.
- Impresión Zebra vía driver de Windows (fuera del software).
- Un solo desarrollador (proyecto personal).
- Sin deadline fijo.

## 8. Supuestos

- Supabase se mantiene como backend en el MVP.
- No hay datos en producción que migrar (la app está desplegada pero no operada).
- El schema se rediseña sin restricciones de compatibilidad hacia atrás.
- El port a .NET queda para fase post-MVP.

## 9. Decisiones cerradas

| ID | Pregunta | Decisión |
| :--- | :--- | :--- |
| **Q-A / Q-B** | Subproducto: ¿misma OP o distinta? | Usualmente misma OP. A veces se pre-produce y queda en stock sin lote; el lote se asigna al consumirse (lote del PT que lo consume). |
| **Q-C** | ¿Se mantiene "Entrada mercancía tipo subproducto"? | Se reemplaza por un módulo dedicado: "Producción subproducto". |
| **Q-D** | ¿Todos los PT esterilizan? | Solo los estériles. Los no estériles van directo de planta a bodega. |
| **Q-E** | Lote EO: ¿por OP o por carga? | **$N:M$**. Una OP puede ir en varias cargas; una carga puede tener varias OPs. Tablas `cargas_eo` + `carga_eo_items`. |
| **Q-F** | Central: ¿interna o externa? | **Interna**. No se modela como proveedor. |
| **Q-G** | Recepción desde central | Entrada de mercancía tipo PT que suma stock y asigna Lote EO. |
| **Q-H** | Cuarentena antes o después | No hay cuarentena adicional. Un PT estéril se despacha solo con Lote EO. |
| **Q-I** | Unidades rechazadas por central | Vuelven a planta para **reproceso** bajo estado `en_reproceso`. |
| **Q-J** | Lotes de insumo vencidos | Nunca se vence nada en Proclides (bodega chica, compras semanales). FIFO puro. `fecha_vencimiento` es informativo y **no** bloquea consumo. |
| **Q-K** | Unicidad de `numero_carga` | Puede repetirse entre PTs. No es `UNIQUE` global. |
| **P2** | FIFO vs. FEFO | **Solo FIFO**. |

## 10. Estado

Spec aprobado. Sirve de base para los documentos `01` a `08`.