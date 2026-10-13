const assert = require('node:assert/strict');
const { test } = require('node:test');
const createWeatherClient = require('../src/pkjs/weather');

const KEYS = { TEMPERATURE: 10000, TEMPERATURE_FAHRENHEIT: 10009,
  WEATHER_UPDATED_AT: 10010 };
const NOW = 1791849000000;

function fixture() {
  let now = NOW;
  const requests = [];
  const deliveries = [];
  const timers = [];
  const locations = [];
  let failDelivery = false;
  let failLocation = false;
  const client = createWeatherClient({
    keys: KEYS,
    now: () => now,
    log: () => {},
    later: (callback) => timers.push(callback),
    send: (payload, success, failure) => {
      deliveries.push(payload);
      if (failDelivery) failure(); else success();
    },
    geolocation: { getCurrentPosition: (success, failure, options) => {
      locations.push(options);
      if (failLocation) failure({ code: 1 });
      else success({ coords: { latitude: 52.52, longitude: 13.41 } });
    } },
    XMLHttpRequest: function() {
      this.open = (_method, url) => { this.url = url; };
      this.send = () => requests.push(this);
      this.respond = (data, status = 200) => {
        this.status = status;
        this.responseText = typeof data === 'string' ? data : JSON.stringify(data);
        this.onload();
      };
    }
  });
  return { client, requests, deliveries, timers, locations,
    advance: (ms) => { now += ms; },
    deliveryFails: (value) => { failDelivery = value; },
    locationFails: (value) => { failLocation = value; } };
}

function pebble(temp = 20, unit = 'metric', timestamp = NOW / 1000) {
  return { conditions: { data: { observation: {
    [unit]: { temp }, obs_time: timestamp
  } } } };
}

function meteo(temp = 24.6, timestamp = NOW / 1000) {
  return { current: { temperature_2m: temp, time: timestamp } };
}

test('Pebble is primary; native Celsius is delivered with its observation time', () => {
  const f = fixture();
  f.client.refresh(false);
  assert.match(f.requests[0].url, /^https:\/\/weather-api\.repebble\.com\//);
  assert.match(f.requests[0].url, /52.52\/13.41\?language=en-US&units=m$/);
  assert.equal(f.requests[0].timeout, 15000);
  assert.equal(f.locations[0].maximumAge, 5 * 60 * 1000);
  f.requests[0].respond(pebble());
  assert.deepEqual(f.deliveries, [{ 10000: 20, 10009: 68, 10010: NOW / 1000 }]);
  assert.equal(f.requests.length, 1);
});

test('Fahrenheit requests the native imperial reading, avoiding double rounding', () => {
  const f = fixture();
  f.client.refresh(true);
  assert.match(f.requests[0].url, /units=e$/);
  f.requests[0].respond(pebble(70, 'imperial'));
  assert.equal(f.deliveries[0][10000], 21);
  assert.equal(f.deliveries[0][10009], 70); // Rounded 21°C alone would give 70°F too.
  f.advance(900000);
  f.client.refresh(true);
  f.requests[1].respond(pebble(76, 'imperial', NOW / 1000 + 900));
  assert.equal(f.deliveries[1][10000], 24);
  assert.equal(f.deliveries[1][10009], 76); // Rounded 24°C alone would give 75°F.
});

for (const failure of ['http', 'timeout', 'network', 'abort', 'json', 'schema',
  'null', 'stale', 'future', 'invalid']) {
  test('Falls back on Pebble ' + failure + ', reusing the same location', () => {
    const f = fixture();
    f.client.refresh(false);
    const r = f.requests[0];
    if (failure === 'http') r.respond({}, 503);
    if (failure === 'timeout') r.ontimeout();
    if (failure === 'network') r.onerror();
    if (failure === 'abort') r.onabort();
    if (failure === 'json') r.respond('{bad');
    if (failure === 'schema') r.respond({});
    if (failure === 'null') r.respond(pebble(null));
    if (failure === 'stale') r.respond(pebble(20, 'metric', NOW / 1000 - 7201));
    if (failure === 'future') r.respond(pebble(20, 'metric', NOW / 1000 + 301));
    if (failure === 'invalid') r.respond(pebble(500));
    assert.equal(f.requests.length, 2);
    assert.match(f.requests[1].url, /^https:\/\/api\.open-meteo\.com\//);
    assert.match(f.requests[1].url, /latitude=52.52&longitude=13.41/);
    assert.match(f.requests[1].url, /timeformat=unixtime/);
    f.requests[1].respond(meteo());
    assert.deepEqual(f.deliveries, [{ 10000: 25, 10009: 76, 10010: NOW / 1000 }]);
    assert.equal(f.locations.length, 1);
    r.onerror(); // Late timeout/error callbacks cannot start another fallback.
    assert.equal(f.requests.length, 2);
  });
}

test('Failed primary is cooled down for an hour, then retried', () => {
  const f = fixture();
  f.client.refresh(false);
  f.requests[0].respond({}, 404);
  f.requests[1].respond(meteo());
  f.advance(900000);
  f.client.refresh(false);
  assert.match(f.requests[2].url, /api.open-meteo.com/);
  f.requests[2].respond(meteo(20, NOW / 1000 + 900));
  f.advance(2700000);
  f.client.refresh(false);
  assert.match(f.requests[3].url, /weather-api.repebble.com/);
});

test('Both providers failing leaves cached watch data untouched; next request recovers', () => {
  const f = fixture();
  f.client.refresh(false);
  f.requests[0].onerror();
  f.requests[1].respond(meteo(20, NOW / 1000 - 7201));
  assert.equal(f.deliveries.length, 0);
  f.client.refresh(false);
  f.requests[2].respond(meteo(-5.5));
  assert.equal(f.deliveries[0][10009], 22);
});

test('Missing fallback temperature/time is never displayed as zero', () => {
  for (const bad of [meteo(null), { current: { temperature_2m: 20 } }, {}]) {
    const f = fixture();
    f.client.refresh(false);
    f.requests[0].onerror();
    f.requests[1].respond(bad);
    assert.equal(f.deliveries.length, 0);
  }
});

test('Duplicate startup requests are coalesced, but later refreshes are not', () => {
  const f = fixture();
  f.client.refresh(false);
  f.client.refresh(false);
  assert.equal(f.requests.length, 1);
  f.requests[0].respond(pebble());
  f.client.refresh(false);
  assert.equal(f.requests.length, 1);
  f.advance(900000);
  f.client.refresh(false);
  assert.equal(f.requests.length, 2);
});

test('Unit switch during an in-flight request discards old result and fetches new unit', () => {
  const f = fixture();
  f.client.refresh(false);
  f.client.refresh(true);
  f.requests[0].respond(pebble());
  assert.equal(f.deliveries.length, 0);
  assert.match(f.requests[1].url, /units=e$/);
  f.requests[1].respond(pebble(76, 'imperial'));
  assert.equal(f.deliveries[0][10009], 76);
});

test('AppMessage delivery is retried without another HTTP request', () => {
  const f = fixture();
  f.deliveryFails(true);
  f.client.refresh(false);
  f.requests[0].respond(pebble());
  assert.equal(f.timers.length, 1);
  f.timers.shift()();
  f.deliveryFails(false);
  f.timers.shift()();
  assert.equal(f.deliveries.length, 3);
  assert.equal(f.requests.length, 1);
});

test('Permission denial sends no location to either provider and can recover', () => {
  const f = fixture();
  f.locationFails(true);
  f.client.refresh(false);
  assert.equal(f.requests.length, 0);
  f.locationFails(false);
  f.client.refresh(false);
  assert.equal(f.requests.length, 1);
});
