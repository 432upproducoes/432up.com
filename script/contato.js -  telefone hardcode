(function () {
  var numero = '5511948564577';
  window.CONTATO_WHATSAPP = numero;
  function aplicar(a) {
    var h = a.getAttribute('href') || '';
    if (h.indexOf('wa.me/') === -1) return;
    a.setAttribute('href', h.replace(/wa\.me\/\d*/, 'wa.me/' + numero));
  }
  function aplicarTodos() {
    document.querySelectorAll('a[href*="wa.me/"]').forEach(aplicar);
  }
  aplicarTodos();
  document.addEventListener('DOMContentLoaded', aplicarTodos);
  // Links criados depois (ex.: modais montados por JS) são corrigidos no clique
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me/"]');
    if (!a) return;
    aplicar(a);
  }, true);
})();
