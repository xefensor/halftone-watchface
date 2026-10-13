// Pebble's mobile app currently uses this endpoint. It is not a stable public
// API: keep the documented Open-Meteo API as an independent fallback.
var PEBBLE_URL = 'https://weather-api.repebble.com/api/v1/geocode/';
var METEO_URL = 'https://api.open-meteo.com/v1/forecast';
var MAX_DATA_AGE_SECONDS = 2 * 60 * 60;
var PEBBLE_COOLDOWN_MS = 60 * 60 * 1000;
var REFRESH_MS = 30 * 60 * 1000;
var RETRY_MS = 2 * 60 * 1000;
var packForecast = require('./forecast');

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
  var generation = 0;
  var startedAt = 0;
  var cancelInFlight = null;
  var refreshTimer = null;

  function cancelTimer(timer) {
    if (timer !== null && timer !== undefined) { options.cancelLater(timer); }
  }

  function requestJson(url, callback) {
    var completed = false;
    var request;
    var deadline;
    var requestGeneration = generation;
    function finish(error, data) {
      if (completed || requestGeneration !== generation) { return; }
      completed = true;
      cancelTimer(deadline);
      cancelInFlight = null;
      callback(error, data);
    }
    function abort() {
      try { if (request && request.abort) { request.abort(); } } catch (ignored) {}
    }
    try {
      request = new options.XMLHttpRequest();
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
      // Some PKJS XHR bridges do not forward the timeout property. Enforce
      // our own deadline, with a once-only settlement for late callbacks.
      deadline = options.later(function() {
        finish(new Error('Weather timed out'));
        abort();
      }, 15000);
      cancelInFlight = function() { cancelTimer(deadline); abort(); };
      request.send();
    } catch (error) {
      finish(error);
    }
  }

  function complete() {
    busy = false;
    cancelInFlight = null;
    if (queuedUnit !== null) {
      var unit = queuedUnit;
      queuedUnit = null;
      refresh(unit);
    }
    if (options.autoRefresh && !busy) {
      cancelTimer(refreshTimer);
      var elapsed = options.now() - lastSuccess;
      var delay = lastSuccess && elapsed >= 0
        ? Math.max(RETRY_MS, REFRESH_MS - elapsed) : RETRY_MS;
      refreshTimer = options.later(function() {
        refreshTimer = null;
        refresh(activeUnit);
      }, delay);
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
    payload[options.keys.FORECAST_DATA] = data.forecast || [];
    function send(attempt) {
      if (queuedUnit !== null && queuedUnit !== useFahrenheit) {
        complete();
        return;
      }
      var sent = false;
      var requestGeneration = generation;
      var deadline;
      function settle() {
        if (sent || requestGeneration !== generation) { return false; }
        sent = true;
        cancelTimer(deadline);
        cancelInFlight = null;
        return true;
      }
      function failure() {
        if (!settle()) { return; }
        if (attempt < 3) {
          var retry = options.later(function() {
            if (requestGeneration === generation) { send(attempt + 1); }
          }, attempt * 1000);
          cancelInFlight = function() { cancelTimer(retry); };
        } else {
          options.log('Weather delivery failed; retry scheduled');
          complete();
        }
      }
      deadline = options.later(failure, 10000);
      cancelInFlight = function() { cancelTimer(deadline); };
      try {
        options.send(payload, function() {
          if (!settle()) { return; }
          lastSuccess = options.now();
          lastUnit = useFahrenheit;
          options.log('Weather delivered via ' + source);
          complete();
        }, failure);
      } catch (error) { failure(); }
    }
    send(1);
  }

  function fromMeteo(coords, useFahrenheit) {
    var url = METEO_URL + '?latitude=' + encodeURIComponent(coords.latitude) +
      '&longitude=' + encodeURIComponent(coords.longitude) +
      '&current=temperature_2m&hourly=temperature_2m&forecast_hours=7' +
      '&temperature_unit=celsius&timeformat=unixtime';
    requestJson(url, function(error, weather) {
      var data;
      if (!error) {
        try {
          var current = weather.current;
          data = reading(current.temperature_2m,
            current.temperature_2m * 9 / 5 + 32, current.time, options.now());
          data.forecast = meteoForecast(weather);
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

  function meteoForecast(weather) {
    var hourly = weather && weather.hourly;
    return hourly ? packForecast(hourly.time, hourly.temperature_2m,
      false, options.now()) : [];
  }

  function completePebble(data, weather, coords, useFahrenheit) {
    var hours = weather.fcsthourly && weather.fcsthourly.data &&
      weather.fcsthourly.data.hours;
    data.forecast = Array.isArray(hours) ? packForecast(
      hours.map(function(hour) { return hour && hour.fcst_valid; }),
      hours.map(function(hour) { return hour && hour.temp; }),
      useFahrenheit, options.now()) : [];
    if (data.forecast.length) {
      deliver(data, 'Pebble', useFahrenheit);
      return;
    }
    // Older Pebble responses omit hourly timestamps. Never guess them from
    // the phone's timezone: fetch explicitly timestamped Open-Meteo hours.
    var url = METEO_URL + '?latitude=' + encodeURIComponent(coords.latitude) +
      '&longitude=' + encodeURIComponent(coords.longitude) +
      '&hourly=temperature_2m&forecast_hours=7&temperature_unit=celsius' +
      '&timeformat=unixtime';
    requestJson(url, function(error, forecast) {
      data.forecast = error ? [] : meteoForecast(forecast);
      // Failure to fetch the forecast must not discard the live Pebble reading.
      deliver(data, 'Pebble', useFahrenheit);
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
        completePebble(data, weather, coords, useFahrenheit);
      }
    });
  }

  function refresh(useFahrenheit) {
    useFahrenheit = !!useFahrenheit;
    if (busy) {
      var age = options.now() - startedAt;
      if (age >= 0 && age < RETRY_MS) {
        if (activeUnit !== useFahrenheit) { queuedUnit = useFahrenheit; }
        else { queuedUnit = null; }
        return;
      }
      // Timers can be suspended by the phone. A later watch request must
      // recover a stuck run instead of waiting for the face to be reopened.
      generation++;
      if (cancelInFlight) { cancelInFlight(); }
      cancelInFlight = null;
      busy = false;
      queuedUnit = null;
      options.log('Recovering stalled weather request');
    }
    // Coalesce PKJS ready + watch startup, but fetch a unit change immediately.
    var elapsed = options.now() - lastSuccess;
    if (lastSuccess && lastUnit === useFahrenheit &&
        elapsed >= 0 && elapsed < 60000) { return; }
    cancelTimer(refreshTimer);
    refreshTimer = null;
    generation++;
    busy = true;
    startedAt = options.now();
    activeUnit = useFahrenheit;
    var requestGeneration = generation;
    var locationDone = false;
    var locationDeadline;
    function settleLocation() {
      if (locationDone || requestGeneration !== generation) { return false; }
      locationDone = true;
      cancelTimer(locationDeadline);
      cancelInFlight = null;
      return true;
    }
    locationDeadline = options.later(function() {
      if (settleLocation()) {
        options.log('Location deadline reached; retry scheduled');
        complete();
      }
    }, 20000);
    cancelInFlight = function() { cancelTimer(locationDeadline); };
    try {
      options.geolocation.getCurrentPosition(function(position) {
        if (!settleLocation()) { return; }
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
        if (!settleLocation()) { return; }
        options.log('Location failed: ' + error.code);
        complete();
      }, { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 15000 });
    } catch (error) {
      if (!settleLocation()) { return; }
      options.log('Location unavailable');
      complete();
    }
  }

  return { refresh: refresh };
};
