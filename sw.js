/*
 * Mes papiers — service worker.
 *
 * Il fait deux choses :
 *
 * 1. Les rappels. Sur Android, une page n'a pas le droit d'afficher une
 *    notification elle-même : elle doit passer par lui. Quand le téléphone le
 *    permet (application installée sur Android), il vérifie aussi les
 *    échéances de temps en temps, application fermée.
 *
 * 2. Le fonctionnement hors ligne. Avec du réseau, chaque fichier de
 *    l'application est pris en ligne, donc toujours dans sa dernière version,
 *    et une copie en est gardée. Sans réseau (ou si le réseau ne répond pas
 *    dans les 4 secondes), c'est la copie qui sert.
 *
 * Il ne garde que les fichiers de l'application. Les papiers, eux, sont dans
 * IndexedDB (voir store.js) et n'ont jamais besoin du réseau.
 */
importScripts('store.js', 'reminders.js');

// Changer ce nom à chaque changement de fonctionnement du service worker :
// la nouvelle version efface alors les copies laissées par les anciennes.
const CACHE = 'mes-papiers-v2';
const NETWORK_TIMEOUT = 4000; // millisecondes

// Tout ce qu'il faut pour démarrer sans réseau.
const FILES = [
  './',
  'index.html',
  'style.css',
  'store.js',
  'reminders.js',
  'backup.js',
  'app.js',
  'manifest.webmanifest',
  'icon.svg',
  'fonts/fraunces.woff2',
  'fonts/fraunces-italic.woff2',
  'fonts/figtree.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/chevron.svg',
];

/* ---------- Hors ligne ---------- */

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Si la copie échoue (réseau coupé au mauvais moment), le service worker
  // s'installe quand même : les rappels en dépendent, et les fichiers seront
  // copiés au fil des visites.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))))
      .catch(() => {})
  );
});

// La nouvelle version prend la main tout de suite et supprime les copies
// des anciennes versions. S'il y en avait, les pages ouvertes peuvent
// afficher encore l'ancienne application (version d'avant le 12 novembre
// 2026) : celle-ci sait proposer « Une nouvelle version est prête », et le
// rechargement affiche la nouvelle. La nouvelle application, elle, ignore ce
// message : chargée avec du réseau, elle est forcément à jour.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const old = (await caches.keys()).filter((name) => name !== CACHE);
      await Promise.all(old.map((name) => caches.delete(name)));
      await self.clients.claim();
      if (old.length === 0) return;
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) client.postMessage({ type: 'update-available' });
    })()
  );
});

async function fromNetwork(key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
  try {
    return await fetch(key, { cache: 'no-cache', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function respond(key) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fromNetwork(key);
    if (fresh.ok) {
      await cache.put(key, fresh.clone());
      return fresh;
    }
    const cached = await cache.match(key);
    return cached || fresh;
  } catch (error) {
    // Pas de réseau, ou trop lent : la copie.
    const cached = await cache.match(key);
    if (cached) return cached;
    return new Response('Mes papiers : ce fichier demande une connexion.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // La copie est rangée sans ce qui suit le « ? » (par exemple « ?date=… »).
  event.respondWith(respond(url.origin + url.pathname));
});

/* ---------- Rappels ---------- */

// Vérification en arrière-plan, quand le navigateur veut bien la déclencher.
self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'rappels') return;
  event.waitUntil(
    Reminders.check((title, options) => self.registration.showNotification(title, options))
  );
});

// Ramène à l'application, sur le papier concerné s'il y en a un.
async function showPaper(id) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windows.length > 0) {
    const client = windows[0];
    try {
      await client.focus();
    } catch (error) {
      // Le navigateur a refusé de ramener la fenêtre devant : on lui demande
      // quand même d'ouvrir le papier.
    }
    if (id) client.postMessage({ type: 'open-paper', id });
    return;
  }
  await self.clients.openWindow(id ? './#papier=' + encodeURIComponent(id) : './');
}

// Toucher un rappel ouvre le papier.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(showPaper(event.notification.data && event.notification.data.id));
});
