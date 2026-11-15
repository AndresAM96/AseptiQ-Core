---
id: 07-criterios-de-aceptacion
status: review
version: 1.0
last_updated: 2026-11-14
depends_on:
  - 02-requisitos-funcionales
  - 03-modelo-de-dominio
---

# Criterios de aceptación

## 1. Criterios por módulo

Los 148 CAs por módulo están en `02-requisitos-funcionales.md`. Este documento
consolida los **escenarios end-to-end** que cruzan varios módulos y sirve de
base para los tests de integración manuales.

## 2. Escenarios end-to-end

### E2E-001 — Ciclo completo estéril (happy path)

**Precondiciones:**

- Catálogo: 1 insumo tela (con lote, sin vencimiento), 1 insumo bolsa (sin lote),
  1 subproducto batón, 1 PT estéril "Paquete Cirugía" con BOM.
- Proveedor cargado.
- Stock inicial: tela 100 m, bolsa 200 u.

**Pasos:**

1. Registrar entrada de tela lote `T1` (50 m) vía Entrada mercancía.
2. Registrar entrada de tela lote `T2` (50 m) vía Entrada mercancía.
3. Registrar entrada de bolsa (200 u) sin lote.
4. Producir subproducto batón standalone (10 u).
5. Crear OP `OP-001` lote `L-2026-001` para 50 u de "Paquete Cirugía".
6. Calcular cobertura → debe estar `Cubierto` o `Reorden`.
7. Confirmar OP.
8. Entregar 50 u → consume insumos FIFO (T1 primero) y batón.
9. Verificar `lotes_pt` creado con `lote_op = L-2026-001`, `estado = en_planta`.
10. Crear carga EO `E1` con la OP.
11. Verificar `lotes_pt.estado = en_central`.
12. Recibir carga EO `E1` con 50 u recibidas.
13. Verificar `lotes_pt.estado = en_bodega`, `lote_eo = E1`.
14. Despachar 30 u a cliente "Clínica X".
15. Verificar `lotes_pt.cantidad_actual = 20`, movimiento `despacho`.
16. Trazar forward desde PT + lote_op + lote_eo → debe mostrar tela T1 (FIFO), T2,
    bolsa, batón con sus insumos.
17. Trazar backward desde tela T1 → debe mostrar PT lote `L-2026-001` lote_eo E1.

**Postcondiciones:**

- Stock de tela: 50 m de T2 restantes.
- Stock de bolsa: 150 u.
- `lotes_pt` en `en_bodega` con 20 u.
- `movimientos` registra todos los pasos.

### E2E-002 — Ciclo completo no estéril

**Precondiciones:**

- PT "Paquete No Estéril" con `requiere_esterilizacion = false`.

**Pasos:**

1. Crear OP para 20 u.
2. Confirmar OP.
3. Entregar 20 u.
4. Verificar `lotes_pt` creado con `lote_op = L1`, `estado = en_bodega`,
   `lote_eo = NULL` (no pasa por central).
5. Despachar 10 u.
6. Verificar `lotes_pt.cantidad_actual = 10`.

### E2E-003 — Entrega parcial con auto-producción

**Precondiciones:**

- Subproducto "Batón" sin stock.
- Insumos suficientes para producirlo.

**Pasos:**

1. Crear OP que requiere 30 batones.
2. Confirmar OP.
3. Entregar 10 u.
4. Verificar que se auto-produjeron 10 batones y se consumieron inmediatamente.
5. Verificar `subproducto_producciones` con `cantidad_actual = 0`, `orden_id = OP`.
6. Verificar `lotes_pt` con 10 u.
7. Entregar 20 u más → auto-produce 20 más.
8. Verificar OP `Terminada` con `lotes_pt = 30 u`.

### E2E-004 — Rechazo y reproceso

**Pasos:**

1. Crear carga EO `E1` con 50 u.
2. Recibir 40 u, rechazar 10 con motivo "empaque dañado".
3. Verificar 40 u en `en_bodega` con `lote_eo = E1`.
4. Verificar 10 u en `en_reproceso` con `lote_eo = NULL`.
5. Crear carga EO `E2` con las 10 u en reproceso.
6. Recibir 10 u con `lote_eo = E2`.
7. Verificar 10 u en `en_bodega` con `lote_eo = E2`.
8. Verificar que E1 sigue con 10 u rechazadas en su histórico.

### E2E-005 — Devolución a proveedor con LIFO

**Precondiciones:**

- Insumo con lote A (3 u, ingreso 2026-01-01) y lote B (5 u, ingreso 2026-02-01).

**Pasos:**

1. Devolver 5 u sin especificar lote.
2. Verificar que se consumió B completo (5 u) y A queda con 3 u.
3. Devolver 4 u especificando lote A → debe fallar con "El lote A solo tiene 3 disponibles".
4. Devolver 3 u especificando lote A → debe consumir A completo.

### E2E-006 — Conteo físico con ajustes

**Pasos:**

1. Cargar existencias de 10 insumos.
2. Ingresar conteos con 3 diferencias (2 positivas, 1 negativa).
3. Aplicar ajustes.
4. Verificar 3 movimientos `ajuste` registrados.
5. Verificar stock = conteo en los 3.

### E2E-007 — Trazabilidad backward desde insumo

**Pasos:**

1. Insumo "Tela" con lote T1 consumido en 2 OPs distintas.
2. Trazar backward desde Tela T1.
3. Verificar 2 PTs listados, cada uno con su lote_op y lote_eo.

### E2E-008 — Roles y permisos

**Pasos:**

1. Login como Consulta.
2. Intentar crear insumo → toast "Tu rol es Consulta — solo lectura".
3. Verificar que botones de crear/editar están ocultos.
4. Login como Admin.
5. Cambiar rol de un operador a consulta.
6. Verificar que el operador pierde permisos en próximo login.

### E2E-009 — Sesión expirada

**Pasos:**

1. Simular token expirado (o esperar 1h).
2. Hacer una query → debe redirigir al login con mensaje.

### E2E-010 — Backup y restauración

**Pasos:**

1. Generar backup completo.
2. Descargar ZIP.
3. Verificar que contiene todos los CSV esperados.
4. Verificar tildes en Excel.

## 3. Smoke tests manuales

Antes de cada release:

- [ ] Login funciona con credenciales válidas.
- [ ] Dashboard carga KPIs correctos.
- [ ] Crear insumo persiste.
- [ ] Crear subproducto persiste.
- [ ] Crear PT persiste.
- [ ] Crear OP y calcular cobertura.
- [ ] Entregar OP parcial.
- [ ] Entregar OP total.
- [ ] Crear carga EO.
- [ ] Recibir carga EO con rechazo.
- [ ] Despachar PT estéril con lote_eo.
- [ ] Despachar PT no estéril sin lote_eo.
- [ ] Trazar forward.
- [ ] Trazar backward.
- [ ] Kardex con saldo corrido.
- [ ] Conteo físico y ajustes.
- [ ] Devolución a proveedor.
- [ ] Devolución de cliente.
- [ ] Imprimir OP.
- [ ] Imprimir kardex.
- [ ] Imprimir reporte de despachos.
- [ ] Cambiar tema.
- [ ] Atajos de teclado.
- [ ] Notificaciones (marcar como vistas, silenciar).
- [ ] Cambiar rol de usuario (admin).
- [ ] Generar backup.

## 4. Criterios de calidad

- **CQ-001.** Cero errores en consola al navegar todos los módulos.
- **CQ-002.** Cero warnings de ESLint.
- **CQ-003.** Cobertura de tests de `core/` ≥ 80%.
- **CQ-004.** Contraste WCAG AA en todos los textos.
- **CQ-005.** Todos los formularios validan en cliente y servidor.
- **CQ-006.** Ninguna operación deja el estado inconsistente si falla a mitad
  (transacciones en RPCs).