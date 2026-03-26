// FLUX Service Worker v1.0
const CACHE = 'flux-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans+KR:wght@300;400;700&display=swap'
];

// 설치 — 핵심 파일 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 활성화 — 구버전 캐시 제거
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 요청 처리 — 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', e => {
  // WebSocket은 SW가 처리하지 않음
  if (e.request.url.startsWith('ws://') || e.request.url.startsWith('wss://')) return;
  // POST 등 mutation 요청도 패스
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // 성공한 응답만 캐시
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => {
        // 오프라인 + 캐시 없음 → 메인 페이지로 폴백
        if (e.request.destination === 'document') {
          return caches.match('/index.html') || caches.match('/');
        }
      });
    })
  );
});
