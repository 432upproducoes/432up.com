/* 432UP Partner · service worker (push + bolinha no ícone + instalação no Chrome)
   Subir em: https://www.432up.com/B2B/sw.js */

var ICON = '/imagens/logo512x512.png';
var URL_EMAIL = '/B2B/e-mail.html';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

/* O Chrome exige um handler de fetch para oferecer "Instalar app".
   Tudo vai direto para a rede, sem cache, para não mostrar e-mail desatualizado. */
self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request));
});

/* O iOS exige mostrar uma notificação a cada push (push silencioso é revogado) */
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }

  var count = typeof data.count === 'number' ? data.count : null;
  var tarefas = [
    self.registration.showNotification(data.title || 'Novo e-mail', {
      body: data.body || '',
      icon: ICON,
      badge: ICON,
      tag: data.tag || 'novo-email',
      renotify: true,
      data: { url: data.url || URL_EMAIL }
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

/* Toque na notificação: abre (ou volta para) o app na caixa de e-mail */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var alvo = new URL((event.notification.data && event.notification.data.url) || URL_EMAIL, self.location.origin).href;

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
