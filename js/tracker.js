/* ========== 432UP TRACKER v7.3 — COM SUPABASE STATS ========== */

(function () {
  'use strict';

  var C = window.CONFIG_432UP || window.C || {};
  var SB_URL = (C.supabase && C.supabase.url) ? C.supabase.url : 'https://paetkspbfejtjjkngqej.supabase.co';
  var SB_KEY = (C.supabase && C.supabase.key) ? C.supabase.key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';

  // Função global de fechar menu para segurança da UI
  window.closeNav = function () {
    var nav = document.querySelector('.nav') || document.querySelector('#navMenu');
    if (nav) {
      nav.classList.remove('active', 'open');
    }
  };

  // Envia eventos diretamente para a API REST do Supabase (para alimentar os Stats)
  function sendStats(tabela, payload) {
    try {
      var url = SB_URL + '/rest/v1/' + tabela + '?apikey=' + SB_KEY;
      
      fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      }).catch(function(err){
        // Silencia falhas de rede isoladas para não travar a navegação do usuário
      });
    } catch (e) {}
  }

  // Captura de cliques em tempo real
  document.addEventListener('click', function (e) {
    var target = e.target.closest('a, button, .btn, .filtro-chip, .btn-simule');
    if (target) {
      var label = target.innerText || target.getAttribute('title') || target.getAttribute('aria-label') || 'elemento';
      var secao = target.closest('section[id]') ? target.closest('section[id]').id : 'geral';

      sendStats('co_tracker_cliques', {
        elemento: label.trim().substring(0, 100),
        secao: secao,
        url: window.location.pathname,
        created_at: new Date().toISOString()
      });
    }
  });

  // Observador de visibilidade de seções
  function initTracker() {
    var sections = document.querySelectorAll('section[id], footer[id]');
    if (!sections.length) return;

    console.log('[TRACKER v7.3] Captura de Stats ativa para ' + sections.length + ' seções');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          sendStats('co_tracker_visibilidade', {
            secao: entry.target.id,
            url: window.location.pathname,
            created_at: new Date().toISOString()
          });
        }
      });
    }, { threshold: 0.4 });

    sections.forEach(function (sec) {
      observer.observe(sec);
    });
  }

  document.addEventListener('DOMContentLoaded', initTracker);

})();
