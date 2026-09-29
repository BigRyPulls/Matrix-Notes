/** Register SW only in production builds (secure context). Never block boot. */
export function registerPwa(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          void updateSW(true);
        },
        onOfflineReady() {
          console.info('[MatrixNotes] Offline ready');
        },
        onRegisteredSW(swUrl, reg) {
          console.info('[MatrixNotes] SW registered', swUrl);
          if (reg) {
            window.setInterval(() => {
              void reg.update();
            }, 60 * 60 * 1000);
          }
        },
        onRegisterError(error) {
          console.warn('[MatrixNotes] SW register failed', error);
        },
      });
    })
    .catch((err) => {
      console.warn('[MatrixNotes] PWA module unavailable', err);
    });
}
