var MessageKeys = require('message_keys');
var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var createWeatherClient = require('./weather');

new Clay(clayConfig);

var weather = createWeatherClient({
  keys: MessageKeys,
  geolocation: navigator.geolocation,
  XMLHttpRequest: XMLHttpRequest,
  send: function(payload, success, failure) {
    Pebble.sendAppMessage(payload, success, failure);
  },
  now: function() { return Date.now(); },
  later: function(callback, delay) { return setTimeout(callback, delay); },
  cancelLater: function(timer) { clearTimeout(timer); },
  autoRefresh: true,
  log: function(message) { console.log(message); }
});

function messageValue(payload, name) {
  // The current Pebble mobile app resolves message IDs to their appinfo names.
  // Older runners/emulators may deliver the numeric IDs instead.
  return payload[name] !== undefined ? payload[name] : payload[MessageKeys[name]];
}

function savedFahrenheit() {
  try {
    var settings = JSON.parse(localStorage.getItem('clay-settings')) || {};
    return !!messageValue(settings, 'USE_FAHRENHEIT');
  } catch (error) {
    return false;
  }
}

Pebble.addEventListener('ready', function() {
  weather.refresh(savedFahrenheit());
});

Pebble.addEventListener('appmessage', function(event) {
  var payload = event.payload || {};
  if (messageValue(payload, 'REQUEST_WEATHER')) {
    var unit = messageValue(payload, 'USE_FAHRENHEIT');
    weather.refresh(unit !== undefined ? !!unit : savedFahrenheit());
  }
});
