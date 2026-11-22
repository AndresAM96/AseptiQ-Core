export const PRINT_CSS_BASE = `
  *{box-sizing:border-box;}
  body{font-family:'Helvetica','Arial',sans-serif;color:#111;background:#fff;margin:0;padding:0;font-size:10.5pt;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .print-doc{padding:0;}
  .print-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:10px;border-bottom:2px solid #111;margin-bottom:16px;}
  .print-brand{display:flex;align-items:center;gap:12px;}
  .print-company{font-size:11.5pt;font-weight:700;letter-spacing:-.01em;line-height:1.2;}
  .print-company small{display:block;font-size:8.5pt;font-weight:400;color:#666;margin-top:2px;letter-spacing:.02em;}
  .print-title{text-align:right;}
  .print-title h1{margin:0;font-size:14pt;font-weight:700;text-transform:uppercase;letter-spacing:.03em;}
  .print-title .meta{font-size:9pt;color:#555;margin-top:3px;line-height:1.4;}
  .print-section-title{font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#333;margin:12px 0 6px;padding-bottom:3px;border-bottom:1px solid #ccc;page-break-after:avoid;}
  .print-info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 20px;font-size:10pt;margin-bottom:14px;}
  .print-info-grid .lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.05em;color:#888;font-weight:600;margin-bottom:2px;}
  .print-info-grid .val{font-weight:500;color:#111;overflow-wrap:anywhere;}
  table.print-table{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:14px;}
  table.print-table th{text-align:left;background:#efefef;color:#222;font-weight:700;font-size:8pt;text-transform:uppercase;letter-spacing:.03em;padding:4px 6px;border:1px solid #bbb;}
  table.print-table td{padding:4px 6px;border:1px solid #ddd;vertical-align:top;font-size:9pt;}
  table.print-table td.num, table.print-table th.num{text-align:right;font-family:'Courier New',monospace;white-space:nowrap;}
  table.print-table tr:nth-child(even) td{background:#fafafa;}
  .print-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin-top:20px;padding-top:12px;page-break-inside:avoid;break-inside:avoid;}
  .print-signature{border-top:1px solid #111;padding-top:5px;font-size:9pt;text-align:center;}
  .print-signature .name{font-weight:700;color:#111;text-transform:uppercase;letter-spacing:.03em;}
  .print-signature .role{color:#666;font-size:8.5pt;margin-top:2px;}
  .print-qr-block{display:flex;align-items:center;gap:10px;font-size:8.5pt;color:#555;margin-bottom:14px;padding:8px 10px;border:1px dashed #bbb;border-radius:4px;}
  .print-footer{display:flex;justify-content:space-between;font-size:8pt;color:#888;border-top:1px solid #ddd;padding-top:6px;margin-top:24px;}
  @page{ size:letter portrait; margin:14mm 12mm; }
  @media print{
    body{background:#fff !important;}
    table.print-table tr{page-break-inside:avoid;}
    table.print-table{page-break-inside:auto;}
    .print-signatures{page-break-inside:avoid;page-break-before:avoid;break-before:avoid;}
    .print-header,.print-info-grid,.print-qr-block{page-break-after:avoid;}
    .print-signatures + .print-footer{page-break-before:avoid;}
  }
`;

export function imprimirHTML(contenidoHTML, tituloVentana, cssExtra) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed; right:0; bottom:0; width:0; height:0; border:0; visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>' +
      (tituloVentana || 'Imprimir') +
      '</title>'
  );
  doc.write('<style>' + PRINT_CSS_BASE + (cssExtra || '') + '</style>');
  doc.write('</head><body><div class="print-doc">');
  doc.write(contenidoHTML);
  doc.write('</div></body></html>');
  doc.close();

  setTimeout(function () {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn('Error al imprimir:', e);
    }
    setTimeout(function () {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 2000);
  }, 450);
}