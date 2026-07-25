/* ========== 432UP CORE v2.1.1 — 2026-02-26 ========== */

(function(){
  'use strict';

  // Helper centralizador de credenciais para garantir que NUNCA saiam cabeçalhos vazios
  function getCredentials() {
    var cfg = window.CONFIG_432UP || window.C || {};
    var url = (cfg.supabase && cfg.supabase.url) ? cfg.supabase.url : 'https://paetkspbfejtjjkngqej.supabase.co';
    var key = (cfg.supabase && cfg.supabase.key) ? cfg.supabase.key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
    return { url: url, key: key };
  }

  // Função sbGet global corrigida
  window.sbGet = async function(t, q) {
    var creds = getCredentials();
    try {
      var r = await fetch(creds.url + '/rest/v1/' + t + '?' + q, {
        method: 'GET',
        headers: {
          'apikey': creds.key,
          'Authorization': 'Bearer ' + creds.key,
          'Content-Type': 'application/json'
        }
      });

      if (!r.ok) {
        console.warn('[sbGet] Status ' + r.status + ' para tabela:', t);
        return [];
      }

      return await r.json();
    } catch (e) {
      console.error('[sbGet] Erro de rede na tabela ' + t + ':', e);
      return [];
    }
  };

  // Carregamento de Configurações Visuais sem travar caso o banco retorne vazio
  window.loadVisualConfig = async function() {
    try {
      var rows = await window.sbGet('co_configuracoes', 'id=eq.1&select=*');
      
      if (!rows || rows.length === 0) {
        console.warn('[Core] Nenhuma linha encontrada em co_configuracoes (ID 1). Usando fallback.');
        return {
          aurora_opacity: 0.6,
          fog_opacity: 0.4,
          valor: {}
        };
      }

      var row = rows[0];
      return {
        aurora_opacity: row.aurora_opacity ?? 0.6,
        fog_opacity: row.fog_opacity ?? 0.4,
        valor: typeof row.valor === 'string' ? JSON.parse(row.valor) : (row.valor || {})
      };
    } catch (e) {
      console.error('[Core] Erro ao carregar configurações visuais:', e);
      return { aurora_opacity: 0.6, fog_opacity: 0.4, valor: {} };
    }
  };

  console.log('[432UP] Core v2.1.1 inicializado com headers de segurança.');
})();
