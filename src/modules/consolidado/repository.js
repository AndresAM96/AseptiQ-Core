import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function generarConsolidado(desde, hasta) {
  // 1. Traemos OPs y todos los insumos
  const [opsRes, insumosRes] = await Promise.all([
    supabase.from('ordenes_semanales').select('*').in('estado_op', ['Pendiente', 'En proceso']),
    supabase
      .from('insumos')
      .select('id, codigo, nombre, existencia_actual, unidad_consumo, costo_unitario'),
  ]);

  if (opsRes.error) throw new Error(traducirError(opsRes.error.message));

  const ops = opsRes.data || [];
  const insumos = insumosRes.data || [];

  // 2. Filtrar OPs por el rango de fechas
  const opsEnRango = ops.filter((o) => {
    const fIni = o.fecha_programada || o.fecha_creacion.split('T')[0];
    const fFin = o.fecha_fin_programada || fIni;
    return fIni <= hasta && fFin >= desde;
  });

  if (opsEnRango.length === 0) return { resultado: [], totalOps: 0 };

  // 3. Calcular requerimientos
  const requerimientos = {};

  for (const op of opsEnRango) {
    const pendiente = op.cantidad_proyectada - (op.cantidad_producida || 0);
    if (pendiente <= 0) continue;

    try {
      // Usamos el RPC para simular la explosión de materiales
      const sim = await rpc('simular_consumo_pt', {
        p_codigo_pt: op.codigo_pt,
        p_cantidad: pendiente,
      });
      const reqs = sim.insumo_req || {};

      for (const [id, cant] of Object.entries(reqs)) {
        requerimientos[id] = (requerimientos[id] || 0) + cant;
      }
    } catch (e) {
      console.warn('Error simulando OP', op.numero_op, e);
    }
  }

  // 4. Cruzar con stock real
  const resultado = Object.keys(requerimientos)
    .map((id) => {
      const ins = insumos.find((i) => i.id === id);
      const requerido = requerimientos[id];
      const stock = ins ? ins.existencia_actual : 0;
      const faltante = Math.max(0, requerido - stock);
      return { ins, requerido, stock, faltante };
    })
    .filter((r) => r.ins)
    .sort((a, b) => b.faltante - a.faltante || b.requerido - a.requerido);

  return { resultado, totalOps: opsEnRango.length };
}