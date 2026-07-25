/* ========== tracker.js ========== */
(function() {
  var SB_URL = 'https://paetkspbfejtjjkngqej.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';

  function sendToSupabase(endpoint, payload) {
    try {
      fetch(SB_URL + '/rest/v1/' + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function(err) {
        console.error('[Tracker Erro]', err);
      });
    } catch(e) {
      console.error('[Tracker Catch]', e);
    }
  }

  // Monitora Cliques
  document.addEventListener('click', function(e) {
    var target = e.target.closest('a, button, .btn, .chip, [data-track]');
    if (!target) return;

    var payload = {
      label: target.innerText.trim().substring(0, 100) || target.id || 'sem_nome',
      secao: target.closest('section')?.id || 'geral',
      url: window.location.pathname,
      created_at: new Date().toISOString()
    };

    sendToSupabase('cliques', payload);
  }, true);

  // Monitora Conversões (WhatsApp / Formulários)
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === '432up-open-wa') {
      sendToSupabase('conversoes', {
        tipo: 'whatsapp',
        url: window.location.pathname,
        created_at: new Date().toISOString()
      });
    }
  });
})();
