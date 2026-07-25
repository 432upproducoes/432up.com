/* ========== layers.js · 432UP · v2.1.0 · 2026-02-26 ========== */
/* Visual layers: aurora, fog, algae, orbs, particles */
/* Extraído cirurgicamente da index v3.8.2 */
/* Depende de config.js (CFG.LAYERS, CFG.BPM) */

var LAYERS = (function () {
  'use strict';

  var isMobile = window.innerWidth < 768;

  /* ── Contagens conforme config ── */
  function count(type) {
    var c = CFG.LAYERS[type];
    if (!c) return 0;
    return isMobile ? c.MOBILE : c.DESKTOP;
  }

  /* ── Gerar algae ── */
  function initAlgae() {
    var container = document.getElementById('algaeLayer');
    if (!container) return;
    var n = count('ALGAE');
    for (var i = 0; i < n; i++) {
      var el = document.createElement('div');
      el.className = 'algae';
      el.style.left = Math.random() * 100 + '%';
      el.style.top = Math.random() * 100 + '%';
      el.style.animationDelay = (Math.random() * 8) + 's';
      el.style.animationDuration = (6 + Math.random() * 10) + 's';
      el.style.width = el.style.height = (2 + Math.random() * 4) + 'px';
      el.style.opacity = (0.15 + Math.random() * 0.35).toFixed(2);
      container.appendChild(el);
    }
  }

  /* ── Gerar orbs ── */
  function initOrbs() {
    var container = document.getElementById('orbLayer');
    if (!container) return;
    var n = count('ORBS');
    for (var i = 0; i < n; i++) {
      var el = document.createElement('div');
      el.className = 'orb';
      el.style.left = Math.random() * 100 + '%';
      el.style.top = Math.random() * 100 + '%';
      el.style.animationDelay = (Math.random() * 6) + 's';
      el.style.animationDuration = (10 + Math.random() * 15) + 's';
      var size = (30 + Math.random() * 80);
      el.style.width = el.style.height = size + 'px';
      el.style.opacity = (0.03 + Math.random() * 0.08).toFixed(2);
      container.appendChild(el);
    }
  }

  /* ── Gerar particles ── */
  function initParticles() {
    var container = document.getElementById('particleLayer');
    if (!container) return;
    var n = count('PARTICLES');
    for (var i = 0; i < n; i++) {
      var el = document.createElement('div');
      el.className = 'particle';
      el.style.left = Math.random() * 100 + '%';
      el.style.top = Math.random() * 100 + '%';
      el.style.animationDelay = (Math.random() * 10) + 's';
      el.style.animationDuration = (8 + Math.random() * 12) + 's';
      el.style.width = el.style.height = (1 + Math.random() * 2) + 'px';
      el.style.opacity = (0.2 + Math.random() * 0.4).toFixed(2);
      container.appendChild(el);
    }
  }

  /* ── Init todas as layers ── */
  function init() {
    /* Aurora e fog são puro CSS (já existem no HTML), não precisam de JS */
    initAlgae();
    initOrbs();
    initParticles();
    console.log('[432] Layers init: algae=' + count('ALGAE') + ' orbs=' + count('ORBS') + ' particles=' + count('PARTICLES') + ' (mobile=' + isMobile + ')');
  }

  return { init: init };
})();
