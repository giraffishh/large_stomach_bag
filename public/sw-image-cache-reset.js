// Keep verifiable successes; opaque responses may contain cached HTTP errors.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all(
      ['restaurant-images-s3', 'restaurant-images-backup-cdn', 'images-generic'].map(
        async (name) => {
          if (!(await caches.has(name))) return
          const oldCache = await caches.open(name)
          const newCache = await caches.open(`${name}-v2`)
          for (const request of await oldCache.keys()) {
            const response = await oldCache.match(request)
            if (response?.status === 200 && !(await newCache.match(request))) {
              await newCache.put(request, response)
            }
          }
          await caches.delete(name)
        },
      ),
    ),
  )
})
