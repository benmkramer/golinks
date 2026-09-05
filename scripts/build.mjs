import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

for (const browser of ['chrome', 'firefox']) {
  const dest = new URL(`../dist/${browser}/`, import.meta.url);
  await mkdir(dest, { recursive: true });
  await cp(new URL('../src/', import.meta.url), dest, { recursive: true });
  const manifest = {
    manifest_version: 3, name: 'Go Links', version,
    description: 'Your personal shortcuts. Map go/keys to URLs, stored locally in your browser.',
    permissions: ['storage', 'declarativeNetRequestWithHostAccess'],
    host_permissions: ['http://go/*', 'https://go/*'],
    background: browser === 'chrome' ? { service_worker: 'background.js', type: 'module' } : { scripts: ['background.js'], type: 'module' },
    action: { default_title: 'Manage Go Links' },
    options_ui: { page: 'options.html', open_in_tab: true },
    omnibox: { keyword: 'go' },
    web_accessible_resources: [{ resources: ['resolve.html'], matches: ['http://go/*', 'https://go/*'] }],
    ...(browser === 'chrome' ? { minimum_chrome_version: '120' } : {
      browser_specific_settings: { gecko: { id: 'personal-go-links@extension.local', strict_min_version: '142.0', data_collection_permissions: { required: ['none'] } } }
    })
  };
  await writeFile(new URL('manifest.json', dest), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Built dist/${browser}`);
}
