import { api, readLinks } from './store.js';
import { normalizeKey, validateURL } from './core.js';

async function resolve() {
  const raw = decodeURIComponent(location.hash.slice(1));
  if (!raw) { location.replace(api.runtime.getURL('options.html')); return; }
  const key = normalizeKey(raw);
  const links = await readLinks();
  if (Object.hasOwn(links, key)) { location.replace(validateURL(links[key])); return; }
  document.querySelector('#title').textContent = `go/${key} is available`;
  document.querySelector('#message').textContent = 'This shortcut has no destination yet. Add one to make it yours.';
  const manage = document.querySelector('#manage');
  manage.textContent = `Create go/${key}`;
  manage.href = api.runtime.getURL(`options.html?key=${encodeURIComponent(key)}`);
}
resolve().catch(error => {
  document.querySelector('#title').textContent = 'Could not open this link';
  document.querySelector('#message').textContent = error.message;
});
