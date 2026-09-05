# Go Links

A small, local-only Chrome and Firefox extension. Save a key and a URL, then open `go/key` from your address bar.

## Setup

Requires Node.js 20+, Git, and Chrome 120+ or Firefox 142+. Build both extensions:

```sh
git clone https://github.com/benmkramer/golinks.git
cd golinks
npm run build
```

No `npm install` is needed to build or use the extension. Dependencies are only for development and testing.

| Browser | Load the extension | Enable direct `go/docs` typing |
| --- | --- | --- |
| Chrome | `chrome://extensions` → **Developer mode** → **Load unpacked** → select `dist/chrome` | Try `go/docs`. If Chrome searches, [visit the go host once and retry](docs/setup.md#chrome-make-godocs-navigate-instead-of-search). |
| Firefox | `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select `dist/firefox/manifest.json` | In `about:config`, create Boolean `browser.fixup.domainwhitelist.go` and set it to **true**. |

**[Complete setup guide](docs/setup.md):** step-by-step installation, your first shortcut, direct `go/...` typing, permissions, updates, troubleshooting, and permanent Firefox installation. Firefox's temporary install must be loaded again after a browser restart.

The management page opens on first installation and checks actual access to both `go` hosts. If access is missing, click **Enable Go Links** and approve the browser prompt. When it says **Redirect permissions enabled**, host access is ready; address-bar setup remains a separate step. You can manage mappings even before granting access.

## Use

1. Add `docs` → `https://example.com/docs` in the editor.
2. Type `go/docs` into the address bar and press Enter.
3. Follow your browser's [direct typing setup](docs/setup.md) if it searches instead. Alternatively, type `go`, then Space (or Tab in Chrome), then `docs` and Enter. The keyword mode also suggests saved keys.

Keys are case-insensitive, 1–64 characters, and use letters, numbers, hyphens or underscores. A key must start with a letter or number. Destinations accept HTTP and HTTPS, including query strings and fragments. `go/` opens the editor, and an unknown key offers to create a mapping. Extra query strings or fragments on the shortcut are not forwarded to its destination.

The extension cannot override the browser's choice to search instead of navigate. It only intercepts main-frame navigation to the exact `go` hostname on standard HTTP/HTTPS ports. It does not change your search engine, DNS or operating system configuration.

Each shortcut shows its usage count. Choose **Most used** or **Least used** to find favorites or cleanup candidates. Opening a saved shortcut through a go URL, keyword mode, or the manager counts once when the extension sends you to its destination, even if the destination later fails to load. Unknown keys and searches do not count. Existing links start at zero with this update; earlier visits cannot be recovered.

## Data and backups

Mappings stay in this browser profile's extension storage. Chrome and Firefox have separate stores; there is no automatic cross-browser sync or account. Export JSON from one browser and import it in the other:

```json
{
  "docs": "https://example.com/docs",
  "calendar": "https://calendar.google.com/"
}
```

Usage counts stay local and are not included in JSON exports. Editing or importing over an existing key preserves its count. Deleting a shortcut removes its count, so recreating it starts at zero.

Imports validate the complete file, preview additions and replacements, and ask before writing. Imported keys replace matching keys; unrelated mappings remain. Export before uninstalling, since uninstalling an extension removes its data.

## Development

```sh
npm ci
npm run check
```

Shared code lives in `src/`. The build creates browser-specific Manifest V3 files, with a Chrome service worker and a Firefox background script. One persistent declarative redirect rule sends `go/` navigations to a local resolver, which reads the latest mapping. Updating a mapping does not require rebuilding rules or reloading the extension.

Permissions are limited to local storage, declarative redirects, and the two `go` host patterns. There are no content scripts, analytics, remote scripts or network requests for storing mappings. Opening a destination visits that website normally.

See [testing and browser checks](docs/testing.md) for validation details.

API references: [declarative redirects](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest), [cross-browser background scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background), [address-bar keywords](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/omnibox).
