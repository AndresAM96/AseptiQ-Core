import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getCajas() {
  const { data, error } = await supabase.from('cajas_ubicacion').select('*').order('actualizado_en', { ascending: false }).limit(50);
  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function guardarUbicacion(data) {
  const { error } = await supabase.from('cajas_ubicacion').upsert({
    codigo_caja: data.codigo,
    codigo_pt: data.codigo.split('-')[0], // Asume formato PT-0001-C001...
    ubicacion: data.ubicacion,
    estado: data.estado,
    usuario_email: (await supabase.auth.getUser()).data.user?.email,
    actualizado_en: new Date().toISOString()
  }, { onConflict: 'codigo_caja' });

  if (error) throw new Error(traducirError(error.message));
}