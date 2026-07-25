/* ========== 432UP INDEX v2.1.3 — 2026-07-25 ========== */

(function () {
  'use strict';

  // Declara openCalc globalmente para evitar o erro do botão "Simule"
  window.openCalc = function () {
    var modal = document.querySelector('#calcModal') || document.querySelector('#simuladorModal');
    if (modal) {
      modal.classList.add('active', 'open');
      modal.style.display = 'block';
    } else {
      window.location.href = 'calculadora.html';
    }
  };

  function getSbCredentials() {
    var cfg = window.CONFIG_432UP || window.C || {};
    var url = (cfg.supabase && cfg.supabase.url) ? cfg.supabase.url : 'https://paetkspbfejtjjkngqej.supabase.co';
    var key = (cfg.supabase && cfg.supabase.key) ? cfg.supabase.key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
    return { url: url, key: key };
  }

  async function sbGetIndex(t, q) {
    var creds = getSbCredentials();
    try {
      var finalUrl = creds.url + '/rest/v1/' + t + '?' + q + '&apikey=' + creds.key;
      var r = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'apikey': creds.key,
          'Authorization': 'Bearer ' + creds.key
        }
      });
      if (!r.ok) return [];
      return await r.json();
    } catch (e) {
      return [];
    }
  }

  function renderHero(secMap) {
    var heroTitle = document.querySelector('#heroTitle');
    var heroSub = document.querySelector('#heroSub');
    if (!heroTitle) return;

    if (secMap && secMap.hero && secMap.hero.titulo) {
      heroTitle.textContent = secMap.hero.titulo;
      if (heroSub) heroSub.textContent = secMap.hero.subtitulo || '';
    } else {
      heroTitle.textContent = 'Sua festa, na frequência perfeita.';
      if (heroSub) heroSub.textContent = 'Sonorização, iluminação e DJ profissional para tornar seu evento inesquecível.';
    }
  }

  async function loadAll() {
    try {
      var secoes = await sbGetIndex('co_secoes', 'select=*&order=ordem');
      var secMap = {};
      if (Array.isArray(secoes)) {
        secoes.forEach(function (s) {
          if (s.chave) secMap[s.chave] = s;
        });
      }
      renderHero(secMap);
    } catch (err) {
      renderHero(null);
    }
  }

  function applyTheme() {
    try {
      var hour = new Date().getHours();
      var isDayTime = hour >= 6 && hour < 18;
      if (isDayTime) {
        document.documentElement.classList.add('theme-day');
        document.documentElement.classList.remove('theme-night');
      } else {
        document.documentElement.classList.add('theme-night');
        document.documentElement.classList.remove('theme-day');
      }
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme();
    loadAll();
  });

})();
