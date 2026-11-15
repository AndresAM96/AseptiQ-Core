/**
 * Lógica de la cadena de conversiones de unidades.
 */

/**
 * Normaliza el array de conversiones de un insumo.
 * Si no tiene, devuelve un nivel base (unidad de medida, factor 1).
 * @param {Object} insumo
 * @returns {Array<{unidad: string, factor: number, formula?: Object}>}
 */
export function getCadena(insumo) {
  const c = insumo && insumo.conversiones;
  if (Array.isArray(c) && c.length > 0) return c;
  return [{ unidad: (insumo && insumo.unidad_medida) || 'u', factor: 1 }];
}

/**
 * Devuelve la unidad de compra (el primer nivel de la cadena).
 * @param {Object} insumo
 * @returns {string}
 */
export function unidadCompra(insumo) {
  return getCadena(insumo)[0].unidad;
}

/**
 * Devuelve la unidad de consumo (el último nivel de la cadena).
 * @param {Object} insumo
 * @returns {string}
 */
export function unidadConsumo(insumo) {
  const c = getCadena(insumo);
  return c[c.length - 1].unidad;
}

/**
 * Calcula el factor total de conversión (compra → consumo).
 * Multiplica los factores de todos los niveles intermedios.
 * @param {Object} insumo
 * @returns {number}
 */
export function factorTotal(insumo) {
  const c = getCadena(insumo);
  if (c.length <= 1) return 1;
  return c.slice(0, -1).reduce((acc, nivel) => acc * (Number(nivel.factor) || 1), 1);
}

/**
 * Formatea un texto con la existencia actual y su equivalente en unidad de compra.
 * @param {Object} insumo
 * @param {Function} numFn - Función importada de formatters para números.
 * @returns {string} Ej: "150 u (≈ 12,5 caja)"
 */
export function formatearExistencia(insumo, numFn) {
  const uC = unidadConsumo(insumo);
  const uP = unidadCompra(insumo);
  const f = factorTotal(insumo);
  const base = `${numFn(insumo.existencia_actual)} ${uC}`;

  if (f > 1) {
    return `${base} <span style="color:var(--text-muted);font-size:11.5px;">(≈ ${numFn(insumo.existencia_actual / f)} ${uP})</span>`;
  }
  return base;
}