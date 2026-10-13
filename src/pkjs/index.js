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
  log: function(message) { console.log(message); }
});

function savedFahrenheit() {
  try {
    var settings = JSON.parse(localStorage.getItem('clay-settings')) || {};
    return !!(settings.USE_FAHRENHEIT || settings[MessageKeys.USE_FAHRENHEIT]);
  } catch (error) {
    return false;
  }
}

Pebble.addEventListener('ready', function() {
  weather.refresh(savedFahrenheit());
});

Pebble.addEventListener('appmessage', function(event) {
  if (event.payload[MessageKeys.REQUEST_WEATHER]) {
    weather.refresh(event.payload[MessageKeys.USE_FAHRENHEIT] !== undefined
      ? !!event.payload[MessageKeys.USE_FAHRENHEIT] : savedFahrenheit());
  }
});
