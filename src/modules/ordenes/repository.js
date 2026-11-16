import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getOrdenesData() {
  const [prodsRes, opsRes] = await Promise.all([
    supabase.from('productos_terminados').select('codigo_pt, nombre, unidades_por_caja').eq('estado_activo', true).order('nombre'),
    supabase.from('ordenes_semanales').select('*').order('fecha_creacion', { ascending: false }).limit(50)
  ]);

  if (prodsRes.error) throw new Error(traducirError(prodsRes.error.message));
  if (opsRes.error) throw new Error(traducirError(opsRes.error.message));

  return { productos: prodsRes.data, ordenes: opsRes.data };
}

export async function getSiguienteOP() {
  return await rpc('siguiente_codigo', { p_prefijo: 'OP-', p_tabla: 'ordenes_semanales' });
}

export async function simularCobertura(codigo_pt, cantidad) {
  return await rpc('simular_consumo_pt', { p_codigo_pt: codigo_pt, p_cantidad: cantidad });
}

export async function confirmarOrden(data) {
  return await rpc('confirmar_orden', {
    p_codigo_pt: data.codigo_pt,
    p_cantidad: data.cantidad,
    p_estado_cobertura: data.estado_cobertura,
    p_detalle: data.detalle,
    p_numero_op: data.numero_op,
    p_prioridad: data.prioridad,
    p_fecha_programada: data.fecha_programada || null,
    p_fecha_fin_programada: data.fecha_fin_programada || null
  });
}