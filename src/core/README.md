# `src/core/` — Lógica de dominio

Funciones **puras**, sin acceso a red ni DOM. Portables 1:1 a C# para el port .NET.

## Archivos planificados

- `formatters.js` — `money`, `num`, `fecha`, `csv`
- `cadena.js` — unidad de compra → consumo, factor, cadena
- `estadoInsumo.js` — cubierto / reorden / urgente
- `costos.js` — costo recursivo de subproducto y PT
- `cobertura.js` — simulación recursiva de consumo
- `fifo.js` — estrategia FIFO y selección de lotes
- `trazabilidad.js` — árbol forward / backward

## Reglas

- **No importar** de `shared/`, `modules/`, ni de librerías del navegador.
- Toda función exportada tiene JSDoc con `@param` y `@returns`.
- Cobertura de tests ≥ 80% (ver `vitest.config.js`).
- Ver `specs/03-modelo-de-dominio.md` para las reglas de negocio implementadas.