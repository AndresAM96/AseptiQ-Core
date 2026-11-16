/**
 * Escanea el DOM buscando tablas y les agrega las clases necesarias
 * para que en móvil se conviertan en tarjetas (usando data-label).
 */
export function initResponsiveTables() {
  function procesarTabla(tabla) {
    if (!tabla || tabla.dataset.responsiveReady === '1') return;

    // Fila de encabezados
    const filas = tabla.querySelectorAll('tr');
    let filaHeader = null;
    for (let i = 0; i < filas.length; i++) {
      if (filas[i].querySelector('th')) { filaHeader = filas[i]; break; }
    }
    if (!filaHeader) return;

    const headers = Array.from(filaHeader.querySelectorAll('th')).map(th =>
      th.textContent.replace(/[▲▼]/g, '').trim()
    );
    if (!headers.length) return;

    tabla.classList.add('responsive-table');
    filaHeader.classList.add('row-header');

    filas.forEach(tr => {
      if (tr === filaHeader) return;
      if (tr.querySelector('th')) { tr.classList.add('row-header'); return; }

      Array.from(tr.children).forEach((td, i) => {
        if (headers[i] && headers[i] !== '') {
          td.setAttribute('data-label', headers[i]);
        }
      });
    });
    tabla.dataset.responsiveReady = '1';
  }

  function procesarTodo() {
    document.querySelectorAll('table').forEach(procesarTabla);
  }

  // Procesar las que ya existen
  procesarTodo();

  // Observar cambios en el DOM para tablas nuevas (cuando cambias de módulo)
  const obs = new MutationObserver((muts) => {
    let hayNuevas = false;
    muts.forEach(m => {
      if (!m.addedNodes || !m.addedNodes.length) return;
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'TABLE' || (n.querySelector && n.querySelector('table'))) hayNuevas = true;
      });
    });
    if (hayNuevas) procesarTodo();
  });

  obs.observe(document.body, { childList: true, subtree: true });
}