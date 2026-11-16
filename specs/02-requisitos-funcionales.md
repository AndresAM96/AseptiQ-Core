---
id: 02-requisitos-funcionales
status: draft
version: 0.1
last_updated: 2026-11-15
depends_on: [00-vision, 01-actores-y-casos-de-uso, 03-modelo-de-dominio]
---

# Requisitos funcionales

## Módulo 1: Configuración

### RF-CFG-001 — Configurar parámetros globales

**Requisito:**
> El Admin debe poder configurar parámetros globales del sistema: prefijos de códigos, umbrales de stock, comportamiento del sidebar y tema visual. Los cambios se persisten en `sys_config` (Supabase) y se aplican a todos los dispositivos en el próximo render.

**Reglas:**
* Prefijos: `prefijo_insumo`, `prefijo_subproducto`, `prefijo_pt`, `prefijo_op`.
* Umbrales: `umbral_urgente` (%) y `umbral_reorden` (%) del punto de reorden:
  * `umbral_urgente < umbral_reorden`.
  * Ambos valores deben estar entre `1` y `99`.
* Comportamiento sidebar: `click` | `hover`.
* Tema visual: `dark` | `light`.
* La configuración se cachea en memoria y se invalida al guardar.

**Criterios de aceptación:**
* **CA-001.** Dado que el Admin cambia `umbral_urgente` de 30 a 20, cuando guarda, entonces el estado de los insumos se recalcula con el nuevo umbral sin recargar la página.
* **CA-002.** Dado un `umbral_urgente` = 60 y `umbral_reorden` = 40, cuando el Admin intenta guardar, entonces el sistema muestra error `"El umbral de urgente debe ser menor que el de reorden"` y no persiste.
* **CA-003.** Dado el Operador o Consulta, cuando intenta abrir Configuración, entonces los paneles de prefijos y umbrales están deshabilitados (solo lectura).

---

### RF-CFG-002 — Gestionar unidades de medida

**Requisito:**
> El Admin debe poder agregar, renombrar y eliminar unidades del catálogo global. Las unidades se usan en la cadena de conversiones de insumos.

**Reglas:**
* Seed inicial: `['u', 'm', 'kg', 'l', 'caja', 'rollo', 'm²']`.
* Nombre no vacío y no duplicado.
* Eliminar una unidad no afecta a los insumos ya creados con ella (solo la quita del catálogo).

**Criterios de aceptación:**
* **CA-001.** Dado un catálogo con `['u', 'm']`, cuando el Admin agrega `'caja'`, entonces `'caja'` aparece en los selects de la cadena de conversiones.
* **CA-002.** Dado un catálogo con `['u', 'm']`, cuando el Admin intenta agregar `'u'`, entonces el sistema rechaza con `"Esa unidad ya existe"`.
* **CA-003.** Dado un catálogo con `['u', 'm', 'caja']`, cuando el Admin elimina `'caja'`, entonces `'caja'` desaparece del catálogo pero los insumos ya creados mantienen `'caja'` en su cadena.

---

### RF-CFG-003 — Gestionar categorías de ítems

**Requisito:**
> El Admin debe poder agregar, renombrar y eliminar categorías para cada tipo de ítem (insumo, subproducto, producto terminado). Cada ítem del catálogo se asocia a una categoría (opcional, puede quedar sin categoría).

**Reglas:**
* Seed inicial por `item_tipo`:
  * `insumo`: Papelería, Materia prima, Otros insumos.
  * `subproducto`: Producto en proceso.
  * `producto_terminado`: Producto terminado.
* `nombre` único por `item_tipo`.
* Eliminar una categoría deja a los ítems asociados en `categoria_id = NULL`.

**Criterios de aceptación:**
* **CA-001.** Dado un catálogo de insumos con "Papelería" y "Materia prima", cuando el Admin agrega "Otros insumos", entonces aparece en el select de categorías del formulario de insumo.
* **CA-002.** Dado un catálogo con la categoría "Papelería" asociada a 3 insumos, cuando el Admin la elimina, entonces los 3 insumos quedan con `categoria_id = NULL` y siguen existiendo.
* **CA-003.** Dado un Admin, cuando intenta crear una categoría "Papelería" para subproductos (ya existe para insumos), entonces el sistema permite crearla (unicidad por `item_tipo`, no global).

---

### RF-CFG-004 — Gestionar datos de etiquetas

**Requisito:**
> El Admin debe poder configurar los datos que aparecen en las etiquetas de PT: empresas (razón social, NIT, dirección, teléfonos, correos, web), registros INVIMA (nombre + número), medidas de etiquetas (pequeña, mediana, grande) y logos (subidos a Supabase Storage, bucket `logos`).

**Reglas:**
* Los logos se suben a Storage; no se guardan como Base64 en `sys_config`.
* Una vez subido, el logo queda disponible para todas las etiquetas.
* Los registros INVIMA son seleccionables desde el formulario de PT.
* Medidas por defecto: pequeña ($50 \times 25\text{ mm}$), mediana ($80 \times 44\text{ mm}$), grande ($150 \times 100\text{ mm}$).

**Criterios de aceptación:**
* **CA-001.** Dado un Admin que sube un PNG de 500 KB como logo Proclides, cuando guarda, entonces el logo se sube a `logos/proclides.png` y `sys_config.etiquetas.logos.proclides` contiene la URL pública.
* **CA-002.** Dado un Admin que intenta subir un archivo de 3 MB, entonces el sistema rechaza con `"El archivo supera 2 MB"`.
* **CA-003.** Dado un registro INVIMA `"Paquetes 2026DM-0032255"`, cuando se crea un PT que lo selecciona, entonces la etiqueta impresa muestra `"INVIMA: 2026DM-0032255"`.

---

## Módulo 2: Insumos

### RF-INS-001 — Crear insumo con cadena de conversiones

**Requisito:**
> El Operador debe poder crear un insumo definiendo su cadena de conversiones (unidad de compra $\rightarrow$ unidad de consumo), costo, punto de reorden y flags de trazabilidad.

**Reglas:**
* Código: `INS-` + 4 dígitos (`0001`–`9999`). Sugerido automáticamente, editable. Validación en vivo de unicidad.
* Nombre obligatorio.
* Cadena de conversiones: mínimo 1 nivel, máximo 5. Primer nivel = compra, último = consumo.
* Tipos de conversión: `fijo` (factor numérico), `dimensional` ($\text{ancho} \times \text{largo}$ en metros), `variable` (rendimiento declarado al recibir).
* `punto_reorden > 0` obligatorio.
* `requiere_lote` default `true`; `requiere_vencimiento` default `false`; si `requiere_vencimiento = true`, fuerza `requiere_lote = true`.
* `existencia_actual` inicial = `0`. El stock se registra vía **Entrada mercancía** (no se edita directamente).
* `costo_unitario >= 0` obligatorio.

**Criterios de aceptación:**
* **CA-001.** Dado un catálogo vacío, cuando el Operador crea un insumo sin ingresar código, entonces el sistema sugiere `INS-0001` y lo persiste.
* **CA-002.** Dado un insumo `INS-0042`, cuando el Operador intenta crear otro con `INS-0042`, entonces el sistema rechaza con `"Ya existe un insumo con ese código"`.
* **CA-003.** Dado un insumo con cadena `[caja ×12 → u]`, cuando el Operador recibe 5 cajas en Entrada mercancía, entonces se suman `60 u` a `existencia_actual`.
* **CA-004.** Dado un insumo con `requiere_vencimiento = true`, cuando el Operador intenta guardar sin `requiere_lote = true`, entonces el sistema lo fuerza a `true` automáticamente.

---

### RF-INS-002 — Desactivar/activar insumo (soft delete)

**Requisito:**
> El Operador debe poder desactivar un insumo sin borrar sus datos ni su historial. El insumo se oculta de los selectores de recetas y entradas, pero sigue visible con badge `"Inactivo"` en el listado.

**Reglas:**
* Desactivar: `estado_activo = false`. No se puede usar en nuevas recetas ni entradas.
* Reactivar: `estado_activo = true`.
* El listado tiene checkbox `"Mostrar inactivos"` (default apagado).
* No se permite eliminar definitivamente un insumo con movimientos o recetas (el sistema bloquea con error descriptivo).

**Criterios de aceptación:**
* **CA-001.** Dado un insumo activo, cuando el Operador lo desactiva, entonces desaparece de los selects de recetas y entradas, pero sigue en el listado al activar `"Mostrar inactivos"`.
* **CA-002.** Dado un insumo con 5 movimientos, cuando el Operador intenta eliminarlo, entonces el sistema rechaza con `"Tiene 5 movimientos. Desactívalo en lugar de borrarlo"`.
* **CA-003.** Dado un insumo inactivo, cuando el Operador lo reactiva, entonces vuelve a aparecer en los selects de recetas.

---

### RF-INS-003 — Ajustar costo unitario con auditoría

**Requisito:**
> El Operador debe poder ajustar manualmente el costo unitario de un insumo (por corrección de digitación o cambio de proveedor). El cambio queda registrado en `ajustes_costo_insumo` con usuario, fecha y motivo.

**Reglas:**
* Click en el costo del listado $\rightarrow$ modal de dos pasos: nuevo costo $\rightarrow$ motivo.
* Motivo opcional pero recomendado.
* El ajuste registra `costo_anterior`, `costo_nuevo`, `usuario_email`, `fecha`.
* El costo afecta inmediatamente a todos los cálculos de costo de subproductos y PT que usan ese insumo.

**Criterios de aceptación:**
* **CA-001.** Dado un insumo con costo $\$1.000$, cuando el Operador lo ajusta a $\$1.200$ con motivo `"cambio de proveedor"`, entonces el listado muestra $\$1.200$ y aparece el registro en Auditoría.
* **CA-002.** Dado un insumo con costo $\$1.000$, cuando el Operador ajusta a $-\$500$, entonces el sistema rechaza con `"El costo no puede ser negativo"`.
* **CA-003.** Dado un PT que usa el insumo en su receta, cuando el Operador ajusta el costo del insumo, entonces el costo calculado del PT se recalcula en el próximo render.

---

### RF-INS-004 — Consultar detalle de insumo con lotes

**Requisito:**
> El Operador debe poder ver la ficha técnica del insumo: identificación, cadena, inventario, costo, y la lista de lotes recibidos con cantidad actual, proveedor, fecha de ingreso y fecha de vencimiento (si aplica).

**Reglas:**
* Modal de solo lectura con botón `"Editar"`.
* Lista de lotes ordenada por `fecha_ingreso DESC`.
* Muestra solo lotes con `cantidad_actual > 0` (los agotados se ocultan pero quedan en el histórico de trazabilidad).
* Si el insumo no maneja lote (`requiere_lote = false`), la sección de lotes no aparece.

**Criterios de aceptación:**
* **CA-001.** Dado un insumo con 3 lotes activos, cuando el Operador abre el detalle, entonces ve los 3 lotes con cantidad, proveedor y fechas.
* **CA-002.** Dado un insumo con `requiere_lote = false`, cuando el Operador abre el detalle, entonces la sección `"Lotes recibidos"` no aparece.
* **CA-003.** Dado un insumo con lote vencido pero con stock, cuando el Operador abre el detalle, entonces el lote aparece con badge de advertencia `"Vencido"` pero el insumo sigue siendo consumible (`RN-FIFO-005`).

---

## Módulo 3: Productos & BOM

### RF-PRD-001 — Crear/editar subproducto con receta e hijos

**Requisito:**
> El Operador debe poder crear un subproducto definiendo su tipo (`intermedio`/`final`/`ambos`), su receta de insumos y sus subproductos hijos (jerarquía anidada).

**Reglas:**
* Código: `SUB-` + 4 dígitos. Sugerido, editable, único.
* Nombre obligatorio.
* Tipo: `intermedio` (usable en otros subproductos), `final` (solo en paquetes), `ambos`.
* Receta: filas dinámicas `[insumo, cantidad, factor_receta?]`. `factor_receta` default `1`.
* Subproductos hijos: filas dinámicas `[subproducto_hijo, cantidad]`. Solo tipos `intermedio` o `ambos`.
* Detección de ciclos: no puede ser hijo de sí mismo transitivamente.
* Crear insumo inline desde el modal: apila un nuevo modal sin perder el subproducto en edición.

**Criterios de aceptación:**
* **CA-001.** Dado un subproducto A con hijo B, cuando el Operador intenta hacer a B hijo de A (ciclo), entonces el sistema rechaza con `"Ciclo detectado: el subproducto se contiene a sí mismo transitivamente"`.
* **CA-002.** Dado un subproducto con receta `[tela ×0.5 m, hilo ×2 u]`, cuando el sistema calcula su costo y la tela vale $\$2.000/\text{m}$ y el hilo $\$500/\text{u}$, entonces el costo es $\$2.000$ ($\$1.000 + \$1.000$).
* **CA-003.** Dado un subproducto en edición, cuando el Operador crea un insumo inline, entonces el nuevo insumo queda seleccionado en la receta sin cerrar el modal de subproducto.

---

### RF-PRD-002 — Crear/editar paquete (PT) con BOM

**Requisito:**
> El Operador debe poder crear un PT definiendo su nombre, unidades por caja, precio de venta, composición (subproductos + insumos directos), plantilla de etiqueta, vida útil y registro INVIMA.

**Reglas:**
* Código: `PT-` + 4 dígitos. Sugerido, editable, único.
* `unidades_por_caja >= 1`.
* `precio_venta >= 0` u opcional.
* Composición: subproductos (cantidad por unidad individual) + insumos directos (cantidad por unidad individual, **no** por caja).
* `plantilla_etiqueta` $\in$ `{esteril_proclides, esteril_allmed, noesteril_allmed, noesteril_proclides_grande, noesteril_proclides_mediana}`.
* `vida_util_meses` default `35`.
* `registro_invima` seleccionable de los configurados en Configuración.
* `codigo_barras` opcional (código del cliente).
* `requiere_esterilizacion`: `true` para estériles, `false` para no estériles.
* Crear subproducto o insumo inline: apila modal.

**Criterios de aceptación:**
* **CA-001.** Dado un PT con `unidades_por_caja = 100` y receta `[bolsa ×1]`, cuando el sistema calcula el costo por caja, entonces es $\text{costo\_unitario} \times 100$.
* **CA-002.** Dado un PT estéril con `requiere_esterilizacion = true`, cuando el Operador intenta despacharlo sin Lote EO, entonces el sistema rechaza (`RN-EO-005`).
* **CA-003.** Dado un PT con `codigo_barras = "7707333721666"`, cuando se imprime la etiqueta, entonces aparece el código de barras generado con JsBarcode.

---

### RF-PRD-003 — Desactivar/activar subproducto o PT

**Requisito:**
> El Operador debe poder desactivar subproductos y PT sin borrar sus datos. Igual que insumos (*soft delete* con checkbox `"Mostrar inactivos"`).

**Reglas:**
* Desactivar: `estado_activo = false`. No se puede usar en nuevas recetas ni OPs.
* Reactivar: `estado_activo = true`.
* No se permite eliminar definitivamente si tiene OPs asociadas o está en recetas.

**Criterios de aceptación:**
* **CA-001.** Dado un PT con 3 OPs, cuando el Operador intenta eliminarlo, entonces el sistema rechaza con `"Tiene OPs asociadas. Desactívalo en lugar de borrarlo"`.
* **CA-002.** Dado un subproducto inactivo, cuando el Operador crea un PT, entonces el subproducto no aparece en el select de composición.

---

## Módulo 4: Proveedores

### RF-PRO-001 — Crear/editar proveedor

**Requisito:**
> El Operador debe poder crear un proveedor con NIT, razón social, dirección y contactos múltiples.

**Reglas:**
* NIT único. Formato libre (validar longitud `5`–`20`).
* Razón social obligatoria.
* Contactos: filas dinámicas `[nombre, teléfono, correo]`.
* Validación de unicidad de NIT antes de guardar.

**Criterios de aceptación:**
* **CA-001.** Dado un proveedor con NIT `900123456-1`, cuando el Operador intenta crear otro con el mismo NIT, entonces el sistema rechaza con `"Ya existe un proveedor con ese NIT"`.
* **CA-002.** Dado un proveedor sin contactos, cuando se guarda, entonces `contactos = []` y el sistema permite guardar.
* **CA-003.** Dado un proveedor con 2 contactos, cuando el Operador edita y elimina uno, entonces el proveedor queda con 1 contacto.

---

## Módulo 5: Producción de subproducto

### RF-SUB-001 — Producir subproducto standalone (pre-producción)

**Requisito:**
> El Operador debe poder producir un subproducto sin OP asociada, consumiendo sus insumos (FIFO) y subproductos hijos (FIFO), generando un registro en `subproducto_producciones` con `orden_id = NULL` que queda en stock.

**Reglas:**
* Selección de subproducto + cantidad + lote interno (opcional) + motivo (opcional).
* Validación previa de stock de insumos e hijos. Si falta, error con lista de faltantes.
* Consumo FIFO de insumos (respeta `requiere_lote`).
* Consumo FIFO de subproductos hijos (por `fecha_produccion`).
* Crea `subproducto_producciones` con `cantidad_inicial = cantidad_actual = cantidad` y `orden_id = NULL`.
* Registra movimientos `produccion_subproducto` para el subproducto, `consumo` para cada insumo/hijo.
* El lote se asigna al consumirse (`P4`: subproducto no tiene lote propio).

**Criterios de aceptación:**
* **CA-001.** Dado un subproducto con receta `[tela ×2 m]` y stock de `10 m` de tela en 2 lotes (`6 m` + `4 m`), cuando el Operador produce `3 u`, entonces consume `6 m` del lote más viejo y `0` del segundo (FIFO), y crea 1 producción con `cantidad_actual = 3`.
* **CA-002.** Dado un subproducto con receta `[tela ×2 m]` pero stock de `5 m` de tela, cuando el Operador intenta producir `3 u` (requiere `6 m`), entonces el sistema rechaza con `"Stock insuficiente: tela (requerido 6 m, disponible 5 m)"` y no muta el estado.
* **CA-003.** Dado un subproducto con producción standalone de `10 u`, cuando otra OP consume `4 u`, entonces la producción pasa a `cantidad_actual = 6` y el movimiento se registra con `subproducto_produccion_id`.

---

### RF-SUB-002 — Consumir subproducto desde OP (auto-producción al vuelo)

**Requisito:**
> Cuando una OP necesita un subproducto y no hay stock suficiente, el sistema debe auto-producirlo en el mismo acto (consumiendo insumos FIFO) y consumirlo inmediatamente, sin dejar stock residual.

**Reglas:**
* Si `stock_subproducto >= requerido`: consumo normal FIFO de `subproducto_producciones`.
* Si `stock_subproducto < requerido`: consumir lo disponible, auto-producir el faltante (`orden_id = OP`), consumir todo.
* La `subproducto_producciones` auto-producida queda con `cantidad_actual = 0` (consumida al 100%).
* Detección de ciclos (profundidad máx `20`).

**Criterios de aceptación:**
* **CA-001.** Dado un subproducto sin stock pero con insumos suficientes, cuando una OP lo requiere, entonces se auto-produce y se consume en el mismo acto, sin error.
* **CA-002.** Dado un subproducto con stock de `5 u` y una OP que requiere `8 u`, entonces se consumen `5` del stock y se auto-producen `3` más (con `orden_id = OP`).
* **CA-003.** Dado un ciclo de subproductos (`A → B → A`), cuando una OP intenta consumir, entonces el sistema rechaza con `"Ciclo detectado"` y no muta el estado.

---

## Módulo 6: Cargar orden

### RF-ORD-001 — Crear nueva OP

**Requisito:**
> El Operador debe poder crear una OP con número único, lote único, producto terminado, cantidad, prioridad, fecha programada y fecha de fin programada.

**Reglas:**
* `numero_op`: obligatorio, único, formato `OP-` + 3+ dígitos. Sugerido automáticamente, editable. Validación en vivo.
* `lote`: obligatorio, único (RN: un lote = una OP). Formato libre, ej: `L-2026-014`.
* Producto terminado: seleccionable del catálogo activo.
* Cantidad: `> 0`.
* Prioridad: `1` = Muy alta, `2` = Alta, `3` = Normal (default), `4` = Baja.
* `fecha_programada`: obligatoria si se calcula cobertura.
* `fecha_fin_programada`: opcional, `>= fecha_programada`.
* Preview en vivo de `"≈ N cajas"` según `unidades_por_caja` del PT.

**Criterios de aceptación:**
* **CA-001.** Dado un catálogo con `OP-001`, cuando el Operador crea una nueva OP sin ingresar número, entonces el sistema sugiere `OP-002`.
* **CA-002.** Dado un lote `L-2026-014` ya usado, cuando el Operador intenta crear otra OP con el mismo lote, entonces el sistema rechaza con `"Ya existe una OP con ese lote"`.
* **CA-003.** Dado un PT con `unidades_por_caja = 100`, cuando el Operador ingresa cantidad `250`, entonces el preview muestra `"≈ 3 cajas"`.

---

### RF-ORD-002 — Calcular cobertura de OP

**Requisito:**
> Antes de confirmar la OP, el sistema debe calcular la cobertura: qué insumos y subproductos se necesitan y si hay stock suficiente. Se muestran gráficos y tablas de análisis logístico.

**Reglas:**
* Simulación recursiva: explota BOM del PT, consume stock virtual de subproductos, explota insumos con `factor_receta`.
* Estado general: `Cubierto` | `Reorden` | `Urgente`.
* Se muestran 3 gráficos (cobertura %, top consumo, faltantes).
* Si hay faltantes, se permite confirmar la OP de todas formas (queda en estado `Pendiente` con cobertura `Urgente`).
* La simulación es de solo lectura (no muta stock).

**Criterios de aceptación:**
* **CA-001.** Dado un PT con BOM `[tela ×2 m]` y stock de `5 m`, cuando el Operador calcula cobertura para `3 u` (requiere `6 m`), entonces el estado es `Urgente` y muestra faltante de `1 m`.
* **CA-002.** Dado un subproducto sin stock pero con insumos suficientes, cuando el Operador calcula cobertura, entonces el subproducto **no** marca `Urgente` (se auto-produce).
* **CA-003.** Dado un PT con stock de insumos al 80% del punto de reorden, cuando se calcula cobertura, entonces el estado general es `Reorden` (no `Urgente`).

---

### RF-ORD-003 — Confirmar OP

**Requisito:**
> El Operador debe poder confirmar la OP desde el modal de cobertura. La OP se crea en estado `Pendiente` con snapshot de cobertura en `detalle_faltantes`.

**Reglas:**
* Confirmar requiere: número de OP válido, lote válido (si se llenó), fecha de inicio.
* La OP se inserta con `estado_op = 'Pendiente'`, `estado_cobertura` del cálculo, `detalle_faltantes` como snapshot.
* No se descuenta inventario al confirmar (el consumo ocurre al entregar).
* Se cierra el modal de cobertura y el de Nueva OP.
* La OP aparece en la lista de órdenes registradas.

**Criterios de aceptación:**
* **CA-001.** Dado un modal de cobertura con `Urgente` y 3 faltantes, cuando el Operador confirma, entonces la OP se crea en `Pendiente` con `estado_cobertura = 'Urgente'` y `detalle_faltantes` con los 3 ítems.
* **CA-002.** Dado un número de OP duplicado, cuando el Operador intenta confirmar, entonces el sistema rechaza con `"Ya existe una OP con ese número"` y no crea la OP.
* **CA-003.** Dado una OP confirmada, cuando el Operador abre Novedades, entonces la OP aparece en la lista de órdenes activas.

---

### RF-ORD-004 — Ver detalle de OP

**Requisito:**
> El Operador debe poder ver el detalle de una OP: KPIs de progreso (proyectado/entregado/pendiente), insumos proyectados, subproductos requeridos, historial completo de entregas y estado de esterilización.

**Reglas:**
* Modal de solo lectura con botón `"Imprimir OP"`.
* Cálculo en vivo de cobertura sobre lo pendiente (no persiste).
* Historial de entregas: fecha, cantidad, motivo, usuario.
* Estado de esterilización: `lotes_pt` asociados con estado (`en_planta`, `en_central`, `en_bodega`).
* Lotes EO asignados (si los hay).

**Criterios de aceptación:**
* **CA-001.** Dado una OP con 3 entregas parciales, cuando el Operador abre el detalle, entonces ve los KPIs de progreso correctos y las 3 entregas en el historial.
* **CA-002.** Dado una OP estéril con lotes en `en_central`, cuando el Operador abre el detalle, entonces ve el estado de la carga EO pendiente.
* **CA-003.** Dado una OP con `cantidad_producida = cantidad_proyectada`, cuando el Operador abre el detalle, entonces el estado es `"Terminada"` y no se permite nueva entrega.
- **CA-004.** Dado una entrega de OP, cuando se crea el lote PT, entonces la fecha_vencimiento se calcula automáticamente a 35 meses - 1 día desde la fecha de hoy.

---

### RF-ORD-005 — Cancelar OP

**Requisito:**
> El Operador debe poder cancelar una OP en estado `Pendiente` o `En proceso`. La cancelación no toca inventario pero bloquea nuevas entregas.

**Reglas:**
* Motivo opcional.
* Bloqueado si `estado_op` $\in$ `{Terminada, Cancelada}`.
* Cancela `lotes_pt` asociados en `en_planta` (pasan a `rechazado`).
* Si hay unidades `en_central` o `en_bodega`, la cancelación se rechaza (primero hay que resolver esas unidades).

**Criterios de aceptación:**
* **CA-001.** Dado una OP `Pendiente`, cuando el Operador la cancela con motivo `"cliente canceló"`, entonces el estado pasa a `Cancelada` y se registra `motivo_cancelacion`.
* **CA-002.** Dado una OP con unidades en `en_central`, cuando el Operador intenta cancelar, entonces el sistema rechaza con `"Hay unidades en esterilización. Resolvé la carga EO antes de cancelar"`.
* **CA-003.** Dado una OP `Terminada`, cuando el Operador intenta cancelar, entonces el sistema rechaza con `"No se puede cancelar una OP terminada"`.

---

## Módulo 7: Entregas de OP

### RF-ENT-001 — Registrar entrega parcial o total

**Requisito:**
> El Operador debe poder registrar una entrega parcial o total de la OP. La entrega consume insumos (FIFO) y subproductos (FIFO), y suma unidades a `lotes_pt`.

**Reglas:**
* Modal: cantidad (viene con pendiente completo), motivo (opcional).
* Validación: `cantidad > 0` y `cantidad <= pendiente`.
* Validación previa de stock (insumos + subproductos).
* Consumo FIFO de insumos y subproductos.
* Auto-producción al vuelo si falta subproducto.
* Crea `lotes_pt` con `lote_op = ordenes.lote`, estado = `en_planta` (estéril) o `en_bodega` (no estéril).
* Actualiza `ordenes.cantidad_producida` y `estado_op`:
  * `cantidad_producida < cantidad_proyectada` $\rightarrow$ `En proceso`.
  * `cantidad_producida >= cantidad_proyectada` $\rightarrow$ `Terminada`.
* Si el PT es no estéril, el lote va directo a `en_bodega` con `lote_eo = NULL`.
* Si el PT es estéril, el lote va a `en_planta` pendiente de envío a central.

**Criterios de aceptación:**
* **CA-001.** Dado una OP de `100 u` con `0` entregadas, cuando el Operador entrega `40`, entonces se consumen `40/100` de los insumos, se crea `lotes_pt` (`lote_op=L1`, `cantidad_actual=40`, `estado=en_planta`), y la OP pasa a `En proceso`.
* **CA-002.** Dado una OP de `100 u` con `40` entregadas, cuando el Operador entrega `60`, entonces se consumen los `60/100` restantes de insumos, se suma a `lotes_pt` (total `100`), y la OP pasa a `Terminada`.
* **CA-003.** Dado una OP no estéril de `50 u`, cuando el Operador entrega `50`, entonces `lotes_pt` se crea con `estado = en_bodega` y `lote_eo = NULL`.
* **CA-004.** Dado una OP con stock insuficiente de un insumo, cuando el Operador intenta entregar, entonces el sistema rechaza con `"Stock insuficiente para esta entrega: [detalle de faltantes]"` y no muta nada.

---

### RF-ENT-002 — Consultar historial de entregas

**Requisito:**
> El Operador debe poder ver el historial de entregas de una OP: fecha, cantidad, motivo, usuario. Aparece en el detalle de la OP.

**Reglas:**
* Solo lectura.
* Ordenado por `fecha ASC`.
* Incluye entregas parciales y la entrega final.

**Criterios de aceptación:**
* **CA-001.** Dado una OP con 3 entregas, cuando el Operador abre el detalle, entonces el historial muestra las 3 con fecha y usuario.

---

## Módulo 8: Envío a central

### RF-CEN-001 — Crear carga EO (envío a central)

**Requisito:**
> El Operador debe poder enviar unidades de PT estéril a la central de esterilización, agrupándolas en una carga EO con número, fecha de envío y lista de items (OP + cantidad).

**Reglas:**
* Solo PT con `requiere_esterilizacion = true` y `lotes_pt.estado = en_planta`.
* Una carga puede tener items de varias OPs; una OP puede estar en varias cargas.
* `numero_carga` obligatorio (asignado por central al enviar, o interno si se desconoce).
* Al crear: `lotes_pt.estado` pasa de `en_planta` a `en_central` para las cantidades enviadas.
* Se crea `cargas_eo` (estado `enviada`) + `carga_eo_items`.

**Criterios de aceptación:**
* **CA-001.** Dado 3 OPs con `20 u` cada una en `en_planta`, cuando el Operador crea una carga con las 3 (`60 u`), entonces las 3 pasan a `en_central` y la carga queda `enviada`.
* **CA-002.** Dado una OP con `20 u` en `en_planta` y `30 u` en `en_bodega`, cuando el Operador crea una carga, entonces solo puede enviar las `20 u` en `en_planta`.
* **CA-003.** Dado una carga ya creada, cuando el Operador intenta enviar las mismas unidades, entonces el sistema rechaza (no están en `en_planta`).

---

### RF-CEN-002 — Consultar historial de cargas EO

**Requisito:**
> El Operador debe poder ver el historial de cargas EO: número, fecha de envío, fecha de recepción, estado, items con cantidad enviada/recibida/rechazada.

**Reglas:**
* Listado con filtros: fecha, estado, número de carga.
* Drill-down a detalle de carga.
* Estado de la carga: `enviada` (pendiente), `recibida`, `rechazada_parcial`, `rechazada_total`.

**Criterios de aceptación:**
* **CA-001.** Dado 5 cargas, cuando el Operador abre el historial, entonces ve las 5 con estado y fechas.
* **CA-002.** Dado una carga con `60 u` enviadas y `55` recibidas, cuando el Operador abre el detalle, entonces ve `5 u` rechazadas con motivo.

---

## Módulo 9: Recepción desde central

### RF-REC-001 — Recibir carga EO (asignar Lote EO)

**Requisito:**
> El Operador debe poder recibir una carga EO de la central, asignando el Lote EO y registrando la cantidad recibida y rechazada por item.

**Reglas:**
* Carga en estado `enviada`.
* Para cada item: $\text{cantidad\_recibida} + \text{cantidad\_rechazada} = \text{cantidad\_enviada}$.
* `numero_carga` de la central (Lote EO) se asigna a todas las unidades recibidas.
* Al recibir:
  * Unidades recibidas $\rightarrow$ `lotes_pt` (`estado = en_bodega`, `lote_eo = E1`).
  * Unidades rechazadas $\rightarrow$ `lotes_pt` (`estado = en_reproceso`, `lote_eo = NULL`) con `carga_eo_id` de la carga original.
* Carga pasa a `recibida`, `rechazada_parcial` o `rechazada_total`.
* Se registran movimientos `recepcion_central`.

**Criterios de aceptación:**
* **CA-001.** Dado una carga con `60 u` enviadas, cuando el Operador recibe `55` y rechaza `5` con motivo, entonces `55` pasan a `en_bodega` con `lote_eo=E1` y `5` pasan a `en_reproceso` con `lote_eo=NULL`.
* **CA-002.** Dado una carga recibida con `numero_carga = E1`, cuando un PT tiene `requiere_esterilizacion = true`, entonces sus `lotes_pt` con `estado = en_bodega` tienen `lote_eo = E1` y son despachables.
* **CA-003.** Dado una carga rechazada en su totalidad (`0` recibidas, `60` rechazadas), entonces la carga queda `rechazada_total` y las `60` unidades en `en_reproceso`.

---

### RF-REC-002 — Reprocesar PT rechazado

**Requisito:**
> El Operador debe poder reenviar a central las unidades en estado `en_reproceso`, agrupándolas en una nueva carga EO.

**Reglas:**
* Solo PT con `estado = en_reproceso` y `lote_eo = NULL`.
* Se crea una nueva `cargas_eo` con nueva `numero_carga`.
* Las unidades pasan de `en_reproceso` a `en_central`.
* La carga original queda con su histórico de rechazos.

**Criterios de aceptación:**
* **CA-001.** Dado `5 u` en `en_reproceso` de la carga `E1`, cuando el Operador las reenvía en la carga `E2`, entonces pasan a `en_central` y `E1` mantiene el registro del rechazo.
* **CA-002.** Dado una OP con `5 u` en `en_reproceso` y `55` en `en_bodega`, cuando el Operador crea una carga de reproceso, entonces solo puede seleccionar las `5 u` en `en_reproceso`.

---

## Módulo 10: Entrada mercancía

### RF-ENT-001 — Registrar entrada de insumo (simple)

**Requisito:**
> El Operador debe poder registrar la entrada de un insumo desde un proveedor, indicando cantidad, costo, proveedor, lote y fecha de vencimiento (si aplica).

**Reglas:**
* Cantidad en unidad de compra (no de consumo).
* Si `requiere_lote = true`, el lote es obligatorio.
* Si `requiere_vencimiento = true`, la fecha de vencimiento es obligatoria.
* Estado de calidad: `Aprobado` (default) | `Rechazado` | `Cuarentena`.
* Solo `Aprobado` suma stock y lote.
* Costo: si se ingresa, recalcula costo promedio ponderado.
* Documentos: factura, OC, entrada almacén (opcionales).
* Se registran movimientos `entrada`.

**Criterios de aceptación:**
* **CA-001.** Dado un insumo con `requiere_lote = true`, cuando el Operador intenta guardar sin lote, entonces el sistema bloquea con `"El lote es obligatorio para este insumo"`.
* **CA-002.** Dado un insumo con costo $\$1.000$ y stock `10`, cuando el Operador registra `5` más con costo $\$1.200$, entonces el nuevo costo es $\frac{10 \times 1000 + 5 \times 1200}{15} = \$1.066,67$.
* **CA-003.** Dado una entrada con `estado_calidad = Rechazado`, cuando el Operador guarda, entonces se crea el movimiento pero el stock no aumenta.
* **CA-004.** Dado un insumo con `requiere_lote = false`, cuando el Operador guarda sin lote, entonces se crea el movimiento con `insumo_lote_id = NULL` (`RN-FIFO-002`).

---

### RF-ENT-002 — Registrar entrada multi-lote

**Requisito:**
> El Operador debe poder registrar una entrada de insumo dividida en múltiples lotes con cantidades individuales (típico en rollos de tela que vienen con lotes distintos).

**Reglas:**
* Filas dinámicas `[lote, cantidad]`.
* Todos los lotes deben tener número y `cantidad > 0`.
* Lotes duplicados en la misma entrada: error.
* Se crean $N$ movimientos de entrada, uno por lote.

**Criterios de aceptación:**
* **CA-001.** Dado el Operador que agrega 3 lotes `[A:10, B:5, C:8]`, cuando guarda, entonces se crean 3 `insumo_lotes` y 3 movimientos de entrada.
* **CA-002.** Dado el Operador que agrega lotes con el mismo número `A:10`, `A:5`, entonces el sistema rechaza con `"El lote A está duplicado"`.

---

## Módulo 11: Auditoría (salidas + ajustes + conteo físico)

### RF-AUD-001 — Registrar salida manual

**Requisito:**
> El Operador debe poder registrar una salida manual de insumo (merma, ajuste, uso interno) con motivo.

**Reglas:**
* Selección de insumo + cantidad (unidad de consumo) + motivo.
* Consumo FIFO (respeta `requiere_lote`).
* Valida stock suficiente.
* Registra movimiento `salida`.

**Criterios de aceptación:**
* **CA-001.** Dado un insumo con stock `10`, cuando el Operador registra salida de `3` con motivo `"merma"`, entonces el stock queda en `7` y se registra el movimiento.
* **CA-002.** Dado un insumo con stock `10`, cuando el Operador intenta salida de `15`, entonces el sistema rechaza con `"Stock insuficiente"`.

---

### RF-AUD-002 — Conteo físico con ajuste

**Requisito:**
> El Operador debe poder cargar las existencias de insumos y subproductos, ingresar el conteo físico, ver la diferencia en vivo, y aplicar ajustes.

**Reglas:**
* Listado con columnas: tipo, código, nombre, unidad, sistema, conteo físico, diferencia.
* Diferencia en vivo: $\text{conteo} - \text{sistema}$ (verde si positivo, rojo si negativo).
* `"Aplicar ajustes"` itera sobre las filas con $\text{diferencia} \neq 0$.
* Cada ajuste registra movimiento `ajuste` (positivo o negativo).
* Botón `"Imprimir formato"` genera formato en blanco para llenar a mano.

**Criterios de aceptación:**
* **CA-001.** Dado un insumo con sistema `10`, cuando el Operador ingresa conteo `12`, entonces la diferencia muestra `+2` en verde.
* **CA-002.** Dado un conteo con 3 diferencias, cuando el Operador aplica ajustes, entonces se registran 3 movimientos `ajuste` y el stock queda igual al conteo.
* **CA-003.** Dado un conteo con 1 fila sin ingresar, cuando el Operador aplica ajustes, entonces esa fila se ignora.

---

### RF-AUD-003 — Generar informes de movimientos

**Requisito:**
> El Operador debe poder generar informes de movimientos (insumos, subproductos, ajustes de costo) con filtros de fecha, tipo e insumo, y exportar a CSV o imprimir.

**Reglas:**
* Tipos de informe: Movimientos de insumos, Movimientos de subproductos, Ajustes de costo, Existencias (conteo físico).
* Filtros rápidos: `7d`, `30d`, `mes actual`, `mes anterior`, `limpiar`.
* Filtros: `desde`, `hasta`, `tipo`, `insumo`.
* Exportar CSV con separador `;` y BOM UTF-8.
* Imprimir informe con formato profesional.

**Criterios de aceptación:**
* **CA-001.** Dado 100 movimientos en los últimos 30 días, cuando el Operador genera informe, entonces se listan los 100 con paginación.
* **CA-002.** Dado un informe generado, cuando el Operador exporta CSV, entonces el archivo se descarga con tildes correctas.

---

## Módulo 12: Kardex

### RF-KAR-001 — Consultar kardex por insumo

**Requisito:**
> El Operador debe poder consultar el kardex de un insumo: historial cronológico de movimientos con saldo corrido.

**Reglas:**
* Selección de insumo + filtros de fecha + tipo.
* Saldo inicial reconstruido: $\text{existencia\_actual} - \sum \text{movimientos}$.
* Tabla: fecha, tipo, referencia, entrada, salida, saldo.
* KPIs: saldo antes del rango, entradas en rango, salidas en rango, saldo actual.
* Exportar CSV. Imprimir formato libro contable.

**Criterios de aceptación:**
* **CA-001.** Dado un insumo con 3 movimientos (entrada `10`, salida `3`, entrada `5`) y stock actual `12`, cuando el Operador consulta kardex, entonces el saldo inicial es `0`, y el saldo corrido es `10`, `7`, `12`.
* **CA-002.** Dado un kardex con filtro de fecha, cuando el Operador imprime, entonces el PDF muestra el rango y los KPIs correctos.

---

## Módulo 13: Despachos

### RF-DES-001 — Registrar despacho a cliente

**Requisito:**
> El Operador debe poder despachar PT a un cliente, indicando cliente, producto, cantidad, lote OP, lote EO (si aplica), consecutivo, OC, fecha, vencimiento y observaciones.

**Reglas:**
* Solo PT con `estado = en_bodega` y `lotes_pt.cantidad_actual > 0`.
* Si PT `requiere_esterilizacion = true`, el Lote EO es obligatorio.
* Valida stock suficiente en `lotes_pt`.
* Descuenta `cantidad_actual` del `lotes_pt` seleccionado.
* Registra movimiento `despacho` con `despacho_id`.
* Autocompletado de Lote OP: sugiere lotes ya entregados para ese PT.

**Criterios de aceptación:**
* **CA-001.** Dado un PT estéril con `lote_op = L1` y `lote_eo = E1`, cuando el Operador despacha `10 u`, entonces el `lotes_pt` correspondiente pasa a `cantidad_actual -= 10`.
* **CA-002.** Dado un PT estéril sin Lote EO, cuando el Operador intenta despachar, entonces el sistema rechaza con `"El PT es estéril y no tiene Lote EO asignado"`.
* **CA-003.** Dado un PT no estéril, cuando el Operador despacha sin Lote EO, entonces se permite (`lote_eo = NULL`).

---

### RF-DES-002 — Imprimir reporte de despachos del día

**Requisito:**
> El Operador debe poder imprimir el reporte de despachos de una fecha: tabla con item, código PT, FV, unidades, cajas, lote OP, lote EO, consecutivo, OC, cliente; firmas de Jefe de Logística y Conductor.

**Reglas:**
* Filtra despachos por fecha.
* $\text{Cajas} = \lfloor \frac{\text{cantidad}}{\text{unidades\_por\_caja}} \rfloor$.
* Firmas: 2 columnas.
* Formato horizontal (landscape).

**Criterios de aceptación:**
* **CA-001.** Dado 3 despachos del día, cuando el Operador imprime, entonces el PDF muestra los 3 con firmas.
* **CA-002.** Dado un día sin despachos, cuando el Operador intenta imprimir, entonces se muestra toast `"No hay despachos para la fecha de hoy"`.

---

## Módulo 14: Devoluciones

### RF-DEV-001 — Devolver insumo a proveedor

**Requisito:**
> El Operador debe poder devolver un insumo a un proveedor, indicando insumo, cantidad, proveedor, lote (opcional) y motivo.

**Reglas:**
* Valida stock suficiente.
* Si se especifica lote, valida que exista y tenga saldo.
* Si no se especifica lote, LIFO (último en entrar, primero en salir).
* Descuenta stock y `insumo_lotes.cantidad_actual`.
* Registra movimiento `salida` con `proveedor_id`.

**Criterios de aceptación:**
* **CA-001.** Dado un insumo con stock `10`, cuando el Operador devuelve `3`, entonces el stock queda en `7` y se registra el movimiento.
* **CA-002.** Dado un lote A con `3 u` y lote B con `5 u`, cuando el Operador devuelve `5` sin especificar lote, entonces se consume primero B (LIFO) y luego `2` de A.
* **CA-003.** Dado un lote A con `3 u`, cuando el Operador intenta devolver `5` con lote A, entonces el sistema rechaza con `"El lote A solo tiene 3 disponibles"`.

---

### RF-DEV-002 — Devolver PT de cliente

**Requisito:**
> El Operador debe poder registrar la devolución de un PT de un cliente, indicando producto, cantidad, estado (`bueno`/`cuarentena`/`dañado`) y motivo.

**Reglas:**
* Estado `bueno`: suma a `existencia_actual` del PT y crea/actualiza `lotes_pt` con `estado = en_bodega` (con `lote_eo` original si se especifica, o `NULL`).
* Estado `cuarentena`: registra pero **no** suma stock.
* Estado `dañado`: registra pero **no** suma stock.
* Motivo opcional.

**Criterios de aceptación:**
* **CA-001.** Dado un PT con stock `20`, cuando el Operador devuelve `5` como `"bueno"`, entonces el stock queda en `25`.
* **CA-002.** Dado un PT con stock `20`, cuando el Operador devuelve `5` como `"dañado"`, entonces el stock queda en `20` y se registra la devolución.

---

## Módulo 15: Trazabilidad

### RF-TRZ-001 — Trazabilidad forward (PT $\rightarrow$ insumos)

**Requisito:**
> El Operador debe poder ingresar un PT + `lote_op` + `lote_eo` (opcional) y ver el árbol completo de insumos consumidos y sus lotes, incluyendo subproductos recursivamente.

**Reglas:**
* Selección de PT + `lote_op` + `lote_eo` (si aplica) + cantidad (opcional, default = `cantidad_actual` del lote).
* Árbol expandible recursivo de subproductos.
* Chips de lote con cantidad consumida y proveedor.
* Trazabilidad estricta: usa `movimientos.orden_id` para encontrar consumos.
* Subproductos se expanden a sus `subproducto_producciones` y a los insumos de esas producciones.
* Nota visible: `"Trazabilidad estricta FIFO. Cada lote consumido está registrado en movimientos"`.

**Criterios de aceptación:**
* **CA-001.** Dado un PT lote `L1` con `lote_eo` `E1`, cuando el Operador traza, entonces ve los insumos con sus lotes exactos consumidos.
* **CA-002.** Dado un PT con subproducto S que se auto-produjo, cuando el Operador traza, entonces S aparece expandido con sus insumos y lotes.
* **CA-003.** Dado un PT con subproducto S pre-producido en otra OP, cuando el Operador traza, entonces S aparece con su `subproducto_producciones` y sus insumos originales.

---

### RF-TRZ-002 — Trazabilidad backward (insumo $\rightarrow$ PTs)

**Requisito:**
> El Operador debe poder ingresar un insumo + lote y ver todos los PTs (con sus lotes OP y EO) que lo contienen, directa o vía subproductos.

**Reglas:**
* Selección de insumo + lote.
* Bloques: PTs donde el insumo se usa directo, subproductos que lo usan, PTs vía subproductos.
* Cada PT muestra `lote_op` y `lote_eo` (si aplica).
* Usa movimientos de consumo con `insumo_lote_id` filtrado.

**Criterios de aceptación:**
* **CA-001.** Dado un insumo lote `A1` usado en 3 OPs, cuando el Operador traza, entonces ve los 3 PTs con sus lotes OP y EO.
* **CA-002.** Dado un insumo usado solo vía subproducto, cuando el Operador traza, entonces el PT aparece en el bloque `"vía subproductos"`.

---

## Módulo 16: Compras

### RF-COM-001 — Consultar compras por proveedor

**Requisito:**
> El Operador debe poder consultar las compras agrupadas por proveedor, con filtros de fecha y proveedor, KPIs y drill-down.

**Reglas:**
* Filtros: `desde`, `hasta`, `proveedor`.
* Rangos rápidos: `mes`, `mes anterior`, `90d`, `año`, `limpiar`.
* KPIs: total, entradas, proveedores, promedio por entrada.
* Panel de proveedor principal (top 1).
* Tabla resumen por proveedor: total comprado, entradas, insumos distintos, promedio, última compra.
* Drill-down: detalle de entradas por proveedor.
* Exportar CSV. Imprimir.

**Criterios de aceptación:**
* **CA-001.** Dado 2 proveedores con compras, cuando el Operador genera el reporte, entonces ve el total y el top 1.
* **CA-002.** Dado un proveedor con 3 entradas, cuando el Operador hace drill-down, entonces ve las 3 con fecha, insumo, cantidad, costo, total.

---

## Módulo 17: Mermas

### RF-MER-001 — Consultar mermas y ajustes

**Requisito:**
> El Operador debe poder consultar las pérdidas (salidas manuales + ajustes por conteo), agrupadas por motivo e insumo, con KPIs y drill-down.

**Reglas:**
* Filtros: `desde`, `hasta`, `insumo`.
* Clasificación automática de motivo: `"Ajuste por conteo físico"`, `"Merma"`, `"Uso interno"`, `"Vencimiento"`, `"Daño / deterioro"`, `"Error de digitación"`, `"Sin motivo"`.
* KPIs: pérdida total, movimientos, insumos afectados, motivo principal.
* Tabla por motivo. Tabla por insumo. Drill-down.
* Exportar CSV. Imprimir.

**Criterios de aceptación:**
* **CA-001.** Dado 5 movimientos de salida sin proveedor, cuando el Operador genera el reporte, entonces ve las 5 agrupadas por motivo.
* **CA-002.** Dado un insumo con 3 mermas, cuando el Operador hace drill-down, entonces ve las 3 con fecha, cantidad, costo, motivo.

---

## Módulo 18: Histórico

### RF-HIS-001 — Consultar gráficos históricos

**Requisito:**
> El Operador debe poder ver 4 gráficos históricos: órdenes por período, movimientos por tipo, consumo mensual top 5, top 10 insumos por valor.

**Reglas:**
* Órdenes por período: filtro `semana`/`mes`/`año` (default `mes`).
* Movimientos por tipo: filtro `semana`/`mes`/`año` (default `mes`).
* Doughnut con fallback si solo hay 1 categoría con datos.
* Consumo mensual top 5: líneas de 12 meses.
* Top 10 insumos por valor: barras horizontales.
* Resumen del período con KPIs.

**Criterios de aceptación:**
* **CA-001.** Dado un período con solo movimientos de Entrada, cuando el Operador abre el doughnut, entonces ve mensaje `"Solo hay movimientos de tipo Entrada (N)"` en vez del anillo.
* **CA-002.** Dado un cambio de filtro de semana a año, cuando el Operador lo cambia, entonces el gráfico se re-renderiza con los datos correctos.

---

## Módulo 19: Costos OP

### RF-COS-001 — Comparar costo teórico vs real por OP

**Requisito:**
> El Operador debe poder comparar el costo teórico ($\text{receta} \times \text{cantidad}$) vs. el costo real (movimientos de consumo) de una OP terminada, con desglose por insumo y variación.

**Reglas:**
* Lista de OPs terminadas con costo teórico y costo unitario teórico.
* Drill-down a comparativo con: KPIs (teórico, real, unitario teo/real, variación), gráfico de barras comparativo top 8, tabla de desglose por insumo con $\Delta$ cantidad, $\Delta$ costo y $\%$ variación.

**Criterios de aceptación:**
* **CA-001.** Dado una OP con costo teórico $\$100.000$ y real $\$105.000$, cuando el Operador compara, entonces ve variación $+\$5.000$ ($+5\%$).
* **CA-002.** Dado un insumo con cantidad teórica `10` y real `12`, cuando el Operador ve la tabla, entonces $\Delta\text{ cantidad} = +2$ en rojo.

---

## Módulo 20: Rentabilidad

### RF-REN-001 — Consultar rentabilidad por producto

**Requisito:**
> El Operador debe poder ver el margen bruto por PT (precio de venta vs. costo teórico) sobre las OPs terminadas.

**Reglas:**
* KPIs: PT con precio, ingresos, costo, margen.
* Gráfico de margen top 10.
* Tabla detallada por PT: precio, costo, margen u., margen %, unidades producidas, ingresos, margen total.
* Sección de PT sin precio (no participan del cálculo).
* Solo OPs terminadas.

**Criterios de aceptación:**
* **CA-001.** Dado un PT con precio $\$15.000$ y costo $\$10.000$, cuando se produce `100 u`, entonces el margen es $\$500.000$ ($33,3\%$).
* **CA-002.** Dado un PT sin precio de venta, cuando el Operador ve la tabla, entonces aparece en la sección `"Sin precio"` con margen `"—"`.

---

## Módulo 21: Consolidado MP (MRP)

### RF-CON-001 — Generar consolidado de materias primas

**Requisito:**
> El Operador debe poder calcular el requerimiento total de insumos para un rango de fechas, considerando las OPs programadas y descontando stock de subproductos.

**Reglas:**
* Filtros: `desde`, `hasta`. Rangos rápidos: `semana actual`, `próxima semana`.
* Considera OPs en `Pendiente` o `En proceso` con `fecha_programada` en el rango.
* Solo calcula sobre lo pendiente ($\text{cantidad\_proyectada} - \text{cantidad\_producida}$).
* Consume stock de subproductos antes de explotar insumos.
* Tabla: código, insumo, requerido, stock, a comprar, estado.
* Exportar CSV. Imprimir PDF.

**Criterios de aceptación:**
* **CA-001.** Dado 2 OPs que requieren `100 m` de tela y stock de `30 m`, entonces el consolidado muestra `"A comprar: 70 m"`.
* **CA-002.** Dado un subproducto con stock de `5 u` que cubre parte de la demanda, cuando se calcula, entonces el requerimiento de sus insumos se reduce proporcionalmente.

---

## Módulo 22: Programación

### RF-PRG-001 — Consultar programación semanal (Kanban)

**Requisito:**
> El Operador debe poder ver un tablero semanal (lunes a viernes) con las OPs asignadas a cada día, indicando si es inicio, continuación o fin.

**Reglas:**
* Filtros de fecha: `desde`, `hasta`. Rangos rápidos: `semana anterior`, `actual`, `siguiente`.
* Columnas por día hábil (5 columnas).
* Cada OP se muestra en los días entre `fecha_programada` y `fecha_fin_programada`.
* Tarea según día: `Hacer` (inicio y fin mismo día), `Iniciar` (primer día), `Terminar` (último día), `Continuar` (días intermedios).
* Tabla de entregas de la semana.
* Imprimir formato con firmas de Producción, Logística, Gerencia.

**Criterios de aceptación:**
* **CA-001.** Dado una OP del lunes al miércoles, cuando el Operador ve el Kanban, entonces aparece el lunes como `"Iniciar"`, martes como `"Continuar"`, miércoles como `"Terminar"`.
* **CA-002.** Dado una OP con `fecha_programada` nula, cuando el Operador ve el Kanban, entonces aparece en alerta `"OP sin fecha"`.

---

## Módulo 23: Evaluación Proveedores

### RF-EVA-001 — Evaluar proveedor (formato SGC)

**Requisito:**
> El Operador debe poder evaluar un proveedor usando el formato `CYC-GEF-FR-06` con 5 criterios (entrega, calidad, postventa, fumigación, precio) y observaciones.

**Reglas:**
* Criterios: notas de `0` a `5` con paso `0.1`.
* Promedio calculado automáticamente.
* Resultado: `Excelente` ($\ge 4.5$), `Bueno` ($\ge 3.9$), `Regular` ($\ge 3.0$), `No Confiable` ($< 3.0$).
* Sugerencia de calidad basada en tasa de devolución histórica.
* Imprimir formato oficial con firmas.

**Criterios de aceptación:**
* **CA-001.** Dado un proveedor con promedio `4.7`, entonces el resultado es `"Excelente"`.
* **CA-002.** Dado un proveedor con tasa de devolución $> 10\%$, entonces la sugerencia de calidad es `2.0`.
* **CA-003.** Dado un proveedor con evaluación formal, cuando el Operador imprime, entonces el PDF tiene el formato `CYC-GEF-FR-06`.

---

### RF-EVA-002 — Consultar métricas de proveedores

**Requisito:**
> El Operador debe poder ver métricas automáticas por proveedor: volumen comprado, tasa de devolución, última evaluación.

**Reglas:**
* Tabla con: proveedor, compras ($), tasa devolución, última evaluación, botón evaluar.
* $\text{Tasa de devolución} = \frac{\text{valor devuelto}}{\text{valor comprado}} \times 100$.
* Si tasa $> 5\%$, marcar en rojo.

**Criterios de aceptación:**
* **CA-001.** Dado un proveedor con $\$100.000$ comprados y $\$10.000$ devueltos, entonces la tasa es $10\%$ (en rojo).

---

## Módulo 24: Órdenes de Compra

### RF-ORD-001 — Consultar órdenes de compra

**Requisito:**
> El Operador debe poder consultar las OCs registradas en las entradas de mercancía, agrupadas por número de OC, con saldo pendiente y drill-down.

**Reglas:**
* Agrupa entradas por `numero_oc`.
* Por OC: proveedor, items, última fecha, saldo pendiente.
* Estado: `"Pendiente"` si $\text{saldo} > 0$, `"Cerrada"` si $\text{saldo} = 0$.
* Drill-down: historial de entregas de la OC con factura, insumo, cantidad, lote, calidad.

**Criterios de aceptación:**
* **CA-001.** Dado 2 entradas con la misma OC, cuando el Operador consulta, entonces ve la OC con 2 items y el saldo pendiente del último.
* **CA-002.** Dado una OC con saldo `0`, entonces el estado es `"Cerrada"`.

---

## Módulo 25: Bodega PT

### RF-BOD-001 — Zonificar cajas con escaneo

**Requisito:**
> El Operador debe poder escanear (con pistola láser en PC o cámara en móvil) el QR de una caja y asignarle una ubicación física y estado.

**Reglas:**
* En PC: campo de texto con foco automático, `Enter` procesa.
* En móvil: botón `"Encender cámara"`, escaneo en vivo con `html5-qrcode`, detener al leer.
* Parseo de código nuevo `{PT}-C{###}-LOTE-{lote}` y viejo `{PT}-C{###}`.
* Formulario: ubicación física + estado (`En bodega`, `Despachada`, `Cuarentena`).
* Upsert en `cajas_ubicacion`.

**Criterios de aceptación:**
* **CA-001.** Dado un QR `PT-0001-C001-LOTE-3619`, cuando el Operador escanea, entonces se parsea a `PT-0001` y se asocia.
* **CA-002.** Dado un QR viejo `PT-0001-C001`, cuando el Operador escanea, entonces también se procesa correctamente.

---

### RF-BOD-002 — Consultar mapa visual de bodega

**Requisito:**
> El Operador debe poder ver el mapa visual de cajas agrupadas por ubicación física.

**Reglas:**
* Solo cajas con `estado = En bodega`.
* Agrupadas por `ubicacion`.
* Tarjetas por ubicación con cantidad y lista de cajas.
* Búsqueda por ubicación.

**Criterios de aceptación:**
* **CA-001.** Dado 10 cajas en 3 ubicaciones, cuando el Operador abre el mapa, entonces ve 3 tarjetas con sus cajas.

---

## Módulo 26: Dashboard

### RF-DASH-001 — Consultar dashboard operativo

**Requisito:**
> El Operador debe ver un dashboard con KPIs de insumos, subproductos y PT, valorización, alerta de stock crítico, timeline de actividad y tablas.

**Reglas:**
* KPIs de insumos: activos, cubiertos, reorden, urgentes.
* KPIs de subproductos: activos, con/sin stock.
* KPIs de PT: en catálogo, con/sin stock.
* Valorización: insumos + subproductos + PT.
* Alerta de stock crítico top 5.
* Timeline de actividad (últimos 15 eventos).
* 3 tablas: insumos, subproductos, PT en inventario.
* KPIs de esterilización: unidades en planta, en central, en reproceso.

**Criterios de aceptación:**
* **CA-001.** Dado 3 insumos urgentes, cuando el Operador abre el dashboard, entonces la alerta muestra los 3.
* **CA-002.** Dado 5 unidades en `en_central`, cuando el Operador abre el dashboard, entonces ve `"5 u en esterilización"` en KPIs.

---

## Módulo 27: Notificaciones

### RF-NOT-001 — Consultar campana de notificaciones

**Requisito:**
> El Operador debe ver una campana con badge de notificaciones: stock urgente, OPs pendientes +5 días, en reorden, entregas 24h, cargas EO pendientes.

**Reglas:**
* Badge con count de notificaciones nuevas (no vistas).
* Dropdown con secciones por tipo.
* Click en item navega al módulo filtrado.
* Botón `×` para silenciar.
* Sección de silenciados con botón `"Reactivar"`.
* Al abrir la campana, todas se marcan como vistas.
* Persistencia en `user_preferences` por usuario (nueva tabla).

**Criterios de aceptación:**
* **CA-001.** Dado 3 insumos urgentes y 2 OPs vencidas, cuando el Operador abre la campana, entonces el badge muestra `5` y al abrir se marcan como vistas.
* **CA-002.** Dado un insumo silenciado, cuando el Operador abre la campana, entonces el insumo no aparece hasta reactivarlo.

---

## Módulo 28: Usuarios

### RF-USU-001 — Gestionar usuarios (admin)

**Requisito:**
> El Admin debe poder ver la lista de usuarios, cambiar roles (`admin`/`operador`/`consulta`) y activar/desactivar cuentas.

**Reglas:**
* Creación de usuarios vía dashboard de Supabase (fuera de la app).
* Cambio de rol: modal con select.
* Activar/Desactivar: toggle con confirmación.
* No se puede cambiar el rol propio ni desactivar la propia cuenta.
* Usuario inactivo no puede iniciar sesión ni leer datos (RLS).

**Criterios de aceptación:**
* **CA-001.** Dado un usuario operador, cuando el Admin lo cambia a consulta, entonces el usuario pierde permisos de escritura en próximo login.
* **CA-002.** Dado el Admin logueado, cuando intenta desactivar su propia cuenta, entonces el botón está deshabilitado.
* **CA-003.** Dado un usuario inactivo, cuando intenta loguearse, entonces el sistema rechaza con `"Tu cuenta está desactivada"`.

---

## Módulo 29: Backup

### RF-BCK-001 — Generar backup ZIP

**Requisito:**
> El Admin debe poder generar un ZIP con todos los datos maestros y movimientos en CSV.

**Reglas:**
* Rango de movimientos: `30d`, `6m`, `1a`, `todo`, `sin movimientos`.
* Incluye 21+ tablas: catálogo, recetas, OPs, entregas, lotes, movimientos, `subproducto_producciones`, `cargas_eo`, `insumos_lotes`, `lotes_pt`, etc.
* Paginación de `1000` filas.
* CSV con `;` y BOM UTF-8.
* `_resumen.txt` con metadata.
* Registro en `backup_log`.

**Criterios de aceptación:**
* **CA-001.** Dado un backup completo, cuando el Admin lo genera, entonces el ZIP contiene todos los CSV con tildes correctas.
* **CA-002.** Dado un backup con rango `"sin movimientos"`, entonces el ZIP no incluye `movimientos_inventario.csv`.
* **CA-003.** Dado un backup generado, cuando el Admin abre el historial, entonces ve la entrada con fecha, tamaño y total de registros.