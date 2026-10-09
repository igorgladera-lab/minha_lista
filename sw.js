// ============================================================
// sw.js — Service Worker do Minha Lista
// Versão: 1.0
// ============================================================
//
// Objetivo:
//   - Permitir instalação como PWA no Chrome Android
//     (o Chrome exige um Service Worker com fetch handler)
//   - Dar suporte básico a carregamento offline dos recursos
//     estáticos (ícones e manifest)
//
// Estratégia:
//   - Navegação (HTML): rede primeiro, cache como fallback.
//   - Recursos estáticos: cache primeiro, rede como fallback.
//   - Não guarda nada de outros origins.
// ============================================================

const CACHE = 'minha-lista-v1';
const ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        ASSETS.map((url) =>
          cache.add(url).catch(() => {
            // ignora falhas individuais (ex: ícone ausente)
          })
        )
      )
    )
  );
});

// ---------- ACTIVATE ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---------- FETCH ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML): rede primeiro
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Recursos estáticos: cache primeiro
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});