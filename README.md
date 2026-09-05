# Go Links

A small, local-only Chrome and Firefox extension. Save a key and a URL, then open `go/key` from your address bar.

## Install locally

Run `npm run build` with Node.js 20 or newer. The extension itself has no runtime dependencies.

**Chrome:** Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/chrome` from this project.

**Firefox:** Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`. Temporary installation skips permission prompts. Temporary add-ons are removed when Firefox restarts. A permanent installation in standard Firefox requires signing through Mozilla. If access has been revoked, allow `http://go/*` and `https://go/*` in the add-on's Permissions tab.

### Firefox: enable direct go/ typing once

If Firefox searches for `go/docs`, tell it that `go` is a hostname:

1. Open `about:config` and continue past the warning.
2. Search for `browser.fixup.domainwhitelist.go`.
3. Select **Boolean**, click **+**, and ensure its value is **true**. If the setting already exists, toggle it to **true**.

Now enter `go/docs` directly, without a scheme or extra space. This preference applies only to the `go` hostname and persists across restarts. Standard extensions cannot change this preference; it requires this one-time manual setup. To undo it, delete the preference or set it to **false**. Firefox's [URL-fixup implementation](https://searchfox.org/firefox-main/source/docshell/base/URIFixup.sys.mjs) reads this hostname allowlist.

Click the extension's toolbar button to manage shortcuts. Pin it for quick access.

## Use

1. Add `docs` → `https://example.com/docs` in the editor.
2. Type `go/docs` into the address bar and press Enter.
3. In Firefox, complete the one-time setup above if it searches instead. Alternatively, type `go`, then Space (or Tab in Chrome), then `docs` and Enter. The keyword mode also suggests saved keys.

Keys are case-insensitive, 1–64 characters, and use letters, numbers, hyphens or underscores. A key must start with a letter or number. Destinations accept HTTP and HTTPS, including query strings and fragments. `go/` opens the editor, and an unknown key offers to create a mapping. Extra query strings or fragments on the shortcut are not forwarded to its destination.

The extension cannot override the browser's choice to search instead of navigate. It only intercepts main-frame navigation to the exact `go` hostname on standard HTTP/HTTPS ports. It does not change your search engine, DNS or operating system configuration.

## Data and backups

Mappings stay in this browser profile's extension storage. Chrome and Firefox have separate stores; there is no automatic cross-browser sync or account. Export JSON from one browser and import it in the other:

```json
{
  "docs": "https://example.com/docs",
  "calendar": "https://calendar.google.com/"
}
```

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
