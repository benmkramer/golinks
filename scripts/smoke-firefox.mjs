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
  await driver.get('http://go/');
  await driver.wait(until.elementLocated(By.id('key')), 10000);
  await driver.findElement(By.id('key')).sendKeys('docs');
  await driver.findElement(By.id('url')).sendKeys(destination);
  await driver.findElement(By.id('save')).click();
  await driver.wait(until.elementTextContains(driver.findElement(By.id('status')), 'Saved go/docs.'), 10000);
  for (const url of ['http://go/docs', 'https://go/DOCS']) {
    await driver.get(url); await driver.wait(until.urlIs(destination), 10000);
  }
  await driver.get('http://go/missing');
  await driver.wait(until.elementTextContains(driver.findElement(By.id('title')), 'go/missing is available'), 10000);
  await driver.findElement(By.id('manage')).click();
  assert.equal(await driver.findElement(By.id('key')).getProperty('value'), 'missing');
  // Exercise the native address bar, not WebDriver URL navigation.
  await driver.setContext('chrome');
  await driver.executeScript("Services.prefs.setBoolPref('browser.fixup.domainwhitelist.go', true);");
  const addressBar = await driver.findElement(By.css('input.urlbar-input'));
  await addressBar.clear();
  await addressBar.sendKeys('go/docs', Key.ENTER);
  await driver.setContext('content');
  await driver.wait(until.urlIs(destination), 10000);
  console.log('Firefox smoke passed: editor, HTTP/HTTPS redirects, missing-key creation, native go/docs address-bar navigation with the go host preference.');
} finally { if (driver) await driver.quit(); server.close(); }
