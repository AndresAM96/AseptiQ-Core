---
id: 01-actores-y-casos-de-uso
status: review
version: 1.0
last_updated: 2026-11-15
depends_on: [00-vision, 03-modelo-de-dominio]
---

# Actores y casos de uso

## 1. Actores

| Actor | Descripción | Permisos |
|---|---|---|
| **Admin** | Dirección técnica y dueño del sistema. | Acceso total, gestión de usuarios y generación de backups. |
| **Operador** | Personal de producción, bodega y compras. | CRUD de catálogo y operación diaria. Sin acceso a usuarios ni backups. |
| **Consulta** | Auditoría, gerencia e INVIMA. | Solo lectura, exportación e impresión de reportes. |
| **Central de esterilización** | Operador interno (rol Operador). | Gestión de envíos y recepciones de cargas EO. |
| **Sistema** | Supabase + RLS + RPCs. | Garantiza la integridad de datos, reglas de negocio y trazabilidad. |

## 2. Casos de uso por módulo

### 2.1 Configuración

| ID | Caso de uso | Actor | Módulo |
|---|---|---|---|
| **CU-001** | Configurar parámetros globales (prefijos, umbrales, tema) | Admin | Configuración |
| **CU-002** | Gestionar unidades de medida | Admin | Configuración |
| **CU-003** | Gestionar categorías de ítems | Admin | Configuración |
| **CU-004** | Gestionar datos de etiquetas (empresas, INVIMA, logos) | Admin | Configuración |

### 2.2 Catálogo

| ID | Caso de uso | Actor | Módulo |
|---|---|---|---|
| **CU-010** | Crear/editar insumo con cadena de conversiones | Operador | Insumos |
| **CU-011** | Desactivar/activar insumo (*soft delete*) | Operador | Insumos |
| **CU-012** | Ajustar costo de insumo (con auditoría) | Operador | Insumos |
| **CU-013** | Crear/editar subproducto con receta y subproductos hijos | Operador | Productos & BOM |
| **CU-014** | Crear/editar paquete (PT) con BOM | Operador | Productos & BOM |
| **CU-015** | Desactivar/activar subproducto o PT | Operador | Productos & BOM |
| **CU-016** | Crear/editar proveedor | Operador | Proveedores |

### 2.3 Producción

| ID | Caso de uso | Actor | Módulo |
|---|---|---|---|
| **CU-020** | Producir subproducto *standalone* (pre-producción) | Operador | Producción subproducto |
| **CU-021** | Cargar nueva OP | Operador | Cargar orden |
| **CU-022** | Calcular cobertura de OP | Operador | Cargar orden |
| **CU-023** | Confirmar OP | Operador | Cargar orden |
| **CU-024** | Registrar entrega parcial o total de OP | Operador | Cargar orden |
| **CU-025** | Cancelar OP | Operador | Cargar orden |
| **CU-026** | Ver detalle de OP (cobertura + historial de entregas) | Operador / Consulta | Cargar orden |
| **CU-027** | Imprimir OP | Operador / Consulta | Cargar orden |

### 2.4 Esterilización

| ID | Caso de uso | Actor | Módulo |
|---|---|---|---|
| **CU-030** | Enviar PT a central (crear carga EO) | Operador | Envío a central |
| **CU-031** | Recibir PT de central (asignar Lote EO) | Operador | Recepción desde central |
| **CU-032** | Reprocesar PT rechazado | Operador | Recepción desde central |
| **CU-033** | Consultar historial de cargas EO | Operador / Consulta | Envío a central |

### 2.5 Inventario

| ID | Caso de uso | Actor | Módulo |
|---|---|---|---|
| **CU-040** | Registrar entrada de insumo (simple) | Operador | Entrada mercancía |
| **CU-041** | Registrar entrada multi-lote | Operador | Entrada mercancía |
| **CU-042** | Registrar salida manual (merma, ajuste) | Operador | Auditoría |
| **CU-043** | Registrar ajuste de inventario (conteo físico) | Operador | Auditoría |
| **CU-044** | Consultar kardex de un insumo | Operador / Consulta | Kardex |

### 2.6 Salidas

| ID | Caso de uso | Actor | Módulo |
|---|---|---|---|
| **CU-050** | Despachar PT a cliente (con Lote OP + Lote EO) | Operador | Despachos |
| **CU-051** | Devolver insumo a proveedor | Operador | Devoluciones |
| **CU-052** | Devolver PT de cliente (bueno / cuarentena / dañado) | Operador | Devoluciones |
| **CU-053** | Imprimir reporte de despachos del día | Operador / Consulta | Despachos |

### 2.7 Trazabilidad

| ID | Caso de uso | Actor | Módulo |
|---|---|---|---|
| **CU-060** | Trazar PT $\rightarrow$ insumos (*forward*, incluye Lote OP y Lote EO) | Operador / Consulta | Trazabilidad |
| **CU-061** | Trazar insumo $\rightarrow$ PTs (*backward*, incluye todos los Lotes OP y EO) | Operador / Consulta | Trazabilidad |

### 2.8 Análisis

| ID | Caso de uso | Actor | Módulo |
|---|---|---|---|
| **CU-070** | Consultar compras por proveedor | Operador / Consulta | Compras |
| **CU-071** | Consultar mermas y ajustes | Operador / Consulta | Mermas |
| **CU-072** | Consultar histórico (gráficos) | Operador / Consulta | Histórico |
| **CU-073** | Comparar costo teórico vs. real por OP | Operador / Consulta | Costos OP |
| **CU-074** | Consultar rentabilidad por PT | Operador / Consulta | Rentabilidad |
| **CU-075** | Consultar consolidado MP (MRP) | Operador / Consulta | Consolidado MP |
| **CU-076** | Consultar programación semanal (Kanban) | Operador / Consulta | Programación |
| **CU-077** | Evaluar proveedor (formato SGC) | Operador | Evaluación Prov. |
| **CU-078** | Consultar órdenes de compra | Operador / Consulta | Órdenes de Compra |
| **CU-079** | Consultar mapa visual de bodega | Operador / Consulta | Bodega PT |

### 2.9 Sistema

| ID | Caso de uso | Actor | Módulo |
|---|---|---|---|
| **CU-080** | Gestionar usuarios (cambiar rol, activar/desactivar) | Admin | Usuarios |
| **CU-081** | Generar backup en ZIP | Admin | Backup |
| **CU-082** | Consultar dashboard | Operador / Consulta | Dashboard |
| **CU-083** | Consultar notificaciones (campana) | Operador / Consulta | Sidebar |

## 3. Mapa de módulos (vista del menú)

```text
Operación
├── Dashboard (CU-082)
├── Cargar orden (CU-021..027)
├── Novedades (vista filtrada de CU-026)
├── Entrada mercancía (CU-040, 041)
├── Producción subproducto (CU-020)  <-- nuevo
├── Envío a central (CU-030, 033)      <-- nuevo
├── Recepción desde central (CU-031, 032) <-- nuevo
├── Devoluciones (CU-051, 052)
├── Despachos (CU-050, 053)
└── Bodega PT (CU-079)

Catálogo
├── Insumos (CU-010..012)
├── Productos & BOM (CU-013..015)
└── Proveedores (CU-016)

Logística y Calidad
├── Programación (CU-076)
├── Consolidado MP (CU-075)
├── Órdenes de Compra (CU-078)
├── Trazabilidad (CU-060, 061)
├── Auditoría (CU-042, 043)
├── Evaluación Prov. (CU-077)
├── Kardex (CU-044)
├── Compras (CU-070)
├── Mermas (CU-071)
├── Histórico (CU-072)
├── Costos OP (CU-073)
└── Rentabilidad (CU-074)

Sistema
├── Configuración (CU-001..004)
├── Usuarios (CU-080)
└── Backup (CU-081)
```

**Cambios vs. app actual:**
- **Entrada mercancía** pierde el tipo subproducto $\rightarrow$ se mueve al nuevo módulo **Producción subproducto**.
- **Envío a central** y **Recepción desde central** se incorporan como dos módulos independientes.

## 4. Pendiente

- Detallar cada caso de uso (precondiciones, flujo principal, flujo alternativo, postcondiciones) en `02-requisitos-funcionales.md`.
- Orden de prioridad para el detalle:
  1. Módulos de **Operación** (10 módulos).
  2. Módulos de **Catálogo** (3 módulos).
  3. Módulos de **Logística y Calidad** (12 módulos).
  4. Módulos de **Sistema** (3 módulos).