import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';

export async function bootstrap(app: ReactNode, scope = import.meta.env.BASE_URL) {
  createRoot(document.getElementById('root')!).render(app);
  if (!('serviceWorker' in navigator)) {
    document.body.dataset.error = 'Service workers are needed for this static demo.';
    return;
  }

  try {
    const base = import.meta.env.BASE_URL;
    const registration = await navigator.serviceWorker.register(`${base}sw.js`, { scope });
    await navigator.serviceWorker.ready;
    if (registration.waiting) {
      registration.waiting.postMessage('SKIP_WAITING');
    }
    if (navigator.serviceWorker.controller !== registration.active) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (navigator.serviceWorker.controller !== registration.active) return;
          navigator.serviceWorker.removeEventListener('controllerchange', check);
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', check);
        check();
      });
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.0-RC.8/bundles/datastar.js';
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not start the live preview.'));
      document.head.append(script);
    });
  } catch (error) {
    document.body.dataset.error = error instanceof Error ? error.message : 'Unable to start the demo.';
  }
}
