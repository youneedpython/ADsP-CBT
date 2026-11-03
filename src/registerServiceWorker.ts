export async function registerServiceWorker(production = import.meta.env.PROD && import.meta.env.MODE !== 'test') {
  if (!production || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch { /* Offline and unsupported registration must not interrupt studying. */ }
}
