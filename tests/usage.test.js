import test from 'node:test';
import assert from 'node:assert/strict';

const data = { 'link:docs': 'https://example.com/', unrelated: true };
let receive;
let failNextWrite = false;
globalThis.chrome = {
  storage: { local: {
    get: async () => ({ ...data }),
    set: async values => {
      await new Promise(resolve => setTimeout(resolve, 1));
      if (failNextWrite) { failNextWrite = false; throw new Error('Storage unavailable'); }
      Object.assign(data, values);
    },
    remove: async keys => { for (const key of keys) delete data[key]; }
  } },
  runtime: { id: 'test', onMessage: { addListener: fn => { receive = fn; } },
    onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
  action: { onClicked: { addListener() {} } },
  omnibox: { onInputChanged: { addListener() {} }, onInputEntered: { addListener() {} } }
};
await import('../src/background.js');
const { readLinks, readUsage, saveLinks } = await import('../src/store.js');
function send(type, key) {
  return new Promise(resolve => assert.equal(receive({ type, key }, { id: 'test' }, resolve), true));
}

test('usage is durable, serialized across simultaneous opens, and independent of mappings', async () => {
  assert.deepEqual(await readUsage(), {});
  const results = await Promise.all(Array.from({ length: 25 }, () => send('record-use', 'docs')));
  assert.ok(results.every(result => result.ok));
  assert.deepEqual(await readUsage(), { docs: 25 });
  await saveLinks({ docs: 'https://example.org/' });
  assert.deepEqual(await readUsage(), { docs: 25 });
  assert.deepEqual(await readLinks(), { docs: 'https://example.org/' });
  await send('record-use', 'missing');
  assert.deepEqual(await readUsage(), { docs: 25 });
  failNextWrite = true;
  assert.deepEqual(await send('record-use', 'docs'), { error: 'Storage unavailable' });
  await send('record-use', 'docs');
  assert.deepEqual(await readUsage(), { docs: 26 });
  // Deleting between visits must remove the counter and prevent an orphan write.
  await Promise.all([send('record-use', 'docs'), send('delete-link', 'docs'), send('record-use', 'docs')]);
  assert.deepEqual(await readUsage(), {});
  await saveLinks({ docs: 'https://example.com/' });
  await send('record-use', 'docs');
  assert.deepEqual(await readUsage(), { docs: 1 });
  assert.equal(data.unrelated, true);
  assert.ok((await send('record-use', 'bad/key')).error);
});
