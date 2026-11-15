# `src/shared/` — Infraestructura compartida

Código reutilizable por todos los módulos. **No contiene lógica de negocio.**

## Subcarpetas

- `ui/` — Componentes visuales (Panel, Table, Badge, Modal, Toast, Button, Input).
- `http/` — Cliente Supabase, manejo de errores, contratos de RPC.
- `auth/` — Login, logout, sesión, roles.

## Reglas

- **No importar** de `modules/`.
- Los componentes de `ui/` no hacen llamadas a red.
- Los módulos importan de aquí, no al revés.