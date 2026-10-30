const assert = require('node:assert/strict');
const {test} = require('node:test');
const createSharedWeather = require('../src/pkjs/shared-weather');

const WEATHER = '00000000-0000-0000-0001-000000000002';
const PREFS = '00000000-0000-0000-0001-000000000009';
const KEYS = {
  TEMPERATURE: 10000, USE_FAHRENHEIT: 10008,
  TEMPERATURE_FAHRENHEIT: 10009, WEATHER_UPDATED_AT: 10010,
  FORECAST_DATA: 10011, WEATHER_CLEAR: 10014
};
const MIDNIGHT = 1791849600;
const NOW = (MIDNIGHT + 12 * 3600 + 900) * 1000;

function instance(id = 'current', temp = 20, unit = '°C', values) {
  return {
    instanceId: id,
    properties: {
      name: {shortText: {text: id}},
      temperature: {numericValue: {value: temp, unit}, shortText: {text: temp + unit}},
      hourly_temperature: {series: {
        start: MIDNIGHT, stepSec: 3600,
        numericValue: {values: values || Array.from({length: 48}, (_, i) => 10 + i), unit}
      }}
    }
  };
}

function fixture(overrides = {}) {
  let now = overrides.now || NOW;
  let enabled = overrides.enabled !== false;
  let hold = !!overrides.hold;
  let enumerationError = null;
  let synchronousUnavailable = !!overrides.synchronousUnavailable;
  let nextTimer = 0;
  const data = overrides.data || {};
  const settings = Object.assign({followPebbleUnits: false, useFahrenheit: false, locationId: ''}, overrides.settings);
  const subscriptions = [];
  const deliveries = [];
  const callbacks = [];
  const timers = new Map();
  const legacyRefreshes = [];
  let legacyStops = 0;
  const storage = {
    getItem: key => data[key] === undefined ? null : data[key],
    setItem: (key, value) => {data[key] = value;}
  };
  const pebble = {
    enumeratePlugins: () => {
      if (enumerationError) throw enumerationError;
      return enabled ? [{uuid: WEATHER}, {uuid: PREFS}] : [];
    },
    subscribeToSource: request => {
      const subscription = {request, closed: false};
      subscriptions.push(subscription);
      if (synchronousUnavailable && request.category === 'weather') {
        synchronousUnavailable = false;
        request.onError({code: 'PLUGIN_UNAVAILABLE', message: 'Not ready'});
      }
      return {unsubscribe: () => {subscription.closed = true;}};
    }
  };
  const router = createSharedWeather({
    pebble, keys: KEYS, storage, getSettings: () => settings,
    legacy: () => ({refresh: unit => legacyRefreshes.push(unit), stop: () => {legacyStops++;}}),
    now: () => now, log: () => {},
    later: (fn, delay) => {const id = ++nextTimer; timers.set(id, {fn, at: now + delay}); return id;},
    cancelLater: id => timers.delete(id),
    send: (payload, success, failure) => {
      deliveries.push(payload);
      callbacks.push({success, failure});
      if (!hold) success();
    }
  });
  function latest(category) {
    const sub = subscriptions.filter(s => !s.closed && s.request.category === category).at(-1);
    assert.ok(sub, 'Expected active ' + category + ' subscription');
    return sub.request;
  }
  return {
    router, settings, subscriptions, deliveries, callbacks, data, legacyRefreshes,
    stops: () => legacyStops,
    enabled: value => {enabled = value;}, hold: value => {hold = value;},
    enumerationError: value => {enumerationError = value;},
    weather: (instances = [instance()], extra = {}) => latest('weather').onData(Object.assign({pluginUuid: WEATHER, validUntilMs: null, instances}, extra)),
    units: unit => latest('preferences').onData({pluginUuid: PREFS, instances: [{instanceId: 'units', properties: {temperature: {shortText: {text: unit}}}}]}),
    error: code => latest('weather').onError({code, message: code}),
    readings: () => deliveries.filter(p => p[KEYS.TEMPERATURE] !== undefined),
    advance: ms => {now += ms;},
    tick: ms => {
      const until = now + ms;
      let count = 0;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        assert.ok(++count < 100, 'Timer loop must settle');
        now = due[1].at;
        timers.delete(due[0]);
        due[1].fn();
      }
      now = until;
    }
  };
}

function lastReading(f) {
  const value = f.readings().at(-1);
  assert.ok(value, 'Expected a delivered temperature');
  return value;
}

test('Disabled preview falls back even when the plugin API functions exist', () => {
  const f = fixture({enabled: false, settings: {useFahrenheit: true}});
  f.router.refresh(true);
  assert.deepEqual(f.legacyRefreshes, [true]);
  assert.equal(f.subscriptions.length, 0);
});

test('Shared weather pins the built-in source and requests only weather values', () => {
  const f = fixture();
  f.router.refresh(false);
  const request = f.subscriptions.find(s => s.request.category === 'weather').request;
  assert.equal(request.plugin, WEATHER);
  assert.equal(request.item, 'location');
  assert.ok(request.properties.includes('temperature'));
  assert.ok(request.properties.includes('hourly_temperature'));
  assert.equal(request.iconPixelSize, undefined);
  f.weather();
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 20);
  assert.equal(f.legacyRefreshes.length, 0);
});

test('Permission denial, transient errors and empty plugin data do not switch weather providers', () => {
  const f = fixture();
  f.router.refresh(false);
  for (const code of ['PERMISSION_DENIED', 'TIMEOUT', 'UNKNOWN']) f.error(code);
  f.weather([]);
  f.router.refresh(false);
  assert.deepEqual(f.legacyRefreshes, []);
  assert.ok(f.subscriptions.some(s => !s.closed && s.request.category === 'weather'));
  f.weather();
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 20);
});

test('An initial empty shared snapshot preserves the offline watch cache until an explicit location change', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather([]);
  assert.ok(!f.deliveries.some(p => p[KEYS.WEATHER_CLEAR]),
    'Starting offline must leave the watch\'s persisted forecast available');
  f.settings.locationId = 'another-place';
  f.router.configure();
  assert.ok(f.deliveries.some(p => p[KEYS.WEATHER_CLEAR] === 1),
    'Changing the requested location must clear forecasts belonging to the previous place');
});

test('Enabling plugins stops the legacy client before shared weather is used', () => {
  const f = fixture({enabled: false});
  f.router.refresh(false);
  f.enabled(true);
  f.router.refresh(false);
  assert.ok(f.stops() >= 1);
  f.weather();
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 20);
  assert.deepEqual(f.legacyRefreshes, [false]);
});

test('An envelope from another plugin cannot replace Pebble weather', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather([instance()], {pluginUuid: 'different-plugin'});
  assert.equal(f.readings().length, 0);
});

test('A temporary enumeration failure cannot switch an established shared source to legacy weather', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather();
  const stamp = lastReading(f)[KEYS.WEATHER_UPDATED_AT];
  f.enumerationError(Error('Host temporarily unavailable'));
  f.advance(10 * 60000);
  f.router.refresh(false);
  assert.deepEqual(f.legacyRefreshes, []);
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], stamp);
  f.enumerationError(null);
  f.router.refresh(false);
  f.weather([instance('current', 21)]);
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 21);
});

test('Synchronous unavailable errors leave no stale handle blocking a later subscription', () => {
  const f = fixture({synchronousUnavailable: true});
  f.router.refresh(false);
  f.router.refresh(false);
  assert.equal(f.subscriptions.filter(s => s.request.category === 'weather').length, 2);
  f.weather();
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 20);
  assert.deepEqual(f.legacyRefreshes, []);
});

test('The first configured location is default; an explicit selection uses its stable ID', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather([instance('home', 12), instance('office', 24)]);
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 12);
  f.settings.locationId = 'office';
  f.router.configure();
  f.weather([instance('home', 12), instance('office', 24)]);
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 24);
});

test('A missing selected location never silently displays a different city', () => {
  const f = fixture({settings: {locationId: 'missing'}});
  f.router.refresh(false);
  f.weather([instance('home', 12), instance('office', 24)]);
  assert.equal(f.readings().length, 0);
  assert.equal(f.legacyRefreshes.length, 0);
});

test('Malformed or missing temperature shapes are ignored safely', () => {
  const f = fixture();
  f.router.refresh(false);
  for (const bad of [null, {}, {numericValue: {value: '20', unit: '°C'}}, {numericValue: {value: Infinity, unit: '°C'}}, {numericValue: {value: 200, unit: '°C'}}, {numericValue: {value: 20, unit: 'K'}}]) {
    const item = instance();
    item.properties.temperature = bad;
    assert.doesNotThrow(() => f.weather([item]));
  }
  assert.equal(f.readings().length, 0);
});

test('Malformed instance entries cannot crash the subscription callback', () => {
  const f = fixture();
  f.router.refresh(false);
  assert.doesNotThrow(() => f.weather([null, {}, instance('valid', 16)]));
});

test('Native Fahrenheit is retained without conversion through rounded Celsius', () => {
  const f = fixture({settings: {useFahrenheit: true}});
  f.router.refresh(true);
  f.weather([instance('current', 44, '°F', Array(48).fill(44))]);
  const p = lastReading(f);
  assert.equal(p[KEYS.TEMPERATURE_FAHRENHEIT], 44);
  assert.equal(p[KEYS.TEMPERATURE], 7);
  const bytes = Buffer.from(p[KEYS.FORECAST_DATA]);
  assert.equal(bytes.readInt16LE(11), 44);
});

test('Follow Pebble units synchronizes the watch while explicit unit preferences remain independent', () => {
  const f = fixture({settings: {followPebbleUnits: true}});
  f.router.refresh(false);
  f.units('°F');
  f.weather([instance()]);
  assert.ok(f.deliveries.some(p => p[KEYS.USE_FAHRENHEIT] === 1));
  f.units('°C');
  assert.ok(f.deliveries.some(p => p[KEYS.USE_FAHRENHEIT] === 0));
  f.settings.followPebbleUnits = false;
  f.settings.useFahrenheit = true;
  f.router.configure();
  const before = f.deliveries.length;
  f.units('°C');
  f.weather([instance()]);
  assert.ok(!f.deliveries.slice(before).some(p => p[KEYS.USE_FAHRENHEIT] === 0));
});

test('Follow Pebble infers the global display unit from weather when Preferences cannot respond', () => {
  const f = fixture({settings: {followPebbleUnits: true, useFahrenheit: false}});
  f.router.refresh(false);
  f.subscriptions.find(s => s.request.category === 'preferences').request.onError({code: 'PLUGIN_UNAVAILABLE'});
  f.weather([instance('current', 44, '°F', Array(48).fill(44))]);
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT], 1);
  assert.equal(lastReading(f)[KEYS.TEMPERATURE_FAHRENHEIT], 44);
  f.weather([instance('current', 7, '°C', Array(48).fill(7))]);
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT], 0);
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 7);
  assert.deepEqual(f.legacyRefreshes, []);
});

test('Hourly forecasts select the current UTC hour from a series beginning at midnight', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather();
  const b = Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]);
  assert.equal(b.readUInt32LE(0), MIDNIGHT + 12 * 3600);
  assert.equal(b[8], 7);
  assert.equal(b.readInt16LE(9), 22);
  assert.equal(b.readInt16LE(9 + 6 * 4), 28);
});

test('A null hourly point cannot shift later hours into its position', () => {
  const f = fixture();
  f.router.refresh(false);
  const values = Array.from({length: 48}, (_, i) => i);
  values[14] = null;
  f.weather([instance('current', 20, '°C', values)]);
  const bytes = lastReading(f)[KEYS.FORECAST_DATA];
  if (bytes.length) {
    const b = Buffer.from(bytes);
    assert.ok(b[8] <= 2, 'Only a contiguous prefix before the missing hour is valid');
    assert.equal(b.readInt16LE(9), 12);
  }
});

test('Repeated cached data and restarting PKJS do not renew weather or forecast age', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather();
  const first = lastReading(f);
  const firstForecastAt = Buffer.from(first[KEYS.FORECAST_DATA]).readUInt32LE(4);
  f.advance(40 * 60000);
  f.weather();
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], first[KEYS.WEATHER_UPDATED_AT]);
  assert.equal(Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4), firstForecastAt);
  const restarted = fixture({now: NOW + 60 * 60000, data: f.data});
  restarted.router.refresh(false);
  restarted.weather();
  assert.equal(lastReading(restarted)[KEYS.WEATHER_UPDATED_AT], first[KEYS.WEATHER_UPDATED_AT]);
  assert.equal(Buffer.from(lastReading(restarted)[KEYS.FORECAST_DATA]).readUInt32LE(4), firstForecastAt);
});

test('A changed weather snapshot is allowed a new first-seen timestamp', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather();
  const first = lastReading(f)[KEYS.WEATHER_UPDATED_AT];
  f.advance(40 * 60000);
  f.weather([instance('current', 21)]);
  assert.ok(lastReading(f)[KEYS.WEATHER_UPDATED_AT] > first);
});

test('Switching A to B and back to A preserves each location age across a restart', () => {
  const f = fixture({settings: {locationId: 'home'}});
  f.router.refresh(false);
  const locations = [instance('home', 20), instance('office', 25)];
  f.weather(locations);
  const homeStamp = lastReading(f)[KEYS.WEATHER_UPDATED_AT];
  f.advance(20 * 60000);
  f.settings.locationId = 'office';
  f.router.configure();
  const officeStamp = lastReading(f)[KEYS.WEATHER_UPDATED_AT];
  assert.ok(officeStamp > homeStamp);
  f.advance(20 * 60000);
  f.settings.locationId = 'home';
  f.router.configure();
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], homeStamp);
  assert.equal(Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4), homeStamp);
  const restarted = fixture({now: NOW + 60 * 60000, data: f.data, settings: {locationId: 'office'}});
  restarted.router.refresh(false);
  restarted.weather(locations);
  assert.equal(lastReading(restarted)[KEYS.WEATHER_UPDATED_AT], officeStamp);
});

test('The original single-location first-seen cache migrates without resetting its age', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather();
  const cacheKey = Object.keys(f.data)[0];
  const samples = JSON.parse(f.data[cacheKey]).samples;
  const migratedData = {[cacheKey]: JSON.stringify(samples[0])};
  const restarted = fixture({now: NOW + 60 * 60000, data: migratedData});
  restarted.router.refresh(false);
  restarted.weather();
  assert.equal(lastReading(restarted)[KEYS.WEATHER_UPDATED_AT], NOW / 1000);
  assert.equal(JSON.parse(migratedData[cacheKey]).samples.length, 1);
});

test('Remembered location ages remain bounded to the sixteen most recently used locations', () => {
  const f = fixture();
  f.router.refresh(false);
  for (let i = 0; i < 20; i++) f.weather([instance('place-' + i, i)]);
  const cache = JSON.parse(f.data[Object.keys(f.data)[0]]);
  assert.equal(cache.samples.length, 16);
  assert.equal(cache.samples[0].identity, WEATHER + '/place-4');
  assert.equal(cache.samples[15].identity, WEATHER + '/place-19');
});

test('A hung delivery has a bounded retry, and a newer queued reading wins over old callbacks', () => {
  const f = fixture({hold: true});
  f.router.refresh(false);
  f.weather([instance('current', 20)]);
  assert.ok(f.callbacks.length > 0);
  const old = f.callbacks[0];
  f.weather([instance('current', 25)]);
  f.tick(10000);
  assert.ok(f.callbacks.length > 1, 'Delivery deadline must make progress');
  old.success();
  f.hold(false);
  f.callbacks.at(-1).success();
  f.tick(10000);
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 25);
  assert.equal(f.legacyRefreshes.length, 0);
});

test('Location replacement remains atomic when its queued update is superseded before delivery', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather([instance('home', 20), instance('office', 25)]);
  f.hold(true);
  // An ordinary home update is already in flight when the user selects office.
  f.weather([instance('home', 21), instance('office', 25)]);
  f.settings.locationId = 'office';
  f.router.configure();
  // Another envelope supersedes the first queued office payload before it gets sent.
  f.weather([instance('home', 21), instance('office', 26)]);
  f.tick(10000);
  const replacement = lastReading(f);
  assert.equal(replacement[KEYS.TEMPERATURE], 26);
  assert.equal(replacement[KEYS.WEATHER_CLEAR], 1,
    'The location cache must be cleared in the same message as its replacement reading');
});
