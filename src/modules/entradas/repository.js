import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getEntradasData() {
  const [insumosRes, subRes, provsRes, opsRes, movsRes] = await Promise.all([
    supabase.from('insumos').select('*').eq('estado_activo', true).order('nombre'),
    supabase.from('subproductos').select('id, codigo, nombre, existencia_actual').eq('estado_activo', true).order('nombre'),
    supabase.from('sys_proveedores').select('id, razon_social').order('razon_social'),
    supabase.from('ordenes_semanales').select('id, numero_op, productos_terminados(nombre)').in('estado_op', ['Pendiente', 'En proceso']).order('numero_op'),
    supabase.from('movimientos')
      .select('*, insumos(nombre, unidad_consumo), insumo_lotes(lote, sys_proveedores(razon_social))')
      .eq('tipo', 'entrada')
      .order('fecha', { ascending: false })
      .limit(30)
  ]);

  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));
  if (movsRes.error) throw new Error(traducirError(movsRes.error.message));

  return {
    insumos: insumosRes.data || [],
    subproductos: subRes.data || [],
    proveedores: provsRes.data || [],
    ops: opsRes.data || [],
    movimientos: movsRes.data || []
  };
}

export async function registrarEntradaInsumo(data) {
  return await rpc('registrar_entrada', {
    p_insumo_id: data.insumo_id,
    p_cantidad: data.cantidad,
    p_proveedor_id: data.proveedor_id || null,
    p_costo_unitario: data.costo_unitario || null,
    p_motivo: 'Entrada manual',
    p_lote_insumo: data.lote_insumo || null,
    p_fecha_vencimiento: data.fecha_vencimiento || null,
    p_estado_calidad: data.estado_calidad || 'aprobado',
    p_numero_factura: data.numero_factura || null,
    p_numero_oc: data.numero_oc || null,
    p_numero_entrada_almacen: data.numero_entrada_almacen || null,
    p_cantidad_pendiente_oc: data.cantidad_pendiente_oc || null,
    p_observaciones_calidad: data.observaciones_calidad || null
  });
}

export async function registrarProduccionSub(data) {
  // 1. Ejecutamos la producción
  const result = await rpc('producir_subproducto', {
    p_id: data.subproducto_id,
    p_cantidad: data.cantidad,
    p_lote: data.lote_produccion || null,
    p_motivo: data.motivo || null
  });

  // 2. Si se asignó a una OP, actualizamos el último movimiento de ese subproducto
  if (data.orden_id) {
    const { data: lastMov } = await supabase
      .from('movimientos')
      .select('id')
      .eq('subproducto_id', data.subproducto_id)
      .eq('tipo', 'produccion_subproducto')
      .order('fecha', { ascending: false })
      .limit(1);

    if (lastMov && lastMov.length > 0) {
      await supabase.from('movimientos')
        .update({ orden_id: data.orden_id })
        .eq('id', lastMov[0].id);
    }
  }
  return result;
}