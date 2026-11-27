// INKBOT PRO — Service Worker con cache offline
const CACHE = 'inkbot-v21';
const ASSETS = [
  './',
  './index.html',
  './reels.js',
  './brain.js',
  './vendor/brain-learn.js',
  './vendor/supertonic/supertonic-es.js',
  './vendor/mp4box/mp4box.all.min.js',
  './vendor/piper/piper-tts-web.js',
  './vendor/piper/piper-o91UDS6e.js',
  './vendor/piper/voices_static-D_OtJDHM.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './icon-dark-192.png',
  './icon-dark-512.png',
  './icon-dark-maskable-192.png',
  './icon-dark-maskable-512.png',
  './manifest-pc2.json',
  './icon-pc2-32.png',
  './icon-pc2-192.png',
  './icon-pc2-512.png'
];

// Instala y precachea los archivos clave de la app
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
  );
});

// Limpia caches viejos al activar una versión nueva
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== 'inkbot-settings' && k.indexOf('inkbot-voz') !== 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Estrategia: cache-first para los assets propios, con fallback a red.
// Para navegaciones (recarga de la página), si no hay red devuelve index.html.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Manifest: usa el icono elegido en Ajustes (original o fondo negro)
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.endsWith('/manifest.json')) {
    e.respondWith(manifestConIcono(req));
    return;
  }

  // Otras apps del mismo sitio (Neural Brain, etc.): siempre de la red, sin guardarlas aquí
  if (url.origin === self.location.origin && url.pathname.indexOf(new URL(self.registration.scope).pathname) !== 0) return;

  // Modelos de voz: los descarga y guarda la propia app (no duplicar en este caché)
  if ((url.origin === self.location.origin && url.pathname.indexOf('/voz/') >= 0) || url.hostname === 'huggingface.co' || /(^|\.)hf\.co$/.test(url.hostname)) return;

  // Estudio: las llamadas a Google/Firebase (datos, login, Calendar, Drive) van directo a la red, sin caché
  if (/(^|\.)googleapis\.com$|(^|\.)firebaseapp\.com$|^accounts\.google\.com$|^apis\.google\.com$|(^|\.)firebaseio\.com$/.test(url.hostname)) return;

  // Librerías externas (SDK de Firebase, JSZip, fuentes): se guardan para que la app abra sin conexión
  if ((url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) || url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cachea en caliente las respuestas del mismo origen
          const copy = res.clone();
          if (res.ok && new URL(req.url).origin === self.location.origin) {
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'offline' });
        });
    })
  );
});

// Devuelve el manifest con los iconos según la elección guardada por la app
function manifestConIcono(req) {
  return caches.open('inkbot-settings')
    .then((c) => c.match('./__app-icon'))
    .then((r) => (r ? r.text() : 'original'))
    .catch(() => 'original')
    .then((choice) =>
      fetch(req).catch(() => caches.match('./manifest.json')).then((res) => res.json().then((m) => {
        if (choice === 'dark' && Array.isArray(m.icons)) {
          m.icons = m.icons.map((i) => Object.assign({}, i, { src: i.src.replace(/^(\.\/)?icon-/, '$1icon-dark-') }));
        }
        return new Response(JSON.stringify(m), { headers: { 'Content-Type': 'application/manifest+json' } });
      }))
    );
}
