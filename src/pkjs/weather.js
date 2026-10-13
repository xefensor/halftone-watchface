// Pebble's mobile app currently uses this endpoint. It is not a stable public
// API: keep the documented Open-Meteo API as an independent fallback.
var PEBBLE_URL = 'https://weather-api.repebble.com/api/v1/geocode/';
var METEO_URL = 'https://api.open-meteo.com/v1/forecast';
var MAX_DATA_AGE_SECONDS = 2 * 60 * 60;
var PEBBLE_COOLDOWN_MS = 60 * 60 * 1000;

function finiteNumber(value) {
  return typeof value === 'number' && isFinite(value);
}

function validTimestamp(value, now) {
  return finiteNumber(value) && value > 0 &&
    value <= now / 1000 + 300 && now / 1000 - value <= MAX_DATA_AGE_SECONDS;
}

function reading(celsius, fahrenheit, timestamp, now) {
  if (!finiteNumber(celsius) || celsius < -100 || celsius > 100 ||
      !finiteNumber(fahrenheit) || fahrenheit < -148 || fahrenheit > 212 ||
      !validTimestamp(timestamp, now)) {
    throw new Error('Missing, invalid or stale weather data');
  }
  return {
    celsius: Math.round(celsius),
    fahrenheit: Math.round(fahrenheit),
    timestamp: Math.floor(timestamp)
  };
}

module.exports = function(options) {
  var busy = false;
  var queuedUnit = null;
  var activeUnit = false;
  var lastSuccess = 0;
  var lastUnit = null;
  var pebbleUnavailableUntil = 0;

  function requestJson(url, callback) {
    var completed = false;
    function finish(error, data) {
      if (completed) { return; }
      completed = true;
      callback(error, data);
    }
    try {
      var request = new options.XMLHttpRequest();
      request.onload = function() {
        if (request.status < 200 || request.status >= 300) {
          finish(new Error('Weather HTTP error: ' + request.status));
          return;
        }
        try {
          var data = JSON.parse(request.responseText);
        } catch (error) {
          finish(new Error('Invalid weather JSON'));
          return;
        }
        finish(null, data);
      };
      request.onerror = function() { finish(new Error('Weather network error')); };
      request.ontimeout = function() { finish(new Error('Weather timed out')); };
      request.onabort = function() { finish(new Error('Weather aborted')); };
      request.open('GET', url, true);
      request.timeout = 15000;
      request.send();
    } catch (error) {
      finish(error);
    }
  }

  function complete() {
    busy = false;
    if (queuedUnit !== null) {
      var unit = queuedUnit;
      queuedUnit = null;
      refresh(unit);
    }
  }

  function deliver(data, source, useFahrenheit) {
    // Do not deliver the previous unit's rounded reading after a settings change.
    if (queuedUnit !== null && queuedUnit !== useFahrenheit) {
      complete();
      return;
    }
    var payload = {};
    payload[options.keys.TEMPERATURE] = data.celsius;
    payload[options.keys.TEMPERATURE_FAHRENHEIT] = data.fahrenheit;
    payload[options.keys.WEATHER_UPDATED_AT] = data.timestamp;
    function send(attempt) {
      if (queuedUnit !== null && queuedUnit !== useFahrenheit) {
        complete();
        return;
      }
      options.send(payload, function() {
        lastSuccess = options.now();
        lastUnit = useFahrenheit;
        options.log('Weather delivered via ' + source);
        complete();
      }, function() {
        if (attempt < 3) {
          options.later(function() { send(attempt + 1); }, attempt * 1000);
        } else {
          options.log('Weather delivery failed; watch will retry');
          complete();
        }
      });
    }
    send(1);
  }

  function fromMeteo(coords, useFahrenheit) {
    var url = METEO_URL + '?latitude=' + encodeURIComponent(coords.latitude) +
      '&longitude=' + encodeURIComponent(coords.longitude) +
      '&current=temperature_2m&temperature_unit=celsius&timeformat=unixtime';
    requestJson(url, function(error, weather) {
      var data;
      if (!error) {
        try {
          var current = weather.current;
          data = reading(current.temperature_2m,
            current.temperature_2m * 9 / 5 + 32, current.time, options.now());
        } catch (invalid) { error = invalid; }
      }
      if (error) {
        options.log('Open-Meteo request failed or returned invalid data');
        complete();
      } else {
        deliver(data, 'Open-Meteo', useFahrenheit);
      }
    });
  }

  function fromPebble(coords, useFahrenheit) {
    if (options.now() < pebbleUnavailableUntil) {
      fromMeteo(coords, useFahrenheit);
      return;
    }
    var url = PEBBLE_URL + encodeURIComponent(coords.latitude) + '/' +
      encodeURIComponent(coords.longitude) + '?language=en-US&units=' +
      (useFahrenheit ? 'e' : 'm');
    requestJson(url, function(error, weather) {
      var data;
      if (!error) {
        try {
          var observation = weather.conditions.data.observation;
          var temperature = observation[useFahrenheit ? 'imperial' : 'metric'].temp;
          data = reading(useFahrenheit ? (temperature - 32) * 5 / 9 : temperature,
            useFahrenheit ? temperature : temperature * 9 / 5 + 32,
            observation.obs_time, options.now());
        } catch (invalid) { error = invalid; }
      }
      if (error) {
        options.log('Pebble weather unavailable; trying Open-Meteo');
        // A broken/changed endpoint must not add a timeout to every refresh.
        pebbleUnavailableUntil = options.now() + PEBBLE_COOLDOWN_MS;
        fromMeteo(coords, useFahrenheit);
      } else {
        pebbleUnavailableUntil = 0;
        deliver(data, 'Pebble', useFahrenheit);
      }
    });
  }

  function refresh(useFahrenheit) {
    useFahrenheit = !!useFahrenheit;
    if (busy) {
      if (activeUnit !== useFahrenheit) { queuedUnit = useFahrenheit; }
      else { queuedUnit = null; }
      return;
    }
    // Coalesce PKJS ready + watch startup, but fetch a unit change immediately.
    if (lastSuccess && lastUnit === useFahrenheit &&
        options.now() - lastSuccess < 60000) { return; }
    busy = true;
    activeUnit = useFahrenheit;
    try {
      options.geolocation.getCurrentPosition(function(position) {
        var coords = position.coords;
        if (!coords || !finiteNumber(coords.latitude) ||
            !finiteNumber(coords.longitude) || Math.abs(coords.latitude) > 90 ||
            Math.abs(coords.longitude) > 180) {
          options.log('Invalid weather location');
          complete();
          return;
        }
        fromPebble(coords, useFahrenheit);
      }, function(error) {
        options.log('Location failed: ' + error.code);
        complete();
      }, { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 15000 });
    } catch (error) {
      options.log('Location unavailable');
      complete();
    }
  }

  return { refresh: refresh };
};
