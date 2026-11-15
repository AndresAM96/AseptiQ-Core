---
id: 06-ui-y-experiencia
status: review
version: 1.0
last_updated: 2026-11-14
depends_on: [02-requisitos-funcionales, 04-requisitos-no-funcionales]
---

# UI y experiencia

## 1. Layout general

```text
┌──────────────────────────────────────────────────────────┐
│ Sidebar (220px) │ Mobile header (solo móvil) │
│ │ ┌────────────────────────────────┐ │
│ - Brand │ │ Contenido del módulo │ │
│ - Campana │ │ │ │
│ - Buscador │ │ │ │
│ - Nav (grupos) │ │ │ │
│ - Footer user │ │ │ │
│ │ └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 1.1 Sidebar

- **Grupos:** Operación, Catálogo, Logística y Calidad, Sistema.
- **Acordeón:** solo un grupo abierto a la vez.
- **Buscador:** filtra items en vivo; `Enter` navega, `Esc` limpia.
- **Campana:** badge con notificaciones nuevas; dropdown con secciones.
- **Colapsable:** 220px ↔ 60px (o hover-mode).
- **Footer:** email, rol, botón "Cerrar sesión".

### 1.2 Contenido

- **Max-width:** 1280px centrado.
- **Padding:** 28px 36px (desktop), 22px 26px (tablet), 14px 12px (móvil).
- **Page-header:** título + subtítulo + acciones (refresh, export, +).
- **Paneles:** cards con header, acciones, toggle colapsable.

### 1.3 Header móvil

- Solo visible en `≤ 640px`.
- Botón `☰` para drawer.
- Brand clickeable (va al dashboard).
- Campana de notificaciones.

## 2. Navegación

### 2.1 Router

- SPA con History API.
- URL: `#/<module>` o `/<module>` (a definir en implementación).
- Al cambiar de módulo:
  1. `unmount()` del módulo anterior.
  2. `mount()` del nuevo.
  3. Guardar en `localStorage` (`aseptiq_tab`).

### 2.2 Restauración

- Al abrir la app, restaura el último módulo visitado.
- Si no hay sesión, muestra login.

## 3. Estados de la UI

### 3.1 Loading

- **Boot:** spinner centrado en pantalla completa.
- **Módulo:** "Cargando…" en el contenedor principal.
- **Operación:** `withLoading(btn, fn)` con spinner en el botón.

### 3.2 Empty

- **Sin datos:** "No hay [entidad] todavía" o "No hay [entidad] para estos filtros".
- **Sin resultados de búsqueda:** "Mostrando 0 de N registros".
- **Sin permisos:** "Solo el administrador puede acceder".

### 3.3 Error

- **Módulo falla:** "Error: [mensaje traducido]" en el contenedor.
- **Operación falla:** toast rojo.
- **Sesión expira:** alert + redirect al login.

### 3.4 Success

- **Escritura:** toast verde 4.5s.
- **Botón:** estado "✓ Guardado" 1.4s antes de volver.

## 4. Componentes base

### 4.1 Panel

- Card con header (título + acciones + toggle), body, footer opcional.
- Toggle colapsable persistente (`localStorage` por `data-panel-key`).
- Modificadores: `force-expanded`, `force-collapsed`, `panel--scroll`, `no-scroll`.

### 4.2 Tabla

- Sort por columna (`thSort`).
- Búsqueda (`filtrarTabla`).
- Paginación (`paginarTabla`, 25–50 filas + "Cargar más").
- Responsive: en móvil se convierten en tarjetas con `data-label`.
- Acciones: botones icon-only con tooltip.

### 4.3 Modal

- Overlay con backdrop blur.
- Stack de modales (apilables).
- Solo se cierra con `Esc` o botones (no click fuera).
- Animación: `cubic-bezier(.22,1,.36,1)`, 380ms.
- Footer con botones de acción.

### 4.4 Toast

- Fixed bottom-right (desktop), full-width (móvil).
- Verde (success), rojo (error), con icono.
- Duración: 4.5s (success) / 6.5s (error).
- Z-index 600 (encima de modales).

### 4.5 Badge

- Estados: success, warning, danger, neutral, info.
- Para stock: Cubierto (verde), Reorden (amarillo), Urgente (rojo).
- Para OP: Pendiente (neutral), En proceso (info), Terminada (success), Cancelada (danger).
- Para PT: en_planta (info), en_central (warning), en_reproceso (danger), en_bodega (success), despachado (neutral).

### 4.6 Formularios

- `form-grid` con labels arriba o abajo (`labels-bottom`).
- Inputs con validación en vivo (`field-validate`).
- Autoselect en campos de código sugerido.
- Combo search con datalist.

### 4.7 Acciones

- **Botón primario:** fondo accent, texto oscuro.
- **Botón secundario:** fondo surface-3, borde.
- **Botón ghost:** transparente, borde.
- **Botón danger:** fondo rojo translúcido.
- **Botón success:** fondo verde translúcido.
- **Botón icon-only:** cuadrado, con tooltip.

### 4.8 Buscador

- Input con lupa.
- Debounce 150ms.
- Contador "Mostrando X de Y registros".

## 5. Responsive

### 5.1 Breakpoints

| Rango | Ancho | Layout |
|---|---|---|
| Desktop | ≥ 1025px | Sidebar fijo 220px + contenido |
| Tablet | 641–1024px | Sidebar fijo + KPIs 2 col |
| Móvil | ≤ 640px | Sidebar drawer + KPIs 1 col |

### 5.2 Comportamientos

- **Tablas:** en móvil, cada fila → tarjeta con `data-label`.
- **KPIs:** grid 4 col (desktop) → 2 col (tablet) → 1 col (móvil).
- **Modales:** desde abajo en móvil (bottom sheet).
- **Sidebar:** drawer con overlay en móvil.
- **Buscador del sidebar:** oculto en modo colapsado.

### 5.3 Touch

- Botones con padding ≥ 44px en móvil.
- Inputs con font-size ≥ 16px (evita zoom en iOS).
- No hover-only interactions.

## 6. Tema (dark/light)

- **Default:** dark.
- **Toggle:** en Configuración (slider con icono luna/sol).
- **Persistencia:** `localStorage` (`aseptiq_tema`).
- **Gráficos:** se re-renderizan con los colores del tema (`_chartTheme`).
- **Contraste:** ambos temas cumplen WCAG AA.

### 6.1 Variables CSS

```css
:root {
  --bg: #10131a;
  --surface-1: #171b24;
  --surface-2: #1e2330;
  --surface-3: #262c3b;
  --border: #2b3140;
  --text-primary: #edeff3;
  --text-secondary: #8d95a6;
  --text-muted: #5b6274;
  --accent: #ffb020;
  --success: #3ddc84;
  --warning: #ffb020;
  --danger: #ff5c5c;
  --info: #6ab7ff;
}

html[data-theme="light"] {
  --bg: #f5f6f8;
  --surface-1: #ffffff;
  --surface-2: #f0f2f5;
  --surface-3: #e4e7eb;
  --border: #d8dce1;
  --text-primary: #1a1f2b;
  --text-secondary: #5a6271;
  --text-muted: #8d95a6;
  --accent: #e08900;
  --success: #1a9f5a;
  --warning: #c78500;
  --danger: #d63c3c;
  --info: #2a7fdb;
}
```

## 7. Atajos de teclado

| Atajo | Acción |
|---|---|
| `G + D` | Dashboard |
| `G + O` | Cargar orden |
| `G + N` | Novedades |
| `G + I` | Insumos |
| `G + P` | Productos & BOM |
| `G + E` | Entrada mercancía |
| `G + X` | Devoluciones |
| `G + V` | Proveedores |
| `G + A` | Auditoría |
| `G + K` | Kardex |
| `G + B` | Compras |
| `G + M` | Mermas |
| `G + H` | Histórico |
| `G + C` | Costos OP |
| `G + R` | Rentabilidad |
| `G + T` | Trazabilidad |
| `G + Y` | Backup |
| `G + U` | Usuarios |
| `/` | Enfocar buscador del módulo |
| `?` | Ayuda de atajos |
| `Esc` | Cerrar modales / colapsar paneles |
Nota: los atajos no interfieren con inputs/textarea/select.

## 8. Impresión

- Función: imprimirHTML(contenido, titulo, cssExtra) con iframe aislado.

- Formatos: ver 05-contratos.md §4.

- CSS de impresión: `@page { size: letter portrait; margin: 14mm 12mm; }`.

- Firmas: grid de 2–3 columnas con nombre + rol.

- Headers/footers del navegador: deben desactivarse manualmente en el diálogo.

## 9. Iconografía

- Sprite SVG inline (Lucide-style, MIT).

- Helper `icono(nombre, size)`.

- Clases: `.icon`, `.icon-sm`, `.icon-lg`, `.icon-xl`.

- Heredan color vía `currentColor`.

## 10. Notificaciones

- Campana en sidebar (desktop) y header (móvil).

- Badge con count de no vistas.

- Animación shake cuando hay alertas críticas.

- Dropdown con secciones:

- Stock urgente.

- OPs pendientes +5 días.

- En reorden.

- Entregas 24h.

- Cargas EO pendientes (nuevo).

- Silenciar por item.

- Sección de silenciados con reactivar.

- Marcar como vistas al abrir.

## 11. Feedback visual

- Hover: fondo surface-2.

- Active: fondo surface-2 + color text-primary.

- Disabled: opacity 0.5.

- Loading: spinner.

- Success: check verde.

- Error: X roja.

## 12. Accesibilidad

- Focus visible en todos los interactivos.

- Navegación por teclado en modales (focus trap).

- `aria-label` en botones sin texto.

- `role="dialog"` en modales.

Contraste AA en ambos temas.
