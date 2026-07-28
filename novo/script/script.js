/* ==========================================================
   432UP! - SCRIPT ENTERPRISE 1.2.0 (MODULARIZADO)
   ========================================================== */

let isUranoActive = false;

function applySystemTheme(e) {
  isUranoActive = e.matches;
  document.documentElement.setAttribute('data-theme', isUranoActive ? 'light' : 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isUranoActive ? '#161822' : '#08080A');
}

const schemeQuery = window.matchMedia('(prefers-color-scheme: light)');
applySystemTheme(schemeQuery);
schemeQuery.addEventListener('change', applySystemTheme);

/* SEGURANÇA BÁSICA */
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'U')) {
    e.preventDefault();
  }
});

/* SUPABASE INTEGRATION */
const SUPABASE_URL = "https://www.432up.com/supabase-api";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA";
let supabaseClient = null;
if (typeof supabase !== 'undefined' && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* RESPONSIVIDADE DE RÓTULOS */
function checkResponsiveLabels() {
  const isMobile = window.innerWidth <= 768;
  const desk = document.querySelector('.desktop-only');
  const mob = document.querySelector('.mobile-only');
  if (desk) desk.style.display = isMobile ? 'none' : 'inline';
  if (mob) mob.style.display = isMobile ? 'inline' : 'none';
}
window.addEventListener('resize', checkResponsiveLabels);
document.addEventListener('DOMContentLoaded', checkResponsiveLabels);

/* CANVAS ENGINE (ÓRBITA ESTELAR LIMPA E ESTÁVEL) */
const canvas = document.getElementById('orbit-canvas');
const ctx = canvas.getContext('2d');
let width, height, stars = [], angle = 0;
const starColors = [ { r: 255, g: 255, b: 255 }, { r: 185, g: 220, b: 255 }, { r: 255, g: 235, b: 180 }, { r: 255, g: 190, b: 170 } ];

function resizeCanvas() {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  const widthChanged = newWidth !== width;
  width = canvas.width = newWidth;
  height = canvas.height = newHeight;
  if (widthChanged || stars.length === 0) {
    initClusterStars();
  }
}

function initClusterStars() {
  stars = [];
  const totalStars = Math.floor((width * height) / 2100);
  const clusters = [ { x: width * 0.2, y: height * 0.3, radius: 200 }, { x: width * 0.8, y: height * 0.25, radius: 250 }, { x: width * 0.5, y: height * 0.75, radius: 220 } ];
  for (let i = 0; i < totalStars; i++) {
    let x, y;
    if (Math.random() < 0.6) {
      const c = clusters[Math.floor(Math.random() * clusters.length)];
      const r = Math.random() * c.radius;
      const theta = Math.random() * Math.PI * 2;
      x = c.x + r * Math.cos(theta);
      y = c.y + r * Math.sin(theta);
    } else {
      x = Math.random() * width;
      y = Math.random() * height;
    }
    stars.push({ x, y, size: Math.random() * 1.35, alpha: Math.random(), speed: 0.006 + Math.random() * 0.018, color: starColors[Math.floor(Math.random() * starColors.length)] });
  }
}

function drawOrbitBackground() {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2, cy = height / 2;

  const g1X = cx + Math.cos(angle * 0.8) * 180, g1Y = cy + Math.sin(angle * 0.6) * 130;
  const grad1 = ctx.createRadialGradient(g1X, g1Y, 60, g1X, g1Y, width * 0.7);
  grad1.addColorStop(0, `rgba(0, 210, 255, ${isUranoActive ? 0.28 : 0.14})`);
  grad1.addColorStop(1, 'rgba(8, 8, 10, 0)');
  ctx.fillStyle = grad1; ctx.beginPath(); ctx.arc(g1X, g1Y, width * 0.7, 0, Math.PI * 2); ctx.fill();

  const g2X = cx + Math.sin(-angle * 0.7) * 200, g2Y = cy + Math.cos(-angle * 0.5) * 150;
  const grad2 = ctx.createRadialGradient(g2X, g2Y, 60, g2X, g2Y, width * 0.75);
  grad2.addColorStop(0, `rgba(255, 0, 127, ${isUranoActive ? 0.25 : 0.12})`);
  grad2.addColorStop(0.5, `rgba(147, 51, 234, ${isUranoActive ? 0.30 : 0.14})`);
  grad2.addColorStop(1, 'rgba(8, 8, 10, 0)');
  ctx.fillStyle = grad2; ctx.beginPath(); ctx.arc(g2X, g2Y, width * 0.75, 0, Math.PI * 2); ctx.fill();

  for (let s of stars) {
    s.alpha += s.speed;
    const curA = Math.abs(Math.sin(s.alpha));
    ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${curA * (isUranoActive ? 1.0 : 0.85)})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
  }
  angle += 0.0025;
  requestAnimationFrame(drawOrbitBackground);
}

let resizeDebounce;
window.addEventListener('resize', () => {
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(resizeCanvas, 150);
});
resizeCanvas();
drawOrbitBackground();

/* GAVETA DE LPs & MENU MOBILE */
function toggleLpsDrawer() {
  const drawer = document.getElementById('lps-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const desk = document.querySelector('.desktop-only');
  const mob = document.querySelector('.mobile-only');
  const isOpen = drawer.classList.toggle('open');
  backdrop.classList.toggle('active', isOpen);
  if (isOpen) {
    if (desk) desk.innerText = '[✕] Fechar Menu';
    if (mob) mob.innerText = '[✕] Fechar';
  } else {
    if (desk) desk.innerText = '[+] Atendimentos Especializados';
    if (mob) mob.innerText = '[+] Especialidades';
  }
}

function closeLpsDrawer() {
  document.getElementById('lps-drawer').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.remove('active');
  const desk = document.querySelector('.desktop-only');
  const mob = document.querySelector('.mobile-only');
  if (desk) desk.innerText = '[+] Atendimentos Especializados';
  if (mob) mob.innerText = '[+] Especialidades';
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLpsDrawer(); });

function toggleMobileMenu() { 
  document.getElementById('mobile-menu').classList.toggle('active'); 
}

/* MODAL & VALIDAÇÃO INTELIGENTE DE CONTATO (E-MAIL OU TELEFONE) */
let fallbackWhatsapp = "5511948564577";

function openLeadModal() { 
  document.getElementById('lead-modal').classList.add('active'); 
}

function closeLeadModal() { 
  document.getElementById('lead-modal').classList.remove('active');
  const errorMsg = document.getElementById('contact-error-msg');
  if (errorMsg) errorMsg.style.display = 'none';
}

function validateContact(value) {
  const cleanVal = value.trim();
  // Regex de e-mail básico válido
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Regex para telefone/WhatsApp (aceita números com DDD, parênteses, espaços e traços, exigindo ao menos 10 dígitos)
  const phoneDigits = cleanVal.replace(/\D/g, '');
  const phoneRegex = /^\d{10,13}$/;

  return emailRegex.test(cleanVal) || phoneRegex.test(phoneDigits);
}

async function handleProgressFormSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('modal-lead-name').value;
  const contact = document.getElementById('modal-lead-contact').value;
  const msg = document.getElementById('modal-lead-msg').value;
  const errorMsg = document.getElementById('contact-error-msg');
  const btn = document.getElementById('btn-submit-modal');

  // Validação estrita do campo unificado (E-mail ou Telefone)
  if (!validateContact(contact)) {
    errorMsg.style.display = 'block';
    document.getElementById('modal-lead-contact').focus();
    return;
  }
  errorMsg.style.display = 'none';

  btn.innerText = "Registrando..."; 
  btn.disabled = true;

  if (supabaseClient) {
    try {
      await supabaseClient.from('leads_simulador').insert([{ 
        nome: name, 
        whatsapp: contact, 
        observacoes: msg, 
        origem: "Modal Home Modular", 
        data_registro: new Date().toISOString() 
      }]);
    } catch(err) {}
  }

  const encoded = encodeURIComponent(`Olá! Meu nome é ${name}.\nContato: ${contact}\nGostaria de iniciar um alinhamento técnico.\n\nDetalhes: ${msg || 'Nenhum'}`);
  window.open(`https://wa.me/${fallbackWhatsapp}?text=${encoded}`, '_blank');
  
  btn.innerText = "Enviar Solicitação"; 
  btn.disabled = false; 
  closeLeadModal();
}













//teste de toque 
/* --- 1. LÓGICA DO TOQUE DE PLASMA (SEUS PARÂMETROS CALIBRADOS) --- */
function trigger432upPlasma(x, y) {
  const plasmaLayer = document.getElementById('plasmaLayer');
  if (!plasmaLayer) return;

  const group = document.createElement('div');
  group.className = 'ripple-group';
  group.style.left = `${x}px`;
  group.style.top = `${y}px`;

  const wave = document.createElement('div');
  wave.className = 'plasma-wave';

  // Parâmetros calibrados do print
  const colorRgb = '168, 85, 247'; // Lilás oficial
  const alpha = 0.65;              // Opacidade
  const borderPx = 8;              // Espessura
  const blurPx = 31;               // Blur
  const radiusPx = 350;            // Raio de alcance
  const durationSec = 2.7;         // Duração (~67 BPM)

  wave.style.border = `${borderPx}px solid rgba(${colorRgb}, ${alpha})`;
  wave.style.background = `radial-gradient(circle, rgba(${colorRgb}, ${alpha * 0.4}) 0%, transparent 80%)`;
  wave.style.boxShadow = `0 0 ${blurPx}px rgba(${colorRgb}, ${alpha * 0.8})`;

  wave.animate([
    {
      width: '10px',
      height: '10px',
      opacity: alpha * 1.4,
      filter: `blur(${blurPx * 0.1}px)`
    },
    {
      width: `${radiusPx * 0.35}px`,
      height: `${radiusPx * 0.35}px`,
      opacity: alpha,
      filter: `blur(${blurPx * 0.4}px)`,
      offset: 0.3
    },
    {
      width: `${radiusPx}px`,
      height: `${radiusPx}px`,
      opacity: 0,
      filter: `blur(${blurPx * 1.3}px)`
    }
  ], {
    duration: durationSec * 1000,
    easing: 'cubic-bezier(0.12, 0.8, 0.32, 1)', // Curva V3
    fill: 'forwards'
  });

  group.appendChild(wave);
  plasmaLayer.appendChild(group);

  setTimeout(() => group.remove(), (durationSec + 0.5) * 1000);
}

// Escuta o toque ou clique do usuário em qualquer lugar da tela
window.addEventListener('pointerdown', (e) => {
  trigger432upPlasma(e.clientX, e.clientY);
});

/* --- 2. RENDERIZADOR DAS FIBRAS DIAGONAIS EM CANVAS --- */
function initDiagonalCanvas() {
  const canvas = document.getElementById('diagonalCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const fibers = [];
  for (let i = 0; i < 5; i++) {
    fibers.push({
      startX: (i * (width / 3)) - (width * 0.15),
      angle: -Math.PI / 4,
      amplitude: 45 + Math.random() * 60,
      frequency: 0.001 + Math.random() * 0.001,
      speed: 0.0015 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
      coreThickness: 3 + Math.random() * 2,
      glowBlur: 30 + Math.random() * 20,
      color: i % 2 === 0 ? 'rgba(0, 230, 118, ' : 'rgba(192, 132, 252, ',
      alpha: 0.22 + Math.random() * 0.18
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    fibers.forEach(f => {
      f.phase += f.speed;
      ctx.save();
      ctx.translate(f.startX, 0);
      ctx.rotate(f.angle);

      ctx.beginPath();
      ctx.lineWidth = f.coreThickness * 4.5;
      ctx.strokeStyle = f.color + (f.alpha * 0.2) + ')';
      ctx.shadowBlur = f.glowBlur;
      ctx.shadowColor = f.color + '0.8)';

      for (let y = -height; y < height * 2; y += 25) {
        let x = Math.sin(y * f.frequency + f.phase) * f.amplitude;
        if (y === -height) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = f.coreThickness;
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (f.alpha * 0.7) + ')';
      ctx.shadowBlur = 10;
      ctx.shadowColor = f.color + '1)';

      for (let y = -height; y < height * 2; y += 25) {
        let x = Math.sin(y * f.frequency + f.phase) * f.amplitude;
        if (y === -height) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    });
    requestAnimationFrame(render);
  }
  render();
}

window.addEventListener('DOMContentLoaded', () => {
  initDiagonalCanvas();
});
