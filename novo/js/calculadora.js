// ==========================================================================
// JAVASCRIPT DA CALCULADORA - 432UP! PRODUÇÕES
// ==========================================================================

const canvas = document.getElementById('orbit-canvas');
const ctx = canvas.getContext('2d');
let width, height, stars = [], angle = 0;
const starColors = [{ r: 255, g: 255, b: 255 }, { r: 185, g: 220, b: 255 }, { r: 255, g: 235, b: 180 }, { r: 255, g: 190, b: 170 }];

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  initClusterStars();
}

function initClusterStars() {
  stars = [];
  const totalStars = Math.floor((width * height) / 2100);
  const clusters = [{ x: width * 0.2, y: height * 0.3, radius: 200 }, { x: width * 0.8, y: height * 0.25, radius: 250 }, { x: width * 0.5, y: height * 0.75, radius: 220 }];
  for (let i = 0; i < totalStars; i++) {
    let x, y;
    if (Math.random() < 0.6) {
      const cluster = clusters[Math.floor(Math.random() * clusters.length)];
      const r = Math.random() * cluster.radius;
      const theta = Math.random() * Math.PI * 2;
      x = cluster.x + r * Math.cos(theta); y = cluster.y + r * Math.sin(theta);
    } else {
      x = Math.random() * width; y = Math.random() * height;
    }
    stars.push({ x, y, size: Math.random() * 1.35, alpha: Math.random(), speed: 0.006 + Math.random() * 0.018, color: starColors[Math.floor(Math.random() * starColors.length)] });
  }
}

function drawOrbitBackground() {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2, cy = height / 2;
  const g1X = cx + Math.cos(angle * 0.8) * 180, g1Y = cy + Math.sin(angle * 0.6) * 130;
  const grad1 = ctx.createRadialGradient(g1X, g1Y, 60, g1X, g1Y, width * 0.7);
  grad1.addColorStop(0, 'rgba(0, 210, 255, 0.14)'); grad1.addColorStop(1, 'rgba(8, 8, 10, 0)');
  ctx.fillStyle = grad1; ctx.beginPath(); ctx.arc(g1X, g1Y, width * 0.7, 0, Math.PI * 2); ctx.fill();

  const g2X = cx + Math.sin(-angle * 0.7) * 200, g2Y = cy + Math.cos(-angle * 0.5) * 150;
  const grad2 = ctx.createRadialGradient(g2X, g2Y, 60, g2X, g2Y, width * 0.75);
  grad2.addColorStop(0, 'rgba(255, 0, 127, 0.12)'); grad2.addColorStop(0.5, 'rgba(147, 51, 234, 0.14)'); grad2.addColorStop(1, 'rgba(8, 8, 10, 0)');
  ctx.fillStyle = grad2; ctx.beginPath(); ctx.arc(g2X, g2Y, width * 0.75, 0, Math.PI * 2); ctx.fill();

  for (let s of stars) {
    s.alpha += s.speed;
    const curA = Math.abs(Math.sin(s.alpha));
    ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${curA * 0.85})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
  }
  angle += 0.0025;
  requestAnimationFrame(drawOrbitBackground);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
drawOrbitBackground();

const SUPABASE_URL = "https://www.432up.com/supabase-api";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA";
let supabaseClient = null;
if (typeof supabase !== 'undefined' && window.supabase && SUPABASE_URL.indexOf("SEU_PROJETO") === -1) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'embed') {
  document.body.classList.add('embed-mode');
  const hero = document.getElementById('calc-hero');
  if (hero) hero.style.display = 'none';
}

let prices = { price_bronze: 3500, price_prata: 6200, price_ouro: 11800, factor_small: 1.0, factor_medium: 1.3, factor_large: 1.6, add_extra_hour: 800 };
let dbAddons = [
  { id: 'd1', nome: "Montagem de Palco Elevado", description: "Estrutura técnica com saia de acabamento pantográfica.", preco_base: 1200, varia_com_pessoas: true, varia_com_horas: false },
  { id: 'd2', nome: "Performance de Sax Solo", description: "Intervenção de alto requinte para receptivos e welcome-drinks.", preco_base: 1500, varia_com_pessoas: false, varia_com_horas: false },
  { id: 'd3', nome: "Upgrade de Iluminação Cênica DMX", description: "Varas de LED inteligentes controladas por mesa digital em tempo real.", preco_base: 2200, varia_com_pessoas: false, varia_com_horas: false }
];

let selectedAddons = {};
let selection = { scale: 'small', hours: 3, package: 'bronze', guestsText: "Até 100 pessoas" };
let fallbackWhatsapp = "5511948564577";
let hasInteracted = false;
let globalFormattedPrice = "";
let globalSpecsList = [];

const matrixSpecifications = {
  bronze: ["Sistemas Lineares Discretos Compactos", "Microfonia Digital Sem Fio", "Engenheiro Operacional Dedicado"],
  prata: ["Pressão Acústica Ampliada com Subwoofers", "Arquitetura de Luz Inteligente DMX", "Suporte Técnico Integral"],
  ouro: ["Rider Completo para Alta Performance e Bandas AA+", "Line Array de Alta Definição", "Cenografia de Iluminação de Gala"]
};

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenuClose = document.getElementById('mobile-menu-close');
const mobileMenu = document.getElementById('mobile-menu');

function toggleMobileMenu() { if (mobileMenu) mobileMenu.classList.toggle('active'); }
if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);
if (mobileMenuClose) mobileMenuClose.addEventListener('click', toggleMobileMenu);

const navTriggerModal = document.getElementById('nav-trigger-modal');
const navTriggerModalMobile = document.getElementById('nav-trigger-modal-mobile');
const btnTriggerModalCall = document.getElementById('btn-trigger-modal-call');
const stickyBtnTriggerModal = document.getElementById('sticky-btn-trigger-modal');
const contactOverlay = document.getElementById('contact-overlay');
const contactModalCloseBtn = document.getElementById('contact-modal-close-btn');

function openContactModal() {
  triggerInteraction();
  if (contactOverlay) contactOverlay.classList.add('open');
  if (mobileMenu && mobileMenu.classList.contains('active')) toggleMobileMenu();
}

if (navTriggerModal) navTriggerModal.addEventListener('click', openContactModal);
if (navTriggerModalMobile) navTriggerModalMobile.addEventListener('click', openContactModal);
if (btnTriggerModalCall) btnTriggerModalCall.addEventListener('click', openContactModal);
if (stickyBtnTriggerModal) stickyBtnTriggerModal.addEventListener('click', openContactModal);
if (contactModalCloseBtn) contactModalCloseBtn.addEventListener('click', () => contactOverlay.classList.remove('open'));
if (contactOverlay) contactOverlay.addEventListener('click', (e) => { if(e.target === contactOverlay) contactOverlay.classList.remove('open'); });

function applyPhoneMask(input) {
  if (!input) return;
  input.addEventListener('input', () => {
    let digits = input.value.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 0) formatted = '(' + digits.slice(0, 2);
    if (digits.length >= 3) formatted += ') ' + digits.slice(2, digits.length <= 10 ? 6 : 7);
    if (digits.length > 6) {
      const bp = digits.length <= 10 ? 6 : 7;
      formatted += '-' + digits.slice(bp, digits.length <= 10 ? 10 : 11);
    }
    input.value = formatted;
  });
}
applyPhoneMask(document.getElementById('mod-phone'));

function isValidEmail(val) { if (!val) return true; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()); }
function isValidPhone(val) { const digits = val.replace(/\D/g, ''); return digits.length === 10 || digits.length === 11; }

async function setupSimulator() {
  try {
    if (supabaseClient) {
      const { data: calcData } = await supabaseClient.from('config_calculadora').select('*').eq('id', 1).single();
      if (calcData) prices = calcData;
      const { data: geralData } = await supabaseClient.from('config_geral').select('whatsapp').eq('id', 1).single();
      if (geralData) fallbackWhatsapp = geralData.whatsapp;
      const { data: addons } = await supabaseClient.from('servicos_adicionais').select('*').order('id', { ascending: true });
      if (addons && addons.length > 0) dbAddons = [...addons];
    }
  } catch(e) {}
  renderAddons();
  calculateAtmosphere();
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderAddons() {
  const listContainer = document.getElementById('dynamic-addons-list');
  listContainer.innerHTML = dbAddons.map(addon => `
    <div class="extra-item" data-id="${escapeHtml(addon.id)}" onclick="handleDynamicAddonClick('${escapeHtml(addon.id)}', this)">
      <div>
        <h5>${escapeHtml(addon.nome)}</h5>
        <p>${escapeHtml(addon.description || '')}</p>
      </div>
      <div class="checkbox-custom"></div>
    </div>
  `).join('');
}

function handleDynamicAddonClick(id, element) {
  triggerInteraction();
  element.classList.toggle('selected');
  selectedAddons[id] = element.classList.contains('selected');
  calculateAtmosphere();
}

function triggerInteraction() {
  if (!hasInteracted) {
    hasInteracted = true;
    document.getElementById('mobile-sticky-bar').classList.add('visible');
  }
}

function calculateAtmosphere() {
  let basePrice = prices[`price_${selection.package}`];
  let factor = prices[`factor_${selection.scale}`];
  let addonsTotal = 0;
  let hourOver = (selection.hours > 5) ? (selection.hours - 5) * prices.add_extra_hour : 0;

  globalSpecsList = [...matrixSpecifications[selection.package]];

  dbAddons.forEach(addon => {
    if (selectedAddons[addon.id]) {
      let itemCost = addon.preco_base;
      if (addon.varia_com_pessoas) itemCost *= factor;
      if (addon.varia_com_horas) itemCost *= selection.hours;
      addonsTotal += itemCost;
      globalSpecsList.push(`${addon.nome}`);
    }
  });

  let finalTotal = (basePrice * factor) + hourOver + addonsTotal;
  let stageText = "Padrão Plano";

  if (selection.scale === 'large') {
    document.getElementById('insight-stage').style.display = 'block';
    stageText = "Elevado (Mín. 60cm)";
  } else {
    document.getElementById('insight-stage').style.display = 'none';
  }
  document.getElementById('insight-acoustic').style.display = (selection.scale !== 'small') ? 'block' : 'none';

  document.getElementById('sum-guests').innerText = selection.guestsText;
  document.getElementById('sum-hours').innerText = `${selection.hours} horas`;
  document.getElementById('sum-package').innerText = selection.package.toUpperCase();
  document.getElementById('sum-stage-needed').innerText = stageText;

  if (selection.hours > 5) globalSpecsList.push(`Adicional Operacional (+${selection.hours - 5}h)`);
  document.getElementById('sum-service-details').innerHTML = globalSpecsList.map(item => `<li>${escapeHtml(item)}</li>`).join('');

  globalFormattedPrice = finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const priceEl = document.getElementById('total-price');
  const stickyPriceEl = document.getElementById('sticky-total-price');

  if (!hasInteracted) {
    priceEl.innerText = "Selecione os parâmetros ao lado para calcular o investimento.";
    priceEl.classList.add('hint-mode');
    if (stickyPriceEl) { stickyPriceEl.innerText = "Selecione os itens ao lado."; stickyPriceEl.classList.add('hint-mode'); }
  } else {
    priceEl.innerText = globalFormattedPrice;
    priceEl.classList.remove('hint-mode');
    if (stickyPriceEl) { stickyPriceEl.innerText = globalFormattedPrice; stickyPriceEl.classList.remove('hint-mode'); }
  }

  const msg = encodeURIComponent(`Olá! Realizei o dimensionamento técnico no simulador 432UP! e gostaria de validar o escopo:\n- Rider Base: ${selection.package.toUpperCase()}\n- Escala: ${selection.guestsText}\n- Horas: ${selection.hours}\n- Investimento Estimado: R$ ${finalTotal.toLocaleString('pt-BR', {minimumFractionDigits:0})}`);

  const targetWhatsappUrl = `https://wa.me/${fallbackWhatsapp}?text=${msg}`;
  document.getElementById('btn-whatsapp').href = targetWhatsappUrl;
  document.getElementById('sticky-btn-whatsapp').href = targetWhatsappUrl;
}

const btnSubmitGeneralContact = document.getElementById('btn-submit-general-contact');
if (btnSubmitGeneralContact) {
  btnSubmitGeneralContact.addEventListener('click', async () => {
    const nameEl = document.getElementById('mod-name');
    const phoneEl = document.getElementById('mod-phone');
    const emailEl = document.getElementById('mod-email');
    const msgEl = document.getElementById('mod-msg');
    const phoneError = document.getElementById('mod-phone-error');
    const emailError = document.getElementById('mod-email-error');

    phoneEl.classList.remove('field-error');
    emailEl.classList.remove('field-error');
    phoneError.style.display = 'none';
    emailError.style.display = 'none';

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const email = emailEl.value.trim();
    const msgText = msgEl.value;

    if (!name) { alert("Por favor, informe seu nome ou empresa."); nameEl.focus(); return; }
    if (!isValidPhone(phone)) { phoneEl.classList.add('field-error'); phoneError.style.display = 'block'; phoneEl.focus(); return; }
    if (email && !isValidEmail(email)) { emailEl.classList.add('field-error'); emailError.style.display = 'block'; emailEl.focus(); return; }

    if (!supabaseClient) {
      alert("Ambiente de homologação detectado ou chaves do Supabase ausentes. Por favor, acione nosso WhatsApp.");
      return;
    }

    btnSubmitGeneralContact.innerText = "Registrando Solicitação...";
    btnSubmitGeneralContact.disabled = true;

    try {
      const { error } = await supabaseClient.from('leads_simulador').insert([{
        nome: name, whatsapp: phone, email: email, observacoes: msgText,
        rider: selection.package.toUpperCase(), escala: selection.guestsText,
        duracao: `${selection.hours} horas`, investimento_estimado: globalFormattedPrice,
        data_registro: new Date().toISOString()
      }]);
      if (error) throw error;
      alert("Solicitação registrada com sucesso! Nossa equipe entrará em contato em breve.");
      contactOverlay.classList.remove('open');
      nameEl.value = ''; phoneEl.value = ''; emailEl.value = ''; msgEl.value = '';
    } catch(e) {
      alert("Erro técnico ao registrar contato. Se preferir, acione nosso WhatsApp.");
    } finally {
      btnSubmitGeneralContact.innerText = "Solicitar Ligação";
      btnSubmitGeneralContact.disabled = false;
    }
  });
}

document.getElementById('btn-pdf-trigger').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('pdf-package').innerText = selection.package.toUpperCase();
  document.getElementById('pdf-guests').innerText = selection.guestsText;
  document.getElementById('pdf-hours').innerText = `${selection.hours} horas`;
  document.getElementById('pdf-stage').innerText = document.getElementById('sum-stage-needed').innerText;
  document.getElementById('pdf-total-val').innerText = globalFormattedPrice;
  document.getElementById('pdf-specs-items').innerHTML = globalSpecsList.map(item => `<li>${escapeHtml(item)}</li>`).join('');

  const element = document.getElementById('pdf-render-template');
  element.style.display = 'block';
  const opt = {
    margin: 15, filename: `Proposta_Estrutural_432UP.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save().then(() => { element.style.display = 'none'; }).catch(() => { element.style.display = 'none'; });
});

document.querySelectorAll('#group-scale .option-card').forEach(card => {
  card.addEventListener('click', () => {
    triggerInteraction();
    document.querySelectorAll('#group-scale .option-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selection.scale = card.dataset.value;
    selection.guestsText = card.querySelector('.sub').innerText;
    calculateAtmosphere();
  });
});

document.querySelectorAll('#group-hours .option-card').forEach(card => {
  card.addEventListener('click', () => {
    triggerInteraction();
    document.querySelectorAll('#group-hours .option-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selection.hours = parseInt(card.dataset.value);
    calculateAtmosphere();
  });
});

document.querySelectorAll('#group-package .option-card').forEach(card => {
  card.addEventListener('click', () => {
    triggerInteraction();
    document.querySelectorAll('#group-package .option-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selection.package = card.dataset.value;
    calculateAtmosphere();
  });
});

window.addEventListener('DOMContentLoaded', setupSimulator);
