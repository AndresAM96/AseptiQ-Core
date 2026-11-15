# `src/shared/auth/` — Autenticación y roles

## Archivos planificados

- `session.js` — Persistencia, refresh, expiración.
- `login.js` — Pantalla de login.
- `roles.js` — Helpers de rol (`isAdmin`, `isOperador`, `canWrite`).
- `guard.js` — Guard de escritura (reemplaza el click-guard actual).

## Reglas

- Las credenciales **nunca** se guardan en `localStorage`.
- La sesión se persiste con `@supabase/supabase-js` (refresh token en storage seguro).
- Al expirar, redirige al login.