import { supabase } from './client.js';
import { traducirError } from './errores.js';

/**
 * Ejecuta una función RPC en Supabase.
 * @param {string} fnName - Nombre de la función.
 * @param {Object} params - Parámetros.
 * @returns {Promise<any>} Datos devueltos.
 */
export async function rpc(fnName, params = {}) {
  const { data, error } = await supabase.rpc(fnName, params);
  if (error) throw new Error(traducirError(error.message));
  return data;
}