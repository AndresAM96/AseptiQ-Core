import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getDevolucionesData() {
  const [insumosRes, productosRes, provsRes, devProvRes, devClienteRes, lotesRes] = await Promise.all([
    supabase
      .from('insumos')
      .select('id, nombre, unidad_consumo, existencia_actual')
      .eq('estado_activo', true)
      .order('nombre'),
    supabase
      .from('productos_terminados')
      .select('codigo_pt, nombre, existencia_actual')
      .eq('estado_activo', true)
      .order('nombre'),
    supabase.from('sys_proveedores').select('id, razon_social').order('razon_social'),
    // Devoluciones a proveedor
    supabase.from('movimientos')
      .select('*, insumos(nombre, codigo, unidad_consumo), insumo_lotes(lote, proveedor_id, sys_proveedores(razon_social))')
      .eq('tipo', 'devolucion_proveedor')
      .order('fecha', { ascending: false }).limit(50),
    // Devoluciones de cliente (tabla devoluciones_pt)
    supabase
      .from('devoluciones_pt')
      .select('*, productos_terminados(nombre)')
      .order('fecha', { ascending: false }).limit(30),
    // Traemos los lotes activos para el selector, incluyendo su proveedor
    supabase.from('insumo_lotes')
      .select('insumo_id, lote, cantidad_actual, proveedor_id, sys_proveedores(id, razon_social)')
      .gt('cantidad_actual', 0)
  ]);

  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));
  if (productosRes.error) throw new Error(traducirError(productosRes.error.message));

  return {
    insumos: insumosRes.data || [],
    productos: productosRes.data || [],
    proveedores: provsRes.data || [],
    devProveedores: devProvRes.data || [],
    devClientes: devClienteRes.data || [],
    lotes: lotesRes.data || []
  };
}

export async function registrarDevolucionProveedor(data) {
  return await rpc('registrar_devolucion', {
    p_insumo_id: data.insumo_id,
    p_cantidad: data.cantidad,
    p_proveedor_id: data.proveedor_id,
    p_motivo: data.motivo,
    p_lote: data.lote || null,
  });
}

export async function registrarDevolucionCliente(data) {
  return await rpc('registrar_devolucion_pt', {
    p_codigo_pt: data.codigo_pt,
    p_cantidad: data.cantidad,
    p_estado_producto: data.estado_producto,
    p_motivo: data.motivo,
    p_lote_op: data.lote_op || null,
    p_lote_eo: data.lote_eo || null,
    p_fecha_vencimiento: data.fecha_vencimiento || null
  });
}