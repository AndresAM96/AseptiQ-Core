/**
 * Funciones puras de formateo. No dependen del DOM ni de la red.
 * Portables 1:1 a C# (String.Format / CultureInfo).
 */

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str - Texto a escapar.
 * @returns {string} Texto seguro para insertar en HTML.
 */
export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, (m) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m];
  });
}

/**
 * Formatea un número como moneda colombiana (COP).
 * @param {number} n - Valor numérico.
 * @returns {string} Ej: "$ 1.500,50"
 */
export function money(n) {
  return (Number(n) || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2,
  });
}

/**
 * Formatea un número con separadores de miles.
 * @param {number} n - Valor numérico.
 * @param {number} [d=2] - Decimales máximos.
 * @returns {string} Ej: "1.500,25" o "—" si es inválido.
 */
export function num(n, d = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: d });
}

/**
 * Formatea un valor para exportación CSV (coma decimal).
 * @param {number|string} v - Valor.
 * @param {number} [dec=2] - Decimales.
 * @returns {string}
 */
export function fmtCSV(v, dec = 2) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v.toFixed(dec).replace('.', ',');
  return v;
}

/**
 * Devuelve la fecha en formato YYYY-MM-DD respetando la zona horaria local.
 * @param {Date} [dateObj=new Date()] - Fecha a formatear.
 * @returns {string} Ej: "2026-11-15"
 */
export function fechaLocalISO(dateObj) {
  const d = dateObj ? new Date(dateObj) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}