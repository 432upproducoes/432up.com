/* 432UP Cliente · service worker (push de avisos da área do cliente)
   Subir em: https://www.432up.com/cliente/sw.js
   ATENÇÃO: se esse arquivo já existe no servidor, NÃO sobrescreva — confira o que ele faz primeiro. */

var ICON = 'https://www.432up.com/imagens/logo512x512.png';
var URL_CLIENTE = '/cliente/index.html?notif=1';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

/* O iOS exige mostrar uma notificação a cada push (push silencioso é revogado) */
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }

  var count = typeof data.count === 'number' ? data.count : null;
  var tarefas = [
    self.registration.showNotification(data.title || 'Aviso 432UP', {
      body: data.body || '',
      icon: ICON,
      badge: ICON,
      tag: data.tag || 'aviso-cliente',
      renotify: true,
      data: { url: data.url || URL_CLIENTE }
    })
  ];

  if (count !== null && self.navigator) {
    if (count > 0 && self.navigator.setAppBadge) tarefas.push(self.navigator.setAppBadge(count));
    else if (count <= 0 && self.navigator.clearAppBadge) tarefas.push(self.navigator.clearAppBadge());
  }

  event.waitUntil(Promise.all(tarefas.map(function (t) {
    return Promise.resolve(t).catch(function () {});
  })));
});

/* Toque na notificação: volta para o app na área do cliente */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var alvo = new URL((event.notification.data && event.notification.data.url) || URL_CLIENTE, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.url.indexOf(self.location.origin) === 0 && 'focus' in c) {
          return c.focus().then(function (w) {
            return (w && 'navigate' in w) ? w.navigate(alvo).catch(function () {}) : null;
          });
        }
      }
      return self.clients.openWindow(alvo);
    })
  );
});
