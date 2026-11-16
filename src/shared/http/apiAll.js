import { supabase } from './client.js';
import { traducirError } from './errores.js';

/**
 * Trae TODOS los registros de una tabla/consulta de Supabase, paginando de a 1000.
 * @param {string} table - Nombre de la tabla.
 * @param {string} select - Columnas a seleccionar (default '*').
 * @param {Object} filters - Objeto con filtros (ej: { column: 'value' }).
 * @param {string} dateFilter - Filtro de fecha opcional (ej: 'fecha', 'gte.2023-01-01').
 * @returns {Promise<Array>}
 */
export async function apiAll(table, select = '*', filters = {}, order = null) {
  const PAGE_SIZE = 1000;
  let offset = 0;
  let allData = [];

  while (true) {
        let query = supabase.from(table).select(select).range(offset, offset + PAGE_SIZE - 1);

    // Aplicar orden (por defecto por id ascendente para mantener consistencia)
    if (order) {
      query = query.order(order, { ascending: true });
    }

    // Aplicar filtros
    for (const [key, value] of Object.entries(filters)) {
      if (value.startsWith('gte.') || value.startsWith('lte.')) {
        const [op, val] = value.split(/\.(.+)/);
        query = query[op === 'gte' ? 'gte' : 'lte'](key, val);
      } else {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(traducirError(error.message));

    allData = allData.concat(data);

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;

    if (offset > 100000) break; // Tope de seguridad
  }

  return allData;
}