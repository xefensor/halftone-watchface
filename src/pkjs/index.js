var MessageKeys = require('message_keys');
var Clay = require('@rebble/clay');
var clayConfig = require('./config');

new Clay(clayConfig);

var OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

function sendTemperature(temperature) {
  var payload = {};
  payload[MessageKeys.TEMPERATURE] = Math.round(temperature);

  Pebble.sendAppMessage(
    payload,
    function() {
      console.log('Temperature sent: ' + payload[MessageKeys.TEMPERATURE]);
    },
    function(error) {
      console.log('Could not send temperature: ' + JSON.stringify(error));
    }
  );
}

function requestJson(url, onSuccess) {
  var request = new XMLHttpRequest();

  request.onload = function() {
    if (request.status >= 200 && request.status < 300) {
      try {
        onSuccess(JSON.parse(request.responseText));
      } catch (error) {
        console.log('Invalid weather response: ' + error.message);
      }
    } else {
      console.log('Weather HTTP error: ' + request.status);
    }
  };

  request.onerror = function() {
    console.log('Weather network request failed');
  };

  request.open('GET', url, true);
  request.send();
}

function fetchWeather() {
  navigator.geolocation.getCurrentPosition(
    function(position) {
      var url = OPEN_METEO_URL +
        '?latitude=' + encodeURIComponent(position.coords.latitude) +
        '&longitude=' + encodeURIComponent(position.coords.longitude) +
        '&current=temperature_2m' +
        '&temperature_unit=celsius';

      requestJson(url, function(weather) {
        if (weather.current &&
            typeof weather.current.temperature_2m === 'number') {
          sendTemperature(weather.current.temperature_2m);
        } else {
          console.log('Weather response did not contain a temperature');
        }
      });
    },
    function(error) {
      console.log('Location failed: ' + error.code + ' ' + error.message);
    },
    {
      enableHighAccuracy: false,
      maximumAge: 30 * 60 * 1000,
      timeout: 15000
    }
  );
}

Pebble.addEventListener('ready', function() {
  console.log('Halftone PebbleKit JS ready');
  fetchWeather();
});

Pebble.addEventListener('appmessage', function(event) {
  if (event.payload[MessageKeys.REQUEST_WEATHER]) {
    fetchWeather();
  }
});
