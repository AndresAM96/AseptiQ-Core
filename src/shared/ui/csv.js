import { toast } from './toast.js';

export function exportarCSV(nombre, headers, filas) {
  const escStr = (v) => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (s.includes('"') || s.includes(';') || s.includes('\n') || s.includes('\r')) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const lineas = [];
  lineas.push(headers.map(escStr).join(';'));
  filas.forEach(f => lineas.push(f.map(escStr).join(';')));

  const csv = '\uFEFF' + lineas.join('\r\n'); // BOM UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast(`Archivo exportado: ${nombre}.csv`, 'success');
}