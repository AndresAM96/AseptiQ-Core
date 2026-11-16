import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function generarConsolidado() {
  // 1. Traemos las OPs activas y todos los insumos
  const [opsRes, insumosRes] = await Promise.all([
    supabase.from('ordenes_semanales')
      .select('*')
      .in('estado_op', ['Pendiente', 'En proceso']),
    supabase.from('insumos').select('id, codigo, nombre, existencia_actual, unidad_consumo, costo_unitario')
  ]);

  if (opsRes.error) throw new Error(traducirError(opsRes.error.message));
  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));

  const ops = opsRes.data;
  const insumos = insumosRes.data;

  // 2. Agregar requerimientos
  const requerimientos = {}; // { insumo_id: cantidad_total }

  for (const op of ops) {
    const pendiente = op.cantidad_proyectada - op.cantidad_producida;
    if (pendiente <= 0) continue;

    try {
      // Usamos el RPC de simulación para cada OP
      const simulacion = await rpc('simular_consumo_pt', {
        p_codigo_pt: op.codigo_pt,
        p_cantidad: pendiente
      });

      const reqs = simulacion.insumo_req || {};
      for (const [insId, cant] of Object.entries(reqs)) {
        requerimientos[insId] = (requerimientos[insId] || 0) + cant;
      }
    } catch (err) {
      console.warn(`Error simulando OP ${op.numero_op}`, err);
    }
  }

  // 3. Armar resultado final cruzando con el stock
  const resultado = Object.keys(requerimientos).map(insId => {
    const ins = insumos.find(i => i.id === insId);
    const requerido = requerimientos[insId];
    const stock = ins ? ins.existencia_actual : 0;
    const faltante = Math.max(0, requerido - stock);

    return { ins, requerido, stock, faltante };
  }).filter(r => r.ins).sort((a, b) => b.faltante - a.faltante);

  return { resultado, totalOps: ops.length };
}