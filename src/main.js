/**
 * AseptiQ — Punto de entrada
 * Fase 0: bootstrap mínimo.
 * Las fases siguientes agregan auth, router, layout y módulos.
 */

import './styles/tokens.css';
import './styles/base.css';

console.warn('[AseptiQ] Fase 0 — bootstrap vacío. Módulos se agregan en Fase 1.');

const boot = document.getElementById('boot');
if (boot) {
  boot.innerHTML = `
    <div style="text-align:center; color: var(--text-secondary);">
      <div style="font-size: 32px; font-weight: 700; color: var(--accent); margin-bottom: 8px;">AseptiQ</div>
      <div style="font-size: 13px;">v1.0.0-alpha.0 · Fase 0</div>
      <div style="font-size: 12px; margin-top: 16px; color: var(--text-muted);">
        Bootstrap pendiente. Implementación en Fase 1.
      </div>
    </div>
  `;
}