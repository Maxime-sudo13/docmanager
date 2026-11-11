/*
 * Mes papiers — service worker.
 *
 * Étape 4 : il sert à afficher les rappels. Sur Android, une page n'a pas le
 * droit d'afficher une notification elle-même : elle doit passer par lui.
 * Quand le téléphone le permet (application installée sur Android), il
 * vérifie aussi les échéances de temps en temps, application fermée.
 *
 * L'étape 5 lui ajoutera le fonctionnement hors ligne.
 */
importScripts('store.js', 'reminders.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
