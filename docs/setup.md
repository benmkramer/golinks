# Set up Go Links

The goal is to type **`go/docs`** into your browser's address bar and open a saved URL. You do not need to type `http://` for everyday use once your browser recognizes `go` as a hostname.

Two things must work: the browser must navigate to `go/docs`, and the extension must redirect that navigation to your saved destination. Firefox has a per-host setting for the first part. Chrome relies on its address-bar heuristics and history, so test the direct form in your own profile.

## 1. Download and build

Install [Node.js](https://nodejs.org/) 20 or newer and [Git](https://git-scm.com/downloads). Use Chrome 120+ or Firefox 142+.

In a terminal:

```sh
git clone https://github.com/benmkramer/golinks.git
cd golinks
npm run build
```

Alternatively, use **Code → Download ZIP** on the GitHub repository, extract it, open a terminal in the extracted folder, and run `npm run build`.

This creates `dist/chrome` and `dist/firefox`. No `npm install`, account, DNS configuration, or server is required. Keep the project folder in a permanent location because the browsers load files from it. The `dist` folders are generated locally and are not included in the GitHub source download.

## 2. Install in Chrome

1. Open `chrome://extensions` in Chrome's address bar.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select the project's **`dist/chrome` folder**, not the repository root or an individual file.
5. Confirm **Go Links** appears and is enabled.
6. Open the puzzle-piece **Extensions** menu and pin **Go Links**. Click its toolbar button to open the editor.
7. Add shortcut **`docs`** with destination **`https://example.com/`**, then click **Add shortcut**.

The unpacked extension stays installed across Chrome restarts as long as its files remain available and Chrome keeps it enabled. See Google's [local extension testing instructions](https://support.google.com/chrome/a/answer/2714278).

### Chrome: make go/docs navigate instead of search

1. Focus the **address bar** with **Cmd+L** on macOS or **Ctrl+L** on Windows/Linux. Do not use the search box inside a webpage.
2. Type **`go/docs`** with no spaces and press **Enter**. If `https://example.com/` opens, setup is complete.
3. If Chrome searches, enter **`http://go/` once**. The extension should open its editor. This explicit visit can help Chrome recognize the hostname for subsequent shortcuts.
4. Try **`go/docs`** again, then try a second saved key. Check that the selected suggestion is a URL rather than a search suggestion.

The explicit URL in step 3 is a setup/troubleshooting step, not the intended everyday workflow. Chromium uses [URL detection](https://www.chromium.org/user-experience/omnibox/) and [previously visited intranet hosts](https://github.com/chromium/chromium/blob/main/components/omnibox/browser/history_url_provider.cc) when choosing between navigation and search. Recognition can vary with browser version, history, and profile settings. The one-time visit is a troubleshooting step, not a guarantee for every profile; repeat the check after clearing history or switching profiles.

Chrome does not expose Firefox's `browser.fixup.domainwhitelist.go` preference. If direct `go/docs` still searches, the extension cannot force Chrome's address-bar decision. The built-in no-scheme fallback is **`go` → Space or Tab → `docs` → Enter**. This keyword mode is different from literal `go/docs` and also provides suggestions for saved keys.

## 3. Install in Firefox

1. Open `about:debugging#/runtime/this-firefox` in Firefox's address bar.
2. Click **Load Temporary Add-on**.
3. Select **`dist/firefox/manifest.json`** from this project.
4. Confirm **Go Links** appears under **Temporary Extensions**.
5. Open the puzzle-piece **Extensions** menu and click **Go Links** to open the editor. You can pin it to the toolbar from that menu.
6. Add shortcut **`docs`** with destination **`https://example.com/`**, then click **Add shortcut**.

**No permission popup is expected for a temporary installation.** Firefox skips installation-time permission prompts in this mode. If you previously revoked host access, open `about:addons` → **Go Links** → **Permissions** and enable the requested access to the `go` sites. See Mozilla's [temporary installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

### Firefox: make go/docs navigate instead of search

Do this once in each Firefox profile where you use Go Links:

1. Open **`about:config`** in the address bar.
2. Click **Accept the Risk and Continue** if Firefox shows its advanced-preferences warning.
3. Paste this exact preference name into the search field:

   ```text
   browser.fixup.domainwhitelist.go
   ```

4. If it does not exist, select **Boolean** and click the **+** button to create it.
5. Ensure the value is **`true`**. If it is `false`, click the toggle button.
6. Open a new tab and type **`go/docs`** directly into the address bar, then press **Enter**.

The saved destination should open without `http://`, an extra space, or a browser restart. This setting tells Firefox that `go` is a hostname and persists across restarts. It applies only to `go`; leave other preferences unchanged. To undo it, delete the preference or set it to `false`.

The extension cannot set this advanced preference itself. Its behavior is implemented in Firefox's [URL-fixup code](https://searchfox.org/firefox-main/source/docshell/base/URIFixup.sys.mjs). We verified native address-bar input of `go/docs` with this setting in Firefox 155.0.1.

### Firefox: temporary versus permanent installation

**Load Temporary Add-on is for development.** Firefox removes the temporary extension when it restarts, even though the hostname preference remains. Load the same manifest again to continue testing. Export your mappings before ending a temporary testing session so you have a backup.

A permanent installation in standard Firefox requires a **Mozilla-signed `.xpi`**. This repository currently provides source code, not a signed release. For a personal permanent installation, submit a package containing the contents of `dist/firefox` to Mozilla for **self-distribution (unlisted)**, then install the signed `.xpi` it returns through `about:addons` → gear menu → **Install Add-on From File**. Keep `manifest.json` at the root of the submitted ZIP. Signing does not require publicly listing the extension on Mozilla Add-ons. See Mozilla's [signing and distribution guide](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## 4. Confirm setup

With a `docs` mapping saved, verify:

| Input in the address bar | Expected result |
| --- | --- |
| `go/docs` | Opens the saved destination. This is the everyday workflow. |
| `go/` | Opens the shortcut editor. |
| `go/not-saved-yet` | Offers to create that shortcut. |
| `go` + Space + `docs` | Opens the saved destination through keyword mode. |

Use the same browser profile where you installed the extension. Chrome and Firefox store their mappings separately; use **Export JSON** and **Import JSON** in the editor to copy them between browsers.

## Troubleshooting

| What happens | What to check |
| --- | --- |
| `go/docs` opens search results | This is the browser's search/navigation decision. Follow the Chrome or Firefox direct-typing steps above. |
| `http://go/docs` works, but `go/docs` searches | The extension and mapping work. Finish the browser-specific direct-typing setup. |
| `http://go/` produces a DNS/network error | Confirm the extension is loaded, enabled, and permitted to access the `go` hosts. In Chrome, check **Go Links → Details → Site access** and permit automatic access on its requested sites rather than only on click. In Firefox, check the add-on's **Permissions** tab. |
| The shortcut has no destination | Add its mapping in this browser's editor, or import your JSON backup. |
| Firefox stops working after restart | Reload the temporary add-on or install a signed permanent version. The `about:config` preference alone does not provide redirects. |
| Loading fails because `manifest.json` is missing | Run `npm run build`. Select `dist/chrome` in Chrome or `dist/firefox/manifest.json` in Firefox. |
| An extension-management setting is locked | A managed browser may restrict local extensions or site access. Ask the browser administrator to allow the extension. |

## Updating a local installation

Export a JSON backup first. Then, from the project folder:

```sh
git pull --ff-only
npm run build
```

For a ZIP download, download the newer source and rebuild in the same location instead of using `git pull`.

- **Chrome:** open `chrome://extensions` and click **Reload** on Go Links.
- **Firefox:** open `about:debugging#/runtime/this-firefox` and click **Reload** on Go Links. If it disappeared after a restart, use **Load Temporary Add-on** again.

Refresh any open editor tabs after reloading. Use reload rather than uninstalling to update an existing installation; uninstalling removes its stored data. Recheck `go/docs` after the update. Signed Firefox installations require an updated signed package rather than this temporary-add-on reload workflow.
