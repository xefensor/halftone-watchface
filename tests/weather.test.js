const assert = require('node:assert/strict');
const { test } = require('node:test');
const createWeatherClient = require('../src/pkjs/weather');
const packForecast = require('../src/pkjs/forecast');

const KEYS = { TEMPERATURE: 10000, TEMPERATURE_FAHRENHEIT: 10009,
  WEATHER_UPDATED_AT: 10010, FORECAST_DATA: 10011 };
const NOW = 1791849000000;
const HOUR = Math.floor(NOW / 3600000) * 3600;
const TIMES = Array.from({ length: 7 }, (_, i) => HOUR + i * 3600);

function fixture(settings = {}) {
  let now = NOW;
  const requests = [];
  const deliveries = [];
  const timers = [];
  const locations = [];
  const locationCallbacks = [];
  const deliveryCallbacks = [];
  let failDelivery = false;
  let failLocation = false;
  let hangLocation = false;
  let hangDelivery = false;
  const client = createWeatherClient({
    keys: KEYS,
    now: () => now,
    log: () => {},
    autoRefresh: !!settings.autoRefresh,
    later: (callback, delay) => {
      callback.delay = delay;
      timers.push(callback);
      return callback;
    },
    cancelLater: callback => {
      const i = timers.indexOf(callback);
      if (i >= 0) timers.splice(i, 1);
    },
    send: (payload, success, failure) => {
      deliveries.push(payload);
      deliveryCallbacks.push({ success, failure });
      if (hangDelivery) return;
      if (failDelivery) failure(); else success();
    },
    geolocation: { getCurrentPosition: (success, failure, options) => {
      locations.push(options);
      locationCallbacks.push({ success, failure });
      if (hangLocation) return;
      if (failLocation) failure({ code: 1 });
      else success({ coords: { latitude: 52.52, longitude: 13.41 } });
    } },
    XMLHttpRequest: function() {
      this.open = (_method, url) => { this.url = url; };
      this.send = () => requests.push(this);
      this.abort = () => { this.aborted = true; this.onabort(); };
      this.respond = (data, status = 200) => {
        this.status = status;
        this.responseText = typeof data === 'string' ? data : JSON.stringify(data);
        this.onload();
      };
    }
  });
  return { client, requests, deliveries, timers, locations,
    locationCallbacks, deliveryCallbacks,
    advance: (ms) => { now += ms; },
    fire: delay => {
      const index = timers.findIndex(timer => timer.delay === delay);
      assert.notEqual(index, -1, 'Expected a timer for ' + delay + 'ms');
      const timer = timers.splice(index, 1)[0];
      now += delay;
      timer();
    },
    deliveryFails: (value) => { failDelivery = value; },
    locationFails: (value) => { failLocation = value; },
    locationHangs: (value) => { hangLocation = value; },
    deliveryHangs: (value) => { hangDelivery = value; } };
}

function pebble(temp = 20, unit = 'metric', timestamp = NOW / 1000) {
  return { conditions: { data: { observation: {
    [unit]: { temp }, obs_time: timestamp
  } } }, fcsthourly: { data: { hours: TIMES.map(fcst_valid => ({fcst_valid, temp})) } } };
}

function meteo(temp = 24.6, timestamp = NOW / 1000) {
  return { current: { temperature_2m: temp, time: timestamp },
    hourly: { time: TIMES, temperature_2m: TIMES.map(() => temp) } };
}

test('Pebble is primary; native Celsius is delivered with its observation time', () => {
  const f = fixture();
  f.client.refresh(false);
  assert.match(f.requests[0].url, /^https:\/\/weather-api\.repebble\.com\//);
  assert.match(f.requests[0].url, /52.52\/13.41\?language=en-US&units=m$/);
  assert.equal(f.requests[0].timeout, 15000);
  assert.equal(f.locations[0].maximumAge, 5 * 60 * 1000);
  f.requests[0].respond(pebble());
  assert.deepEqual(f.deliveries, [{ 10000: 20, 10009: 68, 10010: NOW / 1000,
    10011: packForecast(TIMES, TIMES.map(() => 20), false, NOW) }]);
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
    assert.deepEqual(f.deliveries, [{ 10000: 25, 10009: 76, 10010: NOW / 1000,
      10011: packForecast(TIMES, TIMES.map(() => 24.6), false, NOW) }]);
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

test('Legacy Pebble hourly data without timestamps is supplemented, not guessed', () => {
  const f = fixture();
  f.client.refresh(false);
  const data = pebble(7);
  delete data.fcsthourly;
  f.requests[0].respond(data);
  assert.match(f.requests[1].url, /hourly=temperature_2m&forecast_hours=7/);
  f.requests[1].respond(meteo(5.5));
  assert.equal(f.deliveries[0][10000], 7); // Keep the native Pebble observation.
  assert.equal(f.deliveries[0][10011].length, 37);
});

test('Forecast failure does not discard live Pebble weather; old forecast is cleared', () => {
  const f = fixture();
  f.client.refresh(false);
  const data = pebble(7);
  delete data.fcsthourly;
  f.requests[0].respond(data);
  f.requests[1].onerror();
  assert.equal(f.deliveries[0][10000], 7);
  assert.deepEqual(f.deliveries[0][10011], []);
});

test('Null/malformed Pebble hours use the timestamped fallback', () => {
  const f = fixture();
  f.client.refresh(false);
  const data = pebble(7);
  data.fcsthourly.data.hours[0] = null;
  f.requests[0].respond(data);
  f.requests[1].respond(meteo());
  assert.equal(f.deliveries[0][10000], 7);
});

test('Phone timer refreshes at 30 minutes without leaving the face or receiving a watch request', () => {
  const f = fixture({ autoRefresh: true });
  f.client.refresh(false);
  f.requests[0].respond(pebble(7));
  assert.equal(f.timers.length, 1);
  assert.equal(f.timers[0].delay, 1800000);
  f.fire(1800000);
  assert.equal(f.requests.length, 2);
  f.requests[1].respond(pebble(9, 'metric', NOW / 1000 + 1800));
  assert.equal(f.deliveries[1][10000], 9);
  assert.equal(f.timers[0].delay, 1800000);
});

test('XHR that never fires its native timeout falls back at the independent deadline', () => {
  const f = fixture({ autoRefresh: true });
  f.client.refresh(false);
  f.fire(15000);
  assert.equal(f.requests[0].aborted, true);
  assert.equal(f.requests.length, 2);
  f.requests[1].respond(meteo(9));
  f.requests[0].respond(pebble(1)); // Late primary reply must not overwrite it.
  assert.equal(f.deliveries.length, 1);
  assert.equal(f.deliveries[0][10000], 9);
});

test('Missing location callback is released and retried without reopening', () => {
  const f = fixture({ autoRefresh: true });
  f.locationHangs(true);
  f.client.refresh(false);
  f.fire(20000);
  f.locationCallbacks[0].success({ coords: { latitude: 52.52, longitude: 13.41 } });
  assert.equal(f.requests.length, 0);
  f.locationHangs(false);
  f.fire(120000);
  f.requests[0].respond(pebble(9));
  assert.equal(f.deliveries[0][10000], 9);
});

test('Lost delivery callback is bounded; late ACKs cannot cancel a new attempt', () => {
  const f = fixture({ autoRefresh: true });
  f.deliveryHangs(true);
  f.client.refresh(false);
  f.requests[0].respond(pebble(7));
  f.fire(10000);
  f.fire(1000);
  f.fire(10000);
  f.fire(2000);
  f.fire(10000);
  assert.equal(f.deliveries.length, 3);
  f.deliveryHangs(false);
  f.fire(120000);
  f.requests[1].respond(pebble(9));
  const nextTimer = f.timers[0];
  f.deliveryCallbacks[0].success();
  assert.equal(f.timers[0], nextTimer);
  assert.equal(f.deliveries[3][10000], 9);
});

test('Watch request after suspended timers recovers the busy run immediately', () => {
  const f = fixture();
  f.client.refresh(false);
  f.advance(120000);
  f.client.refresh(false);
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[0].aborted, true);
  f.requests[0].respond(pebble(1));
  assert.equal(f.deliveries.length, 0);
  f.requests[1].respond(pebble(9));
  assert.equal(f.deliveries[0][10000], 9);
});

test('Two hung providers release busy and schedule a two-minute retry', () => {
  const f = fixture({ autoRefresh: true });
  f.client.refresh(false);
  f.fire(15000);
  f.fire(15000);
  assert.equal(f.timers.length, 1);
  assert.equal(f.timers[0].delay, 120000);
  f.fire(120000);
  assert.equal(f.requests.length, 3);
  assert.match(f.requests[2].url, /api.open-meteo.com/);
  f.requests[2].respond(meteo(9));
  assert.equal(f.deliveries[0][10000], 9);
});
