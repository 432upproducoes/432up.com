/* ========== 432UP CONFIG v2.1 — 2026-02-26 ========== */
/* ÚNICO LUGAR COM CREDENCIAIS E DADOS GLOBAIS */

(function(){
  'use strict';

  /* Guarda: evita re-execução se o arquivo for carregado mais de uma vez */
  if (window.CONFIG_432UP && window.CONFIG_432UP.version === 'v2.1') {
    console.log('[432UP] Config v2.1 já carregado — ignorando duplicata');
    return;
  }

 window.CONFIG_432UP = {
    version: 'v2.1',

    /* SUPABASE */
    supabase: {
      url: 'https://www.432up.com/supabase-api',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA'
    },



    /* STORAGE */
    storage: {
      bucket: '432up_galeria'
    },

    /* CONTATOS (carregados do banco) */
    contatos: {
      whatsapp:  null,
      instagram: null,
      email:     null
    },

    /* FALLBACK (se banco falhar) */
    fallback: {
      whatsapp:  '5511948564577',
      instagram: '@432up.producoes',
      email:     'contato@432up.com'
    },

    /* DEVICE */
    isMobile: /iPad|iPhone|Android/i.test(navigator.userAgent),

    /* PARTICLES COUNT */
    particles: {
      algae:     function(){ return CONFIG_432UP.isMobile ? 50  : 90;  },
      orbs:      function(){ return CONFIG_432UP.isMobile ? 12  : 22;  },
      particles: function(){ return CONFIG_432UP.isMobile ? 60  : 120; }
    },

    /* HELPERS */
    $:  function(s){ return document.querySelector(s);  },

    $$: function(s){ return document.querySelectorAll(s); }
  };

  /* ALIAS GLOBAL */
  window.C = window.CONFIG_432UP;

  console.log('[432UP] Config v2.1 carregado');

})();
