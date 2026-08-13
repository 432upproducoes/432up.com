/* ========== script/galeria.js · 432UP · v5.2 · Modo B + Lightbox álbum + prefetch ========== */
/* O canvas de fundo (#orbit-canvas) já é desenhado globalmente por script.js.
   Não redeclarar aqui. */

function showGalToast(msg, type) {
  let container = document.getElementById('galToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'galToastContainer';
    container.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;width:100%;padding:0 16px;box-sizing:border-box;';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  const isError = type === 'error';
  t.style.cssText = 'pointer-events:auto;max-width:420px;width:100%;padding:14px 20px;border-radius:12px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:.9rem;font-weight:600;box-shadow:0 8px 28px rgba(0,0,0,.35);display:flex;align-items:center;gap:10px;opacity:0;transform:translateY(16px);transition:opacity .28s ease, transform .28s ease;' +
    (isError ? 'background:#FF4D6D;color:#fff;' : 'background:#00FF66;color:#08080A;');
  t.innerHTML = '<span style="font-size:1.05rem;line-height:1;">' + (isError ? '⚠️' : '✅') + '</span><span>' + msg + '</span>';
  container.appendChild(t);
  requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
  setTimeout(function () {
    t.style.opacity = '0';
    t.style.transform = 'translateY(16px)';
    setTimeout(function () { t.remove(); }, 300);
  }, 4200);
}

/* ========== LIGHTBOX ÁLBUM ========== */
var lbItems = [];
var lbIndex = 0;

function ensureLightbox() {
  if (document.getElementById('gal-lightbox')) return;

  var lb = document.createElement('div');
  lb.id = 'gal-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML =
    '<div class="gal-lb-backdrop"></div>' +
    '<div class="gal-lb-stage">' +
      '<button class="gal-lb-close" aria-label="Fechar">&times;</button>' +
      '<button class="gal-lb-nav gal-lb-prev" aria-label="Anterior">&#10094;</button>' +
      '<button class="gal-lb-nav gal-lb-next" aria-label="Próximo">&#10095;</button>' +
      '<div class="gal-lb-content"></div>' +
      '<div class="gal-lb-caption">' +
        '<h4 class="gal-lb-title"></h4>' +
        '<p class="gal-lb-desc"></p>' +
        '<span class="gal-lb-meta"></span>' +
      '</div>' +
      '<div class="gal-lb-dots"></div>' +
    '</div>';
  document.body.appendChild(lb);

  if (!document.getElementById('gal-lightbox-styles')) {
    var style = document.createElement('style');
    style.id = 'gal-lightbox-styles';
    style.textContent = `
      #gal-lightbox {
        position: fixed; inset: 0; z-index: 100000;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; pointer-events: none;
        transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);
      }
      #gal-lightbox.open { opacity: 1; pointer-events: auto; }

      /*
        ============================================================
        VÉU AMETISTA (fundo de vidro por cima das estrelas)
        ------------------------------------------------------------
        Para ver APENAS as estrelas do site, comente as 3 linhas:
          background / backdrop-filter / -webkit-backdrop-filter
        ============================================================
      */
      .gal-lb-backdrop {
        position: absolute; inset: 0;
        background: rgba(12, 8, 22, 0.55);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .gal-lb-stage {
        position: relative;
        width: min(94vw, 1080px);
        max-height: 92vh;
        display: flex; flex-direction: column;
        background: transparent;
        border-radius: 18px;
        overflow: visible;
        transform: scale(0.94) translateY(20px);
        transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
      }
      #gal-lightbox.open .gal-lb-stage {
        transform: scale(1) translateY(0);
      }

      .gal-lb-content {
        position: relative;
        flex: 1; min-height: 0;
        display: flex; align-items: center; justify-content: center;
        padding: 6px;
        border-radius: 16px;
        background: rgba(8, 6, 14, 0.28);
        border: 1px solid rgba(168, 85, 247, 0.35);
        box-shadow:
          0 0 0 1px rgba(0, 255, 102, 0.1),
          0 28px 70px rgba(0, 0, 0, 0.55),
          0 0 50px rgba(168, 85, 247, 0.2);
        overflow: hidden;
      }

      /* Reflexo de maré — mais legível, lento, sem pisca-pisca */
      .gal-lb-content::before {
        content: '';
        position: absolute; inset: -1px;
        border-radius: inherit;
        padding: 1.5px;
        background: linear-gradient(
          100deg,
          transparent 0%,
          transparent 28%,
          rgba(168, 85, 247, 0.75) 44%,
          rgba(0, 255, 102, 0.6) 50%,
          rgba(255, 200, 120, 0.38) 56%,
          transparent 72%,
          transparent 100%
        );
        background-size: 240% 100%;
        animation: galEdgeShine 8s ease-in-out infinite;
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
        z-index: 2;
        opacity: 0.9;
      }
      @keyframes galEdgeShine {
        0%   { background-position: 135% 0; }
        45%  { background-position: -35% 0; }
        100% { background-position: -35% 0; }
      }

      .gal-lb-content img,
      .gal-lb-content video {
        max-width: 100%; max-height: 68vh;
        object-fit: contain; border-radius: 12px;
        display: block;
        box-shadow: 0 12px 40px rgba(0,0,0,0.45);
      }
      .gal-lb-content iframe {
        width: min(100%, 900px);
        height: min(68vh, 506px);
        border: none; border-radius: 12px;
        background: #000;
      }

      .gal-lb-close {
        position: absolute; top: -8px; right: -8px; z-index: 5;
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(18, 14, 28, 0.85);
        border: 1px solid rgba(168, 85, 247, 0.4);
        color: #E2E8F0; font-size: 1.35rem; line-height: 1;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.25s ease;
        backdrop-filter: blur(10px);
      }
      .gal-lb-close:hover {
        background: rgba(0, 255, 102, 0.15);
        border-color: #00FF66;
        color: #00FF66;
      }

      .gal-lb-nav {
        position: absolute; top: 50%; transform: translateY(-50%);
        z-index: 5;
        width: 44px; height: 44px; border-radius: 50%;
        background: rgba(18, 14, 28, 0.75);
        border: 1px solid rgba(168, 85, 247, 0.35);
        color: #E2E8F0; font-size: 1.2rem;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.25s ease;
        backdrop-filter: blur(10px);
      }
      .gal-lb-nav:hover {
        background: rgba(168, 85, 247, 0.25);
        border-color: #A855F7;
        color: #fff;
      }
      .gal-lb-prev { left: -56px; }
      .gal-lb-next { right: -56px; }

      .gal-lb-caption {
        padding: 14px 8px 8px;
        text-align: center;
      }
      .gal-lb-title {
        font-size: 1.05rem; font-weight: 700; color: #fff;
        margin: 0 0 4px 0; letter-spacing: -0.3px;
        text-shadow: 0 2px 12px rgba(0,0,0,0.6);
      }
      .gal-lb-desc {
        font-size: 0.86rem; color: #9CA3AF; margin: 0 0 6px 0;
        line-height: 1.45;
      }
      .gal-lb-meta {
        font-size: 0.7rem; color: #A855F7;
        text-transform: uppercase; letter-spacing: 0.7px; font-weight: 600;
      }

      .gal-lb-dots {
        display: flex; justify-content: center; align-items: center;
        gap: 7px; padding: 10px 0 4px;
      }
      .gal-lb-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: rgba(168, 85, 247, 0.35);
        border: none; padding: 0; cursor: pointer;
        transition: all 0.25s ease;
      }
      .gal-lb-dot.active {
        background: #00FF66;
        box-shadow: 0 0 10px rgba(0, 255, 102, 0.55);
        transform: scale(1.25);
      }

      .gal-lb-content .lb-media {
        animation: lbMediaIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      @keyframes lbMediaIn {
        from { opacity: 0; transform: scale(0.97); }
        to   { opacity: 1; transform: scale(1); }
      }

      @media (max-width: 720px) {
        .gal-lb-prev { left: 6px; }
        .gal-lb-next { right: 6px; }
        .gal-lb-nav { width: 38px; height: 38px; font-size: 1rem; }
        .gal-lb-content img, .gal-lb-content video { max-height: 56vh; }
        .gal-lb-content iframe { height: 48vh; }
        .gal-lb-close { top: 4px; right: 4px; }
      }
    `;
    document.head.appendChild(style);
  }

  function close() {
    lb.classList.remove('open');
    var content = lb.querySelector('.gal-lb-content');
    var vid = content.querySelector('video');
    if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); }
    content.innerHTML = '';
    document.body.style.overflow = '';
    lbItems = [];
    lbIndex = 0;
  }

  lb.querySelector('.gal-lb-backdrop').addEventListener('click', close);
  lb.querySelector('.gal-lb-close').addEventListener('click', close);
  lb.querySelector('.gal-lb-prev').addEventListener('click', function () { navigateLb(-1); });
  lb.querySelector('.gal-lb-next').addEventListener('click', function () { navigateLb(1); });

  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') navigateLb(-1);
    if (e.key === 'ArrowRight') navigateLb(1);
  });

  var touchX = null;
  lb.addEventListener('touchstart', function (e) {
    touchX = e.changedTouches[0].screenX;
  }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].screenX - touchX;
    if (Math.abs(dx) > 50) navigateLb(dx > 0 ? -1 : 1);
    touchX = null;
  }, { passive: true });
}

function ytId(url) {
  if (!url) return '';
  var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}

function mediaUrl(item) {
  if (!item) return '';
  if (item.tipo === 'video_yt') return item.url_thumb || item.url || '';
  return item.url || item.url_thumb || '';
}

/* Prefetch: full na atual + 1 de cada lado; demais em baixa prioridade (até 3) */
function prefetchUrl(url, priority) {
  if (!url) return;
  try {
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = url;
    if (priority) link.setAttribute('fetchpriority', priority);
    document.head.appendChild(link);
    var img = new Image();
    if (priority === 'high') img.fetchPriority = 'high';
    img.src = url;
  } catch (e) {}
}

function prefetchAround(index) {
  if (!lbItems.length) return;
  var n = lbItems.length;
  var full = [index, (index - 1 + n) % n, (index + 1) % n];
  var seen = {};
  full.forEach(function (i) {
    seen[i] = true;
    var item = lbItems[i];
    if (!item || item.tipo === 'video_yt' || item.tipo === 'video_up') return;
    prefetchUrl(mediaUrl(item), 'high');
  });
  for (var d = 2; d <= 3; d++) {
    [ (index - d + n) % n, (index + d) % n ].forEach(function (i) {
      if (seen[i]) return;
      var item = lbItems[i];
      if (!item || item.tipo === 'video_yt' || item.tipo === 'video_up') return;
      prefetchUrl(mediaUrl(item), 'low');
    });
  }
}

function renderLbMedia(item) {
  var content = document.querySelector('#gal-lightbox .gal-lb-content');
  var titleEl = document.querySelector('#gal-lightbox .gal-lb-title');
  var descEl = document.querySelector('#gal-lightbox .gal-lb-desc');
  var metaEl = document.querySelector('#gal-lightbox .gal-lb-meta');
  var dotsEl = document.querySelector('#gal-lightbox .gal-lb-dots');

  var oldVid = content.querySelector('video');
  if (oldVid) oldVid.pause();

  content.innerHTML = '';
  titleEl.textContent = item.titulo || '';
  descEl.textContent = item.descricao || '';
  descEl.style.display = item.descricao ? 'block' : 'none';

  var metaParts = [];
  if (item.local) metaParts.push(item.local);
  if (item.cat) metaParts.push(item.cat);
  metaEl.textContent = metaParts.join(' · ');

  var media = null;
  if (item.tipo === 'video_yt' && item.video_url) {
    var id = ytId(item.video_url);
    if (id) {
      media = document.createElement('iframe');
      media.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
      media.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      media.allowFullscreen = true;
    }
  } else if (item.tipo === 'video_up') {
    media = document.createElement('video');
    media.src = item.url || item.video_url || '';
    media.controls = true;
    media.autoplay = true;
    media.playsInline = true;
  } else {
    media = document.createElement('img');
    media.src = item.url || item.url_thumb || '';
    media.alt = item.titulo || '';
  }

  if (media) {
    media.className = 'lb-media';
    content.appendChild(media);
  }

  dotsEl.innerHTML = '';
  if (lbItems.length > 1) {
    lbItems.forEach(function (_, i) {
      var d = document.createElement('button');
      d.className = 'gal-lb-dot' + (i === lbIndex ? ' active' : '');
      d.setAttribute('aria-label', 'Foto ' + (i + 1));
      d.addEventListener('click', function () {
        lbIndex = i;
        renderLbMedia(lbItems[lbIndex]);
      });
      dotsEl.appendChild(d);
    });
  }

  prefetchAround(lbIndex);
}

function navigateLb(dir) {
  if (lbItems.length < 2) return;
  lbIndex = (lbIndex + dir + lbItems.length) % lbItems.length;
  renderLbMedia(lbItems[lbIndex]);
}

function openLightbox(list, startIndex) {
  ensureLightbox();
  lbItems = list;
  lbIndex = startIndex || 0;
  renderLbMedia(lbItems[lbIndex]);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(function () {
    document.getElementById('gal-lightbox').classList.add('open');
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var SUPABASE_URL = 'https://paetkspbfejtjjkngqej.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
  var REST = SUPABASE_URL + '/rest/v1/';
  var HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };

  var fallbackItems = [
    { cat: '', tipo: 'foto', titulo: 'Swing Tropical: Imersão em Brasilidade', descricao: 'Direção artística e de palco refinada.', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7', local: 'São Paulo' },
    { cat: '', tipo: 'foto', titulo: 'Inauguração Corporativa Internacional', descricao: 'Dimensionamento de som milimétrico.', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865', local: 'Alphaville' },
    { cat: '', tipo: 'foto', titulo: 'Gala Social High Standard', descricao: 'Projeto luminotécnico de alto luxo.', url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6', local: 'São Paulo' }
  ];

  var categorias = [];
  var itens = [];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function ytThumb(url) {
    var id = ytId(url);
    return id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : '';
  }

  async function sbGet(table, qs) {
    try {
      var r = await fetch(REST + table + '?' + qs, { headers: HEADERS });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      console.warn('[galeria] falha ao buscar ' + table, e);
      return null;
    }
  }

  function thumbFor(item) {
    if (item.tipo === 'video_yt') return item.url_thumb || ytThumb(item.video_url) || item.url || '';
    if (item.tipo === 'video_up') return item.url_thumb || item.url || '';
    return item.url_thumb || item.url || '';
  }

  function isVideo(item) {
    return item.tipo === 'video_yt' || item.tipo === 'video_up';
  }

  function renderFilters() {
    var wrap = document.querySelector('.filter-wrapper');
    if (!wrap) return;
    var html = '<button class="filter-btn active" data-cat="all">Ver Todas</button>';
    categorias.forEach(function (c) {
      html += '<button class="filter-btn" data-cat="' + escapeHtml(c.slug) + '">' + escapeHtml(c.emoji || '') + ' ' + escapeHtml(c.nome) + '</button>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        wrap.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        e.currentTarget.classList.add('active');
        var cat = e.currentTarget.dataset.cat;
        document.querySelectorAll('.gallery-card').forEach(function (card) {
          card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
        });
      });
    });
  }

  function renderGrid(list) {
    var grid = document.getElementById('main-gallery-grid');
    if (!grid) return;

    var sorted = list.slice().sort(function (a, b) {
      var oa = (a.ordem != null) ? Number(a.ordem) : 9999;
      var ob = (b.ordem != null) ? Number(b.ordem) : 9999;
      return oa - ob;
    });
    window.__galSorted = sorted;

    /*
      ============================================================
      MODO CARD — OPÇÃO B (ATIVA): foto quase solta, moldura mínima
      ------------------------------------------------------------
      Para voltar à OPÇÃO A (card clássico com corpo de texto):
      1) Troque class "mode-b" por "mode-a" no article
      2) Descomente o bloco .card-body abaixo
      3) Comente o bloco .card-overlay-text
      ============================================================
    */

    grid.innerHTML = sorted.map(function (item, idx) {
      var thumb = thumbFor(item);
      var badge = item.local ? escapeHtml(item.local) : '';
      var playIcon = isVideo(item) ? '<span class="tag-badge play-badge">▶</span>' : '';
      var safeTitulo = escapeHtml(item.titulo || 'Registro 432UP');
      var safeDesc = escapeHtml(item.descricao || '');

      /* OPÇÃO B (ativa): overlay de título sobre a foto */
     

return (
  '<article class="gallery-card float-card mode-a" data-cat="' + escapeHtml(item.cat || '') + '" data-idx="' + idx + '">' +
    '<div class="img-box" data-open-lb="' + idx + '">' +
      '<img src="' + escapeHtml(thumb) + '" alt="' + safeTitulo + '" loading="lazy" onerror="this.style.opacity=\'0.3\'">' +
      '<div class="img-box-overlay"></div>' +
      playIcon +
      (badge ? '<span class="tag-badge loc-badge">' + badge + '</span>' : '') +
    '</div>' +
    '<div class="card-body">' +
      '<h3>' + safeTitulo + '</h3>' +
      (safeDesc ? '<p>' + safeDesc + '</p>' : '') +
    '</div>' +
  '</article>'
);





    }).join('');

    grid.querySelectorAll('[data-open-lb]').forEach(function (el) {
      el.addEventListener('click', function () {
        var i = Number(el.getAttribute('data-open-lb'));
        var currentList = window.__galSorted || sorted;
        var visible = [];
        document.querySelectorAll('.gallery-card').forEach(function (card) {
          if (card.style.display !== 'none') {
            var ci = Number(card.dataset.idx);
            if (!isNaN(ci) && currentList[ci]) visible.push(currentList[ci]);
          }
        });
        var listNav = visible.length ? visible : currentList;
        var start = listNav.indexOf(currentList[i]);
        openLightbox(listNav, start >= 0 ? start : 0);
      });
    });
  }

  async function loadGallery() {
    var pair = await Promise.all([
      sbGet('co_galeria_categorias', 'select=*&order=ordem'),
      sbGet('co_galeria_fotos', 'select=*&order=ordem')
    ]);
    categorias = pair[0] || [];
    itens = (pair[1] && pair[1].length > 0) ? pair[1] : fallbackItems;
    renderFilters();
    renderGrid(itens);
  }

  var contactOverlay = document.getElementById('contact-overlay');
  var contactModalCloseBtn = document.getElementById('contact-modal-close-btn');
  if (contactModalCloseBtn) contactModalCloseBtn.addEventListener('click', function () {
    contactOverlay.classList.remove('open', 'active');
  });
  if (contactOverlay) contactOverlay.addEventListener('click', function (e) {
    if (e.target === contactOverlay) contactOverlay.classList.remove('open', 'active');
  });

  var btnSubmitContact = document.getElementById('btn-submit-general-contact');
  if (btnSubmitContact && btnSubmitContact.dataset.listenerAttached !== 'true') {
    btnSubmitContact.dataset.listenerAttached = 'true';
    btnSubmitContact.addEventListener('click', async function () {
      var nameEl = document.getElementById('mod-name');
      var contactEl = document.getElementById('mod-contact');
      var msgEl = document.getElementById('mod-msg');
      var errorEl = document.getElementById('mod-contact-error');
      var name = nameEl ? nameEl.value.trim() : '';
      var contact = contactEl ? contactEl.value.trim() : '';
      var msg = msgEl ? msgEl.value.trim() : '';
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      var phoneDigits = contact.replace(/\D/g, '');
      var isValid = emailRegex.test(contact) || /^\d{10,13}$/.test(phoneDigits);
      if (!name || !isValid) {
        if (errorEl) errorEl.style.display = 'block';
        if (contactEl) contactEl.focus();
        return;
      }
      if (errorEl) errorEl.style.display = 'none';
      btnSubmitContact.innerText = 'Registrando...';
      btnSubmitContact.disabled = true;
      var leadSaved = true;
      try {
        var resp = await fetch(SUPABASE_URL + '/rest/v1/co_leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            nome: name,
            whatsapp: contact,
            mensagem: msg || 'Contato pela galeria',
            origem: 'modal_galeria',
            created_at: new Date().toISOString()
          })
        });
        if (!resp.ok) leadSaved = false;
      } catch (err) {
        leadSaved = false;
      }
      var encoded = encodeURIComponent(
        'Olá! Meu nome é ' + name + '.\nContato: ' + contact + '\nVi a galeria da 432UP e gostaria de conversar sobre um evento.\n\nDetalhes: ' + (msg || 'Nenhum')
      );
      window.open('https://wa.me/5511948564577?text=' + encoded, '_blank');
      btnSubmitContact.innerText = 'Enviar Solicitação';
      btnSubmitContact.disabled = false;
      if (contactOverlay) contactOverlay.classList.remove('active', 'open');
      if (leadSaved) showGalToast('Mensagem enviada com sucesso! Abrindo WhatsApp...', 'success');
      else showGalToast('Não conseguimos registrar sua mensagem no sistema, mas você já pode falar direto pelo WhatsApp.', 'error');
    });
  }

  loadGallery();
});
