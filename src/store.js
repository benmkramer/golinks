export const api = globalThis.browser ?? globalThis.chrome;
const prefix = 'link:';
const usagePrefix = 'usage:';

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
  await api.storage.local.remove([prefix + key, usagePrefix + key]);
}

export async function readUsage() {
  const data = await api.storage.local.get(null);
  return Object.fromEntries(Object.entries(data)
    .filter(([key]) => key.startsWith(usagePrefix))
    .map(([key, count]) => [key.slice(usagePrefix.length), validCount(count)]));
}

function validCount(count) {
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

// Called only through the background's serialized queue, including deletion.
export async function recordUse(key) {
  const data = await api.storage.local.get([prefix + key, usagePrefix + key]);
  if (!Object.hasOwn(data, prefix + key)) return;
  const count = Math.min(validCount(data[usagePrefix + key]) + 1, Number.MAX_SAFE_INTEGER);
  await api.storage.local.set({ [usagePrefix + key]: count });
}
