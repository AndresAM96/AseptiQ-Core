import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getDevolucionesData() {
  const [insumosRes, provsRes, movsRes] = await Promise.all([
    supabase.from('insumos').select('id, nombre, codigo, unidad_consumo').eq('estado_activo', true).order('nombre'),
    supabase.from('sys_proveedores').select('id, razon_social').order('razon_social'),
    supabase.from('movimientos')
      .select('*, insumos(nombre), sys_proveedores(razon_social)')
      .eq('tipo', 'salida')
      .not('proveedor_id', 'is', null)
      .order('fecha', { ascending: false }).limit(20)
  ]);

  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));
  if (provsRes.error) throw new Error(traducirError(provsRes.error.message));
  if (movsRes.error) throw new Error(traducirError(movsRes.error.message));

  return { insumos: insumosRes.data, proveedores: provsRes.data, devoluciones: movsRes.data };
}

export async function registrarDevolucion(data) {
  return await rpc('registrar_devolucion', {
    p_insumo_id: data.insumo_id,
    p_cantidad: data.cantidad,
    p_proveedor_id: data.proveedor_id,
    p_motivo: data.motivo,
    p_lote: data.lote || null
  });
}