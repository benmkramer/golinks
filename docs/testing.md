# Validation

`npm run check` runs Node tests for key and URL validation, import validation, redirect scope, suggestion escaping, and independent storage updates, then builds both browser targets.

## Automated browser checks

After `npm ci`, run `npx playwright install chromium`, then `npm run smoke:chrome`. Set `CHROMIUM_PATH` to use an existing Chromium or Chrome for Testing executable. The script uses a temporary profile, exercises the real extension, and saves `docs/editor.png` for visual review. Destination requests are fulfilled locally by the test.

Run `npm run smoke:firefox` with Firefox installed. The script uses Selenium Manager to locate or download geckodriver, installs the extension temporarily in a fresh headless profile, and checks redirects against a local HTTP server. It enables geckodriver's browser-UI testing access to set `browser.fixup.domainwhitelist.go` in that isolated profile and type `go/docs` into the native address bar. It does not change your normal Firefox profile. Set `FIREFOX_PATH` if Firefox is not installed at `/Applications/Firefox.app/Contents/MacOS/firefox`. Use `SE_CACHE_PATH` to change Selenium's driver cache directory.

Firefox manifest validation: `npx web-ext@10.6.0 lint --source-dir dist/firefox`. This linter is an optional external development tool, not an extension dependency.

## Verified on September 5, 2026

- All 7 Node tests passed; both builds generated successfully.
- Chrome for Testing 151: editor create/edit, HTTP and HTTPS redirects, case-insensitive lookup, unknown-key prefill, duplicate rejection, JSON import/export, deletion, and storage retained after page reload passed.
- Firefox 155.0.1: editor creation, HTTP and HTTPS redirects, unknown-key prefill, and native address-bar typing of `go/docs` with `browser.fixup.domainwhitelist.go = true` passed in a temporary test profile.
- Firefox add-on lint: 0 errors, 0 warnings, 0 notices.
- The Chrome editor screenshot was visually inspected.

Direct typing into Chrome's native address bar, keyword suggestion selection, and persistence across a full browser restart have not been manually verified. No signing or store publication was performed.

## Manual acceptance checks

Use a dedicated test profile in each browser:

1. Load the appropriate build and grant access to the `go` hosts.
2. Open the toolbar editor and add `docs` with an HTTPS destination containing a query string and fragment.
3. Visit `http://go/docs` and `https://go/docs`. Both should reach the complete destination.
4. Type `go/docs` directly in the address bar and note whether that browser/profile navigates or searches. Try `go` + Space + `docs` as well, including opening a suggestion in a new tab.
5. Edit the destination, then revisit `http://go/docs`. It should use the updated mapping immediately.
6. Visit an unknown key and use the create link. Verify the editor prefills it.
7. Try adding a duplicate key and a destination beginning with `javascript:` or pointing back to `go`. Each should be rejected.
8. Export, delete a shortcut, import the backup, review the counts, and confirm. Canceling an import must leave storage unchanged.
9. Reload the extension and verify the mapping remains. For a permanent installation, restart the browser and repeat the navigation check.
10. Verify `http://go.example.com/docs` and unrelated sites are not redirected by this extension.

The address bar's search-versus-navigation decision requires a real address-bar check; programmatic navigation does not verify it. Browser signing and store publication are separate from local testing.
