const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/pkjs/index.js'), 'utf8');

function fixture(settings = {}) {
  const handlers = {};
  const refreshes = [];
  const keys = {REQUEST_WEATHER: 10001, USE_FAHRENHEIT: 10008};
  vm.runInNewContext(source, {
    require: name => {
      if (name === 'message_keys') return keys;
      if (name === '@rebble/clay') return function() {};
      if (name === './config') return [];
      if (name === './weather') return options => {
        assert.equal(options.autoRefresh, true);
        assert.equal(typeof options.cancelLater, 'function');
        return {refresh: unit => refreshes.push(unit)};
      };
      throw Error('Unexpected module ' + name);
    },
    Pebble: {addEventListener: (event, handler) => {handlers[event] = handler;}},
    navigator: {geolocation: {}},
    XMLHttpRequest: function() {},
    localStorage: {getItem: () => JSON.stringify(settings)},
    setTimeout: () => 1,
    clearTimeout: () => {},
    console: {log: () => {}}
  });
  return {handlers, refreshes};
}

test('Named REQUEST_WEATHER received while face stays open triggers refresh', () => {
  const f = fixture();
  f.handlers.ready();
  f.handlers.appmessage({payload: {REQUEST_WEATHER: 1, USE_FAHRENHEIT: 0}});
  f.handlers.appmessage({payload: {REQUEST_WEATHER: 1, USE_FAHRENHEIT: 1}});
  assert.deepEqual(f.refreshes, [false, false, true]);
});

test('Numeric REQUEST_WEATHER remains compatible with older runners', () => {
  const f = fixture();
  f.handlers.appmessage({payload: {10001: 1, 10008: 1}});
  assert.deepEqual(f.refreshes, [true]);
});

test('Explicit false in named payload overrides stored Fahrenheit preference', () => {
  const f = fixture({USE_FAHRENHEIT: true});
  f.handlers.appmessage({payload: {REQUEST_WEATHER: 1, USE_FAHRENHEIT: 0}});
  assert.deepEqual(f.refreshes, [false]);
});

test('Missing unit uses saved preference; unrelated or empty messages do nothing', () => {
  const f = fixture({10008: true});
  f.handlers.appmessage({payload: {REQUEST_WEATHER: 1}});
  f.handlers.appmessage({payload: {TEXT_COLOR: 16777215}});
  f.handlers.appmessage({});
  assert.deepEqual(f.refreshes, [true]);
});
