/* ============================================================
   432UP — MENU UNIFICADO DO PORTAL (partner-header.js)

   - Toggle à esquerda: Site / Parceiro / Admin, liberado por nível
       parceiro logado  -> vê Site + Parceiro
       admin            -> vê Site + Parceiro + Admin
   - Menu à direita: muda conforme a área escolhida no toggle
   - Submenus abrem num painel fixo no <body> (fora do header),
     para nunca ficarem presos atrás de overlays da página
   - Para mudar nome de página ou link: edite só o bloco MENUS
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. Nível do usuário (leitura síncrona do cache) ---------- */
  var cachedIsAdmin = false;
  try {
    cachedIsAdmin = sessionStorage.getItem('432up_is_admin') === 'true';
  } catch (e) {
    cachedIsAdmin = false;
  }

  /* ---------- 2. Rotas ---------- */
  var SITE = 'https://www.432up.com/';
  var isSubdirAdmin = window.location.pathname.includes('/admin/');
  var rootPath = isSubdirAdmin ? '../../' : '../';   // raiz do site
  var B2B = isSubdirAdmin ? '../' : '';              // pasta /B2B/
  var ADM = isSubdirAdmin ? '' : 'admin/';           // pasta /B2B/admin/
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  var pageArea = isSubdirAdmin ? 'admin' : 'parceiro';
  var areaAtual = pageArea;

  /* ---------- 3. MAPA DOS MENUS (edite aqui) ----------
     href = para onde vai | file = nome do arquivo (para marcar "ativo")
     hash = área interna do admin.html | sub = submenu | icon = só no mobile
     soAdmin = só aparece para admin | master = visual âmbar do Master Admin */
  var MENUS = {
    site: [
      { label: 'A Essência', href: SITE + 'aessencia.html' },
      { label: 'A Maestria', href: SITE + 'amaestria.html' },
      { label: 'Galeria', href: SITE + 'galeria.html' },
      { label: 'Vitrine', href: SITE + 'vitrine.html' },
      { label: 'Simulador', href: SITE + 'calculadora.html' },
      { label: 'Parceiros', href: SITE + 'mesa-de-producao.html' }
    ],

    parceiro: [
      { label: 'Meu Painel', icon: '❖', href: B2B + 'index.html', file: 'index.html' },
      { label: '⚡ Nova Proposta', href: B2B + 'nova-proposta.html', file: 'nova-proposta.html', destaque: true },
      { label: 'Minhas Propostas', icon: '▤', href: B2B + 'propostas.html', file: 'propostas.html' },
      { label: 'Novo Cliente', icon: '+', href: B2B + 'cadastro-cliente.html', file: 'cadastro-cliente.html' },
      { label: 'Comissões', icon: '$', href: B2B + 'comissoes.html', file: 'comissoes.html' },
      { label: 'Materiais', icon: '📁', href: B2B + 'materiais.html', file: 'materiais.html' }
    ],

    admin: [
      { label: 'Vendas', sub: [
        { label: 'Visão Geral Vendas', href: ADM + 'index.html', file: 'index.html' },
        { label: 'Baixa de Comissões', href: ADM + 'comissoes.html', file: 'comissoes.html' }
      ]},
      { label: 'Pessoas', sub: [
        { label: 'Gestão de Usuários', href: ADM + 'parceiros.html', file: 'parceiros.html' },
        { label: 'Contato Cliente', href: ADM + 'admin-clientes.html', file: 'admin-clientes.html' },
        { label: 'Contatos', href: ADM + 'clientes.html', file: 'clientes.html' },
        { label: 'Converter Contatos', href: ADM + 'contatos-converter.html', file: 'contatos-converter.html' }
      ]},
      { label: 'Contratos', sub: [
        { label: 'Configurar Contrato', href: ADM + 'configure-contrato.html', file: 'configure-contrato.html' }
      ]},
      { label: 'Painel do Site', sub: [
        { label: 'Simulador', href: ADM + 'admin.html#simulador', file: 'admin.html', hash: 'simulador' },
        { label: 'Serviços', href: ADM + 'admin.html#servicos', file: 'admin.html', hash: 'servicos' },
        { label: 'Pacotes', href: ADM + 'admin.html#pacotes', file: 'admin.html', hash: 'pacotes' },
        { label: 'Transporte', href: ADM + 'admin.html#transporte', file: 'admin.html', hash: 'transporte' },
        { label: 'Leads', href: ADM + 'admin.html#leads', file: 'admin.html', hash: 'leads' },
        { label: 'Galeria', href: ADM + 'admin.html#galeria', file: 'admin.html', hash: 'galeria' }
      ]},
      { label: 'Studio', href: ADM + 'studio.html', file: 'studio.html' }
    ]
  };

  var TABS = [
    { area: 'site', label: 'Site' },
    { area: 'parceiro', label: 'Parceiro' },
    { area: 'admin', label: 'Admin' }
  ];

  /* ---------- 4. Utilitários ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function currentHash() {
    return (window.location.hash || '').replace('#', '');
  }

  function up(e, selector) {
    return e.target && e.target.closest ? e.target.closest(selector) : null;
  }

  // Quem pode ver cada área do toggle
  function podeVer(area) {
    if (area === 'admin') return isSubdirAdmin || cachedIsAdmin;
    return true;
  }

  function isActive(item, area) {
    if (area !== pageArea || !item.file) return false;
    if (item.file !== currentPath) return false;
    if (item.hash) return (currentHash() || 'simulador') === item.hash;
    return true;
  }

  /* ---------- 5. Montagem do HTML ---------- */
  // Setinha em SVG com tamanho fixo (não depende do CSS da página)
  var CARET = '<svg class="mn-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false" style="width:10px;height:10px;flex:none;">' +
    '<path d="M3.5 1.5 7 5l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function linkHTML(item, area, mobile) {
    var cls = isActive(item, area) ? ' class="active"' : '';
    var style = item.destaque ? ' style="color: #f59e0b; font-weight: 700;"' : '';
    if (item.master) {
      style = mobile
        ? ' style="color: #f59e0b; font-weight: 700; display: block; text-align: center; border: 1px solid rgba(245,158,11,0.5); padding: 12px; margin-top: 12px; border-radius: 8px; background: rgba(245,158,11,0.15); font-size: 0.95rem;"'
        : ' style="color: #f59e0b; font-weight: 700; border: 1px solid rgba(245,158,11,0.5); padding: 4px 10px; border-radius: 8px; background: rgba(245,158,11,0.15); font-size: 0.75rem;"';
    }
    var label = (mobile && item.icon ? item.icon + ' ' : '') + esc(item.label);
    var href = item.href;
    // Já estamos no admin.html: só troca o hash, não recarrega outro arquivo
    if (item.hash && currentPath === 'admin.html') href = '#' + item.hash;
    return '<a href="' + esc(href) + '"' + cls + style + '>' + label + '</a>';
  }

  function itemsHTML(area, mobile) {
    return MENUS[area].map(function (item, idx) {
      if (item.soAdmin && !podeVer('admin')) return '';
      if (!item.sub) return linkHTML(item, area, mobile);

      var ativo = item.sub.some(function (s) { return isActive(s, area); });

      if (mobile) {
        var filhos = item.sub.map(function (s) { return linkHTML(s, area, true); }).join('');
        return '<div class="mn-m-group">' +
          '<a href="#" class="mn-group-btn' + (ativo ? ' active' : '') + '" role="button" aria-expanded="' + (ativo ? 'true' : 'false') + '">' +
            esc(item.label) + CARET + '</a>' +
          '<div class="mn-m-sub' + (ativo ? ' open' : '') + '">' + filhos + '</div>' +
        '</div>';
      }

      // Desktop: só o botão. Os filhos aparecem no painel flutuante do <body>.
      return '<div class="mn-group">' +
        '<a href="#" class="mn-group-btn' + (ativo ? ' active' : '') + '" data-idx="' + idx + '" role="button" aria-haspopup="true" aria-expanded="false">' +
          esc(item.label) + CARET + '</a>' +
      '</div>';
    }).join('');
  }

  function toggleHTML(extraClass) {
    return '<div class="mn-toggle ' + extraClass + '" role="group" aria-label="Escolher área">' +
      TABS.map(function (t) {
        return '<button type="button" class="mn-tab" data-area="' + t.area + '" aria-pressed="' + (t.area === areaAtual ? 'true' : 'false') + '">' + t.label + '</button>';
      }).join('') +
    '</div>';
  }

  function injectStyles() {
    if (document.getElementById('mn-styles')) return;
    var st = document.createElement('style');
    st.id = 'mn-styles';
    st.textContent = `
      #calc-header.mn-ready > .desktop-nav { flex: 1 1 auto; min-width: 0; align-items: center; }
      #calc-header .mn-items { display: flex; align-items: center; gap: 4px; margin-left: auto; }
      #mnMobItems { display: contents; }

      /* Toggle de área */
      .mn-toggle { display: inline-flex; gap: 2px; padding: 3px; flex-shrink: 0; margin-left: 1.5rem;
        border: 1px solid rgba(0,240,255,.25); border-radius: 999px; background: rgba(0,0,0,.28); }
      .mn-tab { font: inherit; font-size: .78rem; line-height: 1; padding: .42rem .85rem; border: 0; border-radius: 999px;
        background: none; color: #8da2b5; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s; }
      .mn-tab:hover { color: #e6edf3; }
      .mn-tab[aria-pressed="true"] { background: #00f0ff; color: #04121a; font-weight: 700; }
      .mn-tab[data-area="admin"][aria-pressed="true"] { background: #f59e0b; color: #1a1200; }
      .mn-tab:focus-visible, .mn-group-btn:focus-visible { outline: 2px solid #00f0ff; outline-offset: 2px; }
      .mn-toggle-m { display: flex; width: 100%; margin: 0 0 14px; }
      .mn-toggle-m .mn-tab { flex: 1; padding: .6rem .4rem; font-size: .85rem; }

      /* Botão de grupo (desktop e mobile) */
      .mn-group { display: flex; align-items: center; }
      .mn-group-btn { display: inline-flex; align-items: center; gap: .45rem; cursor: pointer; }
      .mn-caret { opacity: .75; transition: transform .15s; }
      .mn-group-btn[aria-expanded="true"] .mn-caret { transform: rotate(90deg); }

      /* Painel flutuante dos submenus (filho direto do <body>) */
      #mn-float { display: none; position: fixed; z-index: 2147483000; min-width: 250px; padding: .5rem;
        font-family: inherit; pointer-events: auto;
        background: linear-gradient(135deg, rgba(10,18,28,.98), rgba(14,22,35,.97));
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(0,240,255,.28); border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0,0,0,.8), inset 0 0 15px rgba(0,240,255,.05); }
      #mn-float::before { content: ''; position: absolute; left: 0; right: 0; top: -14px; height: 14px; }
      #mn-float a { display: block; white-space: nowrap; padding: .65rem .9rem; border-radius: 8px;
        color: #e6edf3; text-decoration: none; font-size: .8rem; font-weight: 600;
        letter-spacing: .08em; text-transform: uppercase; transition: background .15s, color .15s; }
      #mn-float a:hover { background: rgba(0,240,255,.08); color: #00f0ff; }
      #mn-float a.active { color: #00f0ff; background: rgba(0,240,255,.12); }

      /* Submenu mobile (sanfona) */
      .mn-m-group { display: block; }
      .mn-m-group > .mn-group-btn { display: flex; justify-content: space-between; align-items: center; width: 100%; }
      .mn-m-sub { display: none; margin: 2px 0 8px 12px; padding-left: 10px; border-left: 2px solid rgba(0,240,255,.25); }
      .mn-m-sub.open { display: block; }
      .mn-m-sub a { display: block; }
    `;
    document.head.appendChild(st);
  }

  /* ---------- 6. Renderização do Header ---------- */
  function renderHeader() {
    var headerEl = document.getElementById('calc-header');
    var mobileMenuEl = document.getElementById('mobile-menu');

    if (!headerEl && !mobileMenuEl) return;

    injectStyles();

    if (headerEl) {
      headerEl.className = 'b2b-header-cyan mn-ready';
      headerEl.innerHTML =
        '<div class="logo-container flex items-center">' +
          '<a href="' + rootPath + 'index.html" class="logo-link flex items-center" aria-label="Página Inicial 432UP">' +
            '<img src="' + rootPath + 'imagens/logo.png" alt="432UP! Produções" class="logo-img" onerror="this.src=\'../imagens/logo.png\'">' +
          '</a>' +
        '</div>' +
        '<nav class="desktop-nav" aria-label="Navegação principal">' +
          toggleHTML('mn-toggle-d') +
          '<div class="mn-items" id="mnDeskItems"></div>' +
          '<div class="b2b-user-widget">' +
            '<a href="' + B2B + 'perfil.html" title="Meu Perfil" class="b2b-avatar-link' + (!isSubdirAdmin && currentPath === 'perfil.html' ? ' active' : '') + '">' +
              '<div data-partner-avatar class="b2b-avatar-img"></div>' +
            '</a>' +
            '<button id="btnLogoutDesk" title="Sair do Portal" class="text-xs text-slate-400 hover:text-red-400 transition p-1 cursor-pointer">🔒 Sair</button>' +
          '</div>' +
        '</nav>' +
        '<button class="mobile-hamburger" onclick="window.toggleMobileMenu()" aria-label="Abrir menu">☰</button>';
    }

    if (mobileMenuEl) {
      mobileMenuEl.className = 'mobile-menu-overlay';
      mobileMenuEl.innerHTML =
        '<button onclick="window.toggleMobileMenu()" aria-label="Fechar menu" style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">✕</button>' +
        '<a href="' + B2B + 'perfil.html" class="flex items-center gap-3 mb-4 border-b border-cyan-500/20 pb-3 hover:opacity-80 transition">' +
          '<div data-partner-avatar class="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 bg-cover bg-center shrink-0"></div>' +
          '<div class="text-left">' +
            '<span data-partner-nome class="text-sm font-bold text-white block">—</span>' +
            '<span class="text-[10px] ' + (isSubdirAdmin ? 'text-amber-400' : 'text-cyan-400') + ' font-bold uppercase tracking-wider">' +
              (isSubdirAdmin ? 'Master Admin ➔' : 'Ver Meu Perfil ➔') + '</span>' +
          '</div>' +
        '</a>' +
        toggleHTML('mn-toggle-m') +
        '<div id="mnMobItems"></div>' +
        '<button id="btnLogoutMob" class="btn-header-cta" style="margin-left: 0; margin-top: 15px; padding: 12px 28px; width: 100%; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">🔒 Sair do Portal</button>';
    }

    applyLevel();
    bindEvents();
  }

  // Redesenha só a lista de itens (avatar e botão sair não são tocados)
  function renderItems() {
    closePanel();
    var d = document.getElementById('mnDeskItems');
    var m = document.getElementById('mnMobItems');
    if (d) d.innerHTML = itemsHTML(areaAtual, false);
    if (m) m.innerHTML = itemsHTML(areaAtual, true);
    var tabs = document.querySelectorAll('.mn-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].setAttribute('aria-pressed', tabs[i].getAttribute('data-area') === areaAtual ? 'true' : 'false');
    }
  }

  // Mostra/esconde as abas do toggle conforme o nível do usuário
  function applyLevel() {
    if (!podeVer(areaAtual)) areaAtual = 'parceiro';
    var wraps = document.querySelectorAll('.mn-toggle');
    for (var i = 0; i < wraps.length; i++) {
      var visiveis = 0;
      var tabs = wraps[i].querySelectorAll('.mn-tab');
      for (var j = 0; j < tabs.length; j++) {
        var ok = podeVer(tabs[j].getAttribute('data-area'));
        tabs[j].style.display = ok ? '' : 'none';
        if (ok) visiveis++;
      }
      // com menos de 2 áreas liberadas, não há o que alternar: some o toggle
      wraps[i].style.display = visiveis < 2 ? 'none' : '';
    }
    renderItems();
  }

  /* ---------- 7. Painel flutuante dos submenus (fora do header) ---------- */
  var panel = null;
  var panelOwner = null;
  var closeTimer = null;
  var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  function getPanel() {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'mn-float';
      panel.setAttribute('role', 'menu');
      panel.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
      panel.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      document.body.appendChild(panel);   // filho direto do body
    }
    return panel;
  }

  function closePanel() {
    clearTimeout(closeTimer);
    if (panel) panel.style.display = 'none';
    if (panelOwner) panelOwner.setAttribute('aria-expanded', 'false');
    panelOwner = null;
  }

  function openPanel(btn) {
    var item = MENUS[areaAtual][parseInt(btn.getAttribute('data-idx'), 10)];
    if (!item || !item.sub) return;
    clearTimeout(closeTimer);
    if (panelOwner && panelOwner !== btn) panelOwner.setAttribute('aria-expanded', 'false');

    var p = getPanel();
    p.innerHTML = item.sub.map(function (s) { return linkHTML(s, areaAtual, false); }).join('');
    p.style.display = 'block';

    var r = btn.getBoundingClientRect();
    var header = document.getElementById('calc-header');
    var base = header ? header.getBoundingClientRect().bottom : r.bottom;
    var w = p.offsetWidth;
    var left = r.left;
    if (left + w > window.innerWidth - 8) left = Math.max(8, r.right - w);
    p.style.left = left + 'px';
    p.style.top = (base - 2) + 'px';

    panelOwner = btn;
    btn.setAttribute('aria-expanded', 'true');
  }

  function inMenu(node) {
    return !!(node && node.closest && (node.closest('.mn-group > .mn-group-btn') || node.closest('#mn-float')));
  }

  /* ---------- 8. Eventos ---------- */
  function closeMobile() {
    var m = document.getElementById('mobile-menu');
    if (m) {
      m.classList.remove('active');
      m.setAttribute('aria-hidden', 'true');
    }
  }

  function bindLogoutEvents() {
    ['btnLogoutDesk', 'btnLogoutMob'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) {
        b.addEventListener('click', function (e) {
          if (typeof partnerLogout === 'function') partnerLogout(e);
        });
      }
    });
  }

  var eventsBound = false;
  function bindEvents() {
    bindLogoutEvents();
    if (eventsBound) return;
    eventsBound = true;

    document.addEventListener('click', function (e) {
      // troca de área no toggle
      var tab = up(e, '.mn-tab');
      if (tab) {
        areaAtual = tab.getAttribute('data-area');
        renderItems();
        return;
      }

      // botão de grupo
      var gbtn = up(e, '.mn-group-btn');
      if (gbtn) {
        e.preventDefault();
        if (gbtn.parentNode.classList.contains('mn-m-group')) {
          // mobile: sanfona
          var sub = gbtn.nextElementSibling;
          var aberto = sub.classList.toggle('open');
          gbtn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        } else if (panelOwner === gbtn) {
          closePanel();                     // toque: segundo toque fecha
        } else {
          openPanel(gbtn);
        }
        return;
      }

      // fora do painel fecha; link do painel deixa o clique navegar e fecha em seguida
      if (up(e, '#mn-float a[href]')) {
        setTimeout(closePanel, 50);
        return;
      }
      if (!up(e, '#mn-float') && !up(e, '.mn-group > .mn-group-btn')) closePanel();

      // clique em link dentro do menu mobile fecha o menu
      if (up(e, '#mobile-menu a[href]')) closeMobile();
    });

    // hover (só em dispositivos com mouse)
    document.addEventListener('mouseover', function (e) {
      if (!canHover) return;
      var b = up(e, '.mn-group > .mn-group-btn');
      if (b) {
        if (panelOwner !== b) openPanel(b);
        else clearTimeout(closeTimer);
        return;
      }
      if (up(e, '#mn-float')) clearTimeout(closeTimer);
    });
    document.addEventListener('mouseout', function (e) {
      if (!canHover || !panelOwner) return;
      if (inMenu(e.target) && !inMenu(e.relatedTarget)) {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(closePanel, 800);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closePanel();
        closeMobile();
      }
    });

    window.addEventListener('scroll', closePanel, { passive: true });
    window.addEventListener('resize', closePanel);
    window.addEventListener('hashchange', renderItems);
  }

  /* ---------- 9. API global (mantida) ---------- */
  window.toggleMobileMenu = function () {
    var m = document.getElementById('mobile-menu');
    if (!m) return;
    var on = m.classList.toggle('active');
    m.setAttribute('aria-hidden', on ? 'false' : 'true');
  };

  // Chamada pelas páginas quando descobrem se o usuário é admin
  window.updateAdminState = function (isAdmin) {
    cachedIsAdmin = !!isAdmin;
    try {
      sessionStorage.setItem('432up_is_admin', cachedIsAdmin ? 'true' : 'false');
    } catch (e) {}
    applyLevel();
  };

  /* Mesma identificação da página de parceiros: partnerRequireAuth.
     requireAdmin:false para não expulsar vendedor na rota 2;
     se role/nivel === admin, libera a aba Admin mesmo fora de /admin/. */
  var _adminSyncTries = 0;
  function syncAdminFromParceiroAuth() {
    if (typeof partnerRequireAuth !== 'function') {
      if (_adminSyncTries++ < 40) setTimeout(syncAdminFromParceiroAuth, 50);
      return;
    }
    partnerRequireAuth({ requireAdmin: false }).then(function (parceiro) {
      var isAdmin = !!(parceiro && String(parceiro.role || parceiro.nivel || '').toLowerCase().trim() === 'admin');
      window.updateAdminState(isAdmin);
    }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderHeader();
      syncAdminFromParceiroAuth();
    });
  } else {
    renderHeader();
    syncAdminFromParceiroAuth();
  }
})();