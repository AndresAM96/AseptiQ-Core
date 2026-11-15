/**
 * Cálculo de estado de stock según umbrales.
 */

/**
 * Calcula el estado de un insumo basado en su punto de reorden y los umbrales.
 * @param {Object} insumo - { existencia_actual, punto_reorden }
 * @param {Object} config - { umbralUrgente, umbralReorden } (porcentajes de 1 a 99)
 * @returns {string} 'Urgente' | 'Reorden' | 'Cubierto'
 */
export function estadoInsumo(insumo, config) {
  const objetivo = Number(insumo.punto_reorden) || 0;
  const existencia = Number(insumo.existencia_actual) || 0;

  if (objetivo <= 0) {
    return existencia > 0 ? 'Cubierto' : 'Urgente';
  }

  const uU = objetivo * ((Number(config?.umbralUrgente) || 30) / 100);
  const uR = objetivo * ((Number(config?.umbralReorden) || 60) / 100);

  if (existencia <= uU) return 'Urgente';
  if (existencia <= uR) return 'Reorden';
  return 'Cubierto';
}

/**
 * Toma un array de estados y devuelve el peor.
 * @param {string[]} estados
 * @returns {string} 'Urgente' | 'Reorden' | 'Cubierto'
 */
export function peorEstado(estados) {
  if (estados.includes('Urgente')) return 'Urgente';
  if (estados.includes('Reorden')) return 'Reorden';
  return 'Cubierto';
}