import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getDespachosData() {
  const [prodsRes, despachosRes] = await Promise.all([
    supabase.from('productos_terminados').select('codigo_pt, nombre, existencia_actual, unidades_por_caja').eq('estado_activo', true).order('nombre'),
    supabase.from('despachos').select('*').order('fecha', { ascending: false }).limit(30)
  ]);

  if (prodsRes.error) throw new Error(traducirError(prodsRes.error.message));
  if (despachosRes.error) throw new Error(traducirError(despachosRes.error.message));

  return { productos: prodsRes.data, despachos: despachosRes.data };
}

// Obtiene los lotes disponibles de un PT ordenados por FIFO
export async function getLotesFIFO(codigo_pt) {
  const { data, error } = await supabase
    .from('lotes_pt')
    .select('*')
    .eq('codigo_pt', codigo_pt)
    .eq('estado', 'en_bodega')
    .gt('cantidad_actual', 0)
    .order('fecha_produccion', { ascending: true }); // FIFO

  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function registrarDespacho(data) {
  return await rpc('registrar_despacho', {
    p_codigo_pt: data.codigo_pt,
    p_cantidad: data.cantidad,
    p_cliente: data.cliente,
    p_lote_op: data.lote_op,
    p_lote_eo: data.lote_eo || null,
    p_consecutivo: data.consecutivo || null,
    p_oc: data.oc || null,
    p_fecha: data.fecha,
    p_fecha_vencimiento: data.fecha_vencimiento || null,
    p_observaciones: data.observaciones || null
  });
}