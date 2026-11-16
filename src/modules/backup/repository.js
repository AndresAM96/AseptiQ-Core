import { supabase } from '../../shared/http/client.js';
import { apiAll } from '../../shared/http/apiAll.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getBackupLog() {
  const { data, error } = await supabase
    .from('backup_log')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(10);

  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function generarDatosBackup(rangoFecha) {
  let fechaCorte = null;
  const ahora = new Date();

  if (rangoFecha === '30d') { fechaCorte = new Date(ahora); fechaCorte.setDate(ahora.getDate() - 30); }
  else if (rangoFecha === '6m') { fechaCorte = new Date(ahora); fechaCorte.setMonth(ahora.getMonth() - 6); }
  else if (rangoFecha === '1a') { fechaCorte = new Date(ahora); fechaCorte.setFullYear(ahora.getFullYear() - 1); }

  const filterMovs = fechaCorte ? { fecha: `gte.${fechaCorte.toISOString()}` } : {};

  // Tablas a exportar (puedes agregar más según necesites)
  const tablas = [
    { name: 'insumos', query: () => apiAll('insumos', '*', {}, 'codigo') },
    { name: 'subproductos', query: () => apiAll('subproductos', '*', {}, 'codigo') },
    { name: 'productos_terminados', query: () => apiAll('productos_terminados', '*', {}, 'codigo_pt') },
    { name: 'proveedores', query: () => apiAll('sys_proveedores', '*', {}, 'razon_social') },
    { name: 'bom_recetas', query: () => apiAll('bom_recetas', '*', {}, 'id') },
    { name: 'ordenes_semanales', query: () => apiAll('ordenes_semanales', '*', {}, 'fecha_creacion') },
    { name: 'entregas_op', query: () => apiAll('entregas_op', '*', {}, 'fecha') },
    { name: 'insumo_lotes', query: () => apiAll('insumo_lotes', '*', {}, 'id') },
    { name: 'lotes_pt', query: () => apiAll('lotes_pt', '*', {}, 'fecha_produccion') },
    { name: 'movimientos', query: () => apiAll('movimientos', '*', filterMovs, 'fecha') }
  ];

  const result = {};
  for (const t of tablas) {
    result[t.name] = await t.query();
  }

  return result;
}

export async function registrarLogBackup(tablas, rango, totalRegistros, tamanoBytes) {
  const { error } = await supabase.from('backup_log').insert([{
    usuario_email: (await supabase.auth.getUser()).data.user?.email,
    tablas_incluidas: tablas,
    rango_movimientos: rango,
    total_registros: totalRegistros,
    tamano_bytes: tamanoBytes
  }]);

  if (error) {
    console.error('Error al registrar log de backup:', error);
    throw new Error(traducirError(error.message));
  }
}