/**
 * LÓGICA DE INJEÇÃO E CONTROLE DO MENU GLOBAL
 * 432UP! Produções
 */

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) {
    const isActive = menu.classList.toggle('active');
    menu.setAttribute('aria-hidden', !isActive);
    document.body.style.overflow = isActive ? 'hidden' : '';
  }
}

async function injectGlobalHeader() {
  const container = document.getElementById('global-header-container');
  if (!container) return;

  try {
    const response = await fetch('/menu.html');
    if (response.ok) {
      const headerHTML = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(headerHTML, 'text/html');
      const content = doc.body ? doc.body.innerHTML : headerHTML;
      
      container.innerHTML = content;
    }
  } catch (error) {
    console.error('Erro ao carregar o menu global:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectGlobalHeader);
} else {
  injectGlobalHeader();
}
