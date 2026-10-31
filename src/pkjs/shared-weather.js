// Consume the same weather database as Pebble's Weather app. Do not silently
// change providers on a transient error or permission denial.
var packForecast = require('./forecast');
var WEATHER = '00000000-0000-0000-0001-000000000002';
var PREFERENCES = '00000000-0000-0000-0001-000000000009';
var CACHE_KEY = 'halftone-shared-weather-v1';
var HOUR = 3600;

function finite(value) { return typeof value === 'number' && isFinite(value); }
function number(property) { return property && property.numericValue; }
function instancesOf(envelope) {
  return (envelope && Array.isArray(envelope.instances) ? envelope.instances : []).filter(function(instance) {
    return instance && typeof instance.instanceId === 'string' &&
      instance.properties && typeof instance.properties === 'object' &&
      !Array.isArray(instance.properties);
  });
}
function temperature(value, unit) {
  if (!finite(value) || (unit !== '°C' && unit !== '°F')) { return null; }
  var c = unit === '°F' ? (value - 32) * 5 / 9 : value;
  var f = unit === '°F' ? value : value * 9 / 5 + 32;
  return c >= -100 && c <= 100 && f >= -148 && f <= 212
    ? { c: Math.round(c), f: Math.round(f) } : null;
}

module.exports = function(options) {
  var mode = '';
  var legacy;
  var subscriptions = [];
  var serial = 0;
  var locationList = [];
  var selected = null;
  var snapshot = null;
  var globalFahrenheit = null;
  var fallbackUnit = false;
  var lastIdentity = null;
  var pending = null;
  var sending = false;
  var deliveryTimer = null;
  var deliveryGeneration = 0;
  var rememberedSamples = null;
  var configuredLocation = options.getSettings().locationId || '';
  var confirmedAt = 0;
  var sourceVersion = 0;
  var sourceError = '';
  var readPending = false;
  var readDeadline = null;
  var readSubscription = null;
  var refreshTimer = null;

  function settings() { return options.getSettings(); }
  function effectiveUnit() {
    var s = settings();
    return s.followPebbleUnits && globalFahrenheit !== null
      ? globalFahrenheit : (typeof s.useFahrenheit === 'boolean' ? s.useFahrenheit : fallbackUnit);
  }
  function cancelDelivery() {
    deliveryGeneration++;
    if (deliveryTimer !== null) { options.cancelLater(deliveryTimer); }
    deliveryTimer = null;
    pending = null;
    sending = false;
  }
  function pump() {
    if (sending || !pending) { return; }
    var payload = pending;
    pending = null;
    sending = true;
    var generation = deliveryGeneration;
    function attempt(n) {
      if (generation !== deliveryGeneration) { return; }
      var done = false;
      function finish(ok) {
        if (done || generation !== deliveryGeneration) { return; }
        done = true;
        options.cancelLater(deliveryTimer);
        deliveryTimer = null;
        if (!ok && !pending && n < 3) {
          deliveryTimer = options.later(function() { attempt(n + 1); }, n * 1000);
          return;
        }
        sending = false;
        if (!ok) { options.log('Shared weather delivery failed; will retry on watch request'); }
        pump();
      }
      deliveryTimer = options.later(function() { finish(false); }, 10000);
      try { options.send(payload, function() { finish(true); }, function() { finish(false); }); }
      catch (error) { finish(false); }
    }
    attempt(1);
  }
  function send(payload) { pending = payload; pump(); }
  function clearWeather() {
    cancelDelivery();
    var payload = {};
    payload[options.keys.WEATHER_CLEAR] = 1;
    send(payload);
  }
  function unsubscribe() {
    serial++;
    subscriptions.forEach(function(s) { if (s && s.unsubscribe) { s.unsubscribe(); } });
    subscriptions = [];
    snapshot = null;
    selected = null;
    locationList = [];
    globalFahrenheit = null;
    confirmedAt = 0;
    sourceVersion++;
    readPending = false;
    if (readDeadline !== null) { options.cancelLater(readDeadline); }
    if (readSubscription && readSubscription.unsubscribe) { readSubscription.unsubscribe(); }
    readSubscription = null;
    if (refreshTimer !== null) { options.cancelLater(refreshTimer); }
    readDeadline = null;
    refreshTimer = null;
    cancelDelivery();
  }
  function available() {
    if (typeof options.pebble.subscribeToSource !== 'function' ||
        typeof options.pebble.enumeratePlugins !== 'function') { return false; }
    try {
      var plugins = options.pebble.enumeratePlugins();
      if (!Array.isArray(plugins)) { throw new Error('Invalid plugin catalogue'); }
      return plugins.some(function(p) { return p && p.uuid === WEATHER; });
    } catch (error) {
      // A failed catalogue read does not mean a source that was already in use
      // vanished. Keep its subscription/cache instead of changing providers.
      options.log('Could not enumerate plugins; keeping the current weather source');
      return mode === 'shared';
    }
  }
  function switchMode(next) {
    if (mode === next) { return; }
    var previous = mode;
    unsubscribe();
    if (legacy && legacy.stop) { legacy.stop(); }
    mode = next;
    lastIdentity = null;
    // Preserve the watch's offline cache on launch. Only switching an already
    // running source invalidates it before a replacement sample arrives.
    if (previous) { clearWeather(); }
  }
  // Forecast age is conservative because the API has no observation timestamp.
  // Current conditions instead follow successful reads of Pebble's database;
  // republishing a held snapshot must never count as another successful read.
  function firstSeen(identity, fingerprint) {
    var now = Math.floor(options.now() / 1000);
    if (!rememberedSamples) {
      var cached;
      try { cached = JSON.parse(options.storage.getItem(CACHE_KEY)); } catch (ignored) {}
      // Migrate the first beta's single-location cache without renewing its age.
      var samples = cached && Array.isArray(cached.samples) ? cached.samples : cached ? [cached] : [];
      rememberedSamples = samples.filter(function(sample) {
        return sample && typeof sample.identity === 'string' &&
          typeof sample.fingerprint === 'string' && finite(sample.seen) &&
          sample.seen > 0 && sample.seen <= now;
      }).slice(-16).map(function(sample) {
        // Beta 1 included the current temperature in the forecast fingerprint.
        // Dropping that component must not renew an unchanged forecast on upgrade.
        try {
          var old = JSON.parse(sample.fingerprint);
          if (Array.isArray(old) && old.length === 3 && Array.isArray(old[2])) {
            sample.fingerprint = JSON.stringify([old[1], old[2]]);
          }
        } catch (ignored) {}
        return sample;
      });
    }
    var previous = null;
    rememberedSamples = rememberedSamples.filter(function(sample) {
      if (sample.identity !== identity) { return true; }
      if (sample.fingerprint === fingerprint && sample.seen <= now) { previous = sample; }
      return false;
    });
    var sample = previous || {identity: identity, fingerprint: fingerprint, seen: now};
    // Keep recently used locations, so A -> B -> A retains A's original age.
    rememberedSamples.push(sample);
    rememberedSamples = rememberedSamples.slice(-16);
    try {
      options.storage.setItem(CACHE_KEY, JSON.stringify({samples: rememberedSamples}));
    } catch (ignored) {}
    return sample.seen;
  }
  function publish() {
    if (!snapshot || !selected) { return; }
    var p = selected.properties || {};
    var numeric = number(p.temperature);
    var temp = numeric && temperature(numeric.value, numeric.unit);
    if (!temp) { return; }
    var series = p.hourly_temperature && p.hourly_temperature.series;
    var hours = series && series.numericValue;
    var times = [];
    var values = [];
    var normalized = [];
    if (series && finite(series.start) && series.start > 0 &&
        Math.floor(series.start) === series.start && series.stepSec === HOUR &&
        hours && Array.isArray(hours.values)) {
      for (var i = 0; i < Math.min(hours.values.length, 96); i++) {
        var t = temperature(hours.values[i], hours.unit);
        times.push(series.start + i * HOUR);
        values.push(t ? hours.values[i] : null);
        normalized.push(t ? t.c : null);
      }
    }
    var identity = WEATHER + '/' + selected.instanceId;
    var fingerprint = JSON.stringify([series && series.start, normalized]);
    var seen = firstSeen(identity, fingerprint);
    var now = Math.floor(options.now() / 1000);
    var bytes = [];
    // Keep only a contiguous run beginning at the actual current hour. A null
    // point must never shift a later forecast into the wrong hour.
    var first = -1;
    for (i = 0; i < times.length; i++) {
      if (times[i] <= now && now < times[i] + HOUR) { first = i; break; }
    }
    if (first >= 0) {
      var end = first;
      while (end < times.length && values[end] !== null && end - first < 7) { end++; }
      bytes = packForecast(times.slice(first, end), values.slice(first, end),
        hours.unit === '°F', options.now());
      if (bytes.length) {
        for (i = 0; i < 4; i++) { bytes[4 + i] = (seen >>> (i * 8)) & 255; }
      }
    }
    var payload = {};
    payload[options.keys.WEATHER_CLEAR] = 1;
    payload[options.keys.FORECAST_DATA] = now - seen < 6 * HOUR ? bytes : [];
    var expires = confirmedAt + 2 * HOUR;
    if (finite(snapshot.validUntilMs)) { expires = Math.min(expires, Math.floor(snapshot.validUntilMs / 1000)); }
    if (confirmedAt > 0 && now <= expires) {
      payload[options.keys.TEMPERATURE] = temp.c;
      payload[options.keys.TEMPERATURE_FAHRENHEIT] = temp.f;
      payload[options.keys.WEATHER_UPDATED_AT] = Math.min(confirmedAt, expires - 2 * HOUR);
    }
    // Re-send the effective unit with the data, repairing a missed settings
    // delivery or a watch reinstall without changing the saved override.
    payload[options.keys.USE_FAHRENHEIT] = effectiveUnit() ? 1 : 0;
    // A different source/place must replace its cache, even when the new sample
    // predates the old place's observation. Clear in the same atomic message.
    lastIdentity = identity;
    send(payload);
  }
  function choose() {
    var id = settings().locationId || '';
    selected = null;
    if (snapshot) {
      var instances = instancesOf(snapshot);
      selected = id ? instances.filter(function(x) { return x.instanceId === id; })[0] : instances[0];
    }
    var identity = selected ? WEATHER + '/' + selected.instanceId : WEATHER + '/missing/' + id;
    if (identity !== lastIdentity && !selected &&
        (lastIdentity !== null || instancesOf(snapshot).length > 0)) {
      lastIdentity = identity;
      clearWeather();
    }
    if (selected && identity !== lastIdentity &&
        !temperature((number((selected.properties || {}).temperature) || {}).value,
          (number((selected.properties || {}).temperature) || {}).unit)) {
      lastIdentity = identity;
      clearWeather();
    }
    publish();
  }
  function receive(envelope) {
    if (!envelope || envelope.pluginUuid !== WEATHER) { return; }
    snapshot = envelope;
    confirmedAt = Math.floor(options.now() / 1000);
    sourceVersion++;
    sourceError = '';
    locationList = instancesOf(envelope).map(function(x) {
      var name = x.properties && x.properties.name && x.properties.name.shortText;
      return {id: x.instanceId, name: name && typeof name.text === 'string' ? name.text : x.instanceId};
    });
    var id = settings().locationId || '';
    var here = instancesOf(envelope).filter(function(x) { return !id || x.instanceId === id; })[0];
    var numeric = here && number((here.properties || {}).temperature);
    if (numeric && temperature(numeric.value, numeric.unit)) {
      globalFahrenheit = numeric.unit === '°F';
    }
    choose();
  }
  function scheduleRead(delay) {
    if (refreshTimer !== null) { options.cancelLater(refreshTimer); }
    refreshTimer = options.later(function() {
      refreshTimer = null;
      if (mode === 'shared') { readCurrent(); }
    }, delay);
  }
  function readCurrent() {
    if (readPending) { return; }
    readPending = true;
    var generation = serial;
    var version = sourceVersion;
    var done = false;
    function finish(envelope, error) {
      if (done || generation !== serial) { return; }
      done = true;
      readPending = false;
      if (readDeadline !== null) { options.cancelLater(readDeadline); }
      readDeadline = null;
      if (readSubscription && readSubscription.unsubscribe) { readSubscription.unsubscribe(); }
      readSubscription = null;
      if (error && version === sourceVersion) {
        sourceError = error.code || 'UNKNOWN';
        options.log('Shared weather read: ' + sourceError);
      } else if (version === sourceVersion) {
        receive(envelope);
      }
      // Read the shared database, never another weather service. The timer is
      // a backup for watch requests and missed subscription callbacks.
      scheduleRead(error && version === sourceVersion ? 2 * 60000 : 30 * 60000);
    }
    readDeadline = options.later(function() { finish(null, {code: 'TIMEOUT'}); }, 15000);
    try {
      // Watchface PKJS 1.16 has no readSource API. A temporary subscription
      // receives the native source's initial database snapshot, then ends.
      var subscription = options.pebble.subscribeToSource({
        plugin: WEATHER, category: 'weather', item: 'location',
        properties: ['name', 'temperature', 'hourly_temperature'],
        onData: function(envelope) {
        if (!envelope || envelope.pluginUuid !== WEATHER) { finish(null, {code: 'INVALID_SOURCE'}); }
        else { finish(envelope); }
        },
        onError: function(error) { finish(null, error || {code: 'UNKNOWN'}); }
      });
      if (done || generation !== serial) {
        if (subscription && subscription.unsubscribe) { subscription.unsubscribe(); }
      } else { readSubscription = subscription; }
    } catch (error) { finish(null, error); }
  }
  function subscribe() {
    var generation = serial;
    function track(config) {
      var subscription = options.pebble.subscribeToSource(config);
      if (generation === serial) {
        subscriptions.push(subscription);
        return true;
      }
      // A synchronous error may have invalidated this attempt before the host
      // returned its handle. It must not block the next subscription attempt.
      if (subscription && subscription.unsubscribe) { subscription.unsubscribe(); }
      return false;
    }
    function error(e) {
      if (generation !== serial) { return; }
      sourceError = e && e.code || 'UNKNOWN';
      options.log('Shared weather: ' + sourceError);
      // Keep permission-denied and transient-error subscriptions alive. If the
      // source could not be established, allow a later watch request to retry.
      if (e && e.code === 'PLUGIN_UNAVAILABLE') { unsubscribe(); }
    }
    try {
      if (!track({
        plugin: WEATHER, category: 'weather', item: 'location',
        properties: ['name', 'temperature', 'hourly_temperature'],
        onData: function(envelope) {
          if (generation !== serial || !envelope || envelope.pluginUuid !== WEATHER) { return; }
          receive(envelope);
        }, onError: error
      })) { return; }
      track({
        plugin: PREFERENCES, category: 'preferences', item: 'units', properties: ['temperature'],
        onData: function(envelope) {
          if (generation !== serial || !envelope || envelope.pluginUuid !== PREFERENCES) { return; }
          var instance = envelope.instances && envelope.instances[0];
          var p = instance && instance.properties && instance.properties.temperature;
          var unit = p && p.shortText && p.shortText.text;
          if (unit !== '°C' && unit !== '°F') { return; }
          globalFahrenheit = unit === '°F';
          // Unit preferences also apply before any usable weather arrives.
          if (settings().followPebbleUnits) {
            var payload = {};
            payload[options.keys.USE_FAHRENHEIT] = globalFahrenheit ? 1 : 0;
            send(payload);
          }
          publish();
        }, onError: function(e) { options.log('Pebble units: ' + (e && e.code || 'UNKNOWN')); }
      });
    } catch (e) { error(e); }
  }
  function refresh(useFahrenheit) {
    fallbackUnit = !!useFahrenheit;
    if (available()) {
      switchMode('shared');
      if (!subscriptions.length) { subscribe(); }
      else { publish(); }
      readCurrent();
    } else {
      switchMode('legacy');
      if (!legacy) { legacy = options.legacy(); }
      legacy.refresh(effectiveUnit());
    }
  }
  return {
    refresh: refresh,
    configure: function() {
      var id = settings().locationId || '';
      if (configuredLocation !== id && mode === 'shared') { clearWeather(); }
      configuredLocation = id;
      if (mode === 'shared') { choose(); } else { refresh(effectiveUnit()); }
    },
    locations: function() { return locationList.slice(); },
    status: function() {
      var p = selected && selected.properties || {};
      var numeric = number(p.temperature);
      var temp = numeric && temperature(numeric.value, numeric.unit);
      var name = p.name && p.name.shortText;
      return {source: mode, location: name && name.text || selected && selected.instanceId || '',
        temperature: temp ? (numeric.unit === '°F' ? temp.f : temp.c) + numeric.unit : '',
        receivedAt: confirmedAt, error: sourceError};
    },
    isLegacy: function() { return mode === 'legacy'; }
  };
};
