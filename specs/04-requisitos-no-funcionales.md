## id: 04-requisitos-no-funcionales
status: review
version: 1.0
last_updated: 2026-11-15
depends_on: \[00-vision, 03-modelo-de-dominio, 02-requisitos-funcionales\]

# Requisitos no funcionales

## 1. Seguridad

### RNF-SEC-001 — Autenticación

* **RNF-SEC-001.1.** Toda operación requiere sesión válida de Supabase Auth.

* **RNF-SEC-001.2.** El JWT se refresca automáticamente (`TOKEN_REFRESHED`).

* **RNF-SEC-001.3.** Sesión expirada por inactividad ($30\text{ min}$) $\rightarrow$ redirige al login.

* **RNF-SEC-001.4.** Sesión expirada por token inválido $\rightarrow$ redirige al login con mensaje.

* **RNF-SEC-001.5.** Credenciales de usuario **nunca** se guardan en `localStorage`. Solo URL y `anon key` del proyecto (opcional, checkbox `"Recordar"`).

### RNF-SEC-002 — Autorización (RLS)

* **RNF-SEC-002.1.** Toda tabla tiene RLS habilitado.

* **RNF-SEC-002.2.** `current_user_role()` devuelve `'inactivo'` para usuarios desactivados y bloquea toda lectura.

* **RNF-SEC-002.3.** Escritura directa permitida solo en tablas de catálogo (`insumos`, `subproductos`, `productos_terminados`, `bom_recetas`, `subproducto_recetas`, `subproducto_subproductos`, `paquete_subproductos`, `sys_proveedores`).

* **RNF-SEC-002.4.** Movimientos, lotes, entregas, cargas EO, despachos y devoluciones: **solo escritura vía RPC** (`SECURITY DEFINER`).

* **RNF-SEC-002.5.** `consumir_insumo_fifo`, `consumir_subproducto_recursivo`, `simular_consumo_pt` y `simular_consumo_subproducto`: **no invocables** desde `authenticated`.

### RNF-SEC-003 — Validación de escritura

* **RNF-SEC-003.1.** Todos los RPCs de escritura llaman a `validar_escritura()` al inicio.

* **RNF-SEC-003.2.** `search_path = public, pg_temp` en todas las funciones `SECURITY DEFINER`.

* **RNF-SEC-003.3.** `REVOKE EXECUTE ON ALL FUNCTIONS ... FROM PUBLIC, anon` al final del schema.

### RNF-SEC-004 — XSS

* **RNF-SEC-004.1.** Toda interpolación de datos del usuario en HTML pasa por `esc()`.

* **RNF-SEC-004.2.** No se usa `innerHTML` con datos no escapados.

* **RNF-SEC-004.3.** Los toasts, notificaciones, tablas y modales escapan el contenido.

* **RNF-SEC-004.4.** No se acepta HTML del usuario en ningún campo.

### RNF-SEC-005 — Secretos

* **RNF-SEC-005.1.** La `anon key` y la URL de Supabase se configuran vía `.env` (Vite) y no se commitean.

* **RNF-SEC-005.2.** La `service_role key` **nunca** se usa en el frontend.

### RNF-SEC-006 — Sanitización de input

* **RNF-SEC-006.1.** Los inputs numéricos validan rango y tipo.

* **RNF-SEC-006.2.** Los códigos validan formato (prefijo + 4 dígitos).

* **RNF-SEC-006.3.** Los NITs validan longitud entre `5` y `20` caracteres.

* **RNF-SEC-006.4.** Las fechas usan `date` o `timestamptz`, nunca strings libres.

## 2. Rendimiento

### RNF-PERF-001 — Tiempo de carga

* **RNF-PERF-001.1.** Carga inicial ($\text{login} \rightarrow \text{dashboard}$) $< 3\text{ s}$ en conexión de $10\text{ Mbps}$.

* **RNF-PERF-001.2.** Cambio de módulo (render de tabla/lista) $< 1,5\text{ s}$.

* **RNF-PERF-001.3.** Guardado de formulario $< 2\text{ s}$ con feedback visual (`withLoading`).

### RNF-PERF-002 — Paginación

* **RNF-PERF-002.1.** Toda consulta a Supabase que pueda superar `1000` filas usa paginación (`apiAll`, `pageSize = 1000`).

* **RNF-PERF-002.2.** Los listados en UI paginan de `25` a `50` filas (botón `"Cargar más"`).

* **RNF-PERF-002.3.** Las queries grandes (kardex, compras, mermas, histórico, auditoría) usan `order` determinista con `id` como *tiebreaker*.

### RNF-PERF-003 — Gráficos

* **RNF-PERF-003.1.** Los gráficos (Chart.js) renderizan en $< 500\text{ ms}$.

* **RNF-PERF-003.2.** Se destruyen al cambiar de módulo (`_destroyChart`).

* **RNF-PERF-003.3.** Los colores se resuelven en el momento del render (`_chartTheme`), no *hardcoded*.

### RNF-PERF-004 — Bundle

* **RNF-PERF-004.1.** El bundle de producción (Vite) $< 500\text{ KB}$ (gzip) sin contar librerías CDN.

* **RNF-PERF-004.2.** *Tree-shaking* activo (solo se importa lo que se usa).

* **RNF-PERF-004.3.** Las librerías externas (Chart.js, JSZip, Supabase, QR, Barcode) se cargan desde CDN con `defer` o se bundlean si el peso lo justifica.

## 3. Disponibilidad y recuperación

### RNF-AVAIL-001 — Recuperación de sesión

* **RNF-AVAIL-001.1.** Al reabrir la app, si hay sesión válida, entra directo.

* **RNF-AVAIL-001.2.** Al reabrir la pestaña, restaura el último módulo visitado (`localStorage`).

### RNF-AVAIL-002 — Backup

* **RNF-AVAIL-002.1.** El backup ZIP incluye todas las tablas de catálogo, recetas, OPs, entregas, lotes, movimientos y cargas EO.

* **RNF-AVAIL-002.2.** El backup es descargable desde el navegador (JSZip).

* **RNF-AVAIL-002.3.** Cada backup queda registrado en `backup_log`.

## 4. Observabilidad

### RNF-OBS-001 — Logging

* **RNF-OBS-001.1.** Los errores de red y RPC se loguean en consola con contexto (`traducirError`).

* **RNF-OBS-001.2.** Los errores de validación se muestran al usuario con mensaje traducido.

* **RNF-OBS-001.3.** Modo debug activable: `localStorage.setItem('aseptiq_debug', '1')`.

### RNF-OBS-002 — Manejo de errores

* **RNF-OBS-002.1.** Todo bloque `try/catch` de operación de escritura muestra toast de error.

* **RNF-OBS-002.2.** Los errores de Supabase se traducen a mensajes en español (`traducirError`).

* **RNF-OBS-002.3.** No se muestran *stack traces* al usuario.

## 5. Accesibilidad

### RNF-A11Y-001 — WCAG AA (básico)

* **RNF-A11Y-001.1.** Contraste de texto $\ge 4,5:1$ en tema claro y oscuro.

* **RNF-A11Y-001.2.** Todos los botones tienen atributo `title` o `aria-label`.

* **RNF-A11Y-001.3.** Los formularios tienen etiquetas `<label>` asociadas.

* **RNF-A11Y-001.4.** Navegación por teclado funcional en modales (`Tab`, `Enter`, `Escape`).

* **RNF-A11Y-001.5.** Los íconos puramente decorativos llevan `aria-hidden="true"`.

## 6. Usabilidad

### RNF-USA-001 — Mensajes

* **RNF-USA-001.1.** Todos los mensajes al usuario están en español colombiano (`es-CO`).

* **RNF-USA-001.2.** Los errores explican qué pasó y qué hacer.

* **RNF-USA-001.3.** Los toasts de éxito duran $4,5\text{ s}$; los de error, $6,5\text{ s}$.

### RNF-USA-002 — Atajos

* **RNF-USA-002.1.** `G` + letra navega a módulos.

* **RNF-USA-002.2.** `/` enfoca el buscador del módulo activo.

* **RNF-USA-002.3.** `?` abre la ayuda de atajos.

* **RNF-USA-002.4.** `Esc` cierra modales o colapsa paneles.

* **RNF-USA-002.5.** Los atajos no interfieren cuando el foco está en `<input>`, `<textarea>` o `<select>`.

### RNF-USA-003 — Feedback

* **RNF-USA-003.1.** Toda operación $> 300\text{ ms}$ muestra loader.

* **RNF-USA-003.2.** Toda escritura exitosa muestra toast de éxito.

* **RNF-USA-003.3.** Los botones de acción muestran estado `"Guardando…"` mientras esperan respuesta.

## 7. Compatibilidad

### RNF-COMPAT-001 — Browsers

* **RNF-COMPAT-001.1.** Chrome/Edge $\ge 100$, Firefox $\ge 100$, Safari $\ge 15$.

* **RNF-COMPAT-001.2.** No se soporta IE11.

### RNF-COMPAT-002 — Dispositivos

* **RNF-COMPAT-002.1.** Desktop: $1024\text{ px}$ – $1920\text{ px}$.

* **RNF-COMPAT-002.2.** Tablet: $641\text{ px}$ – $1024\text{ px}$.

* **RNF-COMPAT-002.3.** Móvil: hasta $640\text{ px}$ (layout *drawer*).

### RNF-COMPAT-003 — Impresión

* **RNF-COMPAT-003.1.** La impresión usa `@page` + `<iframe>` aislado.

* **RNF-COMPAT-003.2.** Zebra $150 \times 100\text{ mm}$, $80 \times 44\text{ mm}$, $50 \times 25\text{ mm}$ (configurable).

* **RNF-COMPAT-003.3.** Los encabezados y pies de página del navegador no deben aparecer (se desactivan manualmente en el diálogo de impresión).

## 8. Mantenibilidad

### RNF-MAINT-001 — Estructura

* **RNF-MAINT-001.1.** `src/core/`: funciones puras, sin acceso a red ni DOM.

* **RNF-MAINT-001.2.** `src/shared/`: UI reutilizable y utilidades.

* **RNF-MAINT-001.3.** `src/modules/<feature>/`: un módulo por feature, con `index.js`, `repository.js`, `service.js` y `view.js`.

* **RNF-MAINT-001.4.** Ningún módulo importa directamente de otro módulo; solo de `core/` y `shared/`.

### RNF-MAINT-002 — Tipado

* **RNF-MAINT-002.1.** Toda función de `core/` tiene JSDoc con `@param`, `@returns` y `@throws`.

* **RNF-MAINT-002.2.** Los modelos de datos se documentan con `@typedef` en JSDoc.

### RNF-MAINT-003 — Tests

* **RNF-MAINT-003.1.** Cobertura de `core/` $\ge 80\%$.

* **RNF-MAINT-003.2.** Los 148 CAs de `07-criterios-de-aceptacion.md` se convierten en tests de Vitest cuando sea posible.

* **RNF-MAINT-003.3.** Los tests manuales están documentados en `07-criterios-de-aceptacion.md`.

### RNF-MAINT-004 — Linting

* **RNF-MAINT-004.1.** ESLint + Prettier configurados.

* **RNF-MAINT-004.2.** Sin warnings de ESLint en CI (*pre-commit* local).

## 9. Portabilidad (para el port .NET)

### RNF-PORT-001 — Dominio portable

* **RNF-PORT-001.1.** Toda la lógica de negocio vive en `src/core/` y es traducible $1:1$ a C#.

* **RNF-PORT-001.2.** `core/` no importa Supabase, ni Chart.js, ni el DOM.

* **RNF-PORT-001.3.** Los formatters (`money`, `num`, `fecha`) usan `Intl` con locale `es-CO`.

### RNF-PORT-002 — Contratos estables

* **RNF-PORT-002.1.** Los contratos de RPC (firmas, parámetros, retornos) se documentan en `05-contratos.md`.

* **RNF-PORT-002.2.** Los cambios de firma se versionan (nuevo RPC o nuevo parámetro opcional, nunca *breaking change* en silencio).

## 10. Internacionalización

* **RNF-I18N-001.** Único idioma: español colombiano (`es-CO`).

* **RNF-I18N-002.** Formato de moneda: COP. Formato de fecha: `dd/mm/yyyy`. Separador decimal: coma.

* **RNF-I18N-003.** No se soporta multi-idioma en el MVP.

## 11. Documentación

* **RNF-DOC-001.** Cada módulo tiene un `README.md` interno en su carpeta explicando su responsabilidad.

* **RNF-DOC-002.** `MANUAL.md` se mantiene actualizado con cada release.

* **RNF-DOC-003.** `CHANGELOG.md` se actualiza con cada versión.