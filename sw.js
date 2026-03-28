// FLUX Service Worker v2.0
const CACHE = 'flux-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans+KR:wght@300;400;700&display=swap'
];

// 설치 — 핵심 파일 캐시 + 즉시 활성화
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 활성화 — 구버전 캐시 전부 제거
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 요청 처리
// - index.html : 네트워크 우선 (항상 최신 버전)
// - 나머지     : 캐시 우선 (빠른 로딩)
self.addEventListener('fetch', e => {
  if (e.request.url.startsWith('ws://') || e.request.url.startsWith('wss://')) return;
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isHtml = url.pathname === '/' || url.pathname.endsWith('.html');

  if (isHtml) {
    // 네트워크 우선 → 실패 시 캐시 폴백
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // 캐시 우선 → 없으면 네트워크
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
  }
});
