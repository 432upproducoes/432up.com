/* ========== 432UP TRACKER v7.2 — CORRIGIDO ========== */

(function () {
  'use strict';

  // Função global de fechar menu declarada para evitar o erro Can't find variable: closeNav
  window.closeNav = function () {
    var nav = document.querySelector('.nav') || document.querySelector('#navMenu');
    if (nav) {
      nav.classList.remove('active', 'open');
    }
  };

  // Silencia envios POST para o servidor que retornavam erro 405
  function sendAnalytics(endpoint, payload) {
    // Log apenas local para debug no console, sem disparar requisições HTTP POST com erro 405
    if (window.location.hostname === 'localhost') {
      console.log('[TRACKER Local]', endpoint, payload);
    }
  }

  // Observador de seções ativas
  function initTracker() {
    var sections = document.querySelectorAll('section[id], footer[id]');
    if (!sections.length) return;

    console.log('[TRACKER v7.2] Observando ' + sections.length + ' seções');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          sendAnalytics('visibilidade', { secao: entry.target.id });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(function (sec) {
      observer.observe(sec);
    });
  }

  // Captura de cliques seguros
  document.addEventListener('click', function (e) {
    var target = e.target.closest('a, button, .btn');
    if (target) {
      var label = target.innerText || target.getAttribute('title') || 'elemento';
      sendAnalytics('cliques', { label: label.trim() });
    }
  });

  document.addEventListener('DOMContentLoaded', initTracker);

})();
