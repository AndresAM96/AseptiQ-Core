const routes = {};
let _currentRoute = null;

/**
 * Registra una ruta.
 * @param {string} path - Ruta (ej. 'dashboard').
 * @param {Object} module - Objeto del módulo con función mount/unmount.
 */
export function registerRoute(path, module) {
  routes[path] = module;
}

/**
 * Navega a una ruta.
 * @param {string} path
 */
export function navigate(path) {
  window.location.hash = `#/${path}`;
}

/**
 * Obtiene la ruta actual.
 */
export function getCurrentRoute() {
  return _currentRoute;
}

/**
 * Inicializa el router.
 * @param {HTMLElement} container - Dónde se renderizarán los módulos.
 * @param {string} defaultRoute - Ruta por defecto.
 */
export function initRouter(container, defaultRoute = 'dashboard') {
  const handleRoute = () => {
    const hash = window.location.hash.slice(2) || defaultRoute;
    const route = routes[hash];

    if (_currentRoute && _currentRoute.module.unmount) {
      _currentRoute.module.unmount();
    }

    if (route) {
      container.innerHTML = '';
      route.mount(container);
      _currentRoute = { path: hash, module: route };
      // Actualizar UI del sidebar (esto lo hará el layout)
      document.dispatchEvent(new CustomEvent('route:change', { detail: hash }));
    } else {
      container.innerHTML = `<div style="padding: 32px; color: var(--text-muted);">Módulo "${hash}" no encontrado. En construcción.</div>`;
    }
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}