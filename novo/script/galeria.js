/* O canvas de fundo (#orbit-canvas) já é desenhado globalmente por script.js,
   que é carregado antes deste arquivo em galeria.html. Não redeclarar aqui
   (isso evitava um erro de "canvas já declarado" que quebrava toda a galeria). */

/* MENU MOBILE (toggleMobileMenu já existe em script.js) */
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const menuClose = document.getElementById('mobile-menu-close');
  if (menuBtn) menuBtn.addEventListener('click', toggleMobileMenu);
  if (menuClose) menuClose.addEventListener('click', toggleMobileMenu);
});

/* CARREGAMENTO E SINCRO DA GALERIA */
document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = "https://www.432up.com/supabase-api";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA";
  let supabaseClient = null;

  if (typeof supabase !== 'undefined' && window.supabase && SUPABASE_URL.indexOf("SEU_PROJETO") === -1) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  let localItems = [
    { category: 'casting', tag: 'Rider Sennheiser Active', title: 'Swing Tropical: Imersão em Brasilidade', desc: 'Direção artística e de palco refinada, misturando axé conceitual, samba-rock e pop sob uma roupagem instrumental AA+.', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7' },
    { category: 'corp', tag: 'Electro-Voice Arrays', title: 'Inauguração Corporativa Internacional', desc: 'Dimensionamento de som milimétrico para lounge e discursos institucionais em São Paulo. Sonorização limpa e integrada à arquitetura.', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865' },
    { category: 'social', tag: 'Iluminação Cênica DMX', title: 'Gala Social High Standard', desc: 'Projeto luminotécnico para harmonização de ambientes e valorização de arquitetura em festa privada de alto luxo.', url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6' }
  ];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderGrid(list) {
    const grid = document.getElementById('main-gallery-grid');
    if (!grid) return;
    grid.innerHTML = list.map((item) => `
      <article class="gallery-card" data-cat="${escapeHtml(item.category)}">
        <div class="img-box">
          <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" loading="lazy">
          <div class="img-box-overlay"></div>
          <span class="tag-badge">${escapeHtml(item.tag)}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.desc)}</p>
        </div>
      </article>
    `).join('');
  }

  async function loadGallery() {
    renderGrid(localItems);
    if (supabaseClient) {
      try {
        const { data } = await supabaseClient.from('portfolio').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          let dynamicItems = data.map(i => ({ category: i.category, tag: i.tag, title: i.title, desc: i.description, url: i.img_url }));
          renderGrid([...localItems, ...dynamicItems]);
        }
      } catch(e) {}
    }
  }

  // EVENTOS DOS BOTOES DE FILTRO
  const filterBtns = [
    { id: 'btn-filter-all', cat: 'all' },
    { id: 'btn-filter-corp', cat: 'corp' },
    { id: 'btn-filter-social', cat: 'social' },
    { id: 'btn-filter-casting', cat: 'casting' }
  ];

  filterBtns.forEach(btnInfo => {
    const btn = document.getElementById(btnInfo.id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.querySelectorAll('.gallery-card').forEach(card => {
          if (btnInfo.cat === 'all' || card.dataset.cat === btnInfo.cat) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    }
  });

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
  if (contactOverlay) contactOverlay.addEventListener('click', (e) => { if(e.target === contactOverlay) contactOverlay.classList.remove('open'); });

  loadGallery();
});
