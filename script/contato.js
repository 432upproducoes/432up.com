(function () {
  var SB_URL = 'https://paetkspbfejtjjkngqej.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
  var numero = '';

  var promessa = fetch(SB_URL + '/rest/v1/co_dados_contato_empresa?select=whatsapp&limit=1', {
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
  })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      var dig = String((d && d[0] && d[0].whatsapp) || '').replace(/\D/g, '');
      if (dig && dig.indexOf('55') !== 0 && dig.length <= 11) dig = '55' + dig;
      numero = dig;
      window.CONTATO_WHATSAPP = dig;
      return dig;
    })
    .catch(function (e) { console.error('contato.js:', e); return ''; });

  function aplicar(a) {
    if (!numero) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('wa.me/') === -1) return;
    a.setAttribute('href', h.replace(/wa\.me\/\d*/, 'wa.me/' + numero));
  }

  function aplicarTodos() {
    document.querySelectorAll('a[href*="wa.me/"]').forEach(aplicar);
  }

  promessa.then(aplicarTodos);
  document.addEventListener('DOMContentLoaded', aplicarTodos);

  // Links criados depois (ex.: modais montados por JS) são corrigidos no clique
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me/"]');
    if (!a) return;
    if (numero) { aplicar(a); return; }
    e.preventDefault();
    var alvo = a.getAttribute('href');
    promessa.then(function (n) {
      if (!n) return;
      window.open(alvo.replace(/wa\.me\/\d*/, 'wa.me/' + n), '_blank');
    });
  }, true);
})();
