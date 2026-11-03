/** Pulls screenshots the service worker stashed from the Android share sheet. */
export async function takeSharedScreenshots() {
  if (!('caches' in window)) return []
  try {
    const cache = await caches.open('shared-screenshots')
    const keys = (await cache.keys()).sort((a, b) => a.url.localeCompare(b.url))
    const files = []
    for (const req of keys) {
      const res = await cache.match(req)
      if (res) {
        const blob = await res.blob()
        files.push(new File([blob], `screenshot-${files.length + 1}.png`, { type: blob.type || 'image/png' }))
      }
      await cache.delete(req)
    }
    return files
  } catch (err) {
    console.error('Could not read shared screenshots', err)
    return []
  }
}
