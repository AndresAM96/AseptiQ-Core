# `src/modules/` — Módulos funcionales

Un módulo por feature del sidebar. Cada módulo es una carpeta autocontenida.

## Estructura de cada módulo

modules/<feature>/
├── index.js # Entry point: export const module = {...}
├── repository.js # Queries Supabase (solo lectura y escritura vía RPC)
├── service.js # Lógica de negocio (usa core/)
├── view.js # Render y eventos DOM
└── README.md # Responsabilidad del módulo


## Contrato del módulo

```js
export const module = {
  id: 'insumos',
  title: 'Insumos',
  icon: 'box',
  group: 'catalogo',
  requiredRole: ['admin', 'operador', 'consulta'],
  async mount(container, context) {},
  unmount() {},
};
```

## Lista de módulos

Ver `specs/01-actores-y-casos-de-uso.md §3` para el mapa completo.


### `tests/README.md`

```markdown
# `tests/` — Tests automatizados

- `tests/core/` — Tests de funciones puras (Vitest, environment `node`).
- `tests/modules/` — Tests de módulos con DOM (Vitest, `jsdom`).

## Comandos

- `npm test` — corre una vez.
- `npm run test:watch` — modo watch.
- `npm run test:coverage` — con cobertura (umbral 80% para `core/`).

## Convenciones

- Nombre: `<archivo>.test.js`.
- Estructura: `describe` por función, `it` por caso.
- Cada test referencia el `CA-###` del spec que valida.
```