// CME Conteúdo — Service Worker v1.0
const CACHE_NAME = 'cme-conteudo-v1';

// Arquivos para cache offline (UI sempre disponível)
const CACHE_FILES = [
  '.',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Nunito:wght@400;500;600;700;800&display=swap'
];

// Install: cache shell do app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve do cache para arquivos locais; rede para API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Chamadas à API Anthropic: sempre via rede
  if (url.hostname === 'api.anthropic.com') {
    return; // deixa passar direto
  }

  // Google Fonts: rede first, cache fallback
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Arquivos locais: cache first, rede fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
