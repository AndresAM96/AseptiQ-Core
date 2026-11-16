import { supabase } from '../http/client.js';
import { estadoInsumo } from '../../core/estadoInsumo.js';
import { num } from '../../core/formatters.js';
import { icono } from './icons.js';

let _notifData = null;
let _notifAbierto = false;

export async function initNotifications(container, config) {
  const btnCampana = container.querySelector('#btn-campana');
  const overlay = container.querySelector('#notifOverlay');
  const badge = container.querySelector('#campana-badge');
  const body = container.querySelector('#notifBody');
  const headerMeta = container.querySelector('#notifHeaderMeta');

  if (!btnCampana || !overlay) return;

  // 1. Cargar datos reales de Supabase
  try {
    const [insumosRes, ordenesRes] = await Promise.all([
      supabase.from('insumos').select('*').eq('estado_activo', true),
      supabase.from('ordenes_semanales').select('*').in('estado_op', ['Pendiente', 'En proceso'])
    ]);

    const insumos = insumosRes.data || [];
    const ordenes = ordenesRes.data || [];
    const ahora = Date.now();

    // Clasificar insumos
    const urgentes = [];
    const reorden = [];
    insumos.forEach(i => {
      const est = estadoInsumo(i, config);
      if (est === 'Urgente') urgentes.push(i);
      else if (est === 'Reorden') reorden.push(i);
    });

    // OPs vencidas (+5 días)
    const opsVencidas = ordenes.filter(o => {
      const dias = (ahora - new Date(o.fecha_creacion).getTime()) / (1000 * 60 * 60 * 24);
      return dias >= 5;
    });

    _notifData = { urgentes, reorden, opsVencidas };
    const total = urgentes.length + reorden.length + opsVencidas.length;

    // Actualizar Badge
    if (total > 0) {
      badge.style.display = 'flex';
      badge.textContent = total > 99 ? '99+' : total;
      if (urgentes.length === 0) badge.classList.add('warning');
      btnCampana.classList.add('has-alerts');
    } else {
      badge.style.display = 'none';
      btnCampana.classList.remove('has-alerts');
    }

    // 2. Renderizar panel
    renderPanel(body, headerMeta);

  } catch (err) {
    console.error('Error cargando notificaciones', err);
  }

  // 3. Eventos
  btnCampana.onclick = (e) => {
    e.stopPropagation();
    if (_notifAbierto) cerrar();
    else abrir(overlay, container);
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) cerrar();
  };
}

function renderPanel(body, headerMeta) {
  if (!_notifData) return;
  const { urgentes, reorden, opsVencidas } = _notifData;
  const total = urgentes.length + reorden.length + opsVencidas.length;

  headerMeta.textContent = total > 0 ? `${total} pendiente${total === 1 ? '' : 's'}` : 'Todo en orden';

  let html = '';

  if (urgentes.length > 0) {
    html += `<div class="notif-section">
      <div class="notif-section-title">${icono('alert-circle','sm')} Stock urgente · ${urgentes.length}</div>
      ${urgentes.slice(0, 5).map(i => `
        <div class="notif-item danger" data-goto="insumos">
          <div class="notif-item-icon">${icono('alert-circle')}</div>
          <div class="notif-item-content">
            <div class="notif-item-title">${i.nombre} (${num(i.existencia_actual)} ${i.unidad_consumo || 'u'})</div>
            <div class="notif-item-sub">Por debajo del umbral · objetivo ${num(i.punto_reorden)}</div>
          </div>
        </div>
      `).join('')}
      ${urgentes.length > 5 ? `<div class="notif-item info" data-goto="insumos" style="color:var(--info);"><div class="notif-item-content">Ver los ${urgentes.length - 5} restantes</div></div>` : ''}
    </div>`;
  }

  if (opsVencidas.length > 0) {
    html += `<div class="notif-section">
      <div class="notif-section-title">${icono('clock','sm')} OPs pendientes +5 días · ${opsVencidas.length}</div>
      ${opsVencidas.slice(0, 5).map(o => `
        <div class="notif-item warning" data-goto="ordenes">
          <div class="notif-item-icon">${icono('clock')}</div>
          <div class="notif-item-content">
            <div class="notif-item-title">${o.numero_op || 'OP'} · ${o.codigo_pt}</div>
            <div class="notif-item-sub">Pendiente desde ${new Date(o.fecha_creacion).toLocaleDateString('es-CO')}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  if (reorden.length > 0) {
    html += `<div class="notif-section">
      <div class="notif-section-title">${icono('alert-triangle','sm')} En reorden · ${reorden.length}</div>
      ${reorden.slice(0, 5).map(i => `
        <div class="notif-item warning" data-goto="insumos">
          <div class="notif-item-icon">${icono('alert-triangle')}</div>
          <div class="notif-item-content">
            <div class="notif-item-title">${i.nombre}</div>
            <div class="notif-item-sub">Existencia ${num(i.existencia_actual)} · cerca del mínimo</div>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  if (html === '') {
    html = `<div class="notif-empty">
      <span style="display:block; font-size:32px; opacity:.4; margin-bottom:10px;">${icono('check-circle','xl')}</span>
      Todo en orden. No hay notificaciones pendientes.
    </div>`;
  }

  body.innerHTML = html;

  // Bind de navegación al hacer clic en un item
  body.querySelectorAll('[data-goto]').forEach(el => {
    el.onclick = () => {
      const tab = el.dataset.goto;
      cerrar();
      window.location.hash = `#/${tab}`;
    };
  });
}

function abrir(overlay, container) {
  overlay.classList.add('open');
  _notifAbierto = true;
  // Ajustar posición si el sidebar está colapsado
  const panel = overlay.querySelector('.notif-panel');
  if (panel) {
    const sidebar = container.querySelector('#sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) {
      panel.style.left = '80px';
    } else {
      panel.style.left = '240px';
    }
  }
}

function cerrar() {
  const overlay = document.getElementById('notifOverlay');
  if (overlay) overlay.classList.remove('open');
  _notifAbierto = false;
}