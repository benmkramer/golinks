import test from 'node:test';
import assert from 'node:assert/strict';
import { setupPermissions, GO_HOSTS } from '../src/permissions.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
function event() {
  const listeners = new Set();
  return { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn), fire: () => listeners.forEach(fn => fn()) };
}
function fixture(initial = false) {
  let granted = initial;
  let inClick = false;
  const calls = [];
  const permissions = {
    contains: async hosts => { assert.deepEqual(hosts, GO_HOSTS); return granted; },
    request: hosts => { assert.ok(inClick, 'request must run synchronously during the click'); calls.push(hosts); return Promise.resolve(false); },
    onAdded: event(), onRemoved: event()
  };
  const button = new EventTarget();
  const view = { button, panel: {}, ready: {}, message: {} };
  const controller = setupPermissions(permissions, view);
  return { permissions, view, controller, calls,
    setGrant(value) { granted = value; },
    click() { inClick = true; button.dispatchEvent(new Event('click')); inClick = false; }
  };
}

test('already granted: no request, setup hidden', async () => {
  const f = fixture(true); await f.controller.initialized; f.click();
  assert.equal(f.view.panel.hidden, true); assert.equal(f.view.ready.hidden, false);
  assert.equal(f.calls.length, 0);
});
test('missing: setup stays visible and requests exactly both hosts on click', async () => {
  const f = fixture(); await f.controller.initialized;
  assert.equal(f.view.panel.hidden, false); assert.equal(f.view.button.disabled, false);
  assert.equal(f.calls.length, 0); f.click();
  assert.deepEqual(f.calls, [{ origins: ['http://go/*', 'https://go/*'] }]);
  assert.equal(f.view.button.disabled, true); await tick();
});
test('denied: preserve setup and allow retry', async () => {
  const f = fixture(); await f.controller.initialized; f.click(); await tick();
  assert.equal(f.view.panel.hidden, false); assert.equal(f.view.ready.hidden, true);
  assert.match(f.view.message.textContent, /not granted/); assert.equal(f.view.button.disabled, false);
  f.click(); await tick(); assert.equal(f.calls.length, 2);
});
test('newly granted: recheck actual grants, then hide setup', async () => {
  const f = fixture(); await f.controller.initialized;
  f.permissions.request = hosts => { assert.deepEqual(hosts, GO_HOSTS); f.setGrant(true); f.permissions.onAdded.fire(); return Promise.resolve(true); };
  f.click(); await tick();
  assert.equal(f.view.panel.hidden, true); assert.equal(f.view.ready.hidden, false);
});
test('a true request result without both actual grants cannot mark ready', async () => {
  const f = fixture(); await f.controller.initialized;
  f.permissions.request = () => Promise.resolve(true); f.click(); await tick();
  assert.equal(f.view.panel.hidden, false); assert.equal(f.view.ready.hidden, true);
});
test('external additions and revocations update readiness without requesting', async () => {
  const f = fixture(); await f.controller.initialized;
  f.setGrant(true); f.permissions.onAdded.fire(); await tick(); assert.equal(f.view.panel.hidden, true);
  f.setGrant(false); f.permissions.onRemoved.fire(); await tick();
  assert.equal(f.view.panel.hidden, false); assert.equal(f.view.ready.hidden, true);
  assert.equal(f.view.button.disabled, false); assert.equal(f.calls.length, 0);
});
test('request rejection and synchronous exceptions leave a usable retry', async () => {
  for (const request of [() => Promise.reject(new Error('browser rejected request')), () => { throw new Error('browser rejected request'); }]) {
    const f = fixture(); await f.controller.initialized; f.permissions.request = request; f.click(); await tick();
    assert.equal(f.view.panel.hidden, false); assert.equal(f.view.button.disabled, false);
    assert.match(f.view.message.textContent, /Could not enable.*browser rejected request/);
  }
});
test('contains errors do not hide setup or claim readiness', async () => {
  const f = fixture(); await f.controller.initialized;
  f.permissions.contains = () => Promise.reject(new Error('unavailable'));
  await f.controller.refresh();
  assert.equal(f.view.panel.hidden, false); assert.equal(f.view.ready.hidden, true);
  assert.match(f.view.message.textContent, /Could not check/);
});
test('a stale check cannot overwrite a newer revocation', async () => {
  const f = fixture(true); await f.controller.initialized;
  let resolveOld;
  f.permissions.contains = () => new Promise(resolve => { resolveOld = resolve; });
  const old = f.controller.refresh();
  f.permissions.contains = async () => false;
  f.permissions.onRemoved.fire(); await tick(); resolveOld(true); await old;
  assert.equal(f.view.panel.hidden, false);
});
