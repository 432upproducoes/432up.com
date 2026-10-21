/**
 * AVISO DE INSTALAÇÃO DO APP — 432UP! (site público)
 * Incluir em todas as páginas públicas, antes do </body>:
 *   <script src="/script/instalar-app.js" defer></script>
 * Não altera nenhum outro arquivo.
 */
(function () {
  'use strict';

  var CHAVE_FECHADO = '432up_instalar_fechado_em';
  var CHAVE_INSTALADO = '432up_app_instalado';
  var ESPERA_MS = 5 * 60 * 1000;

  function ehStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true;
  }
  function ehIOS() {
    var ua = window.navigator.userAgent || '';
    return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  }
  function fechadoRecente() {
    try {
      var t = parseInt(sessionStorage.getItem(CHAVE_FECHADO), 10);
      return !!t && (Date.now() - t) < ESPERA_MS;
    } catch (e) { return false; }
  }
  function marcarFechado() {
    try { sessionStorage.setItem(CHAVE_FECHADO, String(Date.now())); } catch (e) {}
  }
  function appJaInstalado() {
    try { return localStorage.getItem(CHAVE_INSTALADO) === '1'; } catch (e) { return false; }
  }

  if (ehStandalone()) return;

  window.addEventListener('appinstalled', function () {
    try { localStorage.setItem(CHAVE_INSTALADO, '1'); } catch (e) {}
    fechar();
  });

  var css = '' +
    '#inst-app{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483100;' +
    'width:min(92vw,420px);padding:14px 16px;border-radius:16px;' +
    'background:rgba(10,15,22,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
    'border:1px solid rgba(255,255,255,.14);color:#e8eef5;font:14px/1.4 system-ui,-apple-system,sans-serif;' +
    'box-shadow:0 10px 30px rgba(0,0,0,.35);opacity:0;transition:opacity .35s ease}' +
    '#inst-app.on{opacity:1}' +
    '#inst-app h4{margin:0 0 4px;font-size:15px;font-weight:600}' +
    '#inst-app p{margin:0 0 10px;opacity:.85}' +
    '#inst-app ol{margin:0 0 10px;padding-left:18px;opacity:.9}' +
    '#inst-app .inst-btns{display:flex;gap:8px;justify-content:flex-end}' +
    '#inst-app button{cursor:pointer;border-radius:10px;padding:8px 14px;font:inherit;border:1px solid rgba(255,255,255,.2)}' +
    '#inst-app .inst-ok{background:#22d3ee;color:#0a0f16;border-color:transparent;font-weight:600}' +
    '#inst-app .inst-x{background:transparent;color:#e8eef5}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var box = null;
  var promptDiferido = null;

  function criarBox(titulo, corpoHTML, botaoInstalar) {
    box = document.createElement('div');
    box.id = 'inst-app';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', titulo);
    box.innerHTML = '<h4>' + titulo + '</h4>' + corpoHTML +
      '<div class="inst-btns">' +
      (botaoInstalar ? '<button type="button" class="inst-ok">Instalar</button>' : '') +
      '<button type="button" class="inst-x">Agora não</button></div>';
    document.body.appendChild(box);
    box.querySelector('.inst-x').addEventListener('click', fechar);
    if (botaoInstalar) box.querySelector('.inst-ok').addEventListener('click', instalarAndroid);
    requestAnimationFrame(function () { box.classList.add('on'); });
  }

  function fechar() {
    marcarFechado();
    if (box) {
      box.classList.remove('on');
      var b = box; box = null;
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
    }
  }

  function instalarAndroid() {
    if (!promptDiferido) return;
    promptDiferido.prompt();
    promptDiferido.userChoice.then(function () {
      promptDiferido = null;
      fechar();
    });
  }

  /* Android / Chrome: botão Instalar */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    promptDiferido = e;
    if (appJaInstalado() || fechadoRecente()) return;
    setTimeout(function () {
      if (!box && !fechadoRecente()) {
        criarBox('Instale o app 432UP!',
          '<p>Receba o acompanhamento do seu evento em tempo real, direto no celular.</p>', true);
      }
    }, 0);
  });

  /* iPhone / iPad: instruções rápidas (iOS não tem botão de instalação) */
  if (ehIOS() && !appJaInstalado() && !fechadoRecente()) {
    criarBox('Instale o app 432UP!',
      '<p>Acompanhe seu evento em tempo real:</p>' +
      '<ol><li>Toque no ícone <b>Compartilhar</b> (quadrado com seta)</li>' +
      '<li>Role e toque em <b>Adicionar à Tela de Início</b></li>' +
      '<li>Toque em <b>Adicionar</b></li></ol>', false);
  }

  /* Já instalado: lembrete para acessar pelo app */
  if (appJaInstalado() && !fechadoRecente()) {
    criarBox('Acesse pelo seu app',
      '<p>Para uma experiência melhor, abra o 432UP! pelo aplicativo instalado.</p>', false);
  }
})();
