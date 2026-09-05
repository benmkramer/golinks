export function normalizeKey(value) {
  const key = value.trim().toLowerCase().replace(/^go\//, '');
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(key)) {
    throw new Error('Use 1–64 letters, numbers, hyphens or underscores, starting with a letter or number.');
  }
  return key;
}

export function validateURL(value) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a full URL starting with https:// or http://.'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Only https:// and http:// links are supported.');
  if (url.username || url.password) throw new Error('URLs containing usernames or passwords are not supported.');
  if (url.hostname.replace(/\.$/, '').toLowerCase() === 'go') throw new Error('A destination cannot point back to go/.');
  return url.href;
}

export function parseImport(text) {
  const data = JSON.parse(text);
  if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Import a JSON object mapping keys to URLs.');
  const entries = new Map();
  for (const [rawKey, value] of Object.entries(data)) {
    if (typeof value !== 'string') throw new Error('Every destination must be a URL string.');
    const key = normalizeKey(rawKey);
    if (entries.has(key)) throw new Error(`Duplicate key after normalization: ${key}`);
    entries.set(key, validateURL(value));
  }
  return Object.fromEntries(entries);
}

export function redirectRule(baseURL) {
  return {
    id: 1, priority: 1,
    action: { type: 'redirect', redirect: { regexSubstitution: `${baseURL}resolve.html#\\1` } },
    condition: { regexFilter: '^https?://go/([^?#]*).*$', isUrlFilterCaseSensitive: false, resourceTypes: ['main_frame'] }
  };
}

export function escapeXML(value) {
  return value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
}
