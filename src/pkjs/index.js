var MessageKeys = require('message_keys');
var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var createWeatherClient = require('./weather');
var createSharedWeather = require('./shared-weather');
var clay = new Clay(clayConfig, null, {autoHandleEvents: false});

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
        if (weather.isLegacy()) { send(payload, success, failure); }
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
  var places = weather.locations();
  var chosen = weatherSettings().locationId;
  if (chosen && !places.some(function(p) { return p.id === chosen; })) {
    places.push({id: chosen, name: 'Saved location (currently unavailable)'});
  }
  clay.config.forEach(function(section) {
    (section.items || []).forEach(function(item) {
      if (item.messageKey === 'WEATHER_LOCATION') {
        item.options = [{label: 'First Pebble weather location', value: ''}].concat(
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
  delete payload[MessageKeys.FOLLOW_PEBBLE_UNITS];
  delete payload[MessageKeys.WEATHER_LOCATION];
  // The plugin's preference wins when following global units. Keep the saved
  // explicit Fahrenheit toggle untouched for when the user turns following off.
  if (weatherSettings().followPebbleUnits) { delete payload[MessageKeys.USE_FAHRENHEIT]; }
  send(payload, function() { weather.configure(); }, function() {
    log('Settings delivery failed'); weather.configure();
  });
});
