(function () {
  'use strict';

  /* ---------- 1. Nível do usuário (leitura síncrona do cache) ---------- */
  var cachedIsAdmin = false;
  var cachedLoggedIn = false;
  var cachedIsCliente = false;
  var cachedIsParceiro = false;
  var logoutLock = false;
  try {
    cachedIsAdmin = sessionStorage.getItem('432up_is_admin') === 'true';
    cachedLoggedIn = sessionStorage.getItem('432up_is_logged') === 'true' || cachedIsAdmin;
    cachedIsCliente = sessionStorage.getItem('432up_is_cliente') === 'true';
  } catch (e) {
    cachedIsAdmin = false;
    cachedLoggedIn = false;
    cachedIsCliente = false;
  }

  /* ---------- 2. Rotas (endereços completos) ---------- */
  /* Origem atual (evita loop www ↔ apex e preview ↔ produção) */
  var SITE = (window.location.origin || 'https://www.432up.com') + '/';
  var B2B = SITE + 'B2B/';
  var ADM = SITE + 'B2B/admin/';
  var pathName = window.location.pathname || '';
  var isSubdirAdmin = pathName.indexOf('/admin/') !== -1;
  var onCliente = pathName.indexOf('/cliente/') !== -1;
  var onSite = pathName.indexOf('/B2B/') === -1 && pathName.indexOf('/b2b/') === -1 && !isSubdirAdmin && !onCliente;
  if ((!onSite || onCliente) && !cachedLoggedIn) cachedLoggedIn = true;
  if (onCliente) cachedIsCliente = true;
  /* Na página do cliente, admin/parceiro só valem se confirmados no banco (nunca pelo cache da sessão) */
  if (onCliente) { cachedIsAdmin = false; cachedIsParceiro = false; }
  var currentPath = pathName.split('/').pop() || 'index.html';
  /* Estar em /B2B/admin/ NÃO torna o usuário admin — só o role no banco.
     Parceiro em agenda/projeto (pasta admin) continua na área parceiro. */
  var pageArea = onCliente ? 'cliente' : (onSite ? 'site' : (isSubdirAdmin && cachedIsAdmin ? 'admin' : (isSubdirAdmin ? 'parceiro' : 'parceiro')));
  if (isSubdirAdmin && cachedIsAdmin) pageArea = 'admin';
  else if (onCliente) pageArea = 'cliente';
  else if (onSite) pageArea = 'site';
  else pageArea = 'parceiro';
  var areaAtual = pageArea;
  var CLIENTE = SITE + 'cliente/';
  /* Perfil do cliente: abre direto na aba Perfil da área do cliente */
  var CLIENTE_PERFIL = CLIENTE + 'index.html?aba=perfil';

  /* ---------- 3. MAPA DOS MENUS (edite aqui) ---------- */
  var MENUS = {
    site: [
      { label: 'A Essência', href: SITE + 'aessencia.html', file: 'aessencia.html' },
      { label: 'A Maestria', href: SITE + 'amaestria.html', file: 'amaestria.html' },
      { label: 'Galeria', href: SITE + 'galeria.html', file: 'galeria.html', tagId: 'lp-context-tag' },
      { label: 'Vitrine', href: SITE + 'vitrine.html', file: 'vitrine.html' },
      { label: 'Simulador', href: SITE + 'calculadora.html', file: 'calculadora.html' },
      { label: 'Parceiros', href: SITE + 'mesa-de-producao.html', file: 'mesa-de-producao.html' },
      { label: 'Iniciar Projeto →', href: '#', cta: true }
    ],

    parceiro: [
      { label: 'Meu Painel', icon: '❖', href: B2B + 'index.html', file: 'index.html' },
      { label: '⚡ Nova Proposta', href: B2B + 'nova-proposta.html', file: 'nova-proposta.html', destaque: true },
      { label: 'Minhas Propostas', icon: '▤', href: B2B + 'propostas.html', file: 'propostas.html' },
      { label: 'Agenda', icon: '📅', href: ADM + 'agenda.html', file: 'agenda.html' },
      { label: 'Projetos', icon: '▦', href: ADM + 'projeto.html', file: 'projeto.html' },
      { label: 'Checklist', icon: '✓', href: B2B + 'checklist.html', file: 'checklist.html' },
      { label: 'Novo Cliente', icon: '+', href: B2B + 'cadastro-cliente.html', file: 'cadastro-cliente.html' },
      { label: 'Comissões', icon: '$', href: B2B + 'comissoes.html', file: 'comissoes.html' },
      { label: 'Materiais', icon: '📁', href: B2B + 'materiais.html', file: 'materiais.html' }
    ],

    admin: [
      { label: 'Operação', sub: [
        { label: 'Agenda', href: ADM + 'agenda.html', file: 'agenda.html' },
        { label: 'Projetos', href: ADM + 'projeto.html', file: 'projeto.html' },
        { label: 'Checklist', href: B2B + 'checklist.html', file: 'checklist.html' }
      ]},
      { label: 'Vendas', sub: [
        { label: 'Visão Geral Vendas', href: ADM + 'index.html', file: 'index.html' },
        { label: 'Baixa de Comissões', href: ADM + 'comissoes.html', file: 'comissoes.html' }
      ]},
      { label: 'Pessoas', sub: [
        { label: 'Gestão de Usuários', href: ADM + 'parceiros.html', file: 'parceiros.html' },
        { label: 'Contato Cliente', href: ADM + 'admin-clientes.html', file: 'admin-clientes.html' },
        { label: 'Converter Contatos', href: ADM + 'contatos-converter.html', file: 'contatos-converter.html' }
      ]},
      { label: 'Configurações', sub: [
        { label: 'Configurar Contrato', href: ADM + 'configure-contrato.html', file: 'configure-contrato.html' },
        { label: 'Dados da Empresa', href: ADM + 'dados-empresa.html', file: 'dados-empresa.html' },
        { label: 'Configurações Financeiras', href: ADM + 'config-financeiro.html', file: 'config-financeiro.html' }
      ]},

      { label: 'Painel do Site', sub: [
        { label: 'Simulador', href: ADM + 'admin-simulador.html', file: 'admin-simulador.html' },
        { label: 'Serviços', href: ADM + 'admin-servicos.html', file: 'admin-servicos.html' },
        { label: 'Pacotes', href: ADM + 'admin-pacotes.html', file: 'admin-pacotes.html' },
        { label: 'Transporte', href: ADM + 'admin-transporte.html', file: 'admin-transporte.html' },
        { label: 'Leads', href: ADM + 'admin-leads.html', file: 'admin-leads.html' },
        { label: 'Galeria', href: ADM + 'admin-galeria.html', file: 'admin-galeria.html' }
      ]},
      { label: 'Studio', href: ADM + 'studio.html', file: 'studio.html' }
    ],

    cliente: [
      { label: 'Minha diária', icon: '◉', href: CLIENTE + 'index.html', file: 'index.html' },
      { label: 'Convite / acesso', href: CLIENTE + 'convite.html', file: 'convite.html' }
    ]
  };

  var TABS = [
    { area: 'site', label: 'Site' },
    { area: 'parceiro', label: 'Parceiro' },
    { area: 'admin', label: 'Admin' },
    { area: 'cliente', label: 'Cliente' }
  ];

  /* ---------- 4. Utilitários ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function up(e, selector) {
    return e.target && e.target.closest ? e.target.closest(selector) : null;
  }

  function podeVer(area) {
    if (area === 'site') return true;
    /* Página do cliente */
    if (onCliente) {
      if (area === 'cliente') return !cachedIsAdmin;
      if (area === 'parceiro') return cachedIsParceiro || cachedIsAdmin;
      if (area === 'admin') return cachedIsAdmin;
      return false;
    }
    /* Parceiro logado (inclui páginas em /admin/ usadas pelo parceiro: agenda, projetos) */
    if (area === 'parceiro') return cachedLoggedIn || cachedIsAdmin || cachedIsParceiro;
    /* Admin: SOMENTE role real no banco/cache — nunca só por estar em /admin/ */
    if (area === 'admin') return cachedIsAdmin;
    /* Admin NÃO vê toggle Cliente */
    if (area === 'cliente') return cachedIsCliente && !cachedIsAdmin;
    return false;
  }

  function isActive(item, area) {
    if (area !== pageArea || !item.file) return false;
    return item.file === currentPath;
  }

  function isMobileView() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 1024px)').matches);
  }

  function isLogged() {
    return cachedLoggedIn || cachedIsAdmin || cachedIsParceiro;
  }

  /* ---------- 5. Montagem do HTML ---------- */
  var CARET = '<svg class="mn-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false" style="width:10px;height:10px;flex:none;">' +
    '<path d="M3.5 1.5 7 5l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function linkHTML(item, area, mobile) {
    if (item.cta) {
      var ctaCls = ' class="btn-header-cta mn-cta"';
      var ctaStyle = mobile ? ' style="margin-left:0;padding:12px 28px;width:100%;"' : '';
      return '<button type="button"' + ctaCls + ctaStyle + ' onclick="typeof openLeadModal===\'function\'&&openLeadModal()">' +
        esc(item.label) + '</button>';
    }

    var cls = isActive(item, area) ? ' class="active"' : '';
    var style = item.destaque ? ' style="color: #f59e0b; font-weight: 700;"' : '';
    if (item.master) {
      style = mobile
        ? ' style="color: #f59e0b; font-weight: 700; display: block; text-align: center; border: 1px solid rgba(245,158,11,0.5); padding: 12px; margin-top: 12px; border-radius: 8px; background: rgba(245,158,11,0.15); font-size: 0.95rem;"'
        : ' style="color: #f59e0b; font-weight: 700; border: 1px solid rgba(245,158,11,0.5); padding: 4px 10px; border-radius: 8px; background: rgba(245,158,11,0.15); font-size: 0.75rem;"';
    }
    var tagId = item.tagId ? (mobile ? item.tagId + '-mobile' : item.tagId) : '';
    var tag = tagId ? ' <span id="' + esc(tagId) + '" class="lp-tag"></span>' : '';
    var label = (mobile && item.icon ? item.icon + ' ' : '') + esc(item.label) + tag;
    return '<a href="' + esc(item.href) + '"' + cls + style + '>' + label + '</a>';
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

      return '<div class="mn-group">' +
        '<a href="#" class="mn-group-btn' + (ativo ? ' active' : '') + '" data-idx="' + idx + '" role="button" aria-haspopup="true" aria-expanded="false">' +
          esc(item.label) + CARET + '</a>' +
      '</div>';
    }).join('');
  }

  function toggleHTML(extraClass) {
    return '<div class="mn-toggle ' + extraClass + '" role="group" aria-label="Escolher área" data-active="' + areaAtual + '">' +
      '<span class="mn-pill" aria-hidden="true"></span>' +
      TABS.map(function (t) {
        return '<button type="button" class="mn-tab" data-area="' + t.area + '" aria-pressed="' + (t.area === areaAtual ? 'true' : 'false') + '">' + t.label + '</button>';
      }).join('') +
    '</div>';
  }

  /* Visual do tema ciano: lido do CSS original da página, para o fade
     entre temas partir exatamente da aparência atual. */
  var cyanSkin = null;
  function captureCyan(headerEl) {
    if (cyanSkin) return;
    var old = document.getElementById('mn-styles');
    if (old) old.parentNode.removeChild(old);
    headerEl.className = 'b2b-header-cyan';
    var cs = window.getComputedStyle(headerEl);
    var img = cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : 'none';
    var col = cs.backgroundColor || 'transparent';
    var semFundo = img === 'none' && (col === 'transparent' || col === 'rgba(0, 0, 0, 0)');
    var temBorda = parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none';
    cyanSkin = {
      image: semFundo ? 'linear-gradient(180deg, rgba(0, 240, 255, 0.06) 0%, rgba(8, 12, 18, 0.7) 100%)' : img,
      color: semFundo ? 'transparent' : col,
      border: temBorda ? cs.borderBottomColor : 'rgba(0, 240, 255, 0.18)',
      shadow: cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : '0 4px 20px rgba(0, 0, 0, 0.25)'
    };
  }

  function injectStyles() {
    var old = document.getElementById('mn-styles');
    if (old) old.parentNode.removeChild(old);
    var skin = cyanSkin || { border: 'rgba(0, 240, 255, 0.18)', shadow: '0 4px 20px rgba(0, 0, 0, 0.25)' };
    var st = document.createElement('style');
    st.id = 'mn-styles';
    st.textContent = `
      #calc-header.b2b-header-cyan,
      #calc-header.mn-ready {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        box-sizing: border-box !important;
        /* 64px de conteúdo + faixa do relógio (iPhone/iPad standalone) */
        height: calc(64px + env(safe-area-inset-top, 0px)) !important;
        min-height: calc(64px + env(safe-area-inset-top, 0px)) !important;
        padding-top: env(safe-area-inset-top, 0px) !important;
        padding-bottom: 0 !important;
        padding-left: 1.5rem !important;
        padding-right: 1.5rem !important;
      }
      #calc-header.mn-ready > .desktop-nav,
      #calc-header.b2b-header-cyan .desktop-nav {
        display: flex !important;
        align-items: center !important;
        gap: 1rem !important;
        height: 100% !important;
        margin: 0 !important;
        flex: 1 1 auto;
        min-width: 0;
      }
      #calc-header .mn-items {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        margin-left: auto;
        flex-wrap: nowrap !important;
      }
      #mnMobItems { display: contents; }

      #calc-header .desktop-nav a,
      #calc-header .desktop-nav .mn-group-btn {
        display: inline-flex !important;
        align-items: center !important;
        flex-direction: row !important;
        white-space: nowrap !important;
      }
      #calc-header .mn-caret {
        flex: none !important;
        display: inline-block !important;
        width: 10px !important;
        height: 10px !important;
      }

      /* ---------- Fundo do header: camadas com fade ---------- */
      #calc-header.mn-ready {
        background: none !important;
        background-color: transparent !important;
        border-bottom: 1px solid transparent !important;
        box-sizing: border-box !important;
        transition: border-bottom-color .6s cubic-bezier(.4,0,.2,1), box-shadow .6s cubic-bezier(.4,0,.2,1), transform .35s ease;
      }
      #calc-header .mn-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
      #calc-header .mn-bg-l { position: absolute; inset: 0; display: block; opacity: 0;
        transition: opacity .6s cubic-bezier(.4,0,.2,1); }
      #calc-header .mn-bg-l.on { opacity: 1; }
      #calc-header .mn-bg-l[data-t="amber"] {
        background: linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, rgba(8, 8, 10, 0.35) 100%);
      }
      #calc-header .mn-bg-l[data-t="admin"] {
        background: linear-gradient(180deg, rgba(245, 158, 11, 0.14) 0%, rgba(18, 12, 0, 0.88) 100%);
      }
      #calc-header.mn-ready > .logo-container,
      #calc-header.mn-ready > .desktop-nav { position: relative; z-index: 1; }

      #calc-header.mn-ready.mn-theme-cyan {
        border-bottom-color: ${skin.border} !important;
        box-shadow: ${skin.shadow} !important;
      }
      #calc-header.mn-ready.mn-theme-amber {
        border-bottom-color: rgba(168, 85, 247, 0.16) !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2) !important;
      }
      #calc-header.mn-ready.mn-theme-cliente {
        border-bottom-color: rgba(231, 200, 115, 0.35) !important;
      }
      #calc-header.mn-ready.mn-theme-admin {
        border-bottom-color: rgba(245, 158, 11, 0.32) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 18px rgba(245, 158, 11, 0.16) !important;
      }

      /* Primeira pintura / mudança de nível sem animação */
      #calc-header.mn-instant,
      #calc-header.mn-instant * { transition: none !important; animation: none !important; }

      /* ---------- Toggle com pílula deslizante ---------- */
      .mn-toggle { position: relative; display: inline-flex; gap: 2px; padding: 3px; flex-shrink: 0; margin-left: 1.5rem;
        border: 1px solid rgba(0,240,255,.25); border-radius: 999px; background: rgba(0,0,0,.28);
        -webkit-user-select: none; user-select: none; touch-action: pan-y; cursor: grab;
        transition: border-color .5s ease; }
      .mn-toggle.mn-dragging { cursor: grabbing; }
      .mn-pill { position: absolute; top: 3px; bottom: 3px; left: 0; width: 0; border-radius: 999px;
        background: #00f0ff; z-index: 0; pointer-events: none; will-change: transform;
        transition: transform .5s cubic-bezier(.22,1,.36,1), width .5s cubic-bezier(.22,1,.36,1), background-color .5s ease; }
      .mn-pill.mn-instant { transition: none !important; }
      .mn-toggle.mn-dragging .mn-pill { transition: width .3s cubic-bezier(.22,1,.36,1), background-color .5s ease; }
      .mn-toggle[data-active="site"] .mn-pill { background: #c5a059; }
      .mn-toggle[data-active="parceiro"] .mn-pill { background: #00f0ff; }
      .mn-toggle[data-active="admin"] .mn-pill { background: #f59e0b; }

      #calc-header > .mn-toggle-d {
        display: inline-flex !important; flex-shrink: 0 !important;
        max-width: 360px; opacity: 1; transform: translateX(0); visibility: visible; overflow: hidden;
        transition: max-width .65s cubic-bezier(.22,1,.36,1), opacity .5s ease, transform .65s cubic-bezier(.22,1,.36,1),
          margin .65s cubic-bezier(.22,1,.36,1), border-color .5s ease, visibility 0s;
      }
      #calc-header > .mn-toggle-d.mn-open { overflow: visible; }
      #calc-header > .mn-toggle-d[data-hidden="1"] {
        max-width: 0; opacity: 0; transform: translateX(-22px); visibility: hidden; pointer-events: none; overflow: hidden;
        margin-left: 0 !important; margin-right: -8px !important;
        transition: max-width .65s cubic-bezier(.22,1,.36,1), opacity .4s ease, transform .65s cubic-bezier(.22,1,.36,1),
          margin .65s cubic-bezier(.22,1,.36,1), border-color .5s ease, visibility 0s linear .65s;
      }

      @media (max-width: 1024px) {
        #calc-header.mn-ready > .desktop-nav,
        #calc-header.b2b-header-cyan .desktop-nav,
        #calc-header .desktop-nav,
        #calc-header .mn-items,
        #calc-header .desktop-nav a,
        #calc-header .desktop-nav .mn-group-btn {
          display: none !important;
        }
        #calc-header > .mn-toggle-d {
          margin-left: auto !important;
          margin-right: 0 !important;
        }
        #calc-header > .mn-toggle-d[data-hidden="1"] {
          margin-left: 0 !important;
          margin-right: -8px !important;
        }
        #calc-header .b2b-user-widget {
          display: none !important;
        }
        #calc-header .mobile-hamburger,
        #calc-header.mn-ready .mobile-hamburger {
          display: block !important;
          margin-left: 0 !important;
          position: relative !important;
          z-index: 30 !important;
          flex-shrink: 0 !important;
          max-width: 80px;
          overflow: hidden;
          transition: opacity .4s ease, max-width .45s cubic-bezier(.22,1,.36,1), transform .4s ease, visibility 0s;
        }
        /* Com o toggle visível (logado), o hambúrguer some com fade */
        #calc-header.mn-ready[data-mn-toggle="1"] .mobile-hamburger {
          opacity: 0 !important;
          max-width: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          transform: scale(.85);
          visibility: hidden;
          pointer-events: none;
          transition: opacity .4s ease, max-width .45s cubic-bezier(.22,1,.36,1), transform .4s ease, visibility 0s linear .45s;
        }
      }

      .mn-tab { position: relative; z-index: 1; font: inherit; font-size: .78rem; font-weight: 600; line-height: 1;
        padding: .42rem .85rem; border: 0; border-radius: 999px;
        background: none; color: #8da2b5; cursor: pointer; white-space: nowrap; transition: color .3s ease; }
      .mn-tab:hover { color: #e6edf3; }
      .mn-toggle .mn-tab[aria-pressed="true"],
      .mn-toggle .mn-tab.mn-hot { color: #04121a; }
      .mn-toggle[data-active="site"] .mn-tab[aria-pressed="true"],
      .mn-toggle[data-active="site"] .mn-tab.mn-hot,
      .mn-toggle[data-active="admin"] .mn-tab[aria-pressed="true"],
      .mn-toggle[data-active="admin"] .mn-tab.mn-hot { color: #1a1200; }
      .mn-toggle.mn-dragging .mn-tab[aria-pressed="true"]:not(.mn-hot) { color: #8da2b5; }
      .mn-tab:focus-visible, .mn-group-btn:focus-visible { outline: 2px solid #00f0ff; outline-offset: 2px; }
      .mn-toggle-m { display: flex; width: 100%; margin: 0 0 14px; }
      .mn-toggle-m .mn-tab { flex: 1; padding: .6rem .4rem; font-size: .85rem; }
      .mn-toggle-m[data-hidden="1"] { display: none !important; }

      #calc-header.mn-theme-amber .mn-toggle { border-color: rgba(168,85,247,.35) !important; }
      #calc-header.mn-theme-admin .mn-toggle { border-color: rgba(245,158,11,.45) !important; }

      .mn-group { display: flex; align-items: center; }
      .mn-group-btn { display: inline-flex; align-items: center; gap: .45rem; cursor: pointer; }
      .mn-caret { opacity: .75; transition: transform .15s; }
      .mn-group-btn[aria-expanded="true"] .mn-caret { transform: rotate(90deg); }

      /* Troca de menu com fade */
      .mn-fade > * { animation: mnItemIn .4s cubic-bezier(.22,1,.36,1) backwards; }
      @keyframes mnItemIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }

      #calc-header .mn-logout {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        margin: 0 !important;
        padding: 4px 8px !important;
        border: 0 !important;
        background: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        font: inherit !important;
        font-size: 12px !important;
        line-height: 1 !important;
        color: #94a3b8 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
      }
      #calc-header .mn-logout:hover { color: #f87171 !important; }

      .lp-tag {
        color: #c5a059;
        font-size: 0.75em;
        margin-left: 4px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      #mn-float { display: none; position: fixed; z-index: 2147483000; min-width: 250px; padding: .5rem;
        font-family: inherit; pointer-events: auto;
        background: linear-gradient(135deg, rgba(10,18,28,.98), rgba(14,22,35,.97));
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(0,240,255,.28); border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0,0,0,.8), inset 0 0 15px rgba(0,240,255,.05); }
      #mn-float.mn-in { animation: mnPanelIn .22s cubic-bezier(.22,1,.36,1); }
      #mn-float.mn-out { animation: mnPanelOut .16s ease forwards; pointer-events: none; }
      @keyframes mnPanelIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
      @keyframes mnPanelOut { from { opacity: 1; } to { opacity: 0; } }
      #mn-float::before { content: ''; position: absolute; left: 0; right: 0; top: -14px; height: 14px; }
      #mn-float a { display: block; white-space: nowrap; padding: .65rem .9rem; border-radius: 8px;
        color: #e6edf3; text-decoration: none; font-size: .8rem; font-weight: 600;
        letter-spacing: .08em; text-transform: uppercase; transition: background .15s, color .15s; }
      #mn-float a:hover { background: rgba(0,240,255,.08); color: #00f0ff; }
      #mn-float a.active { color: #00f0ff; background: rgba(0,240,255,.12); }
      #mn-float.mn-theme-admin {
        border-color: rgba(245,158,11,.35);
        box-shadow: 0 20px 50px rgba(0,0,0,.8), inset 0 0 15px rgba(245,158,11,.06);
      }
      #mn-float.mn-theme-admin a:hover { background: rgba(245,158,11,.10); color: #f59e0b; }
      #mn-float.mn-theme-admin a.active { color: #fbbf24; background: rgba(245,158,11,.16); }

      .mn-m-group { display: block; }
      .mn-m-group > .mn-group-btn { display: flex; justify-content: space-between; align-items: center; width: 100%; }
      .mn-m-sub { display: none; margin: 2px 0 8px 12px; padding-left: 10px; border-left: 2px solid rgba(0,240,255,.25); }
      .mn-m-sub.open { display: block; }
      .mn-m-sub a { display: block; }

      /* ---------- Avatar (todas as áreas) ---------- */
      #calc-header .b2b-avatar-img, .mn-m-av {
        width: 34px; height: 34px; border-radius: 50%; flex: none;
        background-size: cover; background-position: center;
        background-color: rgba(0,240,255,.12); border: 1px solid rgba(0,240,255,.4);
        display: flex; align-items: center; justify-content: center; font-size: 16px;
      }
      .mn-m-av { width: 40px; height: 40px; }
      .mn-m-user { display: flex; align-items: center; justify-content: space-between; gap: 12px;
        margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(0,240,255,.2); }
      .mn-m-prof { display: flex; align-items: center; gap: 12px; text-decoration: none; min-width: 0; }

      /* ---------- Envelope de e-mail / sino de notificações + contador ---------- */
      .mn-mail { position: relative; display: inline-flex !important; align-items: center; justify-content: center;
        width: 34px; height: 34px; border-radius: 50%; color: #8da2b5; text-decoration: none; flex: none;
        transition: color .2s, background .2s; }
      .mn-mail:hover, .mn-mail.active { color: #00f0ff; background: rgba(0,240,255,.1); }
      .mn-badge { position: absolute; top: -3px; right: -4px; min-width: 16px; height: 16px; padding: 0 4px;
        box-sizing: border-box; border-radius: 999px; background: #ff2d6f; color: #fff;
        font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; box-shadow: 0 0 0 2px #0a0f16; }
      .mn-badge[hidden] { display: none !important; }
      .mn-mail-hdr { display: none !important; }

      /* ---------- Botão "ativar avisos" (só no app instalado) ---------- */
      .mn-push { display: none !important; align-items: center; justify-content: center;
        width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(245,158,11,.5);
        background: rgba(245,158,11,.12); font-size: 16px; line-height: 1; cursor: pointer; flex: none; padding: 0; }
      .mn-push.on { display: inline-flex !important; }
      @media (max-width: 1024px) { .mn-mail-hdr { display: inline-flex !important; margin-left: 8px; } }

      @media (prefers-reduced-motion: reduce) {
        #calc-header *, #calc-header, #mobile-menu *, #mn-float {
          transition-duration: .01ms !important;
          animation-duration: .01ms !important;
          animation-delay: 0s !important;
        }
      }
    `;
    document.head.appendChild(st);
  }

  /* ---------- 6. Renderização do Header ---------- */
  var rendered = false;
  var lastSig = '';
  var userSig = null;

  /* Estado do parceiro (avatar/nome) e do contador de e-mails */
  var lastParceiro = null;
  var mailUid = null;
  var mailCount = 0;
  var mailTimer = null;

  /* PWA / Push: cole aqui a chave PÚBLICA VAPID (a privada fica só no Supabase) */
  var VAPID_PUBLIC = 'BM6ILzfra83ovE2AOg_xIW7_YioGcj6E0EkPKgVZI944NVoPhBHoJaIMZuZMOvD0hp4YTqq9GxiXor5VB3N4m-Y';
  var ICON_URL = '/imagens/logo512x512.png';

  var MAIL_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
  var BELL_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

  function mailLinkHTML(cls, standalone) {
    /* Cliente: sino de notificações da área do cliente (sem e-mail) */
    if (onCliente || cachedIsCliente) {
      return '<a href="' + CLIENTE + 'index.html?notif=1" class="mn-mail mn-notif ' + cls + '" data-mn-notif="1"' +
        (standalone ? ' data-mn-user="1"' : '') + ' title="Notificações" aria-label="Notificações">' +
        BELL_SVG + '<span class="mn-badge" hidden></span></a>';
    }
    var ativo = (!isSubdirAdmin && currentPath === 'e-mail.html') ? ' active' : '';
    return '<a href="' + B2B + 'e-mail.html" class="mn-mail ' + cls + ativo + '"' +
      (standalone ? ' data-mn-user="1"' : '') + ' title="E-mail" aria-label="E-mail">' +
      MAIL_SVG + '<span class="mn-badge" hidden></span></a>';
  }

  var CAL_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

  function calLinkHTML(cls, standalone) {
    /* Calendário unificado (pasta admin) — parceiro e admin usam a mesma agenda */
    if (onCliente) return '';
    if (!(cachedLoggedIn || cachedIsParceiro || cachedIsAdmin)) return '';
    var ativo = (currentPath === 'agenda.html') ? ' active' : '';
    return '<a href="' + ADM + 'agenda.html" class="mn-mail ' + cls + ativo + '"' +
      (standalone ? ' data-mn-user="1"' : '') + ' title="Agenda" aria-label="Agenda">' +
      CAL_SVG + '</a>';
  }

  /* Preenche avatar e nome em qualquer área (site, parceiro, admin) */
  function fillUserParts(p) {
    if (p) lastParceiro = p;
    p = lastParceiro;
    if (!p) return;
    var url = p.avatar_url && String(p.avatar_url).trim();
    var nome = p.nome_completo ? String(p.nome_completo).split(' ')[0] : (p.nome_razao ? String(p.nome_razao).split(' ')[0] : '');
    var avs = document.querySelectorAll('#calc-header [data-partner-avatar], #mobile-menu [data-partner-avatar]');
    for (var i = 0; i < avs.length; i++) {
      if (url) {
        avs[i].style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
        avs[i].textContent = '';
        avs[i].title = 'Meu Perfil';
      } else {
        avs[i].style.backgroundImage = 'none';
        avs[i].textContent = '👤';
        avs[i].title = 'Clique para adicionar sua foto de perfil!';
      }
    }
    var nomes = document.querySelectorAll('#mobile-menu [data-partner-nome]');
    for (var j = 0; j < nomes.length; j++) if (nome) nomes[j].textContent = nome;
  }

  function setMailBadge(n) {
    mailCount = n;
    var bs = document.querySelectorAll('.mn-badge');
    for (var i = 0; i < bs.length; i++) {
      if (n > 0) {
        bs[i].textContent = n > 99 ? '99+' : String(n);
        bs[i].hidden = false;
        bs[i].style.removeProperty('display');
      } else {
        bs[i].textContent = '';
        bs[i].hidden = true;
        bs[i].style.setProperty('display', 'none', 'important');
      }
    }
  }
  /* A área do cliente usa isto para mostrar o número de notificações não lidas no sino */
  window.mnSetBadge = function (n) { setMailBadge(Number(n) || 0); };

  /* Mesma regra da pasta "Caixa de Entrada" do e-mail.html */
  function refreshMailCount() {
    if (typeof sbPartner === 'undefined' || !sbPartner.from) return;
    sbPartner.from('email_mensagens')
      .select('id', { count: 'exact', head: true })
      .eq('direcao', 'recebida').eq('lida', false)
      .is('excluida_em', null).eq('pasta_sistema', 'entrada').is('pasta_id', null)
      .then(function (r) {
        if (!r.error && typeof r.count === 'number') {
          setMailBadge(r.count);
          setAppBadge(r.count);
        }
      });
  }

  /* Contagem inicial + Realtime do Supabase */
  function startMail(uid) {
    if (!uid || mailUid === uid || typeof sbPartner === 'undefined') return;
    mailUid = uid;
    refreshMailCount();
    function debounced() {
      clearTimeout(mailTimer);
      mailTimer = setTimeout(refreshMailCount, 400);
    }
    if (sbPartner.channel) {
      sbPartner.channel('mn-mail-' + uid)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'email_mensagens' }, debounced)
        .subscribe();
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refreshMailCount();
    });
  }

  /* ---------- PWA: ícone na tela de início, avisos e bolinha no ícone ---------- */
  function isStandalone() {
    return !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true);
  }

  /* Service worker sempre registrado, em qualquer navegador e qualquer página:
     é isso que faz o Chrome do Android oferecer "Instalar app" em vez de só atalho.
     O arquivo e o escopo ficam em /B2B/ (mesma origem da página). */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(location.origin + '/B2B/sw.js', { scope: '/B2B/' })
      .catch(function (err) { console.warn('[432UP PWA] service worker não registrado', err); });
  }

  /* Manifest e ícone entram em toda página que carrega o menu. */
  function injectPwaTags() {
    var h = document.head;
    if (!h) return;
    function add(tag, attrs) {
      var el = document.createElement(tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      h.appendChild(el);
    }
    if (!document.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: location.origin + '/B2B/manifest.json' });
    if (!document.querySelector('link[rel="apple-touch-icon"]')) add('link', { rel: 'apple-touch-icon', href: location.origin + ICON_URL });
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    if (!document.querySelector('meta[name="mobile-web-app-capable"]')) add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) add('meta', { name: 'apple-mobile-web-app-title', content: '432UP' });
    if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
    if (!document.querySelector('meta[name="theme-color"]')) add('meta', { name: 'theme-color', content: '#0a0f16' });
    registerSW();
  }

  /* Número no ícone do app instalado (quando o app está aberto) */
  function setAppBadge(n) {
    try {
      if (n > 0 && navigator.setAppBadge) navigator.setAppBadge(n).catch(function () {});
      else if (n <= 0 && navigator.clearAppBadge) navigator.clearAppBadge().catch(function () {});
    } catch (e) {}
  }

  function pushOK() {
    return !!(VAPID_PUBLIC && VAPID_PUBLIC.indexOf('COLE_AQUI') !== 0 && !onSite &&
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && isStandalone());
  }

  function b64ToU8(b64) {
    var pad = '='.repeat((4 - b64.length % 4) % 4);
    var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function pushBtnHTML() {
    return '<button type="button" class="mn-push" title="Ativar avisos de novos e-mails" aria-label="Ativar avisos de novos e-mails">🔔</button>';
  }

  function refreshPushUI() {
    /* Cliente tem o próprio "Ativar avisos" dentro da página; aqui não duplica */
    var show = pushOK() && !onCliente && Notification.permission === 'default' && isLogged();
    var bs = document.querySelectorAll('.mn-push');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', show);
  }

  /* Registra o service worker e grava o aparelho no Supabase */
  function syncPush() {
    return navigator.serviceWorker.register(location.origin + '/B2B/sw.js', { scope: '/B2B/' })
      .then(function () { return navigator.serviceWorker.ready; })
      .then(function (reg) {
        return reg.pushManager.getSubscription().then(function (sub) {
          return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID_PUBLIC) });
        });
      })
      .then(function (sub) {
        var j = sub.toJSON();
        return sbPartner.rpc('registrar_push', {
          p_endpoint: j.endpoint,
          p_p256dh: j.keys.p256dh,
          p_auth: j.keys.auth,
          p_ua: String(navigator.userAgent).slice(0, 200)
        });
      })
      .catch(function (err) { console.warn('[432UP push]', err); });
  }

  function initPush() {
    if (!pushOK()) return;
    if (Notification.permission === 'granted') syncPush();
    refreshPushUI();
  }

  /* iOS exige que a permissão seja pedida a partir de um toque */
  function askPush() {
    if (!pushOK()) return;
    Notification.requestPermission().then(function (p) {
      if (p === 'granted') syncPush();
      refreshPushUI();
    });
  }

  /* No logout: remove o aparelho do usuário que saiu e zera a bolinha */
  function removePush() {
    try { if (navigator.clearAppBadge) navigator.clearAppBadge().catch(function () {}); } catch (e) {}
    if (!('serviceWorker' in navigator) || typeof sbPartner === 'undefined') return Promise.resolve();
    var work = navigator.serviceWorker.getRegistration('/B2B/').then(function (reg) {
      if (!reg) return;
      return reg.pushManager.getSubscription().then(function (sub) {
        if (!sub) return;
        return Promise.resolve(sbPartner.rpc('remover_push', { p_endpoint: sub.endpoint }))
          .catch(function () {})
          .then(function () { return sub.unsubscribe(); });
      });
    }).catch(function () {});
    return Promise.race([work, new Promise(function (r) { setTimeout(r, 2500); })]);
  }

  function userWidgetHTML() {
    if (!isLogged()) return '';
    var perfilHref = onCliente ? CLIENTE_PERFIL : (B2B + 'perfil.html');
    var perfilAtivo = onCliente ? '' : (!isSubdirAdmin && currentPath === 'perfil.html' ? ' active' : '');
    return '<div class="b2b-user-widget" data-mn-user="1">' +
      pushBtnHTML() +
      calLinkHTML('', false) +
      mailLinkHTML('', false) +
      '<a href="' + perfilHref + '" title="Meu Perfil" class="b2b-avatar-link' + perfilAtivo + '"' + (onCliente ? ' data-mn-perfil="1"' : '') + '>' +
        '<div data-partner-avatar class="b2b-avatar-img"></div>' +
      '</a>' +
      '<button type="button" id="btnLogoutDesk" title="Sair do Portal" class="mn-logout">🔒 Sair</button>' +
    '</div>';
  }

  function mobUserHTML() {
    var master = cachedIsAdmin;
    var perfilMob = onCliente ? CLIENTE_PERFIL : (B2B + 'perfil.html');
    return '<div data-mn-user="1" class="mn-m-user">' +
      '<a href="' + perfilMob + '" class="mn-m-prof"' + (onCliente ? ' data-mn-perfil="1"' : '') + '>' +
        '<div data-partner-avatar class="mn-m-av"></div>' +
        '<div style="text-align:left;">' +
          '<span data-partner-nome style="display:block;font-size:.9rem;font-weight:700;color:#fff;">—</span>' +
          '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:' + (master ? '#fbbf24' : '#22d3ee') + ';">' +
            (master ? 'Master Admin ➔' : 'Ver Meu Perfil ➔') + '</span>' +
        '</div></a>' +
      '<div style="display:flex;align-items:center;gap:6px;flex:none;">' + pushBtnHTML() + calLinkHTML('', false) + mailLinkHTML('', false) + '</div>' +
    '</div>';
  }

  function mobLogoutHTML() {
    return '<button type="button" id="btnLogoutMob" data-mn-user="1" class="btn-header-cta mn-logout" style="margin-left: 0; margin-top: 15px; padding: 12px 28px; width: 100%; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">🔒 Sair do Portal</button>';
  }

  /* Insere/remove perfil e botão Sair sem recriar o header inteiro */
  function refreshUserParts() {
    var stale = document.querySelectorAll('[data-mn-user]');
    for (var i = 0; i < stale.length; i++) stale[i].parentNode.removeChild(stale[i]);
    userSig = (isLogged() ? '1' : '0') + '|' + (cachedIsAdmin ? '1' : '0');
    if (!isLogged()) return;

    var nav = document.querySelector('#calc-header .desktop-nav');
    if (nav) nav.insertAdjacentHTML('beforeend', userWidgetHTML());

    var menu = document.getElementById('mobile-menu');
    if (menu) {
      var tg = menu.querySelector('.mn-toggle-m');
      if (tg) tg.insertAdjacentHTML('beforebegin', mobUserHTML());
      menu.insertAdjacentHTML('beforeend', mobLogoutHTML());
    }
    bindLogoutEvents();

    /* Sino/envelope extra no header: só aparece no mobile (o widget fica oculto ali) */
    var hdr = document.getElementById('calc-header');
    if (hdr) hdr.insertAdjacentHTML('beforeend', mailLinkHTML('mn-mail-hdr', true));

    fillUserParts();
    setMailBadge(mailCount);
    refreshPushUI();
  }

  function settleHeader(headerEl) {
    headerEl.classList.add('mn-instant');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { headerEl.classList.remove('mn-instant'); });
    });
  }

  function renderHeader() {
    var headerEl = document.getElementById('calc-header');
    var mobileMenuEl = document.getElementById('mobile-menu');

    if (!headerEl && !mobileMenuEl) return;

    if (headerEl) captureCyan(headerEl);
    injectStyles();

    if (headerEl) {
      headerEl.className = 'b2b-header-cyan mn-ready mn-instant ' + themeClass();
      headerEl.innerHTML =
        '<div class="mn-bg" aria-hidden="true">' +
          '<i class="mn-bg-l" data-t="cyan"></i><i class="mn-bg-l" data-t="amber"></i><i class="mn-bg-l" data-t="admin"></i>' +
        '</div>' +
        '<div class="logo-container flex items-center">' +
          '<a href="' + SITE + 'index.html" class="logo-link flex items-center" aria-label="Página Inicial 432UP">' +
            '<img src="' + SITE + 'imagens/logo.png" alt="432UP! Produções" class="logo-img">' +
          '</a>' +
        '</div>' +
        toggleHTML('mn-toggle-d') +
        '<nav class="desktop-nav" aria-label="Navegação principal">' +
          '<div class="mn-items" id="mnDeskItems"></div>' +
        '</nav>' +
        '<button type="button" class="mobile-hamburger" onclick="window.toggleMobileMenu()" aria-label="Abrir menu">☰</button>';

      var cyanLayer = headerEl.querySelector('.mn-bg-l[data-t="cyan"]');
      if (cyanLayer && cyanSkin) {
        cyanLayer.style.backgroundColor = cyanSkin.color;
        cyanLayer.style.backgroundImage = cyanSkin.image;
      }
      if (window.getComputedStyle(headerEl).position === 'static') headerEl.style.position = 'relative';
    }

    if (mobileMenuEl) {
      mobileMenuEl.className = 'mobile-menu-overlay';
      mobileMenuEl.innerHTML =
        '<button type="button" onclick="window.toggleMobileMenu()" aria-label="Fechar menu" style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">✕</button>' +
        toggleHTML('mn-toggle-m') +
        '<div id="mnMobItems"></div>';
    }

    rendered = true;
    lastSig = '';
    refreshUserParts();
    applyLevel(false);
    bindEvents();
    if (headerEl) settleHeader(headerEl);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { layoutAll(false); });
    }
  }

  function themeClass() {
    if (areaAtual === 'site') return 'mn-theme-amber';
    if (areaAtual === 'admin') return 'mn-theme-admin';
    return 'mn-theme-cyan';
  }

  function syncTheme() {
    var theme = themeClass();
    ['calc-header', 'mobile-menu'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('mn-theme-amber', 'mn-theme-cyan', 'mn-theme-admin');
      el.classList.add(theme);
    });
    var key = areaAtual === 'site' ? 'amber' : (areaAtual === 'admin' ? 'admin' : 'cyan');
    var layers = document.querySelectorAll('#calc-header .mn-bg-l');
    for (var i = 0; i < layers.length; i++) {
      layers[i].classList.toggle('on', layers[i].getAttribute('data-t') === key);
    }
  }

  function syncTabs() {
    var tabs = document.querySelectorAll('.mn-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].setAttribute('aria-pressed', tabs[i].getAttribute('data-area') === areaAtual ? 'true' : 'false');
    }
    var wraps = document.querySelectorAll('.mn-toggle');
    for (var j = 0; j < wraps.length; j++) wraps[j].setAttribute('data-active', areaAtual);
  }

  function replayFade(el) {
    if (!el) return;
    el.classList.remove('mn-fade');
    void el.offsetWidth;
    el.classList.add('mn-fade');
  }

  function renderItems(animate) {
    closePanel();
    syncTheme();
    var d = document.getElementById('mnDeskItems');
    var m = document.getElementById('mnMobItems');
    if (d) d.innerHTML = itemsHTML(areaAtual, false);
    if (m) m.innerHTML = itemsHTML(areaAtual, true);
    syncTabs();
    if (animate) {
      replayFade(d);
      replayFade(m);
    }
  }

  /* ---------- Pílula do toggle ---------- */
  function layoutPill(wrap, animate) {
    var pill = wrap.querySelector('.mn-pill');
    var active = wrap.querySelector('.mn-tab[aria-pressed="true"]');
    if (!pill || !active || active.style.display === 'none' || !active.offsetWidth) return;
    if (!animate) pill.classList.add('mn-instant');
    pill.style.width = active.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + active.offsetLeft + 'px)';
    if (!animate) {
      void pill.offsetWidth;
      pill.classList.remove('mn-instant');
    }
  }

  function layoutAll(animate) {
    var wraps = document.querySelectorAll('.mn-toggle');
    for (var i = 0; i < wraps.length; i++) layoutPill(wraps[i], animate);
  }

  function visibleTabs(wrap) {
    return Array.prototype.filter.call(wrap.querySelectorAll('.mn-tab'), function (t) {
      return t.style.display !== 'none';
    });
  }

  function applyLevel(animate) {
    if (!podeVer(areaAtual)) {
      if (podeVer(pageArea)) areaAtual = pageArea;
      else if (podeVer('parceiro')) areaAtual = 'parceiro';
      else areaAtual = 'site';
    }

    var headerEl = document.getElementById('calc-header');
    if (!animate && headerEl && rendered) settleHeader(headerEl);

    var sig = [podeVer('parceiro'), podeVer('admin'), areaAtual].join('|');
    var changed = sig !== lastSig;
    lastSig = sig;

    var wraps = document.querySelectorAll('.mn-toggle');
    var headerToggleVisible = false;
    for (var i = 0; i < wraps.length; i++) {
      var wrap = wraps[i];
      var visiveis = 0;
      var tabs = wrap.querySelectorAll('.mn-tab');
      for (var j = 0; j < tabs.length; j++) {
        var ok = podeVer(tabs[j].getAttribute('data-area'));
        tabs[j].style.display = ok ? '' : 'none';
        if (ok) visiveis++;
      }
      var nowHidden = visiveis < 2;
      var wasHidden = wrap.hasAttribute('data-hidden');
      if (nowHidden) wrap.setAttribute('data-hidden', '1');
      else wrap.removeAttribute('data-hidden');

      if (wrap.classList.contains('mn-toggle-d')) {
        if (!nowHidden) headerToggleVisible = true;
        if (nowHidden) wrap.classList.remove('mn-open');
        else if (!animate || !wasHidden) wrap.classList.add('mn-open');
        else setTimeout(function (w) { return function () { if (!w.hasAttribute('data-hidden')) w.classList.add('mn-open'); }; }(wrap), 700);
      }
    }
    if (headerEl) headerEl.setAttribute('data-mn-toggle', headerToggleVisible ? '1' : '0');

    if (changed || !animate) renderItems(!!animate && changed);
    layoutAll(!!animate && changed);
  }

  /* Troca de modo (toque, clique, arraste, teclado) */
  function setArea(area, opts) {
    opts = opts || {};
    if (!podeVer(area)) return;
    var mudou = area !== areaAtual;
    areaAtual = area;
    lastSig = [podeVer('parceiro'), podeVer('admin'), areaAtual].join('|');
    if (mudou) renderItems(true);
    else syncTabs();
    layoutAll(true);
    if (opts.open) openMobile();
  }

  /* ---------- 7. Painel flutuante dos submenus ---------- */
  var panel = null;
  var panelOwner = null;
  var closeTimer = null;
  var hideTimer = null;
  var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  function getPanel() {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'mn-float';
      panel.setAttribute('role', 'menu');
      panel.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
      panel.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      document.body.appendChild(panel);
    }
    return panel;
  }

  function closePanel() {
    clearTimeout(closeTimer);
    if (panel && panel.style.display === 'block' && !panel.classList.contains('mn-out')) {
      panel.classList.add('mn-out');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (panel && panel.classList.contains('mn-out')) panel.style.display = 'none';
      }, 170);
    }
    if (panelOwner) panelOwner.setAttribute('aria-expanded', 'false');
    panelOwner = null;
  }

  function openPanel(btn) {
    var item = MENUS[areaAtual][parseInt(btn.getAttribute('data-idx'), 10)];
    if (!item || !item.sub) return;
    clearTimeout(closeTimer);
    clearTimeout(hideTimer);
    if (panelOwner && panelOwner !== btn) panelOwner.setAttribute('aria-expanded', 'false');

    var p = getPanel();
    var jaAberto = p.style.display === 'block' && !p.classList.contains('mn-out');
    p.className = themeClass() + (jaAberto ? '' : ' mn-in');
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
  function openMobile() {
    var m = document.getElementById('mobile-menu');
    if (!m) return;
    m.classList.add('active');
    m.setAttribute('aria-hidden', 'false');
    layoutAll(false);
  }

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
        if (b.getAttribute('data-mn-bound')) return;
        b.setAttribute('data-mn-bound', '1');
        b.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          logoutLock = true;
          cachedLoggedIn = false;
          cachedIsAdmin = false;
          try {
            sessionStorage.removeItem('432up_is_logged');
            sessionStorage.removeItem('432up_is_admin');
            sessionStorage.removeItem('432up_is_cliente');
          } catch (err) {}
          function go() {
            if (onSite) window.location.replace(SITE + 'index.html');
            else if (typeof partnerLogout === 'function') partnerLogout(e);
            else window.location.replace(B2B + 'login.html');
          }
          if (typeof sbPartner !== 'undefined' && sbPartner.auth) {
            Promise.resolve(removePush())
              .then(function () { return sbPartner.auth.signOut(); })
              .then(go).catch(go);
          } else {
            go();
          }
        });
      }
    });
  }

  function nearest(tabs, center) {
    var best = tabs[0];
    var bd = Infinity;
    for (var i = 0; i < tabs.length; i++) {
      var d = Math.abs(tabs[i].offsetLeft + tabs[i].offsetWidth / 2 - center);
      if (d < bd) { bd = d; best = tabs[i]; }
    }
    return best;
  }

  var drag = null;
  var suppressClick = false;

  function bindDrag() {
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var wrap = up(e, '.mn-toggle');
      if (!wrap || wrap.hasAttribute('data-hidden')) return;
      var pill = wrap.querySelector('.mn-pill');
      var active = wrap.querySelector('.mn-tab[aria-pressed="true"]');
      var tabs = visibleTabs(wrap);
      if (!pill || !active || tabs.length < 2) return;
      drag = {
        wrap: wrap, pill: pill, tabs: tabs, startTab: active, hot: active,
        x0: e.clientX, t0: Date.now(), left0: active.offsetLeft, w: active.offsetWidth,
        id: e.pointerId, moved: false, cur: null
      };
    });

    document.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        drag.moved = true;
        drag.wrap.classList.add('mn-dragging');
        drag.hot.classList.add('mn-hot');
        try { drag.wrap.setPointerCapture(e.pointerId); } catch (err) {}
      }
      var first = drag.tabs[0];
      var last = drag.tabs[drag.tabs.length - 1];
      var minL = first.offsetLeft;
      var maxL = last.offsetLeft + last.offsetWidth - drag.w;
      var left = Math.max(minL, Math.min(maxL, drag.left0 + dx));
      drag.cur = left;
      drag.pill.style.transform = 'translateX(' + left + 'px)';
      var hot = nearest(drag.tabs, left + drag.w / 2);
      if (hot !== drag.hot) {
        drag.hot.classList.remove('mn-hot');
        hot.classList.add('mn-hot');
        drag.hot = hot;
      }
    });

    function finish(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      if (!d.moved) return;
      d.wrap.classList.remove('mn-dragging');
      d.hot.classList.remove('mn-hot');
      try { d.wrap.releasePointerCapture(e.pointerId); } catch (err) {}
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 80);
      if (cancelled) { layoutAll(true); return; }

      var dx = e.clientX - d.x0;
      var dt = Date.now() - d.t0;
      var center = (d.cur !== null ? d.cur : d.left0) + d.w / 2;
      var target = nearest(d.tabs, center);
      if (target === d.startTab && Math.abs(dx) >= 14 && dt < 450) {
        var i = d.tabs.indexOf(d.startTab) + (dx > 0 ? 1 : -1);
        if (i >= 0 && i < d.tabs.length) target = d.tabs[i];
      }
      setArea(target.getAttribute('data-area'), {
        open: d.wrap.classList.contains('mn-toggle-d') && isMobileView()
      });
    }
    document.addEventListener('pointerup', function (e) { finish(e, false); });
    document.addEventListener('pointercancel', function (e) { finish(e, true); });

    /* Arrastar não pode disparar também um clique */
    document.addEventListener('click', function (e) {
      if (suppressClick && up(e, '.mn-toggle')) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }

  var eventsBound = false;
  function bindEvents() {
    bindLogoutEvents();
    if (eventsBound) return;
    eventsBound = true;

    bindDrag();

    document.addEventListener('click', function (e) {
      if (up(e, '.mn-push')) {
        askPush();
        return;
      }

      /* Cliente: sino abre o modal de notificações da própria página, sem recarregar */
      if (onCliente && up(e, '[data-mn-notif]')) {
        e.preventDefault();
        closeMobile();
        window.dispatchEvent(new CustomEvent('432up:abrir-notif'));
        return;
      }
      /* Cliente: avatar abre direto a aba Perfil */
      if (onCliente && up(e, '[data-mn-perfil]')) {
        e.preventDefault();
        closeMobile();
        window.dispatchEvent(new CustomEvent('432up:ir-aba', { detail: 'perfil' }));
        return;
      }

      var tab = up(e, '.mn-tab');
      if (tab) {
        var wrap = up(e, '.mn-toggle');
        var doHeader = !!(wrap && wrap.classList.contains('mn-toggle-d'));
        setArea(tab.getAttribute('data-area'), { open: doHeader && isMobileView() });
        return;
      }

      /* Toque fora do conteúdo (no fundo do menu) fecha o menu */
      if (e.target && e.target.id === 'mobile-menu') {
        closeMobile();
        return;
      }

      var gbtn = up(e, '.mn-group-btn');
      if (gbtn) {
        e.preventDefault();
        if (gbtn.parentNode.classList.contains('mn-m-group')) {
          var sub = gbtn.nextElementSibling;
          var aberto = sub.classList.toggle('open');
          gbtn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        } else if (panelOwner === gbtn) {
          closePanel();
        } else {
          openPanel(gbtn);
        }
        return;
      }

      if (up(e, '#mn-float a[href]')) {
        setTimeout(closePanel, 50);
        return;
      }
      if (!up(e, '#mn-float') && !up(e, '.mn-group > .mn-group-btn')) closePanel();
      if (up(e, '#mobile-menu a[href]')) closeMobile();
    });

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
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        var tab = up(e, '.mn-tab');
        if (!tab) return;
        var wrap = up(e, '.mn-toggle');
        if (!wrap) return;
        var tabs = visibleTabs(wrap);
        var i = tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
        if (i < 0 || i >= tabs.length) return;
        e.preventDefault();
        tabs[i].focus();
        setArea(tabs[i].getAttribute('data-area'), {});
      }
    });

    window.addEventListener('scroll', closePanel, { passive: true });
    window.addEventListener('resize', function () {
      closePanel();
      layoutAll(false);
    });
  }

  /* ---------- 9. API global ---------- */
  window.toggleMobileMenu = function () {
    var m = document.getElementById('mobile-menu');
    if (!m) return;
    var on = m.classList.toggle('active');
    m.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) layoutAll(false);
  };

  window.updateAuthState = function (opts) {
    if (logoutLock) return;
    opts = opts || {};
    cachedLoggedIn = !!opts.loggedIn;
    cachedIsAdmin = !!opts.isAdmin;
    if (typeof opts.isCliente === 'boolean') cachedIsCliente = opts.isCliente;
    if (cachedIsAdmin) cachedLoggedIn = true;
    if (!onSite || onCliente) cachedLoggedIn = true;
    if (onCliente) cachedIsCliente = true;
    try {
      sessionStorage.setItem('432up_is_logged', cachedLoggedIn ? 'true' : 'false');
      sessionStorage.setItem('432up_is_admin', cachedIsAdmin ? 'true' : 'false');
      sessionStorage.setItem('432up_is_cliente', cachedIsCliente ? 'true' : 'false');
    } catch (e) {}

    /* Antes de montar o header, o estado fica só no cache */
    if (!rendered) return;

    var novaSig = (isLogged() ? '1' : '0') + '|' + (cachedIsAdmin ? '1' : '0') + '|' + (cachedIsCliente ? '1' : '0');
    if (novaSig !== userSig) refreshUserParts();
    applyLevel(true);
  };

  window.updateAdminState = function (isAdmin) {
    window.updateAuthState({
      loggedIn: !!isAdmin || cachedLoggedIn,
      isAdmin: !!isAdmin
    });
  };

  function isAdminParceiro(parceiro) {
    if (!parceiro) return false;
    if (parceiro.is_admin === true) return true;
    var role = String(parceiro.role || parceiro.nivel || '').toLowerCase().trim();
    return role === 'admin' || role === 'master';
  }

  function applyParceiro(parceiro) {
    lastParceiro = parceiro || null;
    /* Na página do cliente, aba Parceiro só para cadastro de parceiro aprovado */
    cachedIsParceiro = !!parceiro && parceiro.role !== 'client' && parceiro.status === 'aprovado';
    var uid = parceiro && parceiro.user_id;
    var base = { loggedIn: !!parceiro, isAdmin: isAdminParceiro(parceiro) };
    if (!uid || typeof sbPartner === 'undefined') {
      window.updateAuthState(base);
      fillUserParts();
      return;
    }
    sbPartner.from('portal_clientes').select('id, avatar_url, email').eq('user_id', uid).maybeSingle().then(function (pc) {
      base.isCliente = !!(pc && pc.data);
      window.updateAuthState(base);
      if (pc && pc.data) {
        fillUserParts({
          avatar_url: pc.data.avatar_url || '',
          nome_completo: (pc.data.email || '').split('@')[0] || 'Cliente'
        });
      } else {
        fillUserParts();
      }
    }).catch(function () {
      window.updateAuthState(base);
      fillUserParts();
    });
    if (uid) {
      /* E-mail e contador são do portal B2B; na área do cliente o sino usa as notificações da página */
      if (!onCliente) startMail(uid);
      initPush();
    }
  }

  function peekAuth() {
    if (logoutLock) return Promise.resolve(null);
    if (typeof partnerPeekAuth === 'function') return Promise.resolve(partnerPeekAuth());
    if (typeof sbPartner === 'undefined' || !sbPartner.auth) return Promise.resolve(null);
    return sbPartner.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session || !session.user) return null;
      var uid = session.user.id;
      return sbPartner
        .from('parceiros')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle()
        .then(function (r) {
          if (r.data) return r.data;
          /* Sessão válida sem linha de parceiro: ainda assim marca logado (ex.: cliente) */
          return { role: 'client', user_id: uid };
        });
    }).catch(function () {
      return null;
    });
  }

  var _authSyncTries = 0;
  function syncAuth() {
    if (onSite) {
      if (logoutLock) return;
      peekAuth().then(function (parceiro) {
        if (logoutLock || !parceiro) return;
        applyParceiro(parceiro);
      });
      return;
    }

    if (typeof partnerRequireAuth !== 'function') {
      if (_authSyncTries++ < 40) setTimeout(syncAuth, 50);
      return;
    }
    if (onCliente) {
      peekAuth().then(function (p) { if (p) applyParceiro(p); }).catch(function () {});
      return;
    }
    partnerRequireAuth({ requireAdmin: false }).then(applyParceiro).catch(function () {});
  }

  injectPwaTags();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderHeader();
      syncAuth();
    });
  } else {
    renderHeader();
    syncAuth();
  }
})();
