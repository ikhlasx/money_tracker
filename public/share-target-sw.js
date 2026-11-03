// Imported into the Workbox service worker (see vite.config.js).
// Receives screenshots shared from other apps (Android share sheet → MoneyTracker),
// stashes them in Cache Storage, and opens the app, which picks them up.

const SHARE_CACHE = 'shared-screenshots'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return

  event.respondWith((async () => {
    try {
      const formData = await event.request.formData()
      const files = formData.getAll('screenshots').filter((f) => f && typeof f === 'object' && f.size > 0)
      const cache = await caches.open(SHARE_CACHE)
      for (const key of await cache.keys()) await cache.delete(key)
      const stamp = Date.now()
      await Promise.all(files.map((file, i) =>
        cache.put(
          `/__shared/${stamp}-${String(i).padStart(3, '0')}`,
          new Response(file, { headers: { 'Content-Type': file.type || 'image/png' } })
        )
      ))
    } catch (err) {
      console.error('Share target failed', err)
    }
    return Response.redirect('/?share-target=1', 303)
  })())
})
