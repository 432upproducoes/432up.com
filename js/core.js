/* ========== 432UP CORE v2.1.2 — 2026-07-25 ========== */

(function(){
  'use strict';

  function getCredentials() {
    var cfg = window.CONFIG_432UP || window.C || {};
    var url = (cfg.supabase && cfg.supabase.url) ? cfg.supabase.url : 'https://paetkspbfejtjjkngqej.supabase.co';
    var key = (cfg.supabase && cfg.supabase.key) ? cfg.supabase.key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
    return { url: url, key: key };
  }

  window.sbGet = async function(t, q) {
    var creds = getCredentials();
    try {
      // Anexa a apikey na URL para garantir autorização mesmo se o browser omitir os Request Headers
      var finalUrl = creds.url + '/rest/v1/' + t + '?' + q + '&apikey=' + creds.key;
      
      var r = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'apikey': creds.key,
          'Authorization': 'Bearer ' + creds.key,
          'Content-Type': 'application/json'
        }
      });

      if (!r.ok) return [];
      return await r.json();
    } catch (e) {
      console.error('[sbGet] Erro de rede em ' + t + ':', e);
      return [];
    }
  };

  window.loadVisualConfig = async function() {
    try {
      var rows = await window.sbGet('co_configuracoes', 'id=eq.1&select=*');
      if (!rows || rows.length === 0) {
        return { aurora_opacity: 0.6, fog_opacity: 0.4, valor: { tema_ativo: 'auto' } };
      }
      var row = rows[0];
      return {
        aurora_opacity: row.aurora_opacity ?? 0.6,
        fog_opacity: row.fog_opacity ?? 0.4,
        valor: typeof row.valor === 'string' ? JSON.parse(row.valor) : (row.valor || { tema_ativo: 'auto' })
      };
    } catch (e) {
      return { aurora_opacity: 0.6, fog_opacity: 0.4, valor: { tema_ativo: 'auto' } };
    }
  };

  console.log('[432UP] Core v2.1.2 inicializado.');
})();
