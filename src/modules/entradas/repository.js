import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getEntradasData() {
  const [insumosRes, provsRes, movsRes] = await Promise.all([
    supabase.from('insumos').select('*').eq('estado_activo', true).order('nombre'),
    supabase.from('sys_proveedores').select('id, razon_social').order('razon_social'),
    // Traemos las últimas 20 entradas para la tabla inferior
    supabase.from('movimientos')
      .select('*, insumos(nombre, unidad_consumo), insumo_lotes(lote, sys_proveedores(razon_social))')
      .eq('tipo', 'entrada')
      .order('fecha', { ascending: false })
      .limit(20)
  ]);

  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));
  if (provsRes.error) throw new Error(traducirError(provsRes.error.message));
  if (movsRes.error) throw new Error(traducirError(movsRes.error.message));

  return {
    insumos: insumosRes.data,
    proveedores: provsRes.data,
    movimientos: movsRes.data
  };
}

export async function registrarEntrada(data) {
  return await rpc('registrar_entrada', {
    p_insumo_id: data.insumo_id,
    p_cantidad: data.cantidad, // En unidad de compra
    p_proveedor_id: data.proveedor_id || null,
    p_costo_unitario: data.costo_unitario || null,
    p_motivo: 'Entrada manual',
    p_lote_insumo: data.lote_insumo || null,
    p_fecha_vencimiento: data.fecha_vencimiento || null,
    p_estado_calidad: 'aprobado'
  });
}