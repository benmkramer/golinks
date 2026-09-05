import { api, readLinks } from './store.js';
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
