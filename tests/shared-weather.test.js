const assert = require('node:assert/strict');
const {test} = require('node:test');
const createSharedWeather = require('../src/pkjs/shared-weather');

const WEATHER = '00000000-0000-0000-0001-000000000002';
const PREFS = '00000000-0000-0000-0001-000000000009';
const KEYS = {
  TEMPERATURE: 10000, USE_FAHRENHEIT: 10008,
  TEMPERATURE_FAHRENHEIT: 10009, WEATHER_UPDATED_AT: 10010,
  FORECAST_DATA: 10011, WEATHER_CLEAR: 10014, WEATHER_DETAILS:10015
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
  const reads = [];
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
      const oneShot = request.category === 'weather' &&
        subscriptions.some(s => !s.closed && !s.oneShot && s.request.category === 'weather');
      const subscription = {request, closed: false, oneShot};
      subscriptions.push(subscription);
      if (oneShot) reads.push({request, subscription,
        resolve: envelope => request.onData(envelope), reject: error => request.onError(error)});
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
    const active = subscriptions.filter(s => !s.closed && s.request.category === category);
    const sub = active.find(s => !s.oneShot) || active.at(-1);
    assert.ok(sub, 'Expected active ' + category + ' subscription');
    return sub.request;
  }
  return {
    router, settings, subscriptions, reads, deliveries, callbacks, data, legacyRefreshes, pebble,
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
  for (const property of ['high','low','precipitation','daily_high','daily_low','daily_precipitation','utc_offset']) {
    assert.ok(request.properties.includes(property),property+' is requested for compact weather details');
  }
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

test('Opening or changing settings before the first source response cannot crash or invent a current reading', () => {
  const f = fixture();
  assert.doesNotThrow(() => f.router.configure());
  assert.doesNotThrow(() => f.router.configure());
  assert.equal(f.readings().length, 0);
  assert.equal(f.router.status().receivedAt, 0);
  f.settings.locationId = 'not-yet-received';
  assert.doesNotThrow(() => f.router.configure());
  assert.equal(f.readings().length, 0);
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
  assert.ok(f.subscriptions.filter(s => s.request.category === 'weather').length >= 2);
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

test('A units response before weather arrives preserves persisted offline daily details', () => {
  const f = fixture({settings: {followPebbleUnits: true}});
  f.router.refresh(false);
  f.units('°F');
  assert.ok(f.deliveries.some(p => p[KEYS.USE_FAHRENHEIT] === 1));
  assert.ok(f.deliveries.every(p => p[KEYS.WEATHER_DETAILS] === undefined),
    'A unit-only update lets the watch reformat its valid saved details');
  f.weather([]);
  assert.ok(f.deliveries.every(p => p[KEYS.WEATHER_DETAILS] === undefined),
    'An initially empty Weather snapshot must not erase offline details either');
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

test('A watch refresh re-reads Pebble current conditions without using the legacy HTTP client', async () => {
  const f = fixture();
  assert.equal(f.pebble.readSource, undefined, 'The watchface runtime exposes subscriptions, not plugin-only readSource');
  f.router.refresh(false);
  f.weather([instance('current', 20)]);
  // If startup initiated an immediate database read, complete it before testing
  // the later request from a watchface that has stayed open.
  for (const read of f.reads) read.resolve({pluginUuid: WEATHER, instances: [instance('current', 20)]});
  await Promise.resolve();
  await Promise.resolve();
  const before = f.reads.length;
  f.advance(35 * 60000);
  f.router.refresh(false);
  assert.ok(f.reads.length > before, 'Watch refresh must read Pebble\'s current weather again');
  const read = f.reads.at(-1);
  assert.equal(read.request.plugin, WEATHER);
  assert.equal(read.request.category, 'weather');
  assert.equal(read.request.item, 'location');
  read.resolve({pluginUuid: WEATHER, instances: [instance('current', 18)]});
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 18);
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], (NOW + 35 * 60000) / 1000);
  assert.equal(read.subscription.closed, true, 'The one-shot subscription must close after confirming a snapshot');
  assert.ok(f.subscriptions.some(s => !s.closed && !s.oneShot && s.request.category === 'weather'),
    'The persistent change subscription must remain active');
  assert.deepEqual(f.legacyRefreshes, []);
});

test('Identical conditions confirmed by Pebble after two hours remain current instead of becoming forecast', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather([instance('current', 20)]);
  const firstForecastAt = Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4);
  f.advance(2 * 3600000 + 60000);
  f.weather([instance('current', 20)]);
  const latest = lastReading(f);
  assert.equal(latest[KEYS.TEMPERATURE], 20, 'Current conditions still exist in Pebble');
  assert.equal(latest[KEYS.WEATHER_UPDATED_AT], (NOW + 2 * 3600000 + 60000) / 1000);
  const forecast = Buffer.from(latest[KEYS.FORECAST_DATA]);
  assert.equal(forecast.readUInt32LE(4), firstForecastAt, 'Confirmation cannot rejuvenate an unchanged offline forecast');
  assert.notEqual(forecast.readInt16LE(9), 20, 'Fixture must distinguish current conditions from the hourly forecast');
});

test('Replaying a held snapshot cannot renew the age of its current conditions', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather([instance('current', 20)]);
  const stamp = lastReading(f)[KEYS.WEATHER_UPDATED_AT];
  f.advance(35 * 60000);
  f.router.configure();
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], stamp);
  f.router.refresh(false); // Its database read has not completed yet.
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], stamp);
  f.advance(2 * 3600000);
  const before = f.deliveries.length;
  f.router.configure();
  assert.ok(!f.deliveries.slice(before).some(p => p[KEYS.TEMPERATURE] !== undefined),
    'An unconfirmed held snapshot eventually expires instead of pretending to be new');
});

test('A failed database read keeps cached current conditions and never changes weather providers', async () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather();
  for (const read of f.reads) read.resolve({pluginUuid: WEATHER, instances: [instance()]});
  await Promise.resolve();
  await Promise.resolve();
  const stamp = lastReading(f)[KEYS.WEATHER_UPDATED_AT];
  f.advance(35 * 60000);
  f.router.refresh(false);
  assert.ok(f.reads.length > 0);
  f.reads.at(-1).reject({code: 'TIMEOUT', message: 'Weather database temporarily unavailable'});
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 20);
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], stamp);
  assert.deepEqual(f.legacyRefreshes, []);
});

test('Phone backup reads current conditions at thirty minutes and bounds a stalled database read', async () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather();
  for (const read of f.reads) read.resolve({pluginUuid: WEATHER, instances: [instance()]});
  await Promise.resolve();
  await Promise.resolve();
  const before = f.reads.length;
  f.tick(30 * 60000);
  assert.equal(f.reads.length, before + 1, 'The phone backup must work without a watch request');
  const stalled = f.reads.at(-1);
  f.tick(15000);
  assert.equal(f.router.status().error, 'TIMEOUT');
  assert.equal(stalled.subscription.closed, true, 'A stalled one-shot subscription must be unsubscribed');
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 20);
  f.tick(2 * 60000);
  assert.equal(f.reads.length, before + 2, 'A stalled database read must allow a later retry');
  f.reads.at(-1).resolve({pluginUuid: WEATHER, instances: [instance('current', 18)]});
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 18);
  stalled.resolve({pluginUuid: WEATHER, instances: [instance('current', 1)]});
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 18, 'An expired read cannot overwrite the retry');
  assert.deepEqual(f.legacyRefreshes, []);
});

test('Diagnostics expose the actual source, selected location, native reading, confirmation and error', () => {
  const f = fixture({settings: {locationId: 'office'}});
  f.router.refresh(false);
  f.weather([instance('home', 10), instance('office', 44, '°F', Array(48).fill(44))]);
  assert.deepEqual(f.router.status(), {
    source: 'shared', location: 'office', temperature: '44°F',
    receivedAt: NOW / 1000, error: ''
  });
  f.advance(35 * 60000);
  f.router.configure();
  assert.equal(f.router.status().receivedAt, NOW / 1000,
    'Status must distinguish confirmation from merely reopening settings');
  f.error('PERMISSION_DENIED');
  assert.equal(f.router.status().error, 'PERMISSION_DENIED');
  assert.equal(f.router.status().source, 'shared');
  f.weather([instance('office', 8)]);
  assert.equal(f.router.status().temperature, '8°C');
  assert.equal(f.router.status().receivedAt, (NOW + 35 * 60000) / 1000);
  assert.equal(f.router.status().error, '');
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

test('Confirmed current readings update their age while identical forecasts retain their age across restart', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather();
  const first = lastReading(f);
  const firstForecastAt = Buffer.from(first[KEYS.FORECAST_DATA]).readUInt32LE(4);
  f.advance(40 * 60000);
  f.weather();
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], (NOW + 40 * 60000) / 1000);
  assert.equal(Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4), firstForecastAt);
  const restarted = fixture({now: NOW + 60 * 60000, data: f.data});
  restarted.router.refresh(false);
  restarted.weather();
  assert.equal(lastReading(restarted)[KEYS.WEATHER_UPDATED_AT], (NOW + 60 * 60000) / 1000);
  assert.equal(Buffer.from(lastReading(restarted)[KEYS.FORECAST_DATA]).readUInt32LE(4), firstForecastAt);
});

test('A changed hourly forecast is allowed a new first-seen timestamp', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather();
  const first = Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4);
  f.advance(40 * 60000);
  const changedHours = Array.from({length: 48}, (_, i) => 11 + i);
  f.weather([instance('current', 21, '°C', changedHours)]);
  assert.ok(Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4) > first);
});

test('Changing current conditions cannot renew the age of an unchanged hourly forecast', () => {
  const f = fixture();
  f.router.refresh(false);
  f.weather([instance('current', 20)]);
  const forecastAt = Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4);
  f.advance(40 * 60000);
  f.weather([instance('current', 21)]);
  const latest = lastReading(f);
  assert.equal(latest[KEYS.TEMPERATURE], 21);
  assert.equal(latest[KEYS.WEATHER_UPDATED_AT], (NOW + 40 * 60000) / 1000);
  assert.equal(Buffer.from(latest[KEYS.FORECAST_DATA]).readUInt32LE(4), forecastAt);
});

test('Explicit temperature units are resent with weather to repair a lost setting or watch reset', () => {
  const f = fixture({settings: {followPebbleUnits: false, useFahrenheit: true}});
  f.router.refresh(false); // The watch still reports its reset/default Celsius setting.
  f.weather([instance('current', 20, '°C')]);
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT], 1);
  assert.equal(lastReading(f)[KEYS.TEMPERATURE_FAHRENHEIT], 68);
  f.settings.useFahrenheit = false;
  f.router.configure();
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT], 0);
  assert.equal(lastReading(f)[KEYS.TEMPERATURE], 20);
});

test('Switching A to B and back to A preserves forecast ages and does not reconfirm held current data', () => {
  const f = fixture({settings: {locationId: 'home'}});
  f.router.refresh(false);
  const locations = [instance('home', 20), instance('office', 25)];
  f.weather(locations);
  const homeStamp = Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4);
  f.advance(20 * 60000);
  f.settings.locationId = 'office';
  f.router.configure();
  const officeStamp = Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4);
  assert.ok(officeStamp > homeStamp);
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], NOW / 1000);
  f.advance(20 * 60000);
  f.settings.locationId = 'home';
  f.router.configure();
  assert.equal(lastReading(f)[KEYS.WEATHER_UPDATED_AT], homeStamp);
  assert.equal(Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4), homeStamp);
  const restarted = fixture({now: NOW + 60 * 60000, data: f.data, settings: {locationId: 'office'}});
  restarted.router.refresh(false);
  restarted.weather(locations);
  assert.equal(Buffer.from(lastReading(restarted)[KEYS.FORECAST_DATA]).readUInt32LE(4), officeStamp);
  assert.equal(lastReading(restarted)[KEYS.WEATHER_UPDATED_AT], (NOW + 60 * 60000) / 1000);
});

test('The original single-location first-seen cache migrates without resetting its age', () => {
  const cacheKey = 'halftone-shared-weather-v1';
  const old = {identity:WEATHER+'/current', fingerprint:JSON.stringify([MIDNIGHT,Array.from({length:48},(_,i)=>10+i)]),seen:NOW/1000};
  const migratedData = {[cacheKey]: JSON.stringify(old)};
  const restarted = fixture({now: NOW + 60 * 60000, data: migratedData});
  restarted.router.refresh(false);
  restarted.weather();
  assert.equal(lastReading(restarted)[KEYS.WEATHER_UPDATED_AT], (NOW + 60 * 60000) / 1000);
  assert.equal(Buffer.from(lastReading(restarted)[KEYS.FORECAST_DATA]).readUInt32LE(4), NOW / 1000);
  assert.equal(JSON.parse(migratedData[cacheKey]).samples.length, 1);
  assert.equal(JSON.parse(migratedData[cacheKey]).version,2);
});

test('Beta 1 current-plus-hours fingerprints migrate each slot without renewing age', () => {
  const cacheKey = 'halftone-shared-weather-v1';
  const start = MIDNIGHT;
  const values = Array.from({length:48},(_,i)=>10+i);
  const legacySample = {identity:WEATHER+'/current',seen:NOW/1000,fingerprint:JSON.stringify([20,start,values])};
  for (const previousFormat of [legacySample, {samples: [legacySample]}]) {
    const data = {[cacheKey]: JSON.stringify(previousFormat)};
    const restarted = fixture({now: NOW + 60 * 60000, data});
    restarted.router.refresh(false);
    restarted.weather([instance('current', 22)]);
    const latest = lastReading(restarted);
    assert.equal(latest[KEYS.TEMPERATURE], 22);
    assert.equal(Buffer.from(latest[KEYS.FORECAST_DATA]).readUInt32LE(4), NOW / 1000);
    const migrated = JSON.parse(data[cacheKey]).samples[0];
    assert.deepEqual(migrated.slots,values.map((value,i)=>[start+i*3600,value,NOW/1000]));
  }
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

test('Confirmed Pebble unit preferences outrank lagging weather units in both directions', () => {
  for (const [preferred,weatherUnit,value,expected] of [['°F','°C',20,1],['°C','°F',68,0]]) {
    const f=fixture({settings:{followPebbleUnits:true}});
    f.router.refresh(false);
    f.units(preferred);
    f.weather([instance('current',value,weatherUnit)]);
    assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT],expected);
    f.error('NETWORK_ERROR');
    f.weather([instance('current',value,weatherUnit)]);
    assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT],expected,'transient errors cannot erase confirmed unit preferences');
  }
});

test('Weather-unit fallback remains available until a valid preferences response arrives', () => {
  const f=fixture({settings:{followPebbleUnits:true}});
  f.router.refresh(false);
  f.units('kelvin');
  f.weather([instance('current',68,'°F')]);
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT],1);
  f.units('°C');
  f.weather([instance('current',68,'°F')]);
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT],0);
});

test('A temporary Weather-source reconnect preserves previously confirmed unit preferences', () => {
  const f=fixture({settings:{followPebbleUnits:true}});
  f.router.refresh(false);
  f.units('°F');
  f.weather([instance('current',20,'°C')]);
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT],1);
  f.error('PLUGIN_UNAVAILABLE');
  f.router.refresh(false);
  f.weather([instance('current',20,'°C')]);
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT],1,'weather reconnect must wait for a new authoritative preference, not override the old one');
  f.units('°C');
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT],0);
});

test('Changing the measured current-hour blend cannot renew unchanged future forecast slots', () => {
  const f=fixture();
  f.router.refresh(false);
  const values=Array.from({length:48},(_,i)=>10+i);
  f.weather([instance('current',values[12],'°C',values)]);
  const original=Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4);
  f.advance(40*60000); // Still within this UTC hour.
  values[12]++;
  f.weather([instance('current',values[12],'°C',values)]);
  const bytes=Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]);
  assert.equal(bytes.readInt16LE(9),values[12]);
  assert.equal(bytes.readUInt32LE(4),original,'oldest emitted future slot retains its original age');
});

test('Changes to past or distant hours cannot rejuvenate the emitted forecast window', () => {
  for (const changedIndex of [0,30]) {
    const f=fixture();
    f.router.refresh(false);
    const values=Array.from({length:48},(_,i)=>10+i);
    f.weather([instance('current',20,'°C',values)]);
    const original=Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4);
    f.advance(40*60000);
    values[changedIndex]++;
    f.weather([instance('current',20,'°C',values)]);
    assert.equal(Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4),original);
  }
});

test('Midnight series rollover keeps overlapping UTC slot ages across restart', () => {
  const firstAt=(MIDNIGHT+23*3600+1800)*1000;
  const f=fixture({now:firstAt});
  f.router.refresh(false);
  const values=Array.from({length:48},(_,i)=>10+i);
  f.weather([instance('current',20,'°C',values)]);
  const restarted=fixture({now:firstAt+3600000,data:f.data});
  restarted.router.refresh(false);
  const shifted=instance('current',20,'°C',Array.from({length:48},(_,i)=>34+i));
  shifted.properties.hourly_temperature.series.start=MIDNIGHT+24*3600;
  restarted.weather([shifted]);
  assert.equal(Buffer.from(lastReading(restarted)[KEYS.FORECAST_DATA]).readUInt32LE(4),firstAt/1000);
});

test('A temporarily missing UTC slot reuses its remembered age when the same value returns', () => {
  const f=fixture();
  f.router.refresh(false);
  const values=Array.from({length:48},(_,i)=>10+i);
  f.weather([instance('current',20,'°C',values)]);
  const original=NOW/1000;
  f.advance(10*60000);
  const gap=values.slice(); gap[13]=null;
  f.weather([instance('current',20,'°C',gap)]);
  assert.equal(Buffer.from(lastReading(f)[KEYS.FORECAST_DATA])[8],1);
  f.advance(10*60000);
  const changed=values.map((value,i)=>i===13?value:value+1);
  f.weather([instance('current',20,'°C',changed)]);
  assert.equal(Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4),original,
    'the returned slot is still oldest even though all other slots changed');
});

test('Unit conversion and a sub-degree change cannot make a rounded Celsius forecast slot younger', () => {
  const f=fixture({settings:{followPebbleUnits:true}});
  f.router.refresh(false);
  const values=Array(48).fill(20.1);
  f.weather([instance('current',20.1,'°C',values)]);
  const original=NOW/1000;
  f.advance(40*60000);
  f.units('°F');
  f.weather([instance('current',68.54,'°F',Array(48).fill(68.54))]); //20.3°C: same conservative rounded°C identity.
  const bytes=Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]);
  assert.equal(bytes.readUInt32LE(4),original);
  assert.equal(lastReading(f)[KEYS.USE_FAHRENHEIT],1);
});

test('Only emitted slot ages constrain the binary cache; an expired later slot truncates it safely', () => {
  const f=fixture({now:(MIDNIGHT+6*3600+900)*1000});
  f.router.refresh(false);
  const values=Array(48).fill(20);
  f.weather([instance('current',20,'°C',values)]);
  f.advance(6*3600000);
  values[12]=21; // Current slot changes; the next slot remains six hours old.
  f.weather([instance('current',21,'°C',values)]);
  const bytes=Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]);
  assert.equal(bytes[8],1,'do not export an expired future slot alongside a current one');
  assert.equal(bytes.readUInt32LE(4),(MIDNIGHT+12*3600+900));
  f.advance(3600000);
  f.weather([instance('current',21,'°C',values)]);
  assert.deepEqual(lastReading(f)[KEYS.FORECAST_DATA],[],'the next current slot remains expired');
});

test('A changed distant slot cannot revive an expired current forecast', () => {
  const f=fixture();
  f.router.refresh(false);
  const values=Array(48).fill(20);
  f.weather([instance('current',20,'°C',values)]);
  f.advance(6*3600000);
  values[30]=21;
  f.weather([instance('current',20,'°C',values)]);
  assert.deepEqual(lastReading(f)[KEYS.FORECAST_DATA],[]);
});

test('Per-slot remembered ages remain bounded across locations and moving forecast horizons', () => {
  const f=fixture();
  f.router.refresh(false);
  for(let place=0;place<20;place++) {
    for(let day=0;day<3;day++) {
      const data=instance('location-'+place,20,'°C',Array(96).fill(20));
      data.properties.hourly_temperature.series.start=MIDNIGHT+day*86400;
      f.weather([data]);
    }
  }
  const stored=JSON.parse(f.data['halftone-shared-weather-v1']);
  assert.equal(stored.version,2);
  assert.equal(stored.samples.length,16);
  assert.ok(stored.samples.every(sample=>sample.slots.length<=96));
});

test('Duplicate legacy records preserve the oldest matching UTC slot ages during migration', () => {
  const fingerprint=JSON.stringify([MIDNIGHT,Array(48).fill(20)]);
  const data={'halftone-shared-weather-v1':JSON.stringify({samples:[
    {identity:WEATHER+'/current',fingerprint,seen:NOW/1000-1800},
    {identity:WEATHER+'/current',fingerprint,seen:NOW/1000}
  ]})};
  const f=fixture({data});
  f.router.refresh(false);
  f.weather([instance('current',20,'°C',Array(48).fill(20))]);
  assert.equal(Buffer.from(lastReading(f)[KEYS.FORECAST_DATA]).readUInt32LE(4),NOW/1000-1800);
});

test('Weather details are populated from requested fields and explicitly cleared on location replacement', () => {
  const f=fixture();
  f.router.refresh(false);
  const city=instance();
  city.properties.high={numericValue:{value:25,unit:'°C'}};
  city.properties.low={numericValue:{value:15,unit:'°C'}};
  city.properties.precipitation={numericValue:{value:30,unit:'%'}};
  city.properties.utc_offset={numericValue:{value:0,unit:'min'}};
  f.weather([city]);
  assert.equal(lastReading(f)[KEYS.WEATHER_DETAILS].length,23);
  f.settings.locationId='missing';
  f.router.configure();
  assert.deepEqual(f.deliveries.at(-1)[KEYS.WEATHER_DETAILS],[]);
});
