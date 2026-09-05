import test from 'node:test';
import assert from 'node:assert/strict';

test('independent saves do not overwrite other keys; delete touches only its key', async () => {
  const data = { settings: 'unrelated' };
  globalThis.chrome = { storage: { local: {
    get: async () => ({ ...data }),
    set: async values => Object.assign(data, values),
    remove: async keys => { for (const key of keys) delete data[key]; }
  } } };
  const { readLinks, saveLinks, deleteLink } = await import('../src/store.js');
  await Promise.all([saveLinks({ docs: 'https://example.com/' }), saveLinks({ constructor: 'https://example.org/' })]);
  assert.deepEqual(await readLinks(), { docs: 'https://example.com/', constructor: 'https://example.org/' });
  await deleteLink('docs');
  assert.deepEqual(await readLinks(), { constructor: 'https://example.org/' });
  assert.equal(data.settings, 'unrelated');
});
