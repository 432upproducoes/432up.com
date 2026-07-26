/* ==========================================================================
   432UP! PRODUÇÕES - INTELIGÊNCIA & TRACKER SISTÊMICO v1.0
   ========================================================================== */

/* 1. MODO DIA/NOITE AUTOMÁTICO PELO SISTEMA */
let isUranoActive = false;

function applySystemTheme(e) {
  isUranoActive = e.matches;
  document.documentElement.setAttribute('data-theme', isUranoActive ? 'light' : 'dark');
  
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isUranoActive ? '#161822' : '#08080A');
  }
}

const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: light)');
applySystemTheme(colorSchemeQuery);
colorSchemeQuery.addEventListener('change', applySystemTheme);

/* 2. PROTEÇÃO DE CONTEÚDO E CÓDIGO (SEGURANÇA) */
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'U')) { 
    e.preventDefault(); 
  }
});

/* 3. CONEXÃO BAZO DE DADOS SUPABASE */
const SUPABASE_URL = "https://www.432up.com/supabase-api";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA";
let supabaseClient = null;

if (typeof supabase !== 'undefined' && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* 4. TRACKER INTELEVENTOS E RASTREAMENTO DE SESSÃO */
const sessionData = {
  session_id: 'sess_' + Math.random().toString(36).substring(2, 11),
  user_agent: navigator.userAgent,
  screen_res: `${window.innerWidth}x${window.innerHeight}`,
  entry_time: new Date().toISOString(),
  page_url: window.location.href
};

async function logTrackerEvent(eventType, eventData = {}) {
  if (supabaseClient) {
    try {
      await supabaseClient.from('tracker_analytics').insert([{
        session_id: sessionData.session_id,
        event_type: eventType,
        metadata: eventData,
        created_at: new Date().toISOString()
      }]);
    } catch(err) {}
  }
}

// Rastrear acesso inicial
document.addEventListener('DOMContentLoaded', () => {
  checkResponsiveLabels();
  logTrackerEvent('page_view', { screen: sessionData.screen_res, url: sessionData.page_url });
});

/* 5. CONTROLES DE INTERFACE & OVERLAYS */
function checkResponsiveLabels() {
  const isMobile = window.innerWidth <= 768;
  const desk = document.querySelector('.desktop-only');
  const mob = document.querySelector('.mobile-only');
  if (desk) desk.style.display = isMobile ? 'none' : 'inline';
  if (mob) mob.style.display = isMobile ? 'inline' : 'none';
}
window.addEventListener('resize', checkResponsiveLabels);

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.toggle('active');
}

function openLeadModal() {
  const modal = document.getElementById('lead-modal');
  if (modal) modal.classList.add('active');
  logTrackerEvent('modal_open', { target: 'lead_form' });
}

function closeLeadModal() {
  const modal = document.getElementById('lead-modal');
  if (modal) modal.classList.remove('active');
}

function toggleLpsDrawer() {
  const drawer = document.getElementById('lps-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const deskLabel = document.querySelector('.desktop-only');
  const mobLabel = document.querySelector('.mobile-only');

  const isOpen = drawer.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('active', isOpen);

  if (isOpen) {
    if (deskLabel) deskLabel.innerText = '[✕] Fechar Menu';
    if (mobLabel) mobLabel.innerText = '[✕] Fechar';
    logTrackerEvent('drawer_open', { target: 'lps_menu' });
  } else {
    if (deskLabel) deskLabel.innerText = '[+] Atendimentos Especializados';
    if (mobLabel) mobLabel.innerText = '[+] Especialidades';
  }
}

function closeLpsDrawer() {
  const drawer = document.getElementById('lps-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const deskLabel = document.querySelector('.desktop-only');
  const mobLabel = document.querySelector('.mobile-only');
  
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
  if (deskLabel) deskLabel.innerText = '[+] Atendimentos Especializados';
  if (mobLabel) mobLabel.innerText = '[+] Especialidades';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLpsDrawer();
    closeLeadModal();
  }
});

/* 6. ENVIO DE FORMULÁRIO DUPLO (DATABASE + WHATSAPP) */
let fallbackWhatsapp = "5511948564577";

async function handleProgressFormSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('modal-lead-name').value;
  const phone = document.getElementById('modal-lead-phone').value;
  const msg = document.getElementById('modal-lead-msg').value;
  const btn = document.getElementById('btn-submit-modal');
  
  btn.innerText = "Registrando Solicitacao...";
  btn.disabled = true;

  if (supabaseClient) {
    try {
      await supabaseClient.from('leads_simulador').insert([{
        nome: name,
        whatsapp: phone,
        observacoes: msg,
        origem: "Modal Home (Versao 1.0)",
        data_registro: new Date().toISOString()
      }]);
    } catch(err) {}
  }

  logTrackerEvent('lead_conversion', { name: name, phone: phone });

  const encodedMsg = encodeURIComponent(`Olá! Meu nome é ${name}.\nGostaria de iniciar um alinhamento técnico para meu evento.\n\nDetalhes: ${msg || 'Sem observações adicionais.'}`);
  window.open(`https://wa.me/${fallbackWhatsapp}?text=${encodedMsg}`, '_blank');
  
  btn.innerText = "Enviar Solicitação Direta";
  btn.disabled = false;
  closeLeadModal();
}

/* 7. ENGINE DO CANVAS - ESTRELAS RESTAURADAS */
const canvas = document.getElementById('orbit-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let width, height;
let stars = [];
let angle = 0;

const starColors = [
  { r: 255, g: 255, b: 255 },
  { r: 185, g: 220, b: 255 },
  { r: 255, g: 235, b: 180 },
  { r: 255, g: 190, b: 170 }
];

function resizeCanvas() {
  if (!canvas) return;
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  initClusterStars();
}

function initClusterStars() {
  stars = [];
  const totalStars = Math.floor((width * height) / 2100);
  const clusters = [
    { x: width * 0.2, y: height * 0.3, radius: 200 },
    { x: width * 0.8, y: height * 0.25, radius: 250 },
    { x: width * 0.5, y: height * 0.75, radius: 220 }
  ];

  for (let i = 0; i < totalStars; i++) {
    let x, y;
    if (Math.random() < 0.6) {
      const cluster = clusters[Math.floor(Math.random() * clusters.length)];
      const r = Math.random() * cluster.radius;
      const theta = Math.random() * Math.PI * 2;
      x = cluster.x + r * Math.cos(theta);
      y = cluster.y + r * Math.sin(theta);
    } else {
      x = Math.random() * width;
      y = Math.random() * height;
    }

    stars.push({
      x: x,
      y: y,
      size: Math.random() * 1.35,
      alpha: Math.random(),
      speed: 0.006 + Math.random() * 0.018,
      color: starColors[Math.floor(Math.random() * starColors.length)]
    });
  }
}

function drawOrbitBackground() {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height / 2;

  // GLOW 1
  const g1X = centerX + Math.cos(angle * 0.8) * 180;
  const g1Y = centerY + Math.sin(angle * 0.6) * 130;
  const grad1 = ctx.createRadialGradient(g1X, g1Y, 60, g1X, g1Y, width * 0.7);
  grad1.addColorStop(0, `rgba(0, 210, 255, ${isUranoActive ? 0.28 : 0.14})`);
  grad1.addColorStop(1, 'rgba(8, 8, 10, 0)');
  ctx.fillStyle = grad1;
  ctx.beginPath();
  ctx.arc(g1X, g1Y, width * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // GLOW 2
  const g2X = centerX + Math.sin(-angle * 0.7) * 200;
  const g2Y = centerY + Math.cos(-angle * 0.5) * 150;
  const grad2 = ctx.createRadialGradient(g2X, g2Y, 60, g2X, g2Y, width * 0.75);
  grad2.addColorStop(0, `rgba(255, 0, 127, ${isUranoActive ? 0.25 : 0.12})`);
  grad2.addColorStop(0.5, `rgba(147, 51, 234, ${isUranoActive ? 0.30 : 0.14})`);
  grad2.addColorStop(1, 'rgba(8, 8, 10, 0)');
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.arc(g2X, g2Y, width * 0.75, 0, Math.PI * 2);
  ctx.fill();

  // RENDER ESTRELAS
  for (let star of stars) {
    star.alpha += star.speed;
    const currentAlpha = Math.abs(Math.sin(star.alpha));
    const boostAlpha = isUranoActive ? 1.0 : 0.85;
    ctx.fillStyle = `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, ${currentAlpha * boostAlpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  angle += 0.0025;
  requestAnimationFrame(drawOrbitBackground);
}

if (canvas) {
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  drawOrbitBackground();
}
