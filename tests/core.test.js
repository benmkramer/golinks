import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKey, validateURL, parseImport, redirectRule, escapeXML } from '../src/core.js';

test('keys have a consistent, URL-friendly canonical form', () => {
  assert.equal(normalizeKey(' GO/Team_Docs-2 '), 'team_docs-2');
  for (const key of ['', '../docs', 'docs/team', 'hello world', '_private', 'x'.repeat(65), 'docs?x', 'café']) assert.throws(() => normalizeKey(key));
  assert.equal(normalizeKey('x'.repeat(64)).length, 64);
});
test('destinations retain query strings and fragments', () => {
  assert.equal(validateURL(' https://example.com/a?q=1#section '), 'https://example.com/a?q=1#section');
  assert.equal(validateURL('http://localhost:3000'), 'http://localhost:3000/');
});
test('destinations reject code, credentials, malformed URLs and go loops', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test', 'example.com', 'https://user:pass@example.com', 'http://go/docs', 'https://GO.:80/docs']) assert.throws(() => validateURL(url));
});
test('import validates the whole input and rejects normalized duplicates', () => {
  assert.deepEqual(parseImport('{"Docs":"https://example.com"}'), { docs: 'https://example.com/' });
  for (const text of ['null', '[]', '"abc"', '{"a":12}', '{"a":"https://example.com","bad":"javascript:alert(1)"}', '{"Docs":"https://a.com","docs":"https://b.com"}']) assert.throws(() => parseImport(text));
  assert.equal(Object.hasOwn(parseImport('{"constructor":"https://example.com"}'), 'constructor'), true);
});
test('routing matches only go navigations and preserves the key', () => {
  const rule = redirectRule('chrome-extension://test/');
  const regex = new RegExp(rule.condition.regexFilter, 'i');
  assert.equal(regex.exec('http://go/docs')[1], 'docs');
  assert.equal(regex.exec('https://go/Docs?q=1#test')[1], 'Docs');
  assert.equal(regex.exec('http://go/')[1], '');
  for (const url of ['http://go.example.com/docs', 'http://example.com/go/docs', 'http://go:3000/docs']) assert.equal(regex.test(url), false);
  assert.deepEqual(rule.condition.resourceTypes, ['main_frame']);
  assert.equal(rule.action.redirect.regexSubstitution, 'chrome-extension://test/resolve.html#\\1');
});
test('suggestion URLs cannot inject omnibox markup', () => {
  assert.equal(escapeXML('<x a="b">&\''), '&lt;x a=&quot;b&quot;&gt;&amp;&apos;');
});
