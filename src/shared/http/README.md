# `src/shared/http/` — Cliente HTTP / Supabase

## Archivos planificados

- `client.js` — Wrapper de `@supabase/supabase-js` con manejo de sesión.
- `rpc.js` — Helper `rpc(fn, params)` para RPCs.
- `api.js` — Helper `api(path, options)` para queries REST.
- `apiAll.js` — Paginación transparente para reportes.
- `errores.js` — `traducirError(mensaje)` a español.

## Contratos

Ver `specs/05-contratos.md` para firmas de RPCs, tablas y errores.