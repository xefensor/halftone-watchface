'use strict';

var MAX_EPOCH = 4294967295;
var MAX_AGE = 2 * 3600;
// Exact condition_code.longText vocabulary published by WeatherPlugin.kt:
// https://github.com/coredevices/mobileapp/blob/master/pebble/src/commonMain/kotlin/coredevices/pebble/weather/WeatherPlugin.kt
// Intensity shares artwork; unsupported conditions remain hidden. Rain
// probability, condition text and hourly/daily forecasts are not substitutes.
var CODES = {sun:1, partly_cloudy:2, cloudy:3, light_rain:4, heavy_rain:4,
  light_snow:5, heavy_snow:5, rain_and_snow:6};

function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function epoch(value) {
  return typeof value === 'number' && isFinite(value) && value > 0 && value <= MAX_EPOCH && Math.floor(value) === value;
}
function uint32(bytes, at, value) {
  for (var i = 0; i < 4; i++) { bytes[at + i] = Math.floor(value / Math.pow(256, i)) % 256; }
}

/**
 * Current shared condition, version + code + confirmedAt + exclusive expiry.
 * confirmedAt is the original successful read of Pebble's weather database,
 * not the provider's observation time. Repacking cannot renew that read.
 */
function packCondition(properties, nowSec, confirmedAt, validUntilMs) {
  if (!object(properties) || !epoch(nowSec) || !epoch(confirmedAt) || confirmedAt > nowSec) { return []; }
  var property = properties.condition_code;
  var shape = object(property) && property.longText;
  var code = object(shape) && shape.text;
  if (typeof code !== 'string' || !Object.prototype.hasOwnProperty.call(CODES, code)) { return []; }
  var until = Math.min(confirmedAt + MAX_AGE, MAX_EPOCH);
  if (validUntilMs !== null && validUntilMs !== undefined) {
    if (typeof validUntilMs !== 'number' || !isFinite(validUntilMs)) { return []; }
    until = Math.min(until, Math.floor(validUntilMs / 1000));
  }
  if (!epoch(until) || nowSec >= until) { return []; }
  var bytes = [1, CODES[code], 0, 0, 0, 0, 0, 0, 0, 0];
  uint32(bytes, 2, confirmedAt);
  uint32(bytes, 6, until);
  return bytes;
}

module.exports = {packCondition:packCondition};
