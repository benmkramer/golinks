import { api, readLinks, saveLinks, deleteLink } from './store.js';
import { normalizeKey, validateURL, parseImport } from './core.js';
import { setupPermissions } from './permissions.js';

const $ = selector => document.querySelector(selector);
$('#firefox-setup').hidden = !api.runtime.getURL('').startsWith('moz-extension:');
setupPermissions(api.permissions, {
  panel: $('#permission-setup'), button: $('#enable-permissions'),
  message: $('#permission-status'), ready: $('#permission-ready')
});
let links = {};
let editing = null;
let pendingImport = null;
let pendingDelete = null;
function status(message, error = false) { $('#status').textContent = message; $('#status').classList.toggle('error', error); }
function resetForm() {
  editing = null;
  $('#link-form').reset();
  $('#key').readOnly = false;
  $('#cancel').hidden = true;
  $('#form-title').textContent = 'Create a shortcut';
  $('#save').textContent = 'Add shortcut';
}
function render() {
  const query = $('#search').value.trim().toLowerCase();
  const entries = Object.entries(links).sort(([a], [b]) => a.localeCompare(b));
  $('#count').textContent = entries.length;
  const filtered = entries.filter(([key, url]) => `${key} ${url}`.toLowerCase().includes(query));
  $('#links').replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    const title = document.createElement('strong');
    title.textContent = entries.length ? 'No matching shortcuts' : 'Your next favorite shortcut starts here.';
    const detail = document.createElement('p');
    detail.textContent = entries.length ? 'Try a different key or destination.' : 'Add a link above. Try docs, calendar, or dashboard.';
    empty.append(title, detail);
    $('#links').append(empty);
  }
  for (const [key, url] of filtered) {
    const row = document.createElement('div'); row.className = 'link-row';
    const info = document.createElement('div'); info.className = 'link-info';
    const anchor = document.createElement('a'); anchor.textContent = `go/${key}`;
    anchor.href = api.runtime.getURL(`resolve.html#${encodeURIComponent(key)}`); anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
    const destination = document.createElement('p'); destination.textContent = url; destination.title = url;
    info.append(anchor, destination);
    const actions = document.createElement('div'); actions.className = 'row-actions';
    for (const label of ['Edit', 'Delete']) {
      const button = document.createElement('button'); button.className = 'text-button'; button.textContent = label;
      button.setAttribute('aria-label', `${label} go/${key}`);
      button.addEventListener('click', () => {
        if (label === 'Edit') {
          editing = key; $('#key').value = key; $('#key').readOnly = true; $('#url').value = url;
          $('#form-title').textContent = `Edit go/${key}`; $('#save').textContent = 'Save changes'; $('#cancel').hidden = false; $('#url').focus();
        } else {
          pendingDelete = key; $('#delete-summary').textContent = `Remove go/${key}? The destination website will be unaffected.`; $('#delete-dialog').showModal();
        }
      });
      actions.append(button);
    }
    row.append(info, actions); $('#links').append(row);
  }
}
async function refresh() { links = await readLinks(); render(); }
$('#link-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#save').disabled = true;
  try {
    const key = normalizeKey($('#key').value); const url = validateURL($('#url').value);
    const current = await readLinks();
    if (editing !== key && Object.hasOwn(current, key)) throw new Error(`go/${key} already exists. Use its Edit button to change it.`);
    await saveLinks({ [key]: url }); resetForm(); await refresh(); status(`Saved go/${key}.`);
  } catch (error) { status(error.message, true); }
  finally { $('#save').disabled = false; }
});
$('#cancel').addEventListener('click', resetForm);
$('#search').addEventListener('input', render);
$('#delete-cancel').addEventListener('click', () => $('#delete-dialog').close());
$('#delete-confirm').addEventListener('click', async () => {
  $('#delete-confirm').disabled = true;
  try { await deleteLink(pendingDelete); if (editing === pendingDelete) resetForm(); await refresh(); status(`Deleted go/${pendingDelete}.`); $('#delete-dialog').close(); }
  catch (error) { $('#delete-dialog').close(); status(error.message, true); }
  finally { $('#delete-confirm').disabled = false; }
});
$('#export').addEventListener('click', async () => {
  try {
    const data = await readLinks();
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'go-links.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    status(`Exported ${Object.keys(data).length} shortcuts.`);
  } catch (error) { status(error.message, true); }
});
$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  try {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 2_000_000) throw new Error('Choose a JSON file smaller than 2 MB.');
    pendingImport = parseImport(await file.text());
    const current = await readLinks(); const keys = Object.keys(pendingImport);
    const replacements = keys.filter(key => Object.hasOwn(current, key)).length;
    $('#import-summary').textContent = `${keys.length} shortcuts: ${keys.length - replacements} new, ${replacements} existing keys to replace.`;
    $('#import-dialog').showModal();
  } catch (error) { status(`Import failed: ${error.message}`, true); }
  finally { event.target.value = ''; }
});
$('#import-cancel').addEventListener('click', () => $('#import-dialog').close());
$('#import-confirm').addEventListener('click', async () => {
  $('#import-confirm').disabled = true;
  try { await saveLinks(pendingImport); await refresh(); resetForm(); status(`Imported ${Object.keys(pendingImport).length} shortcuts.`); $('#import-dialog').close(); }
  catch (error) { $('#import-dialog').close(); status(`Import failed: ${error.message}`, true); }
  finally { $('#import-confirm').disabled = false; }
});
api.storage.onChanged.addListener((_changes, area) => { if (area === 'local') refresh().catch(error => status(error.message, true)); });
refresh().catch(error => status(error.message, true));
const requestedKey = new URLSearchParams(location.search).get('key');
if (requestedKey) { try { $('#key').value = normalizeKey(requestedKey); $('#url').focus(); } catch { /* Leave invalid prefill empty. */ } }
