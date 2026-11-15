---
id: 05-contratos
status: review
version: 1.0
last_updated: 2026-11-14
depends_on: [03-modelo-de-dominio]
---

# Contratos

## 1. Tablas

Ver `03-modelo-de-dominio.md §1` para columnas y constraints. Este documento
solo lista los nombres para referencia rápida.

| Tabla | Propósito | Escritura |
|---|---|---|
| `categorias` | Categorías por tipo de ítem | Directa (RLS) |
| `insumos` | Catálogo de insumos | Directa (RLS) |
| `subproductos` | Catálogo de subproductos | Directa (RLS) |
| `productos_terminados` | Catálogo de PT | Directa (RLS) |
| `sys_proveedores` | Proveedores | Directa (RLS) |
| `bom_recetas` | Receta de PT (insumos directos) | Directa (RLS) |
| `subproducto_recetas` | Receta de subproducto | Directa (RLS) |
| `subproducto_subproductos` | Jerarquía de subproductos | Directa (RLS) |
| `paquete_subproductos` | Composición de PT | Directa (RLS) |
| `ordenes_semanales` | OPs | RPC |
| `entregas_op` | Entregas parciales | RPC |
| `subproducto_producciones` | Producciones de subproducto | RPC |
| `cargas_eo` | Cargas de esterilización | RPC |
| `carga_eo_items` | Items de una carga EO | RPC |
| `insumo_lotes` | Lotes de insumo | RPC |
| `lotes_pt` | Lotes de PT (con lote_op + lote_eo) | RPC |
| `movimientos` | Movimientos unificados | RPC |
| `despachos` | Despachos a cliente | RPC |
| `devoluciones_pt` | Devoluciones de PT | RPC |
| `evaluaciones_proveedores` | Evaluaciones SGC | Directa (RLS) |
| `cajas_ubicacion` | Zonificación de cajas | RPC |
| `etiquetas_impresas` | Registro de impresiones | RPC |
| `backup_log` | Historial de backups | Directa (RLS) |
| `profiles` | Usuarios | Directa (RLS admin) |
| `sys_config` | Config global | Directa (RLS) |
| `user_preferences` | Preferencias de notificaciones | Directa (RLS) |

## 2. RPCs

### 2.1 Helpers

#### `current_user_role() → text`
Rol del usuario actual. `'inactivo'` si `activo = false`. `'anon'` si no logueado.

#### `current_user_email() → text`
Email del usuario actual.

#### `validar_escritura() → void`
Falla si el rol no es `admin` u `operador`.

#### `siguiente_codigo(p_prefijo text, p_tabla text) → text`
Siguiente código de 4 dígitos. `p_tabla ∈ ('insumos','subproductos','productos_terminados')`.

### 2.2 Catálogo

#### `guardar_subproducto(p_id uuid, p_codigo text, p_nombre text, p_existencia numeric, p_punto_reorden numeric, p_receta jsonb, p_hijos jsonb, p_tipo text) → subproductos`
Transaccional. Detecta ciclos contra `p_hijos` (no solo contra aristas viejas).

#### `guardar_paquete(p_codigo_pt text, p_es_nuevo boolean, p_nombre text, p_subproductos jsonb, p_insumos jsonb, p_unidades_por_caja int, p_precio_venta numeric) → productos_terminados`
Transaccional. Reemplaza composición completa.

#### `eliminar_insumo(p_id uuid) → void`
Bloquea si tiene movimientos o está en recetas.

#### `ajustar_costo_insumo(p_insumo_id uuid, p_costo_nuevo numeric, p_motivo text) → jsonb`
Registra en `ajustes_costo_insumo`. Devuelve `{costo_anterior, costo_nuevo}`.

### 2.3 Inventario

#### `registrar_entrada(...) → jsonb`
14 parámetros:
- `p_insumo_id uuid`
- `p_cantidad numeric` (en unidad de compra)
- `p_proveedor_id uuid` (opcional)
- `p_costo_unitario numeric` (opcional)
- `p_motivo text` (opcional)
- `p_rendimiento_real numeric` (opcional, para tipo variable)
- `p_lote_insumo text` (opcional, obligatorio si `requiere_lote`)
- **`p_fecha_vencimiento date`** (opcional, obligatorio si `requiere_vencimiento`) ← nuevo
- `p_estado_calidad text` (default 'Aprobado')
- `p_numero_factura text`
- `p_numero_oc text`
- `p_numero_entrada_almacen text`
- `p_cantidad_pendiente_oc numeric`
- `p_observaciones_calidad text`

Retorna: `{movimiento_id, cantidad_consumo, existencia_nueva, costo_unitario, estado_calidad}`.

#### `registrar_entrada_multi_lote(p_insumo_id uuid, p_lotes jsonb, ...) → jsonb`
Igual que `registrar_entrada` pero itera sobre `[{lote, cantidad, fecha_vencimiento?}]`.

#### `registrar_salida(p_insumo_id uuid, p_cantidad numeric, p_motivo text) → jsonb`
Consume FIFO. Retorna `{existencia_nueva}`.

#### `ajustar_inventario(p_insumo_id uuid, p_nueva_existencia numeric, p_motivo text) → jsonb`
Ajuste por conteo físico. Positivo crea lote `AJUSTE`; negativo consume FIFO.

#### `registrar_devolucion(p_insumo_id uuid, p_cantidad numeric, p_proveedor_id uuid, p_motivo text, p_lote text) → jsonb`
LIFO si `p_lote` es null; validación de saldo si tiene lote.

### 2.4 Producción de subproducto

#### `producir_subproducto(p_id uuid, p_cantidad numeric, p_lote text, p_motivo text) → jsonb`
Consume FIFO insumos + hijos. Crea `subproducto_producciones` con `orden_id = NULL`.

Retorna `{existencia_nueva, items_afectados, produccion_id}`.

#### `consumir_subproducto_fifo(p_sub_id uuid, p_cantidad numeric, p_orden_id uuid) → jsonb`
Consumo desde una OP. FIFO por `fecha_produccion`. **No invocable** desde `authenticated`.

### 2.5 Órdenes

#### `confirmar_orden(...) → ordenes_semanales`
Parámetros:
- `p_codigo_pt text`
- `p_cantidad numeric`
- `p_estado_cobertura text`
- `p_detalle jsonb` (snapshot de cobertura)
- `p_numero_op text`
- `p_lote text`
- `p_prioridad int`
- `p_fecha_programada date`
- `p_fecha_fin_programada date`

#### `cancelar_orden(p_orden_id uuid, p_motivo text) → jsonb`
Bloqueado si `Terminada` o `Cancelada`.

#### `registrar_entrega_op(p_orden_id uuid, p_cantidad numeric, p_motivo text) → jsonb`
**Sin `p_lote_entrega`.** El lote del PT es siempre `ordenes.lote`.

Retorna `{ok, cantidad_producida, cantidad_pendiente, op_cerrada, items_afectados, lotes_pt_creados: [{lote_pt_id, estado, cantidad}]}`.

#### `recalcular_cobertura_op(p_orden_id uuid) → jsonb`
Solo lectura. Retorna `{estado_general, faltantes, pendiente}`.

### 2.6 Esterilización

#### `crear_carga_eo(p_numero_carga text, p_items jsonb) → cargas_eo`
`p_items = [{orden_id, cantidad}]`. Mueve `lotes_pt` de `en_planta` a `en_central`.

#### `recibir_carga_eo(p_carga_id uuid, p_items jsonb, p_numero_carga text) → jsonb`
`p_items = [{orden_id, cantidad_recibida, cantidad_rechazada, motivo_rechazo}]`. Asigna `lote_eo = p_numero_carga` a las recibidas. Las rechazadas van a `en_reproceso`.

#### `listar_cargas_eo(filtros jsonb) → jsonb`
Filtros: fecha_desde, fecha_hasta, estado, numero_carga.

### 2.7 Despachos

#### `registrar_despacho(p_codigo_pt text, p_cantidad numeric, p_cliente text, p_lote_op text, p_lote_eo text, p_consecutivo text, p_oc text, p_fecha date, p_fecha_vencimiento text, p_observaciones text) → jsonb`
Valida stock en `lotes_pt`. Si PT estéril, `p_lote_eo` obligatorio.

Retorna `{ok, existencia_nueva, lote_pt_id}`.

#### `registrar_devolucion_pt(p_codigo_pt text, p_cantidad numeric, p_estado_producto text, p_motivo text, p_lote_op text, p_lote_eo text) → jsonb`
Si `estado = bueno`, suma a `lotes_pt` (o crea uno nuevo con `lote_op` + `lote_eo`).

### 2.8 Trazabilidad

#### `trazar_forward(p_codigo_pt text, p_lote_op text, p_lote_eo text, p_cantidad numeric) → jsonb`
Árbol recursivo de insumos y subproductos consumidos. Usa `movimientos.orden_id`.

#### `trazar_backward(p_insumo_id uuid, p_lote text) → jsonb`
Lista de PTs (con lote_op + lote_eo) que contienen el insumo, directa o vía subproductos.

### 2.9 Cajas

#### `reservar_cajas_lote(p_codigo_pt text, p_lote text, p_cantidad int) → text[]`
Reserva atómicamente (advisory lock). Retorna los códigos `{PT}-C{###}-LOTE-{lote}`.

#### `siguiente_codigo_caja(p_codigo_pt text, p_lote text) → int`
Interno.

### 2.10 Helpers de cálculo

#### `costos_todos() → jsonb`
Retorna `{subproducto_costo: {uuid: number}, paquete_costo: {codigo_pt: number}}`.

#### `subproducto_costo(p_sub_id uuid, p_visited uuid[]) → numeric`
Recursivo. **No invocable** desde `authenticated`.

#### `paquete_costo(p_pt text) → numeric`
**No invocable** desde `authenticated`.

#### `simular_consumo_pt(p_codigo_pt text, p_cantidad numeric) → jsonb`
Simulación recursiva con estado acumulativo. **No invocable** desde `authenticated`.

#### `simular_consumo_subproducto(p_sub_id uuid, p_cantidad numeric, p_state jsonb, p_visited uuid[]) → jsonb`
Interno.

### 2.11 Consumo FIFO

#### `consumir_insumo_fifo(p_insumo_id uuid, p_cantidad numeric, p_motivo text, p_orden_id uuid, p_tipo text) → jsonb`
FIFO estricto. `p_tipo ∈ ('Consumo','Salida')`. **No invocable** desde `authenticated`.

#### `consumir_subproducto_recursivo(p_sub_id uuid, p_cantidad numeric, p_orden_id uuid, p_visited uuid[]) → jsonb`
Auto-producción al vuelo. **No invocable** desde `authenticated`.

## 3. Contratos de UI (module API)

Cada módulo expone una interfaz consistente:

```js
// src/modules/<feature>/index.js
export const module = {
  id: 'insumos',
  title: 'Insumos',
  icon: 'box',
  group: 'catalogo',
  requiredRole: ['admin', 'operador', 'consulta'],
  async mount(container, context) { /* render inicial */ },
  unmount() { /* cleanup: destroy charts, clear timers */ }
};

- mount(container, context): renderiza el módulo en el contenedor.

- context: { supabase, config, session, user, router }.

- unmount(): destruye gráficos, cancela fetches pendientes.

## 4. Contratos de impresión

### 4.1 Función `imprimirHTML(contenidoHTML, tituloVentana, cssExtra)`

Crea iframe aislado.

Espera 450ms antes de print().

Elimina el iframe después de 2s.

### 4.2 Formatos

| Formato | Origen | Orientación | Tamaño |
|---|---|---|---|
| OP | `imprimirOP` | Portrait | Carta |
| Kardex | `imprimirKardex` | Portrait | Carta |
| Conteo físico | `imprimirConteoFisico` | Portrait | Carta |
| Consolidado MP | `imprimirConsolidadoMP` | Portrait | Carta |
| Programación semanal | `imprimirProgramacionSemanal` | Portrait | Carta |
| Despachos del día | `imprimirReporteDespachos` | Landscape | Carta |
| Evaluación proveedor | `imprimirEvaluacionProveedor` | Portrait | Carta |
| Etiquetas PT | `imprimirEtiquetasPT` | Portrait | Zebra 150×100 / 80×44 |
| Etiquetas QR insumo | `imprimirEtiquetas` | Portrait | Carta (4×N) |
| FO-AP-04 | `imprimirFormatoEntradaAlmacen` | Portrait | Carta |

## 5. Convenciones de errores
Errores de validación: toast rojo con traducirError(mensaje).

Errores de red: toast rojo "No se pudo conectar. Revisá tu conexión.".

Errores de sesión (401): redirige al login con mensaje.

Errores de permiso (403): toast rojo "Tu rol es Consulta — solo lectura.".

Errores de stock: toast rojo con lista de faltantes en texto.

Errores inesperados: toast rojo "Error inesperado. Revisá la consola." + log.

## 6. Convenciones de eventos
No se usan eventos globales. La comunicación entre módulos va por `router` y `context`.

El router emite:

- `route:change` → `{ from, to }`
- `auth:login` → `{ session }`
- `auth:logout` → `{}`
- `auth:expired` → `{}`

## 7. Convenciones de versionado
- **Schema:** versionado en el nombre del archivo (`schema_v1.0.0.sql`).
- **RPCs:** cambios de firma con parámetros opcionales al final, nunca breaking.
- **Frontend:** SemVer (`v1.0.0`).
- **Specs:** versión en frontmatter (0.x = draft, 1.x = aprobado, 2.x = revisado).

