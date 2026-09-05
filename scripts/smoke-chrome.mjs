import { chromium } from 'playwright';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(path.join(tmpdir(), 'go-links-chrome-'));
const extension = path.resolve('dist/chrome');
const context = await chromium.launchPersistentContext(profile, {
  headless: true, channel: 'chromium', executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`chrome-extension://${id}/options.html`);
  await page.locator('#key').fill('Docs');
  await page.locator('#url').fill('https://example.com/docs?q=1#section');
  await page.locator('#save').click();
  await page.getByRole('status').filter({ hasText: 'Saved go/docs.' }).waitFor();
  await page.getByRole('button', { name: 'Edit go/docs', exact: true }).click();
  await page.locator('#url').fill('https://example.com/updated?q=1#section');
  await page.locator('#save').click();
  await page.getByText('https://example.com/updated?q=1#section', { exact: true }).waitFor();
  await page.screenshot({ path: 'docs/editor.png', fullPage: true });
  // Fulfill the destination locally; the extension's real redirect still runs.
  await context.route('https://example.com/**', route => route.fulfill({ body: '<h1>Destination</h1>', contentType: 'text/html' }));
  for (const url of ['http://go/docs', 'https://go/DOCS']) {
    await page.goto(url).catch(error => { if (!error.message.includes('ERR_ABORTED')) throw error; });
    await page.waitForURL('https://example.com/updated?q=1#section');
  }
  await page.goto('http://go/missing').catch(error => { if (!error.message.includes('ERR_ABORTED')) throw error; });
  await page.getByText('go/missing is available').waitFor();
  await page.getByRole('link', { name: 'Create go/missing' }).click();
  await page.waitForFunction(() => document.querySelector('#key')?.value === 'missing');
  assert.equal(await page.locator('#key').inputValue(), 'missing');
  await page.locator('#key').fill('docs'); await page.locator('#url').fill('https://example.org'); await page.locator('#save').click();
  await page.getByText('go/docs already exists. Use its Edit button to change it.').waitFor();
  await page.locator('#import-file').setInputFiles({ name: 'links.json', mimeType: 'application/json', buffer: Buffer.from('{"calendar":"https://example.org/calendar"}') });
  await page.locator('#import-confirm').click();
  await page.getByRole('link', { name: 'go/calendar', exact: true }).waitFor();
  const downloadEvent = page.waitForEvent('download'); await page.locator('#export').click();
  const download = await downloadEvent;
  const { readFile } = await import('node:fs/promises');
  assert.equal(JSON.parse(await readFile(await download.path(), 'utf8')).calendar, 'https://example.org/calendar');
  await page.getByRole('button', { name: 'Delete go/docs', exact: true }).click();
  await page.locator('#delete-confirm').click();
  await page.getByText('Deleted go/docs.').waitFor();
  await page.reload(); assert.equal(await page.getByRole('link', { name: 'go/docs', exact: true }).count(), 0);
  assert.equal(await page.getByRole('link', { name: 'go/calendar', exact: true }).count(), 1);
  assert.deepEqual(errors, []);
  console.log('Chrome smoke passed: editor, HTTP/HTTPS redirects, missing key, duplicate, import/export, delete, reload.');
} finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
