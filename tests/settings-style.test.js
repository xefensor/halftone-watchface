'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const vm = require('node:vm');
const settingsStyle = require('pebble-xoce-ui/settings-style');
const custom = require('../src/pkjs/settings-page');

function clayHtml() {
  // Use the real installed package, including its actual function/data serializer.
  const box = {module:{exports:{}}, exports:{}, require:name => {
    assert.equal(name, 'message_keys'); return {};
  }, Pebble:{platform:'test', addEventListener(){}}, localStorage:{getItem:()=>null}, console};
  // Clean npm installs keep the bundle in dist.zip; the Pebble SDK expands it.
  const archive = path.join(path.dirname(require.resolve('@rebble/clay/package.json')), 'dist.zip');
  const source=process.env.CLAY_TEST_BUNDLE?fs.readFileSync(process.env.CLAY_TEST_BUNDLE,'utf8'):execFileSync('python3',['-c','import sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read("js/index.js"))',archive],{encoding:'utf8'});
  vm.runInNewContext(source, box);
  const clay = new box.module.exports([], custom, {autoHandleEvents:false, userData:{settingsStyle}});
  // Halftone creates Clay after ready, so the public metadata needs seeding too.
  clay.meta.userData.settingsStyle = settingsStyle;
  return decodeURIComponent(clay.generateUrl().split(',').slice(1).join(','));
}

function runSerializedHook(html, existingStyle) {
  const styles = existingStyle ? [{id:'xoce-settings-style', textContent:existingStyle}] : [];
  const document = {
    getElementById:id => styles.find(style => style.id === id),
    createElement:tag => {assert.equal(tag, 'style'); return {};},
    head:{appendChild:style => styles.push(style)},
    querySelector:() => null
  };
  const box = {window:{}, document};
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .find(match => match[1].includes('window.customFn='));
  assert.ok(script, 'Clay metadata and hook script are present');
  vm.runInNewContext(script[1], box);
  assert.equal(box.window.clayMeta.userData.settingsStyle, settingsStyle);
  // AFTER_BUILD is intentionally not dispatched: this checks the presentation
  // handoff, not form/bridge behaviour already covered by the controller tests.
  box.window.customFn.call({meta:box.window.clayMeta, EVENTS:{AFTER_BUILD:'built'}, on(){}});
  return styles;
}

test('offline legacy Clay transfers the common CSS without a lexical import', () => {
  const styles = runSerializedHook(clayHtml());
  assert.equal(styles.filter(style => style.id === 'xoce-settings-style').length, 1);
  assert.equal(styles.find(style => style.id === 'xoce-settings-style').textContent, settingsStyle);
  assert.ok(styles.some(style => style.id === 'halftone-settings-style'));
});

test('bundled loading and built Clay share one identical base stylesheet', () => {
  const html = fs.readFileSync(require.resolve('../config.html'), 'utf8');
  const embedded = html.match(/<style id="xoce-settings-style">([\s\S]*?)<\/style>/);
  assert.ok(embedded, 'loading has its stylesheet before Clay starts');
  assert.equal(embedded[1], settingsStyle);
  const styles = runSerializedHook(html, embedded[1]);
  assert.equal(styles.filter(style => style.id === 'xoce-settings-style').length, 1);
});
