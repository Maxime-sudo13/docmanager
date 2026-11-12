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
 * 2. Le fonctionnement hors ligne. Il garde une copie des fichiers de
 *    l'application et la sert aussitôt, même sans réseau. En parallèle il
 *    redemande chaque fichier au serveur : si une version plus récente
 *    existe, elle remplace la copie et l'application propose de recharger.
 *
 * Il ne garde que les fichiers de l'application. Les papiers, eux, sont dans
 * IndexedDB (voir store.js) et n'ont jamais besoin du réseau.
 */
importScripts('store.js', 'reminders.js');

const CACHE = 'mes-papiers';

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

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function sameContent(a, b) {
  const [first, second] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
  if (first.byteLength !== second.byteLength) return false;
  const x = new Uint8Array(first);
  const y = new Uint8Array(second);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

async function announceUpdate() {
  const windows = await self.clients.matchAll({ type: 'window' });
  for (const client of windows) client.postMessage({ type: 'update-available' });
}

// Redemande le fichier au serveur et met la copie à jour. Renvoie la réponse
// du serveur, ou null sans réseau.
async function refresh(cache, key, cached) {
  let fresh;
  try {
    fresh = await fetch(key, { cache: 'no-cache' });
  } catch (error) {
    return null;
  }
  if (!fresh.ok) return fresh;
  const changed = cached ? !(await sameContent(cached, fresh.clone())) : false;
  await cache.put(key, fresh.clone());
  if (changed) await announceUpdate();
  return fresh;
}

async function respond(event, key) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(key);
  // La copie servie à la page est lue par elle : la comparaison avec la
  // version du serveur se fait sur un double, pris avant.
  const update = refresh(cache, key, cached ? cached.clone() : null);
  event.waitUntil(update.catch(() => {}));
  if (cached) return cached;
  const fresh = await update;
  return (
    fresh ||
    new Response('Mes papiers : ce fichier demande une connexion.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // La copie est rangée sans ce qui suit le « ? » (par exemple « ?date=… »).
  event.respondWith(respond(event, url.origin + url.pathname));
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
