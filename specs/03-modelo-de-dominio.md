---
id: 03-modelo-de-dominio
status: approved
version: 1.0
last_updated: 2026-11-15
depends_on: [00-vision]
---

# Modelo de dominio

## 1. Entidades

### 1.1 Catálogo

#### `categorias`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| `item_tipo` | `text` | `NOT NULL`, `CHECK` $\in$ `('insumo', 'subproducto', 'producto_terminado')` |
| `nombre` | `text` | `NOT NULL` |
| `descripcion` | `text` | `NULL` |
| `orden` | `int` | `DEFAULT 0` |
| `UNIQUE` | `(item_tipo, nombre)` | — |

**Seed:**

| `item_tipo` | `nombre` |
| :--- | :--- |
| `insumo` | Papelería |
| `insumo` | Materia prima |
| `insumo` | Otros insumos |
| `subproducto` | Producto en proceso |
| `producto_terminado` | Producto terminado |

#### `insumos`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| `codigo` | `text` | `NOT NULL`, `UNIQUE` |
| `nombre` | `text` | `NOT NULL` |
| `categoria_id` | `uuid` | `FK` $\rightarrow$ `categorias`, `NULL` |
| `unidad_medida` | `text` | `NOT NULL` |
| `unidad_consumo` | `text` | `NULL` |
| `conversiones` | `jsonb` | `NOT NULL`, `DEFAULT '[]'` |
| `tipo_conversion` | `text` | `NOT NULL`, `DEFAULT 'fijo'`, `CHECK` $\in$ `('fijo', 'dimensional', 'variable')` |
| `costo_unitario` | `numeric` | `NOT NULL`, `DEFAULT 0`, `CHECK` $\ge 0$ |
| `punto_reorden` | `numeric` | `NOT NULL`, `CHECK` $> 0$ |
| `existencia_actual` | `numeric` | `NOT NULL`, `DEFAULT 0`, `CHECK` $\ge 0$ |
| **`requiere_lote`** | `boolean` | `NOT NULL`, `DEFAULT true` |
| **`requiere_vencimiento`** | `boolean` | `NOT NULL`, `DEFAULT false` |
| `estado_activo` | `boolean` | `NOT NULL`, `DEFAULT true` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**`CHECK` compuesto:** `requiere_vencimiento = false OR requiere_lote = true`

#### `subproductos`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| `codigo` | `text` | `NOT NULL`, `UNIQUE` |
| `nombre` | `text` | `NOT NULL` |
| `categoria_id` | `uuid` | `FK` $\rightarrow$ `categorias`, `NULL` |
| `tipo` | `text` | `NOT NULL`, `DEFAULT 'ambos'`, `CHECK` $\in$ `('intermedio', 'final', 'ambos')` |
| `existencia_actual` | `numeric` | `NOT NULL`, `DEFAULT 0`, `CHECK` $\ge 0$ |
| `estado_activo` | `boolean` | `NOT NULL`, `DEFAULT true` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

#### `productos_terminados`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `codigo_pt` | `text` | `PK` |
| `nombre` | `text` | `NOT NULL` |
| `categoria_id` | `uuid` | `FK` $\rightarrow$ `categorias`, `NULL` |
| `unidades_por_caja` | `integer` | `NOT NULL`, `DEFAULT 1`, `CHECK` $\ge 1$ |
| `existencia_actual` | `numeric` | `NOT NULL`, `DEFAULT 0`, `CHECK` $\ge 0$ |
| `precio_venta` | `numeric` | `NULL`, `CHECK` $\ge 0$ |
| `plantilla_etiqueta` | `text` | `NOT NULL`, `DEFAULT 'esteril_proclides'` |
| `vida_util_meses` | `integer` | `NOT NULL`, `DEFAULT 35` |
| `registro_invima` | `text` | `NULL` |
| **`requiere_esterilizacion`** | `boolean` | `NOT NULL`, `DEFAULT false` |
| `estado_activo` | `boolean` | `NOT NULL`, `DEFAULT true` |
| `creado_en` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

#### `sys_proveedores`

* Columnas: `id` (`uuid`, `PK`), `nit` (`text`, `UNIQUE`), `razon_social` (`text`), `direccion` (`text`), `contactos` (`jsonb`).

### 1.2 Recetas

* `bom_recetas`: `(codigo_pt, insumo_id, cantidad_por_unidad)`
* `subproducto_recetas`: `(subproducto_id, insumo_id, cantidad_por_unidad, factor_receta)`
* `subproducto_subproductos`: `(padre_id, hijo_id, cantidad_por_unidad)`
* `paquete_subproductos`: `(codigo_pt, subproducto_id, cantidad)`

### 1.3 Producción

#### `ordenes_semanales`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| `codigo_pt` | `text` | `FK` $\rightarrow$ `productos_terminados` |
| `cantidad_proyectada` | `numeric` | `NOT NULL`, `CHECK` $> 0$ |
| `cantidad_producida` | `numeric` | `NOT NULL`, `DEFAULT 0`, `CHECK` $\ge 0$ |
| `numero_op` | `text` | `UNIQUE` parcial |
| **`lote`** | `text` | `UNIQUE` parcial, `NOT NULL` |
| `fecha_programada` | `date` | `NULL` |
| `fecha_fin_programada` | `date` | `NULL` |
| `prioridad` | `int` | `1..4` |
| `estado_op` | `text` | `CHECK` $\in$ `('Pendiente', 'En proceso', 'Terminada', 'Cancelada')` |
| `estado_cobertura` | `text` | `NOT NULL`, `DEFAULT 'Cubierto'` |
| `detalle_faltantes` | `jsonb` | `NULL` |
| `fecha_creacion` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `fecha_completado` | `timestamptz` | `NULL` |
| `fecha_cancelado` | `timestamptz` | `NULL` |
| `motivo_cancelacion` | `text` | `NULL` |

#### `entregas_op`

* Columnas: `id`, `orden_id` (`FK`), `cantidad` ($> 0$), `motivo`, `usuario_email`, `fecha`.
* **Sin `lote_entrega`:** el lote del PT es siempre `ordenes_semanales.lote`.

#### `subproducto_producciones`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| `subproducto_id` | `uuid` | `FK` $\rightarrow$ `subproductos` |
| `fecha_produccion` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `cantidad_inicial` | `numeric` | `NOT NULL`, `CHECK` $> 0$ |
| `cantidad_actual` | `numeric` | `NOT NULL`, `CHECK` $\ge 0$ |
| **`orden_id`** | `uuid` | `FK` $\rightarrow$ `ordenes_semanales`, `NULL` |
| `costo_unitario_promedio` | `numeric` | `NOT NULL`, `DEFAULT 0` |
| `usuario_email` | `text` | `NULL` |

**Semántica:**

* `orden_id != NULL`: producción dentro de una OP (auto-producción al vuelo o adelanto).
* `orden_id = NULL`: pre-producción *standalone* (queda en stock sin lote).

### 1.4 Esterilización

#### `cargas_eo`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| **`numero_carga`** | `text` | `NOT NULL`. **No único** (puede repetirse entre PTs). |
| `fecha_envio` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `fecha_recepcion` | `timestamptz` | `NULL` hasta recibir |
| `estado` | `text` | `CHECK` $\in$ `('enviada', 'recibida', 'rechazada_parcial', 'rechazada_total')` |
| `observaciones` | `text` | `NULL` |
| `usuario_envio_email` | `text` | `NULL` |
| `usuario_recepcion_email` | `text` | `NULL` |

#### `carga_eo_items`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| `carga_id` | `uuid` | `FK` $\rightarrow$ `cargas_eo` |
| `orden_id` | `uuid` | `FK` $\rightarrow$ `ordenes_semanales` |
| `cantidad_enviada` | `numeric` | `NOT NULL`, `CHECK` $> 0$ |
| `cantidad_recibida` | `numeric` | `NULL`, `CHECK` $\ge 0$ |
| **`cantidad_rechazada`** | `numeric` | `NOT NULL`, `DEFAULT 0`, `CHECK` $\ge 0$ |
| `motivo_rechazo` | `text` | `NULL` |

**`CHECK`:** $\text{cantidad\_recibida} + \text{cantidad\_rechazada} = \text{cantidad\_enviada}$ (cuando se recibe).

### 1.5 Trazabilidad

#### `insumo_lotes`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| `insumo_id` | `uuid` | `FK` $\rightarrow$ `insumos` |
| `lote` | `text` | `NOT NULL` |
| `cantidad_inicial` | `numeric` | `NOT NULL`, `CHECK` $\ge 0$ |
| `cantidad_actual` | `numeric` | `NOT NULL`, `CHECK` $\ge 0$ |
| `costo_unitario` | `numeric` | `NOT NULL`, `DEFAULT 0` |
| `proveedor_id` | `uuid` | `FK` $\rightarrow$ `sys_proveedores`, `NULL` |
| `fecha_ingreso` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| **`fecha_vencimiento`** | `date` | `NULL` (informativo, **no** bloquea) |
| `estado_calidad` | `text` | `CHECK` $\in$ `('aprobado', 'rechazado', 'cuarentena')` |
| `observaciones` | `text` | `NULL` |
| `UNIQUE` | `(insumo_id, lote)` | — |

#### `lotes_pt`

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| `codigo_pt` | `text` | `FK` $\rightarrow$ `productos_terminados` |
| **`lote_op`** | `text` | `NOT NULL` |
| **`lote_eo`** | `text` | `NULL` (hasta recibir de central) |
| `orden_id` | `uuid` | `FK` $\rightarrow$ `ordenes_semanales` |
| `carga_eo_id` | `uuid` | `FK` $\rightarrow$ `cargas_eo`, `NULL` (última carga) |
| `cantidad_inicial` | `numeric` | `NOT NULL`, `CHECK` $\ge 0$ |
| `cantidad_actual` | `numeric` | `NOT NULL`, `CHECK` $\ge 0$ |
| **`estado`** | `text` | `CHECK` $\in$ `('en_planta', 'en_central', 'en_reproceso', 'en_bodega', 'rechazado', 'despachado_total')` |
| `fecha_produccion` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `fecha_esterilizacion` | `timestamptz` | `NULL` |
| `fecha_vencimiento` | `date` | `NULL` |
| `UNIQUE` | `(codigo_pt, lote_op, lote_eo)` | — |

**Semántica de estados:**

| Estado | `lote_eo` | Significado |
| :--- | :--- | :--- |
| `en_planta` | `NULL` | Producido, pendiente de enviar a central (solo estériles) o directo a bodega (no estériles). |
| `en_central` | `NULL` | Enviado a central, pendiente de recepción. |
| `en_reproceso` | `NULL` | Rechazado por central, vuelve a planta para reprocesar. |
| `en_bodega` | `E1` o `NULL` | Recibido (estéril con EO) o directo (no estéril). **Despachable.** |
| `rechazado` | `NULL` | Rechazado definitivo (si se decide descartar). |
| `despachado_total` | `E1` | Despachado por completo. |

#### `movimientos` (unificada)

| Columna | Tipo | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | `PK` |
| `tipo` | `text` | `CHECK` $\in$ `('entrada', 'salida', 'consumo', 'ajuste', 'produccion_subproducto', 'produccion_pt', 'envio_central', 'recepcion_central', 'despacho', 'reproceso')` |
| `cantidad` | `numeric` | `NOT NULL`, `CHECK` $> 0$ |
| `costo_unitario_momento` | `numeric` | `NOT NULL`, `DEFAULT 0` |
| **`insumo_lote_id`** | `uuid` | `FK` $\rightarrow$ `insumo_lotes`, `NULL` |
| **`subproducto_produccion_id`** | `uuid` | `FK` $\rightarrow$ `subproducto_producciones`, `NULL` |
| **`lote_pt_id`** | `uuid` | `FK` $\rightarrow$ `lotes_pt`, `NULL` |
| `orden_id` | `uuid` | `FK` $\rightarrow$ `ordenes_semanales`, `NULL` |
| `carga_eo_id` | `uuid` | `FK` $\rightarrow$ `cargas_eo`, `NULL` |
| `despacho_id` | `uuid` | `FK` $\rightarrow$ `despachos`, `NULL` |
| `documento_tipo` | `text` | `NULL` |
| `documento_numero` | `text` | `NULL` |
| `usuario_email` | `text` | `NULL` |
| `observaciones` | `text` | `NULL` |
| `fecha` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**`CHECK`:** **exactamente uno** de `{insumo_lote_id, subproducto_produccion_id, lote_pt_id}` es `NOT NULL`.

### 1.6 Calidad y documentos

* `evaluaciones_proveedores`
* `devoluciones_pt`: `(codigo_pt, cantidad, estado_producto, motivo, usuario_email, fecha)`
* `despachos`: `(codigo_pt, cantidad, lote_op, lote_eo, cliente, fecha, usuario_email)`
* `cajas_ubicacion`
* `etiquetas_impresas`
* `backup_log`
* `profiles`
* `sys_config`

## 2. Reglas de negocio

### 2.1 FIFO

* **RN-FIFO-001.** Consumo de insumo con `requiere_lote = true` $\rightarrow$ lote con `fecha_ingreso` más antigua y `cantidad_actual > 0`. Si no alcanza, múltiples lotes en orden FIFO.
* **RN-FIFO-002.** `requiere_lote = false` $\rightarrow$ consumo directo del stock. Movimiento con `insumo_lote_id = NULL`.
* **RN-FIFO-003.** Consumo de subproducto pre-producido $\rightarrow$ FIFO por `subproducto_producciones.fecha_produccion`.
* **RN-FIFO-004.** Solo FIFO. Sin FEFO.
* **RN-FIFO-005.** `fecha_vencimiento` es informativo. **No bloquea consumo** (`Q-J`).

### 2.2 Trazabilidad

* **RN-TRZ-001.** Todo movimiento de consumo tiene un lote (insumo), una producción (subproducto) o un lote PT (entrada a bodega).
* **RN-TRZ-002.** *Forward* ($\text{PT} \rightarrow \text{insumos}$): `lotes_pt (codigo_pt, lote_op, lote_eo)` $\rightarrow$ `movimientos` de la OP $\rightarrow$ `insumo_lotes` y `subproducto_producciones` con recursión a sus insumos.
* **RN-TRZ-003.** *Backward* ($\text{insumo lote} \rightarrow \text{PTs}$): `insumo_lotes` $\rightarrow$ `movimientos` de consumo $\rightarrow$ `orden_id` $\rightarrow$ `lotes_pt` con el mismo `orden_id`.
* **RN-TRZ-004.** Subproductos sin lote. Su trazabilidad usa `subproducto_producciones` y propaga a sus insumos.

### 2.3 Esterilización

* **RN-EO-001.** Solo PT con `requiere_esterilizacion = true` se envían a central. Los no estériles pasan de `en_planta` directo a `en_bodega` (con `lote_eo = NULL`).
* **RN-EO-002.** Una carga agrupa ítems ($\text{OP} + \text{cantidad}$). Una OP puede estar en varias cargas; una carga puede tener varias OPs.
* **RN-EO-003.** Al crear carga: `en_planta` $\rightarrow$ `en_central`.
* **RN-EO-004.** Al recibir carga: `en_central` $\rightarrow$ `en_bodega` con `lote_eo` asignado; rechazos $\rightarrow$ `en_reproceso`.
* **RN-EO-005.** Un PT estéril con `lote_eo = NULL` no puede despacharse.
* **RN-EO-006.** `numero_carga` puede repetirse entre PTs (`Q-K`). Unicidad solo implícita por `cargas_eo.id`.
* **RN-EO-007.** Reproceso: unidades `en_reproceso` con `lote_eo = NULL` vuelven al flujo de central en una nueva carga. La `cantidad_rechazada` queda registrada en la carga original (histórico).

### 2.4 Producción de subproducto

* **RN-SUB-001.** Producir consume insumos (FIFO) y subproductos hijos (FIFO). Crea `subproducto_producciones` con `orden_id = NULL` (*standalone*) o `orden_id = OP`.
* **RN-SUB-002.** Consumir subproducto en una OP reduce `subproducto_producciones.cantidad_actual` (FIFO) y registra movimiento con `subproducto_produccion_id`.
* **RN-SUB-003.** Auto-producción al vuelo: la OP produce internamente y consume en el mismo acto. `orden_id = OP` y `cantidad_actual = 0`.

## 3. Flujos

### 3.1 Ciclo completo estéril (con rechazo y reproceso)

```text
[Producción de subproductos] (opcional)
  └── subproducto_producciones (orden_id = NULL)

[OP]
  ├── Cargar orden -> Cobertura -> Confirmar
  ├── Entregar (parcial o total)
  ├── Consume insumos (FIFO) + subproductos (FIFO)
  └── lotes_pt (lote_op = L1, lote_eo = NULL, estado = en_planta)

[Envío a central]
  ├── cargas_eo (numero_carga = E1, fecha_envio)
  ├── carga_eo_items (orden, cantidad)
  └── lotes_pt: (en_planta) -> (en_central)

[Recepción de central]
  ├── Marcar cargas_eo.estado = 'recibida' o 'rechazada_parcial'
  ├── carga_eo_items: cantidad_recibida, cantidad_rechazada, motivo
  └── lotes_pt:
        ├── recibidas:  (en_central) -> (en_bodega, lote_eo = E1)
        └── rechazadas: (en_central) -> (en_reproceso, lote_eo = NULL)

[Reproceso]
  └── lotes_pt (en_reproceso) vuelve a [Envío a central] con nueva carga E2.
      Las rechazadas quedan en el histórico de E1.

[Despacho]
  ├── PT + lote_op = L1 + lote_eo = E1 + cantidad
  └── lotes_pt: (en_bodega) -> (despachado_total) o cantidad reducida
```

### 3.2 Ciclo completo no estéril

```text
[OP] -> Cargar -> Confirmar -> Entregar
  ├── Consume insumos + subproductos
  └── lotes_pt (lote_op = L1, lote_eo = NULL, estado = en_bodega)
      (la entrega directa pasa a en_bodega)

[Despacho]
  └── PT + lote_op (sin lote_eo) + cantidad
```

## 4. Matriz de visibilidad de estados por módulo

| Estado | Dashboard | Bodega PT | Despacho | Trazabilidad |
| :--- | :---: | :---: | :---: | :---: |
| `en_planta` | $\checkmark$ | — | — | $\checkmark$ |
| `en_central` | $\checkmark$ | — | — | $\checkmark$ |
| `en_reproceso` | $\checkmark$ (alerta) | — | — | $\checkmark$ |
| `en_bodega` | $\checkmark$ | $\checkmark$ | $\checkmark$ | $\checkmark$ |
| `rechazado` | — | — | — | $\checkmark$ |
| `despachado_total` | — | — | — | $\checkmark$ |

## 5. Riesgos aceptados

* **R-002.** Subproductos sin lote INVIMA. `subproducto_producciones` actúa como *tracking* interno. *Aceptado con Q-A.*
* **R-003.** Si un lote OP se envía a central en varias cargas y solo algunas se reciben, las rechazadas quedan en `en_reproceso` con `lote_eo = NULL`. Al reenviarse pueden obtener un Lote EO distinto al de las unidades ya aprobadas. *Aceptado con Q-I.*
* ~~R-001. FEFO~~ $\rightarrow$ **Cerrado:** nunca se vence nada en Proclides.

## 6. Preguntas abiertas

Ninguna. Modelo aprobado.