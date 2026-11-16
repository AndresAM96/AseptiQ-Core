import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getOrdenesCompraData() {
  const { data, error } = await supabase.from('movimientos')
    .select('*, insumo_lotes(proveedor_id, sys_proveedores(razon_social)), insumos(nombre)')
    .eq('tipo', 'entrada')
    .not('documento_numero', 'is', null); // Asumimos que el doc_numero es la OC

  if (error) throw new Error(traducirError(error.message));

  // Agrupar por OC
  const agrupado = {};
  data.forEach(m => {
    const oc = m.documento_numero.trim();
    if (!agrupado[oc]) {
      agrupado[oc] = {
        oc,
        proveedor: m.insumo_lotes?.sys_proveedores?.razon_social || '—',
        fecha: m.fecha,
        items: [],
        pendiente: 0
      };
    }
    agrupado[oc].items.push(m);

    // La fecha más reciente define el saldo pendiente
    if (new Date(m.fecha) >= new Date(agrupado[oc].fecha)) {
      agrupado[oc].fecha = m.fecha;
      agrupado[oc].pendiente = m.cantidad_pendiente_oc || 0;
    }
  });

  return Object.values(agrupado).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}