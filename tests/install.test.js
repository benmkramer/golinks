import test from 'node:test';
import assert from 'node:assert/strict';

test('only first install opens management; rule setup still runs on updates', async () => {
  let installed;
  let opened = 0;
  let updates = 0;
  globalThis.chrome = {
    runtime: { getURL: path => `chrome-extension://test/${path}`, openOptionsPage: async () => { opened++; },
      onInstalled: { addListener: fn => { installed = fn; } }, onStartup: { addListener() {} } },
    action: { onClicked: { addListener() {} } },
    omnibox: { onInputChanged: { addListener() {} }, onInputEntered: { addListener() {} } },
    declarativeNetRequest: { updateDynamicRules: async () => { updates++; } }
  };
  await import('../src/background.js');
  installed({ reason: 'install' });
  assert.equal(opened, 1); assert.equal(updates, 1);
  installed({ reason: 'update' });
  assert.equal(opened, 1); assert.equal(updates, 2);
});
