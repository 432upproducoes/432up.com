/* ========== script/galeria.js · 432UP · v8.0 · Overlay Único + Modal de Case no visual do Lightbox ========== */
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

/* ========== ESTILOS COMPARTILHADOS DO "VISUAL LIGHTBOX" ==========
   Usado tanto pelo lightbox simples de imagem/vídeo quanto pelo
   modal de detalhes do case (mesma linguagem visual). */
function ensureLightboxStyles() {
  if (document.getElementById('gal-lightbox-styles')) return;
  var style = document.createElement('style');
  style.id = 'gal-lightbox-styles';
  style.textContent = `
    .glx-backdrop {
      position: absolute; inset: 0;
      background: rgba(12, 8, 22, 0.55);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }
    .glx-stage {
      position: relative;
      display: flex; flex-direction: column;
      background: transparent;
      border-radius: 18px;
      overflow: visible;
      transform: scale(0.94) translateY(20px);
      transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .glx-open .glx-stage { transform: scale(1) translateY(0); }
    .glx-panel {
      position: relative;
      border-radius: 16px;
      background: rgba(8, 6, 14, 0.55);
      border: 1px solid rgba(168, 85, 247, 0.35);
      box-shadow: 0 0 0 1px rgba(0, 255, 102, 0.1), 0 28px 70px rgba(0, 0, 0, 0.55), 0 0 50px rgba(168, 85, 247, 0.2);
      overflow: hidden;
    }
    .glx-panel::before {
      content: '';
      position: absolute; inset: -1px;
      border-radius: inherit;
      padding: 1.5px;
      background: linear-gradient(100deg, transparent 0%, transparent 28%, rgba(168, 85, 247, 0.75) 44%, rgba(0, 255, 102, 0.6) 50%, rgba(255, 200, 120, 0.38) 56%, transparent 72%, transparent 100%);
      background-size: 240% 100%;
      animation: galEdgeShine 8s ease-in-out infinite;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      z-index: 2;
      opacity: 0.9;
    }
    @keyframes galEdgeShine { 0% { background-position: 135% 0; } 45% { background-position: -35% 0; } 100% { background-position: -35% 0; } }
    .glx-close {
      position: absolute; top: -8px; right: -8px; z-index: 5;
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(18, 14, 28, 0.85);
      border: 1px solid rgba(168, 85, 247, 0.4);
      color: #E2E8F0; font-size: 1.35rem; line-height: 1;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.25s ease;
      backdrop-filter: blur(10px);
    }
    .glx-close:hover { background: rgba(0, 255, 102, 0.15); border-color: #00FF66; color: #00FF66; }
    .glx-nav {
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
    .glx-nav:hover { background: rgba(168, 85, 247, 0.25); border-color: #A855F7; color: #fff; }
    .glx-prev { left: -56px; }
    .glx-next { right: -56px; }
    .glx-dots { display: flex; justify-content: center; align-items: center; gap: 7px; padding: 10px 0 4px; }
    .glx-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(168, 85, 247, 0.35); border: none; padding: 0; cursor: pointer; transition: all 0.25s ease; }
    .glx-dot.active { background: #00FF66; box-shadow: 0 0 10px rgba(0, 255, 102, 0.55); transform: scale(1.25); }
    .glx-media-in { animation: lbMediaIn 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
    @keyframes lbMediaIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }

    /* ---- Lightbox simples (imagem/vídeo único, sem case) ---- */
    #gal-lightbox {
      position: fixed; inset: 0; z-index: 110000;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    #gal-lightbox.open { opacity: 1; pointer-events: auto; }
    #gal-lightbox .glx-stage { width: min(94vw, 1080px); max-height: 92vh; }
    #gal-lightbox .glx-panel { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 6px; }
    #gal-lightbox .glx-panel img, #gal-lightbox .glx-panel video {
      max-width: 100%; max-height: 68vh; object-fit: contain; border-radius: 12px; display: block;
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    }
    #gal-lightbox .glx-panel iframe { width: min(100%, 900px); height: min(68vh, 506px); border: none; border-radius: 12px; background: #000; }
    .gal-lb-caption { padding: 14px 8px 8px; text-align: center; }
    .gal-lb-title { font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0 0 4px 0; letter-spacing: -0.3px; text-shadow: 0 2px 12px rgba(0,0,0,0.6); }
    .gal-lb-desc { font-size: 0.86rem; color: #9CA3AF; margin: 0 0 6px 0; line-height: 1.45; }
    .gal-lb-meta { font-size: 0.7rem; color: #A855F7; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 600; }

    /* ---- Modal de Case (mesmo visual, conteúdo rico) ---- */
    #case-detail-modal {
      position: fixed; inset: 0; z-index: 100010;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none; visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
      padding: 24px;
    }
    #case-detail-modal.open { opacity: 1; pointer-events: auto; visibility: visible; }
    #case-detail-modal .glx-stage { width: min(96vw, 980px); max-height: 90vh; }
    #case-detail-modal .glx-panel { max-height: 90vh; overflow-y: auto; padding: 32px; }
    .cd-header { margin-bottom: 20px; padding-right: 40px; position: relative; z-index: 3; }
    .cd-eyebrow { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #c084fc; margin-bottom: 6px; }
    .cd-title { font-size: 1.6rem; font-weight: 800; color: #fff; letter-spacing: -0.5px; margin-bottom: 6px; }
    .cd-subtitle { font-size: 0.9rem; color: #8a8a9e; }
    .cd-media-row {
      display: flex; gap: 12px; overflow-x: auto;
      padding-bottom: 12px; margin: 20px 0;
      scroll-snap-type: x mandatory;
      position: relative; z-index: 3;
    }
    .cd-media-item {
      flex: 0 0 auto; width: min(78vw, 320px); aspect-ratio: 4/3;
      border-radius: 14px; overflow: hidden;
      border: 1px solid rgba(168, 85, 247, 0.25);
      scroll-snap-align: start; position: relative;
      background: rgba(0,0,0,0.4); cursor: pointer;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .cd-media-item:hover { transform: scale(1.02); border-color: #00FF66; box-shadow: 0 0 15px rgba(0, 255, 102, 0.2); }
    .cd-media-item img, .cd-media-item video { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
    .cd-empty-state { font-size: 0.85rem; color: #8a8a9e; padding: 18px 4px; font-style: italic; }
    .cd-empty-state-li { color: #8a8a9e !important; font-style: italic; }
    .cd-empty-state-li::before { content: "" !important; }
    .cd-specs-box {
      background: rgba(168, 85, 247, 0.08);
      border: 1px solid rgba(168, 85, 247, 0.22);
      border-radius: 16px; padding: 20px; margin-top: 8px;
      position: relative; z-index: 3;
    }
    .cd-specs-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; color: #c084fc; font-weight: 700; margin-bottom: 12px; }
    .cd-specs-list { list-style: none; display: flex; flex-direction: column; gap: 8px; padding-left: 0; }
    .cd-specs-list li { font-size: 0.85rem; color: #E2E8F0; padding-left: 16px; position: relative; }
    .cd-specs-list li::before { content: "•"; color: #00FF66; position: absolute; left: 0; font-weight: bold; }
    .cd-cta-row { margin-top: 24px; display: flex; gap: 10px; flex-wrap: wrap; position: relative; z-index: 3; }

    @media (max-width: 720px) {
      .glx-prev { left: 6px; }
      .glx-next { right: 6px; }
      .glx-nav { width: 38px; height: 38px; font-size: 1rem; }
      #gal-lightbox .glx-panel img, #gal-lightbox .glx-panel video { max-height: 56vh; }
      #gal-lightbox .glx-panel iframe { height: 48vh; }
      .glx-close { top: 4px; right: 4px; }
      #case-detail-modal .glx-panel { padding: 22px 18px; }
      .cd-title { font-size: 1.25rem; }
    }
  `;
  document.head.appendChild(style);
}

/* ========== LIGHTBOX SIMPLES (fotos/vídeos avulsos, sem case_slug) ========== */
var lbItems = [];
var lbIndex = 0;

function ensureLightbox() {
  ensureLightboxStyles();
  if (document.getElementById('gal-lightbox')) return;

  var lb = document.createElement('div');
  lb.id = 'gal-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML =
    '<div class="glx-backdrop"></div>' +
    '<div class="glx-stage">' +
      '<button class="glx-close" aria-label="Fechar">&times;</button>' +
      '<button class="glx-nav glx-prev" aria-label="Anterior">&#10094;</button>' +
      '<button class="glx-nav glx-next" aria-label="Próximo">&#10095;</button>' +
      '<div class="glx-panel"></div>' +
      '<div class="gal-lb-caption">' +
        '<h4 class="gal-lb-title"></h4>' +
        '<p class="gal-lb-desc"></p>' +
        '<span class="gal-lb-meta"></span>' +
      '</div>' +
      '<div class="glx-dots"></div>' +
    '</div>';
  document.body.appendChild(lb);

  function close() {
    lb.classList.remove('open');
    var content = lb.querySelector('.glx-panel');
    var vid = content.querySelector('video');
    if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); }
    content.innerHTML = '';
    document.body.style.overflow = '';
    lbItems = [];
    lbIndex = 0;
  }

  lb.querySelector('.glx-backdrop').addEventListener('click', close);
  lb.querySelector('.glx-close').addEventListener('click', close);
  lb.querySelector('.glx-prev').addEventListener('click', function () { navigateLb(-1); });
  lb.querySelector('.glx-next').addEventListener('click', function () { navigateLb(1); });

  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') navigateLb(-1);
    if (e.key === 'ArrowRight') navigateLb(1);
  });

  var touchX = null;
  lb.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].screenX; }, { passive: true });
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
  var content = document.querySelector('#gal-lightbox .glx-panel');
  var titleEl = document.querySelector('#gal-lightbox .gal-lb-title');
  var descEl = document.querySelector('#gal-lightbox .gal-lb-desc');
  var metaEl = document.querySelector('#gal-lightbox .gal-lb-meta');
  var dotsEl = document.querySelector('#gal-lightbox .glx-dots');

  var oldVid = content.querySelector('video');
  if (oldVid) oldVid.pause();

  content.innerHTML = '';
  titleEl.textContent = item.cliente ? (item.cliente + (item.titulo ? ' — ' + item.titulo : '')) : (item.titulo || '');
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
    media.className = 'glx-media-in';
    content.appendChild(media);
  }

  dotsEl.innerHTML = '';
  if (lbItems.length > 1) {
    lbItems.forEach(function (_, i) {
      var d = document.createElement('button');
      d.className = 'glx-dot' + (i === lbIndex ? ' active' : '');
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
  var lb = document.getElementById('gal-lightbox');
  requestAnimationFrame(function () {
    lb.classList.add('open');
    lb.classList.add('glx-open');
  });
}

/* ========================================================================
   NÚCLEO v8: Faixa de logos + Super Cases + Filtros + Overlay Único
   Modal de case agora usa o mesmo visual do lightbox (glx-*)
   ======================================================================== */
document.addEventListener('DOMContentLoaded', function () {
  ensureLightboxStyles();

  var SUPABASE_URL = 'https://paetkspbfejtjjkngqej.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
  var REST = SUPABASE_URL + '/rest/v1/';
  var HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };

  var fallbackItems = [
    { cat: '', tipo: 'foto', titulo: 'Swing Tropical: Imersão em Brasilidade', descricao: 'Direção artística e de palco refinada.', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7', local: 'São Paulo', destaque: true },
    { cat: '', tipo: 'foto', titulo: 'Inauguração Corporativa Internacional', descricao: 'Dimensionamento de som milimétrico.', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865', local: 'Alphaville', destaque: true },
    { cat: '', tipo: 'foto', titulo: 'Gala Social High Standard', descricao: 'Projeto luminotécnico de alto luxo.', url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6', local: 'São Paulo', destaque: false }
  ];

  var categorias = [];
  var itens = [];
  var marcas = [];
  var currentCat = 'all';
  var showAll = false;

  var caseDetailCache = {};
  var currentCaseMedias = [];

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

  function renderBrands() {
    var wrapper = document.getElementById('brands-strip-wrapper');
    var strip = document.getElementById('brands-strip');
    if (!wrapper || !strip) return;

    var ativos = (marcas || []).filter(function (m) { return m.ativo !== false; });
    if (!ativos.length) { wrapper.style.display = 'none'; return; }

    strip.innerHTML = ativos.map(function (m) {
      var nome = escapeHtml(m.nome || '');
      if (m.logo_url) {
        return '<div class="brand-chip" title="' + nome + '">' +
          '<img src="' + escapeHtml(m.logo_url) + '" alt="' + nome + '" loading="lazy" ' +
          'onerror="this.parentElement.innerHTML=\'<span class=&quot;brand-fallback-text&quot;>' + nome.replace(/'/g, "\\'") + '</span>\'">' +
          '</div>';
      }
      return '<div class="brand-chip"><span class="brand-fallback-text">' + nome + '</span></div>';
    }).join('');

    wrapper.style.display = '';
  }

  function renderFilters() {
    var wrap = document.getElementById('filter-wrapper');
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
        currentCat = e.currentTarget.dataset.cat;
        renderGrid(itens);
      });
    });
  }

  function cardHtml(item, idx) {
    var thumb = thumbFor(item);
    var badge = item.local ? escapeHtml(item.local) : '';
    var playIcon = isVideo(item) ? '<span class="tag-badge play-badge">▶</span>' : '';
    var safeTitulo = escapeHtml(item.titulo || 'Registro 432UP');
    var safeDesc = escapeHtml(item.descricao || '');
    var hasClient = !!(item.cliente && item.cliente.trim());
    var safeCliente = hasClient ? escapeHtml(item.cliente) : '';
    var destaqueBadge = item.destaque ? '<span class="super-case-badge">Destaque</span>' : '';
    var hasCaseDetail = !!(item.case_slug && item.case_slug.trim());
    var safeCaseSlug = hasCaseDetail ? escapeHtml(item.case_slug) : '';

    var bodyHtml;
    if (hasClient) {
      bodyHtml =
        '<div class="client-headline">' + safeCliente + '</div>' +
        (safeTitulo ? '<div class="service-subline">' + safeTitulo + '</div>' : '') +
        (safeDesc ? '<p>' + safeDesc + '</p>' : '');
    } else {
      bodyHtml =
        '<h3>' + safeTitulo + '</h3>' +
        (safeDesc ? '<p>' + safeDesc + '</p>' : '');
    }

    var imgBoxAttr = hasCaseDetail
      ? 'data-open-case="' + safeCaseSlug + '" data-case-title="' + (safeCliente || safeTitulo) + '" data-case-subtitle="' + (hasClient ? safeTitulo : '') + '"'
      : 'data-open-lb="' + idx + '"';

    var caseHint = hasCaseDetail
      ? '<span class="case-hint-badge">🔍 Ver detalhes do projeto</span>'
      : '';

    return (
      '<article class="gallery-card float-card mode-a' + (hasClient ? ' has-client' : '') + (hasCaseDetail ? ' has-case-detail' : '') + '" data-cat="' + escapeHtml(item.cat || '') + '" data-idx="' + idx + '">' +
        '<div class="img-box" ' + imgBoxAttr + '>' +
          '<img src="' + escapeHtml(thumb) + '" alt="' + (safeCliente || safeTitulo) + '" loading="lazy" onerror="this.style.opacity=\'0.3\'">' +
          '<div class="img-box-overlay"></div>' +
          playIcon +
          destaqueBadge +
          caseHint +
          (badge ? '<span class="tag-badge loc-badge">' + badge + '</span>' : '') +
        '</div>' +
        '<div class="card-body">' + bodyHtml + '</div>' +
      '</article>'
    );
  }

  function renderGrid(list) {
    var grid = document.getElementById('main-gallery-grid');
    if (!grid) return;

    var sorted = list.slice().sort(function (a, b) {
      var oa = (a.ordem != null) ? Number(a.ordem) : 9999;
      var ob = (b.ordem != null) ? Number(b.ordem) : 9999;
      return oa - ob;
    });

    var byCat = currentCat === 'all' ? sorted : sorted.filter(function (i) { return i.cat === currentCat; });

    var hasAnyDestaque = sorted.some(function (i) { return !!i.destaque; });
    var visibleList;
    if (!hasAnyDestaque) {
      visibleList = byCat;
    } else {
      visibleList = showAll ? byCat : byCat.filter(function (i) { return !!i.destaque; });
    }

    window.__galSorted = visibleList;

    grid.innerHTML = visibleList.map(function (item, idx) { return cardHtml(item, idx); }).join('');

    grid.querySelectorAll('.img-box').forEach(function (el) {
      el.addEventListener('click', function () {
        var slug = el.getAttribute('data-open-case');
        if (slug) {
          var title = el.getAttribute('data-case-title') || '';
          var subtitle = el.getAttribute('data-case-subtitle') || '';
          openCaseDetail(slug, title, subtitle);
          return;
        }
        var lbIdxAttr = el.getAttribute('data-open-lb');
        if (lbIdxAttr !== null) {
          var i = Number(lbIdxAttr);
          var currentList = window.__galSorted || visibleList;
          openLightbox(currentList, i);
        }
      });
    });

    updateViewToggle(hasAnyDestaque, byCat.length, visibleList.length);
  }

  async function fetchCaseDetail(slug) {
    if (caseDetailCache[slug]) return caseDetailCache[slug];
    var pair = await Promise.all([
      sbGet('co_galeria_case_midias', 'select=*&case_slug=eq.' + encodeURIComponent(slug) + '&order=ordem'),
      sbGet('co_galeria_case_specs', 'select=*&case_slug=eq.' + encodeURIComponent(slug) + '&order=ordem')
    ]);
    var data = {
      midias: pair[0] || [],
      specs: pair[1] || [],
      midiasFailed: pair[0] === null,
      specsFailed: pair[1] === null
    };
    if (!data.midiasFailed && !data.specsFailed) caseDetailCache[slug] = data;
    return data;
  }

  function caseMediaHtml(m) {
    var thumb = thumbFor(m);
    var playIcon = isVideo(m) ? '<span class="tag-badge play-badge">▶</span>' : '';
    return '<div class="cd-media-item">' +
      '<img src="' + escapeHtml(thumb) + '" alt="" loading="lazy" onerror="this.style.opacity=\'0.3\'">' +
      playIcon +
      '</div>';
  }

  async function openCaseDetail(slug, title, subtitle) {
    var modal = document.getElementById('case-detail-modal');
    if (!modal) return;

    document.getElementById('cd-eyebrow').textContent = 'Case em Destaque';
    document.getElementById('cd-title').textContent = title || '';
    document.getElementById('cd-subtitle').textContent = subtitle || '';
    document.getElementById('cd-media-row').innerHTML = '<div class="cd-empty-state">Carregando mídias...</div>';
    document.getElementById('cd-specs-list').innerHTML = '';
    currentCaseMedias = [];

    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      modal.classList.add('open');
      modal.classList.add('glx-open');
    });

    var data = await fetchCaseDetail(slug);

    var mediaRow = document.getElementById('cd-media-row');
    if (data.midias.length) {
      currentCaseMedias = data.midias.map(function (m) {
        return {
          tipo: m.tipo,
          url: m.url,
          url_thumb: m.url_thumb,
          video_url: m.video_url,
          titulo: title,
          cliente: '',
          descricao: m.descricao || '',
          local: subtitle || ''
        };
      });
      mediaRow.innerHTML = data.midias.map(caseMediaHtml).join('');
      mediaRow.querySelectorAll('.cd-media-item').forEach(function (el, idx) {
        el.addEventListener('click', function () {
          openLightbox(currentCaseMedias, idx);
        });
      });
    } else if (data.midiasFailed) {
      mediaRow.innerHTML = '<div class="cd-empty-state">Não conseguimos carregar as mídias agora. Volte em instantes.</div>';
    } else {
      mediaRow.innerHTML = '<div class="cd-empty-state">Mídias adicionais deste case em breve.</div>';
    }

    var specsList = document.getElementById('cd-specs-list');
    if (data.specs.length) {
      specsList.innerHTML = data.specs.map(function (s) {
        return '<li>' + escapeHtml(s.item) + '</li>';
      }).join('');
    } else if (data.specsFailed) {
      specsList.innerHTML = '<li class="cd-empty-state-li">Não conseguimos carregar os detalhes agora. Volte em instantes.</li>';
    } else {
      specsList.innerHTML = '<li class="cd-empty-state-li">Detalhamento técnico deste case em breve.</li>';
    }
  }

  function closeCaseDetail() {
    var modal = document.getElementById('case-detail-modal');
    if (!modal) return;
    modal.classList.remove('open', 'glx-open');
    document.body.style.overflow = '';
  }

  var cdCloseBtn = document.getElementById('cd-close-btn');
  if (cdCloseBtn) cdCloseBtn.addEventListener('click', closeCaseDetail);
  var cdBackdrop = document.querySelector('#case-detail-modal .glx-backdrop');
  if (cdBackdrop) cdBackdrop.addEventListener('click', closeCaseDetail);
  document.addEventListener('keydown', function (e) {
    var modal = document.getElementById('case-detail-modal');
    if (modal && modal.classList.contains('open') && e.key === 'Escape') closeCaseDetail();
  });

  var cdActionBtn = document.getElementById('cd-action-btn');
  if (cdActionBtn) {
    cdActionBtn.addEventListener('click', function () {
      closeCaseDetail();
      if (typeof openLeadModal === 'function') openLeadModal();
    });
  }

  function updateViewToggle(hasAnyDestaque, totalInCat, visibleCount) {
    var wrapper = document.getElementById('view-toggle-wrapper');
    var label = document.getElementById('view-toggle-label');
    var count = document.getElementById('view-toggle-count');
    if (!wrapper || !label || !count) return;

    if (!hasAnyDestaque || totalInCat <= visibleCount) {
      wrapper.style.display = 'none';
      return;
    }

    wrapper.style.display = '';
    label.textContent = showAll ? 'Ver Somente Destaques' : 'Ver Galeria Completa';
    count.textContent = showAll ? String(visibleCount) : '+' + (totalInCat - visibleCount);
  }

  var btnViewAll = document.getElementById('btn-view-all');
  if (btnViewAll) {
    btnViewAll.addEventListener('click', function () {
      showAll = !showAll;
      renderGrid(itens);
      if (!showAll) {
        var hero = document.querySelector('.gallery-hero');
        if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  async function loadGallery() {
    var pair = await Promise.all([
      sbGet('co_galeria_categorias', 'select=*&order=ordem'),
      sbGet('co_galeria_fotos', 'select=*&order=ordem'),
      sbGet('co_galeria_marcas', 'select=*&ativo=eq.true&order=ordem')
    ]);
    categorias = pair[0] || [];
    itens = (pair[1] && pair[1].length > 0) ? pair[1] : fallbackItems;
    marcas = pair[2] || [];

    renderBrands();
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
