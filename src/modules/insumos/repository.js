import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getInsumos() {
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function getConfig() {
  const { data, error } = await supabase
    .from('sys_config')
    .select('config')
    .eq('id', 1)
    .single();

  if (error) return null;
  return data.config;
}

export async function eliminarInsumo(id) {
  return await rpc('eliminar_insumo', { p_id: id });
}

export async function getSiguienteCodigo() {
  // Usamos el RPC que creamos en el schema
  return await rpc('siguiente_codigo', { p_prefijo: 'INS-', p_tabla: 'insumos' });
}

export async function crearInsumo(data) {
  const { data: result, error } = await supabase
    .from('insumos')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(traducirError(error.message));
  return result;
}