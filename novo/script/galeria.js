/* O canvas de fundo (#orbit-canvas) já é desenhado globalmente por script.js,
   que é carregado antes deste arquivo em galeria.html. Não redeclarar aqui
   (isso evitava um erro de "canvas já declarado" que quebrava toda a galeria). */

/* ========== script/galeria.js · 432UP · v3.0 · integração real co_galeria_fotos ========== */

/* MENU MOBILE (toggleMobileMenu já existe em script.js) */
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const menuClose = document.getElementById('mobile-menu-close');
  if (menuBtn) menuBtn.addEventListener('click', toggleMobileMenu);
  if (menuClose) menuClose.addEventListener('click', toggleMobileMenu);
});

/* CARREGAMENTO E SINCRO DA GALERIA (dados reais gravados pelo admin) */
document.addEventListener('DOMContentLoaded', () => {
  // Mesmo projeto/URL usados pelo admin.js — conexão direta ao Supabase.
  const SUPABASE_URL = "https://paetkspbfejtjjkngqej.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA";

  const REST = SUPABASE_URL + '/rest/v1/';
  const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };

  // Itens de reserva, usados SOMENTE se a conexão com o banco falhar de vez.
  // Não recebem categoria (ficam visíveis apenas em "Ver Todas") para não
  // conflitar com os slugs reais cadastrados no admin.
  const fallbackItems = [
    { cat: '', tipo: 'foto', titulo: 'Swing Tropical: Imersão em Brasilidade', descricao: 'Direção artística e de palco refinada, misturando axé conceitual, samba-rock e pop sob uma roupagem instrumental AA+.', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7' },
    { cat: '', tipo: 'foto', titulo: 'Inauguração Corporativa Internacional', descricao: 'Dimensionamento de som milimétrico para lounge e discursos institucionais em São Paulo.', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865' },
    { cat: '', tipo: 'foto', titulo: 'Gala Social High Standard', descricao: 'Projeto luminotécnico para harmonização de ambientes e valorização de arquitetura em festa privada de alto luxo.', url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6' }
  ];

  let categorias = [];   // co_galeria_categorias: {slug, nome, emoji, ordem}
  let itens = [];        // co_galeria_fotos

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function ytId(url) {
    if (!url) return '';
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  function ytThumb(url) {
    const id = ytId(url);
    return id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : '';
  }

  async function sbGet(table, qs) {
    try {
      const r = await fetch(REST + table + '?' + qs, { headers: HEADERS });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      console.warn('[galeria] falha ao buscar ' + table, e);
      return null;
    }
  }

  function thumbFor(item) {
    if (item.tipo === 'video_yt') return item.url_thumb || ytThumb(item.video_url) || '';
    if (item.tipo === 'video_up') return item.url_thumb || item.url || '';
    return item.url_thumb || item.url || '';
  }

  function isVideo(item) {
    return item.tipo === 'video_yt' || item.tipo === 'video_up';
  }

  function renderFilters() {
    const wrap = document.querySelector('.filter-wrapper');
    if (!wrap) return;
    let html = '<button class="filter-btn active" data-cat="all">Ver Todas</button>';
    categorias.forEach(c => {
      html += `<button class="filter-btn" data-cat="${escapeHtml(c.slug)}">${escapeHtml(c.emoji || '')} ${escapeHtml(c.nome)}</button>`;
    });
    wrap.innerHTML = html;

    wrap.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        wrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const cat = e.currentTarget.dataset.cat;
        document.querySelectorAll('.gallery-card').forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.cat === cat) ? 'flex' : 'none';
        });
      });
    });
  }

  function renderGrid(list) {
    const grid = document.getElementById('main-gallery-grid');
    if (!grid) return;
    grid.innerHTML = list.map((item) => {
      const thumb = thumbFor(item);
      const badgeParts = [];
      if (item.local) badgeParts.push(item.local);
      if (item.destaque) badgeParts.push('⭐ Destaque');
      const badge = badgeParts.join(' · ');
      const playIcon = isVideo(item) ? '<span class="tag-badge" style="right:auto;left:12px;top:12px;">▶</span>' : '';
      return `
      <article class="gallery-card" data-cat="${escapeHtml(item.cat)}">
        <div class="img-box" ${item.tipo === 'video_yt' && item.video_url ? `onclick="window.open('${escapeHtml(item.video_url)}','_blank')" style="cursor:pointer;"` : ''}>
          <img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.titulo)}" loading="lazy">
          <div class="img-box-overlay"></div>
          ${playIcon}
          ${badge ? `<span class="tag-badge">${escapeHtml(badge)}</span>` : ''}
        </div>
        <div class="card-body">
          <h3>${escapeHtml(item.titulo)}</h3>
          <p>${escapeHtml(item.descricao)}</p>
        </div>
      </article>
    `;
    }).join('');
  }

  async function loadGallery() {
    const [cats, fotos] = await Promise.all([
      sbGet('co_galeria_categorias', 'select=*&order=ordem'),
      sbGet('co_galeria_fotos', 'select=*&order=ordem')
    ]);

    categorias = cats || [];
    itens = (fotos && fotos.length > 0) ? fotos : fallbackItems;

    renderFilters();
    renderGrid(itens);
  }

  // MODAL DE CONTATO
  const navTriggerModal = document.getElementById('nav-trigger-modal');
  const navTriggerModalMobile = document.getElementById('nav-trigger-modal-mobile');
  const contactOverlay = document.getElementById('contact-overlay');
  const contactModalCloseBtn = document.getElementById('contact-modal-close-btn');

  function openContactModal() {
    if (contactOverlay) contactOverlay.classList.add('open');
  }

  if (navTriggerModal) navTriggerModal.addEventListener('click', openContactModal);
  if (navTriggerModalMobile) navTriggerModalMobile.addEventListener('click', openContactModal);
  if (contactModalCloseBtn) contactModalCloseBtn.addEventListener('click', () => contactOverlay.classList.remove('open'));
  if (contactOverlay) contactOverlay.addEventListener('click', (e) => { if (e.target === contactOverlay) contactOverlay.classList.remove('open'); });

  loadGallery();
});
