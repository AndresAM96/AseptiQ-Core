import { esc } from '../../core/formatters.js';
import { icono } from '../../shared/ui/icons.js';
import { toast } from '../../shared/ui/toast.js';

export function renderBodega(container, cajas) {
  // Detección definitiva: Es móvil si el navegador es de celular/tablet O si la pantalla es pequeña
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.matchMedia("(max-width: 768px)").matches;

  // Agrupar cajas por ubicación para el mapa
  const ubicaciones = {};
  cajas.forEach((c) => {
    const ub = c.ubicacion || 'Sin ubicación asignada';
    if (!ubicaciones[ub]) ubicaciones[ub] = [];
    ubicaciones[ub].push(c);
  });

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Bodega PT</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Escaneá cajas o visualizá el mapa de ubicaciones.</p>
      </div>
      <button id="btn-refresh-bod" title="Actualizar datos" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary); width: 34px; height: 34px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
        ${icono('clock', 'sm')}
      </button>
    </div>

    <!-- Pestañas -->
    <div class="panel-collapsible" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; margin-bottom: 16px;">
      <div style="display: flex; gap: 6px;">
        <button id="tab-scan" style="background: var(--surface-3); color: var(--text-primary); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          ${icono('eye', 'sm')} Escanear Caja
        </button>
        <button id="tab-map" style="background: transparent; color: var(--text-secondary); border: 1px solid transparent; padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          ${icono('box', 'sm')} Mapa Visual
        </button>
      </div>
    </div>

    <!-- Contenido: Escáner -->
    <div id="wrap-scan" class="grid-cols-2" style="gap: 24px; align-items: start;">
      
      <!-- Panel Izquierdo -->
      <div class="panel-collapsible" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <div class="panel-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Escanear Caja</h3>
        </div>
        <div style="padding: 20px;">
          
          <!-- Vista PC (Pistola) -->
          <div id="scanPC" style="display: ${isMobile ? 'none' : 'block'}; text-align: center;">
            <div style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;">⌨️</div>
            <label style="font-size: 13px; margin-bottom: 8px; display: block; color: var(--text-secondary);">Usa tu pistola láser o escribe el código</label>
            <input type="text" id="scanInput" placeholder="Clic aquí y escanea el código..." style="width: 100%; text-align: center; font-size: 18px; font-family: var(--font-mono); padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary);">
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px;">El campo se limpia automáticamente.</div>
          </div>

          <!-- Vista Móvil (Cámara) -->
          <div id="scanMobile" style="display: ${isMobile ? 'block' : 'none'};">
            <div id="reader" style="width: 100%; max-width: 400px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); display: none;"></div>
            <button id="btnStartScan" class="full" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font-weight: 600; border: none; cursor: pointer; margin-bottom: 8px;">Encender Cámara</button>
            <button id="btnCancelScan" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--danger-bg); color: var(--danger); font-weight: 600; border: none; cursor: pointer; display: none;">Cancelar escaneo</button>
          </div>

          <!-- Panel Resultado -->
          <div id="scanResult" style="display: none; margin-top: 24px; padding-top: 24px; border-top: 1px dashed var(--border);">
            <div style="background: var(--success-bg); border: 1px solid var(--success); border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center;">
              <div style="font-size: 12px; color: var(--success); margin-bottom: 4px;">Caja escaneada:</div>
              <div id="scanCode" style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--success);"></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div>
                <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Ubicación Física</label>
                <input type="text" id="scanLocation" placeholder="Ej: Estante A - Nivel 2" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Estado de la caja</label>
                <select id="scanStatus" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
                  <option value="En bodega">En bodega</option>
                  <option value="Despachada">Despachada</option>
                  <option value="Cuarentena">En cuarentena</option>
                </select>
              </div>
              <button id="btnSaveScan" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--success); color: #fff; font-weight: 600; border: none; cursor: pointer;">Guardar Ubicación</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel Derecho (Historial) -->
      <div class="panel-collapsible" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <div class="panel-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Últimos Movimientos</h3>
        </div>
        <div style="padding: 12px 18px; border-bottom: 1px solid var(--border);">
          <input type="text" id="buscar_bod" placeholder="Buscar por código o ubicación..." style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
          <table id="tablaBod" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Caja</th>
                <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Ubicación</th>
                <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${
                cajas.length === 0
                  ? '<tr><td colspan="3" style="padding: 24px; text-align: center; color: var(--text-muted);">Aún no hay cajas ubicadas.</td></tr>'
                  : cajas
                      .map(
                        (c) => `
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 11px;">${esc(c.codigo_caja)}</td>
                  <td style="padding: 10px 12px; font-weight: 500;">${esc(c.ubicacion)}</td>
                  <td style="padding: 10px 12px;">
                    <span class="badge ${c.estado === 'En bodega' ? 'success' : c.estado === 'Cuarentena' ? 'warning' : 'neutral'}">${esc(c.estado)}</span>
                  </td>
                </tr>
              `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Contenido: Mapa Visual -->
    <div id="wrap-map" style="display: none;">
      <div class="panel-collapsible" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <div class="panel-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border);">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Mapa de Bodega</h3>
        </div>
        <div style="padding: 12px 18px; border-bottom: 1px solid var(--border);">
          <input type="text" id="buscar_mapa" placeholder="Buscar por ubicación..." style="width: 100%; max-width: 300px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        
        <div class="grid-cols-3" style="padding: 18px; gap: 16px;">
          ${
            Object.keys(ubicaciones).length === 0
              ? '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;">No hay ubicaciones registradas.</div>'
              : Object.keys(ubicaciones)
                  .sort()
                  .map(
                    (ub) => `
            <div class="map-card" data-ubicacion="${esc(ub.toLowerCase())}" style="background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
              <div style="padding: 10px 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--surface-3);">
                <div style="font-weight: 600; font-size: 13px; color: var(--accent);">📍 ${esc(ub)}</div>
                <div style="font-size: 11px; background: var(--accent); color: var(--accent-ink); padding: 2px 6px; border-radius: 10px; font-weight: bold;">${ubicaciones[ub].length}</div>
              </div>
              <div style="padding: 10px 12px; max-height: 150px; overflow-y: auto;">
                ${ubicaciones[ub]
                  .map(
                    (c) => `
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding: 4px 0; font-size: 11px;">
                    <span style="font-family: var(--font-mono);">${esc(c.codigo_caja)}</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
                  )
                  .join('')
          }
        </div>
      </div>
    </div>
  `;

  // --- LÓGICA DE LA VISTA ---

  // Cambio de pestañas
  const tabScan = container.querySelector('#tab-scan');
  const tabMap = container.querySelector('#tab-map');
  const wrapScan = container.querySelector('#wrap-scan');
  const wrapMap = container.querySelector('#wrap-map');

  tabScan.onclick = () => {
    tabScan.style.cssText =
      'background: var(--surface-3); color: var(--text-primary); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;';
    tabMap.style.cssText =
      'background: transparent; color: var(--text-secondary); border: 1px solid transparent; padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer;';
    wrapScan.style.display = 'grid';
    wrapMap.style.display = 'none';
  };

  tabMap.onclick = () => {
    tabMap.style.cssText =
      'background: var(--surface-3); color: var(--text-primary); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;';
    tabScan.style.cssText =
      'background: transparent; color: var(--text-secondary); border: 1px solid transparent; padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer;';
    wrapScan.style.display = 'none';
    wrapMap.style.display = 'block';
  };

  // Buscadores
  const inputBuscar = container.querySelector('#buscar_bod');
  inputBuscar.oninput = () => {
    const q = inputBuscar.value.toLowerCase();
    container.querySelectorAll('#tablaBod tbody tr').forEach((tr) => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  const inputMapa = container.querySelector('#buscar_mapa');
  inputMapa.oninput = () => {
    const q = inputMapa.value.toLowerCase();
    container.querySelectorAll('.map-card').forEach((card) => {
      card.style.display = card.getAttribute('data-ubicacion').includes(q) ? 'block' : 'none';
    });
  };

  // Escáner PC
  if (!isMobile) {
    const inputPC = container.querySelector('#scanInput');
    inputPC.focus();
    inputPC.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const codigo = inputPC.value.trim();
        if (codigo) {
          procesarCodigo(codigo);
          inputPC.value = '';
        }
      }
    };
  }

  // Escáner Móvil
  let html5QrCode = null;
  if (isMobile) {
    const btnStart = container.querySelector('#btnStartScan');
    const btnCancel = container.querySelector('#btnCancelScan');
    const readerDiv = container.querySelector('#reader');

    btnStart.onclick = async () => {
      btnStart.style.display = 'none';
      btnCancel.style.display = 'block';
      readerDiv.style.display = 'block';

      if (!html5QrCode) {
        // Importación dinámica para no cargar la librería en PC
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('reader');
      }

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            html5QrCode
              .stop()
              .then(() => {
                readerDiv.style.display = 'none';
                btnStart.style.display = 'block';
                btnStart.textContent = 'Escanear otra caja';
                btnCancel.style.display = 'none';
                procesarCodigo(decodedText);
              })
              .catch((err) => console.error(err));
          },
          (_errorMessage) => {
            /* ignorar errores de frames */
          }
        );
      } catch (err) {
        toast('Error al encender la cámara: ' + err, 'error');
        readerDiv.style.display = 'none';
        btnStart.style.display = 'block';
        btnCancel.style.display = 'none';
      }
    };

    btnCancel.onclick = async () => {
      if (html5QrCode && html5QrCode.isScanning) {
        try {
          await html5QrCode.stop();
          html5QrCode.clear();
        } catch (e) {
          console.error(e);
        }
      }
      readerDiv.style.display = 'none';
      btnStart.style.display = 'block';
      btnCancel.style.display = 'none';
      toast('Escaneo cancelado', 'info');
    };
  }

  // Procesar el código escaneado
  function procesarCodigo(codigo) {
    container.querySelector('#scanCode').textContent = codigo;
    container.querySelector('#scanResult').style.display = 'block';
    container.querySelector('#scanLocation').value = '';
    container.querySelector('#scanLocation').focus();
    window._codigoCajaEscaneada = codigo;
  }

  // Guardar ubicación
  container.querySelector('#btnSaveScan').onclick = () => {
    const codigo = window._codigoCajaEscaneada;
    const ubicacion = container.querySelector('#scanLocation').value.trim();
    const estado = container.querySelector('#scanStatus').value;

    if (!ubicacion) return toast('Escribí una ubicación física.', 'error');
    if (!codigo) return toast('Escaneá una caja primero.', 'error');

    window.onGuardarUbicacion({ codigo, ubicacion, estado });
    container.querySelector('#scanResult').style.display = 'none';
  };
}