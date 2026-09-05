export const GO_HOSTS = { origins: ['http://go/*', 'https://go/*'] };

// No storage writes: browser grants are the sole source of permission readiness.
export function setupPermissions(permissions, { panel, button, message, ready }) {
  let granted = false;
  let checking = true;
  let requesting = false;
  let revision = 0;
  let disposed = false;

  function render(text) {
    panel.hidden = granted;
    ready.hidden = !granted;
    button.disabled = checking || requesting || granted;
    if (text !== undefined) message.textContent = text;
  }

  async function refresh(note = '') {
    const current = ++revision;
    try {
      const result = await permissions.contains(GO_HOSTS);
      if (disposed || current !== revision) return;
      granted = result;
      checking = false;
      render(note || 'Access to both go hosts is needed for redirects. You can keep managing shortcuts while access is disabled.');
    } catch (error) {
      if (disposed || current !== revision) return;
      granted = false;
      checking = false;
      render(`Could not check redirect permissions: ${error.message}. Try Enable Go Links again.`);
    }
  }

  function onClick() {
    if (granted || checking || requesting) return;
    requesting = true;
    render('Waiting for your browser’s permission decision…');
    let request;
    try {
      // Invoke synchronously in the click handler. Awaiting contains() here
      // would lose the user gesture required by Firefox.
      request = permissions.request(GO_HOSTS);
    } catch (error) {
      request = Promise.reject(error);
    }
    Promise.resolve(request).then(
      allowed => refresh(allowed ? 'The browser has not granted both go hosts yet. Try Enable Go Links again.' : 'Permission was not granted. Redirects remain disabled; your shortcuts are still available to edit. You can try again.'),
      error => refresh(`Could not enable redirect permissions: ${error.message}. You can try again.`)
    ).finally(() => {
      requesting = false;
      if (!disposed) render();
    });
  }

  function onChange() { void refresh(); }
  button.addEventListener('click', onClick);
  permissions.onAdded.addListener(onChange);
  permissions.onRemoved.addListener(onChange);
  render('Checking redirect permissions…');
  const initialized = refresh();
  return {
    initialized,
    refresh,
    dispose() {
      disposed = true;
      ++revision;
      button.removeEventListener('click', onClick);
      permissions.onAdded.removeListener(onChange);
      permissions.onRemoved.removeListener(onChange);
    }
  };
}
