import { api, readLinks, recordUse, deleteLink } from './store.js';
import { normalizeKey, escapeXML, redirectRule } from './core.js';

async function setup() {
  await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1], addRules: [redirectRule(api.runtime.getURL(''))] });
}
api.runtime.onInstalled.addListener(details => {
  setup().catch(console.error);
  if (details.reason === 'install') api.runtime.openOptionsPage().catch(console.error);
});
api.runtime.onStartup.addListener(() => { setup().catch(console.error); });
api.action.onClicked.addListener(() => { api.runtime.openOptionsPage().catch(console.error); });

let suggestionSequence = 0;
api.omnibox.onInputChanged.addListener((text, suggest) => {
  const sequence = ++suggestionSequence;
  readLinks().then(links => {
    if (sequence !== suggestionSequence) return;
    const query = text.trim().toLowerCase().replace(/^go\//, '');
    suggest(Object.entries(links).filter(([key]) => key.includes(query)).sort(([a], [b]) => a.localeCompare(b)).slice(0, 6)
      .map(([key, url]) => ({ content: key, description: `go/${escapeXML(key)} → ${escapeXML(url)}` })));
  }).catch(console.error);
});
api.omnibox.onInputEntered.addListener((text, disposition) => {
  let url = api.runtime.getURL('options.html');
  try { url = api.runtime.getURL(`resolve.html#${encodeURIComponent(normalizeKey(text))}`); } catch { /* Open manager for invalid input. */ }
  const operation = disposition === 'currentTab' ? api.tabs.update({ url }) : api.tabs.create({ url, active: disposition !== 'newBackgroundTab' });
  operation.catch(console.error);
});

// A single writer prevents simultaneous tabs from losing increments. Keep the
// response channel open until storage completes, including in Chrome workers.
let usageQueue = Promise.resolve();
api.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== api.runtime.id || !['record-use', 'delete-link'].includes(message?.type)) return;
  const operation = usageQueue.then(async () => {
    const key = normalizeKey(message.key);
    if (message.type === 'delete-link') await deleteLink(key);
    else await recordUse(key);
  });
  usageQueue = operation.catch(() => {});
  operation.then(() => respond({ ok: true }), error => respond({ error: error.message }));
  return true;
});
