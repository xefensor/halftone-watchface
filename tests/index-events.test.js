const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/pkjs/index.js'), 'utf8');

function fixture(settings = {}) {
  const handlers = {};
  const refreshes = [];
  const deliveries = [];
  const urls = [];
  let saved = JSON.stringify(settings);
  let coordinatorOptions;
  let clay;
  let configured = 0;
  let legacyMode = false;
  let legacyOptions;
  const places = [];
  const keys = {
    REQUEST_WEATHER: 10001, TEXT_COLOR: 10003, USE_FAHRENHEIT: 10008,
    FOLLOW_PEBBLE_UNITS: 10012, WEATHER_LOCATION: 10013
  };
  const storage = {
    getItem: () => saved,
    setItem: (_key, value) => {saved = value;}
  };
  vm.runInNewContext(source, {
    require: name => {
      if (name === 'message_keys') return keys;
      if (name === '@rebble/clay') return function(config, _custom, options) {
        assert.equal(options.autoHandleEvents, false);
        this.config = JSON.parse(JSON.stringify(config));
        this.generateUrl = () => 'data:text/html,settings';
        this.getSettings = response => {
          const raw = JSON.parse(response);
          const flat = Object.fromEntries(Object.entries(raw).map(([key, value]) =>
            [key, value && typeof value === 'object' ? value.value : value]));
          saved = JSON.stringify(flat);
          return Object.fromEntries(Object.entries(flat).map(([key, value]) =>
            [keys[key] === undefined ? key : keys[key], typeof value === 'boolean' ? Number(value) : value]));
        };
        clay = this;
      };
      if (name === './config') return [{type: 'section', items: [{messageKey: 'WEATHER_LOCATION', options: []}]}];
      if (name === './weather') return options => {
        legacyOptions = options;
        assert.equal(options.autoRefresh, true);
        assert.equal(typeof options.cancelLater, 'function');
        return {refresh: () => {}, stop: () => {}};
      };
      if (name === './shared-weather') return options => {
        coordinatorOptions = options;
        return {
          refresh: unit => refreshes.push(unit),
          configure: () => {configured++;},
          locations: () => places.slice(),
          isLegacy: () => legacyMode
        };
      };
      throw Error('Unexpected module ' + name);
    },
    Pebble: {
      addEventListener: (event, handler) => {handlers[event] = handler;},
      sendAppMessage: (payload, success) => {deliveries.push(payload); if (success) success();},
      openURL: url => urls.push(url)
    },
    navigator: {geolocation: {}},
    XMLHttpRequest: function() {}, localStorage: storage,
    setTimeout: () => 1, clearTimeout: () => {},
    console: {log: () => {}}
  });
  return {
    handlers, refreshes, deliveries, urls, places, clay, keys,
    coordinatorOptions, settings: () => JSON.parse(saved), configured: () => configured,
    legacyMode: value => {legacyMode = value;}, legacyOptions: () => legacyOptions
  };
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

test('New installs follow Pebble units; existing named and numeric choices are retained', () => {
  const fresh = fixture();
  fresh.handlers.ready();
  assert.equal(fresh.settings().FOLLOW_PEBBLE_UNITS, true);
  assert.equal(fresh.coordinatorOptions.getSettings().followPebbleUnits, true);
  for (const previous of [{USE_FAHRENHEIT: true}, {USE_FAHRENHEIT: false}, {10008: true}, {TEXT_COLOR: 123}]) {
    const f = fixture(previous);
    f.handlers.ready();
    assert.equal(f.settings().FOLLOW_PEBBLE_UNITS, false);
    for (const [key, value] of Object.entries(previous)) assert.equal(f.settings()[key], value);
  }
});

test('Migration does not reset an existing Follow Pebble choice', () => {
  for (const value of [false, true]) {
    const f = fixture({FOLLOW_PEBBLE_UNITS: value, USE_FAHRENHEIT: true});
    f.handlers.ready();
    f.handlers.showConfiguration();
    assert.equal(f.settings().FOLLOW_PEBBLE_UNITS, value);
  }
});

test('Settings picker contains current Pebble locations and retains a missing selected ID', () => {
  const f = fixture({WEATHER_LOCATION: 'missing', USE_FAHRENHEIT: false});
  f.places.push({id: 'home', name: 'Home'}, {id: 'office', name: 'Office'});
  f.handlers.showConfiguration();
  const choices = f.clay.config[0].items[0].options;
  assert.equal(choices[0].value, '');
  assert.equal(choices.find(c => c.value === 'home').label, 'Home');
  assert.equal(choices.find(c => c.value === 'office').label, 'Office');
  assert.match(choices.find(c => c.value === 'missing').label, /unavailable/i);
  assert.equal(f.places.length, 2, 'The current source list is not mutated by the picker');
  assert.deepEqual(f.urls, ['data:text/html,settings']);
});

test('Saving settings keeps JS preferences on the phone and lets Pebble global units win', () => {
  const f = fixture();
  f.handlers.webviewclosed({response: JSON.stringify({
    FOLLOW_PEBBLE_UNITS: {value: true}, WEATHER_LOCATION: {value: 'office'},
    USE_FAHRENHEIT: {value: false}, TEXT_COLOR: {value: 123}
  })});
  assert.equal(f.deliveries.length, 1);
  const payload = f.deliveries[0];
  assert.equal(payload[f.keys.FOLLOW_PEBBLE_UNITS], undefined);
  assert.equal(payload[f.keys.WEATHER_LOCATION], undefined);
  assert.equal(payload[f.keys.USE_FAHRENHEIT], undefined);
  assert.equal(payload[f.keys.TEXT_COLOR], 123);
  assert.equal(f.settings().FOLLOW_PEBBLE_UNITS, true);
  assert.equal(f.settings().WEATHER_LOCATION, 'office');
  assert.equal(f.configured(), 1);
});

test('Saving an explicit unit still delivers it and cancelled/invalid settings do nothing', () => {
  const f = fixture();
  f.handlers.webviewclosed({response: JSON.stringify({FOLLOW_PEBBLE_UNITS: false, USE_FAHRENHEIT: true})});
  assert.equal(f.deliveries[0][f.keys.USE_FAHRENHEIT], 1);
  f.handlers.webviewclosed({});
  f.handlers.webviewclosed({response: 'invalid-json'});
  assert.equal(f.deliveries.length, 1);
  assert.equal(f.configured(), 1);
});

test('Late legacy deliveries are gated after switching to shared weather', () => {
  const f = fixture();
  f.coordinatorOptions.legacy();
  let failed = 0;
  f.legacyOptions().send({10000: 20}, () => {}, () => {failed++;});
  assert.equal(f.deliveries.length, 0);
  assert.equal(failed, 1);
  f.legacyMode(true);
  f.legacyOptions().send({10000: 20}, () => {}, () => {failed++;});
  assert.equal(f.deliveries.length, 1);
});
