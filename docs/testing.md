# Validation

`npm run check` runs Node tests for key and URL validation, import validation, redirect scope, suggestion escaping, independent storage updates, first-install behavior, and permission setup, then builds both browser targets. Permission tests cover already-granted, missing, denied, newly granted, revoked, API errors, and stale asynchronous checks. The request test also asserts that the API is invoked synchronously during the button click with exactly the two declared go hosts.

## Automated browser checks

After `npm ci`, run `npx playwright install chromium`, then `npm run smoke:chrome`. Set `CHROMIUM_PATH` to use an existing Chromium or Chrome for Testing executable. The script uses a temporary profile, exercises the real extension, and saves `docs/editor.png` for visual review (override with `SCREENSHOT_PATH`). Destination requests are fulfilled locally by the test. It uses Chrome's extension-settings API to withhold and restore host access to check permission-change events. The extension manifest is unmodified.

Run `npm run smoke:firefox` with Firefox installed. The script uses Selenium Manager to locate or download geckodriver, installs the extension temporarily in a fresh headless profile, and checks redirects against a local HTTP server. It enables geckodriver's browser-UI testing access to set `browser.fixup.domainwhitelist.go` in that isolated profile and type `go/docs` into the native address bar. It does not change your normal Firefox profile. Set `FIREFOX_PATH` if Firefox is not installed at `/Applications/Firefox.app/Contents/MacOS/firefox`. Use `SE_CACHE_PATH` to change Selenium's driver cache directory.

The Firefox smoke test also revokes grants through Firefox's permission backend with live-extension notification, saves a mapping while access is missing, and clicks the extension's Enable button to open the actual browser prompt. It activates the real denial and approval buttons from browser-UI context because WebDriver cannot scroll Firefox's popup buttons in headless mode. This tests browser prompt outcomes and the user gesture on the extension button without mocking `permissions.request()`.

Firefox manifest validation: `npx web-ext@10.6.0 lint --source-dir dist/firefox`. This linter is an optional external development tool, not an extension dependency.

## Verified on September 5, 2026

- All 17 Node tests passed; both builds generated successfully.
- Chrome for Testing 151: first-install management page, already-granted readiness, withheld access, external revocation/restoration, and the existing editor, redirect, import/export, deletion, and page-reload persistence checks passed. Firefox-only guidance was hidden.
- Firefox 155.0.1: first-install management page, already-granted readiness, revocation, editing while access was missing, actual permission-prompt denial/retry/approval, restored HTTP/HTTPS redirects, unknown-key prefill, and native address-bar typing of `go/docs` with the hostname preference passed. Firefox guidance was visible.
- Firefox add-on lint: 0 errors, 0 warnings, 0 notices.
- The Chrome permission-setup panel with an existing mapping was visually inspected.

Both fresh test profiles initially granted the declared hosts. The tests explicitly revoked those real grants to exercise the missing-access path; these results do not imply that every installation grants them. Browser approval dialogs were not manually exercised in a normal user profile. No manifest host patterns or API permissions were added.

Chrome's runtime Enable request was attempted, but its headless confirmation remained pending, so Chrome prompt approval/denial is not counted as verified. The shared request handler is covered by unit tests and Firefox's real permission prompt; Chrome's installation-time grants and external grant changes were verified separately.

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
