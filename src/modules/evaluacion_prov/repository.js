import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getEvaluacionData() {
  const [provsRes, comprasRes, devsRes, evalsRes] = await Promise.all([
    supabase.from('sys_proveedores').select('*').order('razon_social'),
    // Compras agrupadas por proveedor
    supabase.from('movimientos').select('insumo_lotes(proveedor_id), cantidad, costo_unitario_momento').eq('tipo', 'entrada').not('insumo_lote_id', 'is', null),
    // Devoluciones
    supabase.from('movimientos').select('insumo_lotes(proveedor_id), cantidad, costo_unitario_momento').eq('tipo', 'salida').ilike('observaciones', '%devolución%'),
    // Evaluaciones formales ya guardadas
    supabase.from('evaluaciones_proveedores').select('*').order('fecha', { ascending: false })
  ]);

  if (provsRes.error) throw new Error(traducirError(provsRes.error.message));

  const proveedores = provsRes.data;
  const evaluaciones = evalsRes.data;

  // Calcular métricas
  const stats = {};
  proveedores.forEach(p => {
    stats[p.id] = { comprado: 0, devuelto: 0, pedidos: 0 };
  });

  comprasRes.data.forEach(c => {
    const provId = c.insumo_lotes?.proveedor_id;
    if (provId && stats[provId]) {
      stats[provId].comprado += (Number(c.cantidad) * Number(c.costo_unitario_momento));
      stats[provId].pedidos++;
    }
  });

  devsRes.data.forEach(d => {
    const provId = d.insumo_lotes?.proveedor_id;
    if (provId && stats[provId]) {
      stats[provId].devuelto += (Number(d.cantidad) * Number(d.costo_unitario_momento));
    }
  });

  const resultado = proveedores.map(p => {
    const s = stats[p.id];
    const tasaDev = s.comprado > 0 ? (s.devuelto / s.comprado) * 100 : 0;
    const ultimaEval = evaluaciones.find(e => e.proveedor_id === p.id);
    return { ...p, ...s, tasaDev, ultimaEval };
  }).filter(p => p.pedidos > 0).sort((a, b) => b.comprado - a.comprado);

  return { proveedores: resultado, evaluaciones };
}

export async function guardarEvaluacion(data) {
  const { error } = await supabase.from('evaluaciones_proveedores').insert([data]);
  if (error) throw new Error(traducirError(error.message));
}