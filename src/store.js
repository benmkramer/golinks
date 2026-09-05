export const api = globalThis.browser ?? globalThis.chrome;
const prefix = 'link:';

export async function readLinks() {
  const data = await api.storage.local.get(null);
  return Object.fromEntries(Object.entries(data)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => [key.slice(prefix.length), value]));
}

export async function saveLinks(links) {
  await api.storage.local.set(Object.fromEntries(Object.entries(links).map(([key, url]) => [prefix + key, url])));
}

export async function deleteLink(key) {
  await api.storage.local.remove(prefix + key);
}
