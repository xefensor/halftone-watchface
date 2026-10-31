var MessageKeys = require('message_keys');
var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var createWeatherClient = require('./weather');
var createSharedWeather = require('./shared-weather');
var localization = require('./localization');
var clay = new Clay(clayConfig, null, {autoHandleEvents: false});

function settingsLanguage() {
  var watchLanguage;
  try {
    var watch = typeof Pebble.getActiveWatchInfo === 'function' && Pebble.getActiveWatchInfo();
    watchLanguage = watch && watch.language;
  } catch (ignored) {}
  var phoneLanguage = typeof navigator !== 'undefined' &&
    (navigator.language || navigator.userLanguage || (navigator.languages && navigator.languages[0]));
  return localization.resolveLanguage(watchLanguage, phoneLanguage);
}

function messageValue(payload, name) {
  return payload[name] !== undefined ? payload[name] : payload[MessageKeys[name]];
}
function savedSettings() {
  try { return JSON.parse(localStorage.getItem('clay-settings')) || {}; }
  catch (error) { return {}; }
}
function migrateSettings() {
  var s = savedSettings();
  if (messageValue(s, 'FOLLOW_PEBBLE_UNITS') === undefined) {
    // Existing installs retain their explicit unit. New installs follow Pebble.
    s.FOLLOW_PEBBLE_UNITS = Object.keys(s).length === 0;
    localStorage.setItem('clay-settings', JSON.stringify(s));
  }
}
function weatherSettings() {
  var s = savedSettings();
  return {
    followPebbleUnits: !!messageValue(s, 'FOLLOW_PEBBLE_UNITS'),
    useFahrenheit: !!messageValue(s, 'USE_FAHRENHEIT'),
    locationId: messageValue(s, 'WEATHER_LOCATION') || ''
  };
}
function send(payload, success, failure) { Pebble.sendAppMessage(payload, success, failure); }
function now() { return Date.now(); }
function later(callback, delay) { return setTimeout(callback, delay); }
function cancelLater(timer) { clearTimeout(timer); }
function log(message) { console.log(message); }

var weather = createSharedWeather({
  pebble: Pebble, keys: MessageKeys, storage: localStorage, getSettings: weatherSettings,
  send: send, now: now, later: later, cancelLater: cancelLater, log: log,
  legacy: function() {
    return createWeatherClient({
      keys: MessageKeys, geolocation: navigator.geolocation, XMLHttpRequest: XMLHttpRequest,
      send: function(payload, success, failure) {
        if (weather.isLegacy()) {
          // Compatibility weather has no shared daily details or condition. Clear any
          // persisted values from the previous provider in the same update.
          payload[MessageKeys.WEATHER_DETAILS] = [];
          payload[MessageKeys.WEATHER_CONDITION] = [];
          send(payload, success, failure);
        }
        else if (failure) { failure(); }
      },
      now: now, later: later, cancelLater: cancelLater, autoRefresh: true, log: log
    });
  }
});

Pebble.addEventListener('ready', function() {
  migrateSettings();
  weather.refresh(weatherSettings().useFahrenheit);
});
Pebble.addEventListener('appmessage', function(event) {
  var payload = event.payload || {};
  if (messageValue(payload, 'REQUEST_WEATHER')) {
    var unit = messageValue(payload, 'USE_FAHRENHEIT');
    weather.refresh(unit !== undefined ? !!unit : weatherSettings().useFahrenheit);
  }
});

Pebble.addEventListener('showConfiguration', function() {
  migrateSettings();
  var language = settingsLanguage();
  // Translate a fresh config on each open, so a language change never reuses
  // old translated labels or alters the saved option IDs and values.
  clay.config = localization.translateConfig(clayConfig, language);
  function t(key, params) { return localization.t(key, language, params); }
  var places = weather.locations();
  var chosen = weatherSettings().locationId;
  if (chosen && !places.some(function(p) { return p.id === chosen; })) {
    places.push({id: chosen, name: t('savedUnavailable')});
  }
  clay.config.forEach(function(section) {
    (section.items || []).forEach(function(item) {
      if (item.id === 'weather-status') {
        var status = weather.status();
        var errors = {PERMISSION_DENIED: 'permissionDenied', PLUGIN_UNAVAILABLE: 'sourceUnavailable',
          TIMEOUT: 'sourceTimeout', NETWORK_ERROR: 'networkError', NETWORK: 'networkError'};
        var errorText = '';
        if (status.error) {
          errorText = errors[status.error]
            ? t(errors[status.error]) + ' (' + status.error + ')'
            : t('sourceError', {error: status.error});
        }
        item.defaultValue = 'Halftone 1.5.1 beta 6. ' +
          t(status.source === 'shared' ? 'sharedSource' : 'legacySource') +
          (status.location ? ' · ' + status.location : '') +
          (status.temperature ? ' · ' + t('received', {temperature: status.temperature}) : '') +
          (status.receivedAt ? ' · ' + t('lastRead', {
            minutes: Math.max(0, Math.floor((Date.now() / 1000 - status.receivedAt) / 60))}) : '') +
          (errorText ? ' · ' + errorText : '');
      }
      if (item.messageKey === 'WEATHER_LOCATION') {
        item.options = [{label: t('First Pebble weather location'), value: ''}].concat(
          places.map(function(p) { return {label: p.name, value: p.id}; }));
      }
    });
  });
  Pebble.openURL(clay.generateUrl());
});
Pebble.addEventListener('webviewclosed', function(event) {
  if (!event || !event.response) { return; }
  var payload;
  try { payload = clay.getSettings(event.response); }
  catch (error) { log('Invalid settings response'); return; }
  var layout = messageValue(payload, 'LAYOUT_STYLE');
  if (layout !== undefined) {
    // Clay selects return strings; watch layout settings use an integer tuple.
    delete payload.LAYOUT_STYLE;
    delete payload[MessageKeys.LAYOUT_STYLE];
    if (layout === 0 || layout === 1 || layout === 2 ||
        (typeof layout === 'string' && /^[012]$/.test(layout))) {
      payload[MessageKeys.LAYOUT_STYLE] = Number(layout);
    }
  }
  delete payload[MessageKeys.FOLLOW_PEBBLE_UNITS];
  delete payload[MessageKeys.WEATHER_LOCATION];
  // The plugin's preference wins when following global units. Keep the saved
  // explicit Fahrenheit toggle untouched for when the user turns following off.
  if (weatherSettings().followPebbleUnits) { delete payload[MessageKeys.USE_FAHRENHEIT]; }
  send(payload, function() { weather.configure(); }, function() {
    log('Settings delivery failed'); weather.configure();
  });
});
