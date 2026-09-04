import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsPage, analyticsReferrer, readConsent, saveConsent, clearAnalyticsCookies } from '../src/front/js/app/analytics.mjs';

test('removes recipe IDs, private queries and hashes', () => {
  const result = analyticsPage('https://kitchen.example/dashboard/recipes/123?email=private@example.com#secret');
  assert.equal(result.location, 'https://kitchen.example/dashboard/recipes/detail');
  assert.equal(result.path, '/dashboard/recipes/detail');
});
test('never includes recovery tokens or unknown path contents', () => {
  assert.equal(analyticsPage('https://kitchen.example/passwordreset/SECRET').path, '/passwordreset');
  assert.equal(analyticsPage('https://kitchen.example/private@example.com').path, '/404');
});
test('preserves valid campaign attribution only', () => {
  const result = analyticsPage('https://kitchen.example/?utm_source=linkedin&utm_medium=social&utm_campaign=portfolio&email=secret&utm_content=user%40example.com');
  assert.equal(result.location, 'https://kitchen.example/?utm_source=linkedin&utm_medium=social&utm_campaign=portfolio');
});
test('normalizes trailing slashes and strips referrer path and query', () => {
  assert.equal(analyticsPage('https://kitchen.example/dashboard/').path, '/dashboard');
  assert.equal(analyticsReferrer('https://linkedin.com/in/private?token=secret'), 'https://linkedin.com/');
  assert.equal(analyticsReferrer(''), '');
});
test('consent expires after 180 days and malformed values fail closed', () => {
  const stored = { getItem: () => JSON.stringify({choice:'granted',date:1000}) };
  assert.equal(readConsent(stored, 2000), 'granted');
  assert.equal(readConsent(stored, 1000 + 180 * 86400000), '');
  assert.equal(readConsent({getItem:()=>'{broken'}), '');
  assert.equal(readConsent({getItem:()=>{throw Error('Blocked');}}), '');
});
test('persists rejection and removes only analytics cookies', () => {
  let value;
  saveConsent({setItem:(key,next)=>{value=next;}}, 'denied');
  assert.equal(readConsent({getItem:()=>value}), 'denied');
  const deleted=[];
  clearAnalyticsCookies({get cookie(){return '_ga=abc; _ga_EXAMPLE=def; session=keep';},set cookie(v){deleted.push(v);}}, 'app.example.com');
  assert.equal(deleted.length, 6);
  assert.ok(deleted.every(v=>v.startsWith('_ga')));
});
