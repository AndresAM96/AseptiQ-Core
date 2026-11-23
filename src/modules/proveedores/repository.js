import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getProveedores() {
  const { data, error } = await supabase.from('sys_proveedores').select('*').order('razon_social');

  if (error) throw new Error(traducirError(error.message));
  return data || [];
}

export async function crearProveedor(data) {
  const { data: result, error } = await supabase
    .from('sys_proveedores')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(traducirError(error.message));
  return result;
}

export async function actualizarProveedor(id, data) {
  const { data: result, error } = await supabase
    .from('sys_proveedores')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(traducirError(error.message));
  return result;
}

export async function eliminarProveedor(id) {
  const { error } = await supabase.from('sys_proveedores').delete().eq('id', id);

  if (error) throw new Error(traducirError(error.message));
}