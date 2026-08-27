(function () {
  'use strict';

  // 1. Leitura Síncrona do Cache
  var cachedIsAdmin = false;
  try {
    cachedIsAdmin = sessionStorage.getItem('432up_is_admin') === 'true';
  } catch (e) {
    cachedIsAdmin = false;
  }

  // Identificação de rotas
  var isSubdirAdmin = window.location.pathname.includes('/admin/');
  var prefixPath = isSubdirAdmin ? '../' : '';
  var rootPath = isSubdirAdmin ? '../../' : '../';
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';

  function isActive(page) {
    return currentPath === page ? 'active' : '';
  }

  // 2. Renderização do Header
  function renderHeader() {
    var headerEl = document.getElementById('calc-header');
    var mobileMenuEl = document.getElementById('mobile-menu');

    if (!headerEl && !mobileMenuEl) return;

    if (isSubdirAdmin) {
      /* PÁGINAS DO MASTER ADMIN (/admin/) */
      if (headerEl) {
        headerEl.className = 'b2b-header-cyan';
        headerEl.innerHTML =
          '<div class="logo-container flex items-center">' +
            '<a href="' + rootPath + 'index.html" class="logo-link flex items-center" aria-label="Página Inicial 432UP">' +
              '<img src="' + rootPath + 'imagens/logo.png" alt="432UP! Produções" class="logo-img" onerror="this.src=\'../imagens/logo.png\'">' +
            '</a>' +
          '</div>' +
          '<nav class="desktop-nav">' +
            '<a href="index.html" class="' + isActive('index.html') + '">Visão Geral Vendas</a>' +
            '<a href="parceiros.html" class="' + isActive('parceiros.html') + '">Gestão de Usuários</a>' +
            '<a href="comissoes.html" class="' + isActive('comissoes.html') + '">Baixa de Comissões</a>' +
            '<a href="../index.html" style="color: #f59e0b; font-weight: 700;">↵ Painel Partner</a>' +
            '<div class="b2b-user-widget">' +
              '<a href="../perfil.html" title="Meu Perfil" class="b2b-avatar-link">' +
                '<div data-partner-avatar class="b2b-avatar-img"></div>' +
              '</a>' +
              '<button id="btnLogoutDesk" title="Sair do Portal" class="text-xs text-slate-400 hover:text-red-400 transition p-1 cursor-pointer">🔒 Sair</button>' +
            '</div>' +
          '</nav>' +
          '<button class="mobile-hamburger" onclick="window.toggleMobileMenu()">☰</button>';
      }

      if (mobileMenuEl) {
        mobileMenuEl.className = 'mobile-menu-overlay';
        mobileMenuEl.innerHTML =
          '<button onclick="window.toggleMobileMenu()" style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">✕</button>' +
          '<a href="../perfil.html" onclick="window.toggleMobileMenu()" class="flex items-center gap-3 mb-4 border-b border-cyan-500/20 pb-3 hover:opacity-80 transition">' +
            '<div data-partner-avatar class="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 bg-cover bg-center shrink-0"></div>' +
            '<div class="text-left">' +
              '<span data-partner-nome class="text-sm font-bold text-white block">—</span>' +
              '<span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Master Admin ➔</span>' +
            '</div>' +
          '</a>' +
          '<a href="index.html" onclick="window.toggleMobileMenu()" class="' + isActive('index.html') + '">📊 Visão Geral Vendas</a>' +
          '<a href="parceiros.html" onclick="window.toggleMobileMenu()" class="' + isActive('parceiros.html') + '">👥 Gestão de Usuários</a>' +
          '<a href="comissoes.html" onclick="window.toggleMobileMenu()" class="' + isActive('comissoes.html') + '">💰 Baixa de Comissões</a>' +
          '<a href="../index.html" onclick="window.toggleMobileMenu()" style="color: #f59e0b; font-weight: 700;">↵ Voltar ao Painel Partner</a>' +
          '<button id="btnLogoutMob" class="btn-header-cta" style="margin-left: 0; margin-top: 15px; padding: 12px 28px; width: 100%; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">🔒 Sair do Portal</button>';
      }

    } else {
      /* PÁGINAS DO PORTAL PARTNER */
      var displayAdminDesk = cachedIsAdmin ? 'inline-flex' : 'none';
      var displayAdminMob = cachedIsAdmin ? 'block' : 'none';

      if (headerEl) {
        headerEl.className = 'b2b-header-cyan';
        headerEl.innerHTML =
          '<div class="logo-container flex items-center">' +
            '<a href="' + rootPath + 'index.html" class="logo-link flex items-center" aria-label="Página Inicial 432UP">' +
              '<img src="' + prefixPath + '../imagens/logo.png" alt="432UP! Produções" class="logo-img" onerror="this.src=\'../imagens/logo.png\'">' +
            '</a>' +
          '</div>' +
          '<nav class="desktop-nav">' +
            '<a href="' + prefixPath + 'index.html" class="' + isActive('index.html') + '">Meu Painel</a>' +
            '<a href="' + prefixPath + 'nova-proposta.html" class="' + isActive('nova-proposta.html') + '" style="color: #f59e0b; font-weight: 700;">⚡ Nova Proposta</a>' +
            '<a href="' + prefixPath + 'propostas.html" class="' + isActive('propostas.html') + '">Minhas Propostas</a>' +
            '<a href="' + prefixPath + 'comissoes.html" class="' + isActive('comissoes.html') + '">Comissões</a>' +
            '<a href="' + prefixPath + 'materiais.html" class="' + isActive('materiais.html') + '">Materiais</a>' +
            
            '<div id="navAdminLinkContainer" style="display: ' + displayAdminDesk + ';">' +
              '<a href="' + prefixPath + 'admin/index.html" style="color: #f59e0b; font-weight: 700; border: 1px solid rgba(245,158,11,0.5); padding: 4px 10px; border-radius: 8px; background: rgba(245,158,11,0.15); font-size: 0.75rem;">👑 Master Admin</a>' +
            '</div>' +

            '<div class="b2b-user-widget">' +
              '<a href="' + prefixPath + 'perfil.html" title="Meu Perfil" class="b2b-avatar-link ' + isActive('perfil.html') + '">' +
                '<div data-partner-avatar class="b2b-avatar-img"></div>' +
              '</a>' +
              '<button id="btnLogoutDesk" title="Sair do Portal" class="text-xs text-slate-400 hover:text-red-400 transition p-1 cursor-pointer">🔒 Sair</button>' +
            '</div>' +
          '</nav>' +
          '<button class="mobile-hamburger" onclick="window.toggleMobileMenu()">☰</button>';
      }

      if (mobileMenuEl) {
        mobileMenuEl.className = 'mobile-menu-overlay';
        mobileMenuEl.innerHTML =
          '<button onclick="window.toggleMobileMenu()" style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">✕</button>' +
          '<a href="' + prefixPath + 'perfil.html" onclick="window.toggleMobileMenu()" class="flex items-center gap-3 mb-4 border-b border-cyan-500/20 pb-3 hover:opacity-80 transition">' +
            '<div data-partner-avatar class="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 bg-cover bg-center shrink-0"></div>' +
            '<div class="text-left">' +
              '<span data-partner-nome class="text-sm font-bold text-white block">—</span>' +
              '<span class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Ver Meu Perfil ➔</span>' +
            '</div>' +
          '</a>' +

          '<div id="navAdminLinkContainerMobile" style="display: ' + displayAdminMob + ';">' +
            '<a href="' + prefixPath + 'admin/index.html" onclick="window.toggleMobileMenu()" style="color: #f59e0b; font-weight: 700; display: block; text-align: center; border: 1px solid rgba(245,158,11,0.5); padding: 12px; margin-bottom: 12px; border-radius: 8px; background: rgba(245,158,11,0.15); font-size: 0.95rem;">👑 Painel Master Admin</a>' +
          '</div>' +

          '<a href="' + prefixPath + 'index.html" onclick="window.toggleMobileMenu()">❖ Meu Painel</a>' +
          '<a href="' + prefixPath + 'nova-proposta.html" onclick="window.toggleMobileMenu()" style="color: #f59e0b; font-weight: 700;">⚡ Nova Proposta</a>' +
          '<a href="' + prefixPath + 'propostas.html" onclick="window.toggleMobileMenu()">▤ Minhas Propostas</a>' +
          '<a href="' + prefixPath + 'comissoes.html" onclick="window.toggleMobileMenu()">$ Comissões</a>' +
          '<a href="' + prefixPath + 'materiais.html" onclick="window.toggleMobileMenu()">📁 Materiais</a>' +
          '<button id="btnLogoutMob" class="btn-header-cta" style="margin-left: 0; margin-top: 15px; padding: 12px 28px; width: 100%; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">🔒 Sair do Portal</button>';
      }
    }

    bindLogoutEvents();
  }

  function bindLogoutEvents() {
    var btnDesk = document.getElementById('btnLogoutDesk');
    var btnMob = document.getElementById('btnLogoutMob');
    if (btnDesk) btnDesk.addEventListener('click', typeof partnerLogout === 'function' ? partnerLogout : function() {});
    if (btnMob) btnMob.addEventListener('click', typeof partnerLogout === 'function' ? partnerLogout : function() {});
  }

  window.toggleMobileMenu = function () {
    var mobNav = document.getElementById('mobile-menu');
    if (mobNav) mobNav.classList.toggle('active');
  };

  // Função global para alternar visualização do admin instantaneamente
  window.updateAdminState = function (isAdmin) {
    cachedIsAdmin = !!isAdmin;
    try {
      sessionStorage.setItem('432up_is_admin', cachedIsAdmin ? 'true' : 'false');
    } catch (e) {}

    var adminDeskEl = document.getElementById('navAdminLinkContainer');
    if (adminDeskEl) {
      adminDeskEl.style.display = cachedIsAdmin ? 'inline-flex' : 'none';
    }

    var adminMobEl = document.getElementById('navAdminLinkContainerMobile');
    if (adminMobEl) {
      adminMobEl.style.display = cachedIsAdmin ? 'block' : 'none';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHeader);
  } else {
    renderHeader();
  }
})();
