import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getUsuarios() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('email');

  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function actualizarUsuario(userId, campos) {
  const { error } = await supabase
    .from('profiles')
    .update(campos)
    .eq('user_id', userId);

  if (error) throw new Error(traducirError(error.message));
}