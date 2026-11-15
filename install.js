const installButton = document.getElementById('installButton');
const installHelp = document.getElementById('installHelp');
let installPrompt = null;

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

if (isInstalled()) {
  installButton.hidden = true;
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
  installHelp.classList.remove('visible');
});

installButton.addEventListener('click', async () => {
  if (!installPrompt) {
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    installHelp.textContent = isIos
      ? 'In Safari, tap Share, then “Add to Home Screen.”'
      : 'In Chrome or Edge, open the browser menu and choose “Install Nova Drift” or “Install this site as an app.”';
    installHelp.classList.add('visible');
    return;
  }

  installButton.disabled = true;
  try {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
  } catch (error) {
    console.error('Could not open the app installation prompt.', error);
    installHelp.textContent = 'The install prompt could not open. Try the browser menu and select “Install Nova Drift.”';
    installHelp.classList.add('visible');
  } finally {
    installButton.disabled = false;
  }
});

if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch((error) => console.error('Could not register offline game support.', error));
  });
}
