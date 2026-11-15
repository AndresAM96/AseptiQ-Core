# AseptiQ

Sistema de gestión de inventario, producción, costos y trazabilidad para **Proclides Soluciones Estériles S.A.S.**

## Estado

**v1.0.0-alpha.0** — Reconstrucción bajo Spec-Driven Development (Fase 0 completada).

## ¿Qué resuelve?

- **Insumos** con cadena de conversiones, costo promedio ponderado y flags de trazabilidad (lote / vencimiento).
- **Subproductos** intermedios y finales, con receta y jerarquía anidada. Tracking interno por producción.
- **Paquetes terminados (PT)** con composición, unidades por caja y precio de venta.
- **Órdenes de producción (OP)** con número y lote únicos, prioridad, fechas y **entregas parciales**.
- **Trazabilidad estricta FIFO** por lote (INVIMA).
- **Esterilización** con cargas EO N:M y reproceso de rechazados.
- **Movimientos unificados** con trazabilidad completa.
- **Despachos** con lote OP + lote EO.
- **Devoluciones** a proveedor y de cliente.
- **Análisis**: kardex, compras, mermas, costos OP, rentabilidad, histórico.
- **Reportes operativos**: MRP, programación semanal, evaluación de proveedores.
- **Impresión nativa** de OP, kardex, conteo, etiquetas QR, FO-AP-04, programación y despachos.
- **Backup** completo en ZIP.
- **Roles y RLS**: admin, operador, consulta.

## Stack

- **Frontend**: Vanilla JS + ES modules + Vite.
- **Tests**: Vitest + JSDoc.
- **Backend**: Supabase (PostgreSQL + Auth + RLS + RPCs).
- **Gráficos**: Chart.js 4.
- **ZIP**: JSZip.
- **QR / Barcode**: qrcode-generator, JsBarcode, html5-qrcode.
- **Linting**: ESLint 9 + Prettier 3.
- **Deploy**: Vercel (automático desde GitHub).

## Estructura del repositorio

aseptiq/
├── index.html # Shell mínimo, el contenido se renderiza desde src/
├── schema_v1.0.0.sql # Schema completo del backend
├── src/
│ ├── main.js # Bootstrap
│ ├── core/ # Lógica pura (portable a .NET)
│ ├── shared/ # UI, http, auth
│ ├── modules/ # Un módulo por feature
│ └── styles/ # Design tokens + base
├── tests/ # Tests automatizados
├── specs/ # Specs SDD (fuente de verdad)
├── legacy/ # v2.5.3 archivada (referencia histórica)
├── docs/ # Documentación de usuario y contratos
└── ...

## Instalación

Ver [`SETUP.md`](SETUP.md). Resumen:

1. `npm install`
2. Crear proyecto Supabase.
3. Correr `schema_v1.0.0.sql` en el SQL Editor.
4. Crear el primer usuario en Authentication → Users → Add user.
5. Promover ese usuario a admin: `UPDATE public.profiles SET role='admin' WHERE email='tu@email.com';`
6. Copiar `.env.example` a `.env` y completar las credenciales.
7. `npm run dev`
8. Login con el usuario creado.

## Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción a `dist/` |
| `npm run preview` | Preview del build |
| `npm run test` | Tests (una vez) |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con cobertura |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint con auto-fix |
| `npm run format` | Prettier |
| `npm run check` | Lint + format check + test |

## Documentación

- [`SETUP.md`](SETUP.md) — Instalación desde cero.
- [`specs/`](specs/) — Specs SDD (fuente de verdad del proyecto).
- [`specs/00-vision.md`](specs/00-vision.md) — Visión, alcance, decisiones.
- [`specs/01-actores-y-casos-de-uso.md`](specs/01-actores-y-casos-de-uso.md) — Actores y casos de uso.
- [`specs/02-requisitos-funcionales.md`](specs/02-requisitos-funcionales.md) — 54 RFs con 148 CAs.
- [`specs/03-modelo-de-dominio.md`](specs/03-modelo-de-dominio.md) — Modelo de datos y reglas de negocio.
- [`specs/04-requisitos-no-funcionales.md`](specs/04-requisitos-no-funcionales.md) — Seguridad, performance, accesibilidad.
- [`specs/05-contratos.md`](specs/05-contratos.md) — RPCs, tablas, impresión.
- [`specs/06-ui-y-experiencia.md`](specs/06-ui-y-experiencia.md) — Layout, componentes, responsive.
- [`specs/07-criterios-de-aceptacion.md`](specs/07-criterios-de-aceptacion.md) — E2E y smoke tests.
- [`specs/08-plan-de-reconstruccion.md`](specs/08-plan-de-reconstruccion.md) — Fases y migración.
- [`MANUAL.md`](MANUAL.md) — Manual de usuario.
- [`CONTRATO_API.md`](CONTRATO_API.md) — Contratos del backend (complementario a `05`).
- [`CHANGELOG.md`](CHANGELOG.md) — Historial de versiones.
- [`PORT_DOTNET.md`](PORT_DOTNET.md) — Plan de port a .NET (post-MVP).

## Roadmap

- [x] Fase 0 — Fundaciones (schema, specs, Vite, ESLint, Prettier, Vitest).
- [ ] Fase 1 — Core + Auth + Shared.
- [ ] Fase 2 — Catálogo.
- [ ] Fase 3 — Inventario.
- [ ] Fase 4 — Producción.
- [ ] Fase 5 — Esterilización.
- [ ] Fase 6 — Salidas.
- [ ] Fase 7 — Análisis.
- [ ] Fase 8 — Trazabilidad y Bodega.
- [ ] Fase 9 — Sistema.
- [ ] Fase 10 — Pulido y release v1.0.0.
- [ ] Post-MVP — Port .NET.

## Licencia

Propietario. © Alvaro Andrés Arias