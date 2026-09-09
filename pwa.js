/* PWA: registrazione service worker + prompt di installazione */
  (function () {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function (err) {
          console.warn('Service worker non registrato:', err);
        });
      });
    }

    var installBtn = document.getElementById('installBtn');
    var deferredPrompt = null;
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (!isStandalone) installBtn.classList.add('show');
    });

    installBtn.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
        installBtn.classList.remove('show');
      });
    });

    window.addEventListener('appinstalled', function () {
      installBtn.classList.remove('show');
    });
  })();
