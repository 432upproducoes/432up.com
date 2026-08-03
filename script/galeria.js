/* O canvas de fundo (#orbit-canvas) já é desenhado globalmente por script.js,
   que é carregado antes deste arquivo em galeria.html. Não redeclarar aqui
   (isso evitava um erro de "canvas já declarado" que quebrava toda a galeria). */

/* ========== script/galeria.js · 432UP · v3.1 · integração real co_galeria_fotos + toast sucesso/erro ========== */

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

  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(16px)';
    setTimeout(() => t.remove(), 300);
  }, 4200);
}


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




// ENVIO DO FORMULÁRIO DE CONTATO (mesma tabela co_leads)
const btnSubmitContact = document.getElementById('btn-submit-general-contact');
if (btnSubmitContact) {
  if (btnSubmitContact.dataset.listenerAttached === 'true') {
    // já tem listener (evita duplo envio caso o script seja incluído 2x)
  } else {
    btnSubmitContact.dataset.listenerAttached = 'true';
    btnSubmitContact.addEventListener('click', async function () {
      const nameEl = document.getElementById('mod-name');
      const contactEl = document.getElementById('mod-contact');
      const msgEl = document.getElementById('mod-msg');
      const errorEl = document.getElementById('mod-contact-error');

      const name = nameEl ? nameEl.value.trim() : '';
      const contact = contactEl ? contactEl.value.trim() : '';
      const msg = msgEl ? msgEl.value.trim() : '';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneDigits = contact.replace(/\D/g, '');
      const isValid = emailRegex.test(contact) || /^\d{10,13}$/.test(phoneDigits);

      if (!name || !isValid) {
        if (errorEl) errorEl.style.display = 'block';
        if (contactEl) contactEl.focus();
        return;
      }
      if (errorEl) errorEl.style.display = 'none';

      btnSubmitContact.innerText = 'Registrando...';
      btnSubmitContact.disabled = true;

      let leadSaved = true;
      try {
        const resp = await fetch(SUPABASE_URL + '/rest/v1/co_leads', {
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
        if (!resp.ok) {
          console.error('Erro ao salvar lead (galeria): HTTP ' + resp.status);
          leadSaved = false;
        }
      } catch (err) {
        console.error('Erro ao salvar lead (galeria):', err);
        leadSaved = false;
      }

      const encoded = encodeURIComponent(
        `Olá! Meu nome é ${name}.\nContato: ${contact}\nVi a galeria da 432UP e gostaria de conversar sobre um evento.\n\nDetalhes: ${msg || 'Nenhum'}`
      );
      window.open(`https://wa.me/5511948564577?text=${encoded}`, '_blank');

      btnSubmitContact.innerText = 'Enviar Solicitação';
      btnSubmitContact.disabled = false;

      if (contactOverlay) contactOverlay.classList.remove('active', 'open');

      if (leadSaved) {
        showGalToast('Mensagem enviada com sucesso! Abrindo WhatsApp...', 'success');
      } else {
        showGalToast('Não conseguimos registrar sua mensagem no sistema, mas você já pode falar direto pelo WhatsApp.', 'error');
      }
    });
  }
}

  loadGallery();
});
