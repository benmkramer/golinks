import { Builder, By, Key, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'node:http';

const server = createServer((_request, response) => { response.end('<h1>Destination</h1>'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const destination = `http://127.0.0.1:${server.address().port}/docs?q=1#section`;
const options = new firefox.Options().addArguments('-headless')
  .setBinary(process.env.FIREFOX_PATH || '/Applications/Firefox.app/Contents/MacOS/firefox');
let driver;
try {
  driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options)
    .setFirefoxService(new firefox.ServiceBuilder().addArguments('--allow-system-access')).build();
  await driver.installAddon(path.resolve('dist/firefox'), true);
  // The management page must open even when host access is unavailable.
  await driver.wait(async () => {
    for (const handle of await driver.getAllWindowHandles()) {
      await driver.switchTo().window(handle);
      if ((await driver.getCurrentUrl()).endsWith('/options.html')) return true;
    }
    return false;
  }, 10000);
  await driver.wait(until.elementLocated(By.id('key')), 10000);
  await driver.wait(until.elementIsVisible(driver.findElement(By.id('permission-ready'))), 10000);
  assert.equal(await driver.findElement(By.id('permission-ready')).getText(), 'Redirect permissions enabled');
  assert.equal(await driver.findElement(By.id('firefox-setup')).isDisplayed(), true);
  await driver.findElement(By.id('key')).sendKeys('docs');
  await driver.findElement(By.id('url')).sendKeys(destination);
  await driver.findElement(By.id('save')).click();
  await driver.wait(until.elementTextContains(driver.findElement(By.id('status')), 'Saved go/docs.'), 10000);
  // Revoke real grants through Firefox's permission backend, like settings do.
  await driver.setContext('chrome');
  const revoked = await driver.executeAsyncScript(function (done) {
    const { ExtensionPermissions } = ChromeUtils.importESModule('resource://gre/modules/ExtensionPermissions.sys.mjs');
    ExtensionPermissions.remove('personal-go-links@extension.local', {
      origins: ['http://go/*', 'https://go/*'], permissions: []
    }, WebExtensionPolicy.getByID('personal-go-links@extension.local').extension)
      .then(() => done(null), error => done(error.message));
  });
  assert.equal(revoked, null);
  await driver.setContext('content');
  await driver.wait(until.elementIsVisible(driver.findElement(By.id('permission-setup'))), 10000);
  console.log('Firefox: revoked access is reflected in the management page.');
  assert.equal(await driver.findElement(By.id('permission-ready')).isDisplayed(), false);
  // Editing remains available while permission setup is incomplete.
  await driver.findElement(By.id('key')).sendKeys('offline');
  await driver.findElement(By.id('url')).sendKeys(destination);
  await driver.findElement(By.id('save')).click();
  await driver.wait(until.elementTextContains(driver.findElement(By.id('status')), 'Saved go/offline.'), 10000);
  for (const approve of [false, true]) {
    await driver.findElement(By.id('enable-permissions')).click();
    console.log(`Firefox: clicked Enable Go Links; testing ${approve ? 'approval' : 'denial'}.`);
    await driver.setContext('chrome');
    const selector = `#addon-webext-permissions-notification .popup-notification-${approve ? 'primary' : 'secondary'}-button`;
    const decision = await driver.wait(until.elementLocated(By.css(selector)), 10000);
    await driver.wait(until.elementIsVisible(decision), 10000);
    // Firefox's moz-button popup cannot be scrolled by WebDriver in headless
    // mode. Activate the real browser prompt button in browser-UI context.
    await driver.executeScript('arguments[0].click()', decision);
    await driver.setContext('content');
    if (approve) {
      await driver.wait(until.elementIsVisible(driver.findElement(By.id('permission-ready'))), 10000);
    } else {
      await driver.wait(until.elementTextContains(driver.findElement(By.id('permission-status')), 'not granted'), 10000);
      assert.equal(await driver.findElement(By.id('permission-setup')).isDisplayed(), true);
    }
  }
  for (const url of ['http://go/docs', 'https://go/DOCS']) {
    await driver.get(url); await driver.wait(until.urlIs(destination), 10000);
  }
  await driver.get('http://go/missing');
  await driver.wait(until.elementTextContains(driver.findElement(By.id('title')), 'go/missing is available'), 10000);
  await driver.findElement(By.id('manage')).click();
  assert.equal(await driver.findElement(By.id('key')).getProperty('value'), 'missing');
  await driver.wait(until.elementLocated(By.className('use-count')), 10000);
  assert.equal(await driver.findElement(By.className('use-count')).getText(), '2 uses');
  const managerURL = await driver.getCurrentUrl();
  // Exercise the native address bar, not WebDriver URL navigation.
  await driver.setContext('chrome');
  await driver.executeScript("Services.prefs.setBoolPref('browser.fixup.domainwhitelist.go', true);");
  const addressBar = await driver.findElement(By.css('input.urlbar-input'));
  await addressBar.clear();
  await addressBar.sendKeys('go/docs', Key.ENTER);
  await driver.setContext('content');
  await driver.wait(until.urlIs(destination), 10000);
  await driver.get(managerURL);
  await driver.wait(until.elementLocated(By.className('use-count')), 10000);
  assert.equal(await driver.findElement(By.className('use-count')).getText(), '3 uses');
  console.log('Firefox smoke passed: first-install ready state, revocation, editing without access, native permission denial and approval, restored redirects, missing-key creation, native go/docs address-bar navigation.');
} finally { if (driver) await driver.quit(); server.close(); }
