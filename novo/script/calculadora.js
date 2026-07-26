/* ==========================================================
   432UP! - CALCULADORA DE ATMOSFERA (MODULARIZADO)
   ========================================================== */

let prices = { price_bronze: 3500, price_prata: 6200, price_ouro: 11800, factor_small: 1.0, factor_medium: 1.3, factor_large: 1.6, add_extra_hour: 800 };

let dbAddons = [
  { id: 'd1', nome: "Montagem de Palco Elevado", description: "Estrutura técnica com saia de acabamento pantográfica.", preco_base: 1200, varia_com_pessoas: true, varia_com_horas: false },
  { id: 'd2', nome: "Performance de Sax Solo", description: "Intervenção de alto requinte para receptivos e welcome-drinks.", preco_base: 1500, varia_com_pessoas: false, varia_com_horas: false },
  { id: 'd3', nome: "Upgrade de Iluminação Cênica DMX", description: "Varas de LED inteligentes controladas por mesa digital em tempo real.", preco_base: 2200, varia_com_pessoas: false, varia_com_horas: false }
];

let selectedAddons = {};
let selection = { scale: 'small', hours: 3, package: 'bronze', guestsText: "Até 100 pessoas" };
let calcFallbackWhatsapp = "5511948564577";
let hasInteracted = false;
let globalFormattedPrice = "";
let globalSpecsList = [];

const matrixSpecifications = {
  bronze: ["Sistemas Lineares Discretos Compactos", "Microfonia Digital Sem Fio", "Engenheiro Operacional Dedicado"],
  prata: ["Pressão Acústica Ampliada com Subwoofers", "Arquitetura de Luz Inteligente DMX", "Suporte Técnico Integral"],
  ouro: ["Rider Completo para Alta Performance e Bandas AA+", "Line Array de Alta Definição", "Cenografia de Iluminação de Gala"]
};

const neuroExitMessages = [
  "Antes de sair: sua simulação ainda não foi salva. Deseja registrar esta configuração com nossa equipe?",
  "Notamos que você está prestes a sair. Se quiser, podemos salvar os parâmetros técnicos que você calibrou.",
  "Sua simulação está pronta. Você pode salvá-la em PDF ou enviá-la para nossa equipe antes de sair.",
  "Se preferir, podemos manter esta configuração salva e entrar em contato para dar continuidade.",
  "Antes de fechar esta página, você pode registrar seu orçamento estimado com a nossa equipe."
];

let exitTriggered = false;
document.addEventListener("mouseleave", function (e) {
  if (e.clientY < 0 && !exitTriggered && hasInteracted) {
    exitTriggered = true;
    const randomIndex = Math.floor(Math.random() * neuroExitMessages.length);
    alert(neuroExitMessages[randomIndex]);
  }
});

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'embed') {
  document.body.classList.add('embed-mode');
  const hero = document.getElementById('calc-hero');
  if (hero) hero.style.display = 'none';
}

// MODAL DE CONTATO INTEGRADO DA CALCULADORA
const navTriggerModal = document.getElementById('nav-trigger-modal');
const navTriggerModalMobile = document.getElementById('nav-trigger-modal-mobile');
const btnTriggerModalCall = document.getElementById('btn-trigger-modal-call');
const stickyBtnTriggerModal = document.getElementById('sticky-btn-trigger-modal');
const contactOverlay = document.getElementById('contact-overlay');
const contactModalCloseBtn = document.getElementById('contact-modal-close-btn');

function openContactModal() {
  triggerInteraction();
  if (contactOverlay) contactOverlay.classList.add('open');
}

if (navTriggerModal) navTriggerModal.addEventListener('click', openContactModal);
if (navTriggerModalMobile) navTriggerModalMobile.addEventListener('click', openContactModal);
if (btnTriggerModalCall) btnTriggerModalCall.addEventListener('click', openContactModal);
if (stickyBtnTriggerModal) stickyBtnTriggerModal.addEventListener('click', openContactModal);

if (contactModalCloseBtn) contactModalCloseBtn.addEventListener('click', () => contactOverlay.classList.remove('open'));
if (contactOverlay) contactOverlay.addEventListener('click', (e) => { if(e.target === contactOverlay) contactOverlay.classList.remove('open'); });

async function setupSimulator() {
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const { data: calcData } = await supabaseClient.from('config_calculadora').select('*').eq('id', 1).single();
      if (calcData) prices = calcData;
      const { data: geralData } = await supabaseClient.from('config_geral').select('whatsapp').eq('id', 1).single();
      if (geralData) calcFallbackWhatsapp = geralData.whatsapp;

      const { data: addons } = await supabaseClient.from('servicos_adicionais').select('*').order('id', { ascending: true });
      if (addons && addons.length > 0) {
        dbAddons = [...addons];
      }
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
  if(!listContainer) return;
  listContainer.innerHTML = '';
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
    const stickyBar = document.getElementById('mobile-sticky-bar');
    if(stickyBar) stickyBar.classList.add('visible');
  }
}

function validateContact(value) {
  const cleanVal = value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = cleanVal.replace(/\D/g, '');
  const phoneRegex = /^\d{10,13}$/;
  return emailRegex.test(cleanVal) || phoneRegex.test(phoneDigits);
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

  const insightStage = document.getElementById('insight-stage');
  const insightAcoustic = document.getElementById('insight-acoustic');

  if (selection.scale === 'large') {
    if(insightStage) insightStage.style.display = 'block';
    stageText = "Elevado (Mín. 60cm)";
  } else {
    if(insightStage) insightStage.style.display = 'none';
  }
  if(insightAcoustic) insightAcoustic.style.display = (selection.scale !== 'small') ? 'block' : 'none';

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
    if (stickyPriceEl) {
      stickyPriceEl.innerText = "Selecione os itens ao lado.";
      stickyPriceEl.classList.add('hint-mode');
    }
  } else {
    priceEl.innerText = globalFormattedPrice;
    priceEl.classList.remove('hint-mode');
    if (stickyPriceEl) {
      stickyPriceEl.innerText = globalFormattedPrice;
      stickyPriceEl.classList.remove('hint-mode');
    }
  }

  const msg = encodeURIComponent(`Olá! Realizei o dimensionamento técnico no simulador 432UP! e gostaria de validar o escopo:\n- Rider Base: ${selection.package.toUpperCase()}\n- Escala: ${selection.guestsText}\n- Horas: ${selection.hours}\n- Investimento Estimado: R$ ${finalTotal.toLocaleString('pt-BR', {minimumFractionDigits:0})}`);

  const targetWhatsappUrl = `https://wa.me/${calcFallbackWhatsapp}?text=${msg}`;
  const btnWhatsapp = document.getElementById('btn-whatsapp');
  const stickyBtnWhatsapp = document.getElementById('sticky-btn-whatsapp');
  if(btnWhatsapp) btnWhatsapp.href = targetWhatsappUrl;
  if(stickyBtnWhatsapp) stickyBtnWhatsapp.href = targetWhatsappUrl;
}

const btnSubmitGeneralContact = document.getElementById('btn-submit-general-contact');
if (btnSubmitGeneralContact) {
  btnSubmitGeneralContact.addEventListener('click', async () => {
    const name = document.getElementById('mod-name').value.trim();
    const contact = document.getElementById('mod-contact').value.trim();
    const msgText = document.getElementById('mod-msg').value;
    const errorMsg = document.getElementById('mod-contact-error');

    if (!name) {
      alert("Por favor, informe seu nome ou empresa.");
      document.getElementById('mod-name').focus();
      return;
    }

    if (!validateContact(contact)) {
      if(errorMsg) errorMsg.style.display = 'block';
      document.getElementById('mod-contact').focus();
      return;
    }
    if(errorMsg) errorMsg.style.display = 'none';

    if(typeof supabaseClient === 'undefined' || !supabaseClient) {
      alert("Ambiente de homologação detectado ou chaves do Supabase ausentes. Por favor, acione nosso WhatsApp.");
      return;
    }

    btnSubmitGeneralContact.innerText = "Registrando Solicitação...";
    btnSubmitGeneralContact.disabled = true;

    try {
      const { error } = await supabaseClient.from('leads_simulador').insert([{
        nome: name,
        whatsapp: contact,
        observacoes: msgText,
        rider: selection.package.toUpperCase(),
        escala: selection.guestsText,
        duracao: `${selection.hours} horas`,
        investimento_estimado: globalFormattedPrice,
        data_registro: new Date().toISOString()
      }]);
      if (error) throw error;

      alert("Solicitação registrada com sucesso! Nossa equipe entrará em contato em breve.");
      if(contactOverlay) contactOverlay.classList.remove('open');
      document.getElementById('mod-name').value = '';
      document.getElementById('mod-contact').value = '';
      document.getElementById('mod-msg').value = '';
    } catch(e) {
      alert("Erro técnico ao registrar contato. Se preferir, acione nosso WhatsApp.");
    } finally {
      btnSubmitGeneralContact.innerText = "Solicitar Ligação";
      btnSubmitGeneralContact.disabled = false;
    }
  });
}

const pdfTrigger = document.getElementById('btn-pdf-trigger');
if(pdfTrigger) {
  pdfTrigger.addEventListener('click', (e) => {
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
      margin:       15,
      filename:     `Proposta_Estrutural_432UP.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      element.style.display = 'none';
    }).catch(err => {
      element.style.display = 'none';
    });
  });
}

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
