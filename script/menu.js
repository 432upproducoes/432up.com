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

function installAgendaPopover() {
  if (window.__432upAgendaPopoverInstalled) return;
  window.__432upAgendaPopoverInstalled = true;

  const style = document.createElement('style');
  style.id = '432up-agenda-popover-style';
  style.textContent = `
    #mn-agenda-popover { position:fixed; z-index:2147483000; width:min(440px,calc(100vw - 16px)); height:min(700px,78vh); display:none; overflow:visible; border-radius:20px; background:rgba(28,18,34,.82); border:1px solid rgba(192,132,252,.28); box-shadow:0 18px 60px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.10); backdrop-filter:blur(30px) saturate(145%); -webkit-backdrop-filter:blur(30px) saturate(145%); transform-origin:top right; animation:mnAgendaIn .22s cubic-bezier(.22,1,.36,1); }
    #mn-agenda-popover.on { display:block; }
    #mn-agenda-popover::before { content:''; position:absolute; top:-7px; right:var(--mn-agenda-arrow,28px); width:13px; height:13px; transform:rotate(45deg); background:rgba(28,18,34,.90); border-left:1px solid rgba(192,132,252,.28); border-top:1px solid rgba(192,132,252,.28); }
    #mn-agenda-popover iframe { position:relative; z-index:1; width:100%; height:100%; display:block; border:0; border-radius:inherit; background:transparent; }
    #mn-agenda-backdrop { position:fixed; inset:0; z-index:2147482999; display:none; background:transparent; }
    #mn-agenda-backdrop.on { display:block; }
    @keyframes mnAgendaIn { from { opacity:0; transform:translateY(-5px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
  `;
  document.head.appendChild(style);

  let popover = null;
  let backdrop = null;
  let anchor = null;

  function close() {
    if (popover) popover.classList.remove('on');
    if (backdrop) backdrop.classList.remove('on');
    if (anchor) anchor.setAttribute('aria-expanded', 'false');
    anchor = null;
  }

  function position() {
    if (!popover || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const width = Math.min(440, window.innerWidth - 16);
    const height = Math.min(700, window.innerHeight * .78);
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left + r.width / 2 - width / 2));
    const top = Math.max(8, Math.min(window.innerHeight - height - 8, r.bottom - 1));
    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
    popover.style.width = width + 'px';
    popover.style.height = height + 'px';
    popover.style.setProperty('--mn-agenda-arrow', Math.max(16, Math.min(width - 28, r.left + r.width / 2 - left - 6)) + 'px');
  }

  function open(el) {
    if (!popover) {
      backdrop = document.createElement('div');
      backdrop.id = 'mn-agenda-backdrop';
      popover = document.createElement('div');
      popover.id = 'mn-agenda-popover';
      popover.setAttribute('role', 'dialog');
      popover.setAttribute('aria-label', 'Agenda 432UP');
      popover.innerHTML = '<iframe title="Agenda 432UP" loading="eager" src="/B2B/admin/agenda.html?popup=1"></iframe>';
      document.body.appendChild(backdrop);
      document.body.appendChild(popover);
      backdrop.addEventListener('click', close);
      popover.addEventListener('click', e => e.stopPropagation());
    }
    if (popover.classList.contains('on') && anchor === el) { close(); return; }
    anchor = el;
    anchor.setAttribute('aria-expanded', 'true');
    backdrop.classList.add('on');
    popover.classList.add('on');
    position();
  }

  document.addEventListener('click', function (e) {
    const el = e.target && e.target.closest ? e.target.closest('a.mn-mail[href*="agenda"],a[aria-label*="agenda" i],a[title*="agenda" i]') : null;
    if (el && !el.closest('#mn-agenda-popover')) {
      e.preventDefault();
      e.stopPropagation();
      open(el);
    }
  });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
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
      installAgendaPopover();
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
