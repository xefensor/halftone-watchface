'use strict';

var DAY = 86400;
var HOUR = 3600;
var MAX_EPOCH = 4294967295;

function finite(value) { return typeof value === 'number' && isFinite(value); }
function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function epoch(value) { return finite(value) && value > 0 && value <= MAX_EPOCH && Math.floor(value) === value; }
function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
function temperature(value, unit) {
  if (!finite(value) || (unit !== '°C' && unit !== '°F')) { return null; }
  var c = unit === '°F' ? (value - 32) * 5 / 9 : value;
  var f = unit === '°F' ? value : value * 9 / 5 + 32;
  return c >= -100 && c <= 100 && f >= -148 && f <= 212
    ? {c: c, f: f} : null;
}
function scalarTemperature(property) {
  var numeric = object(property) && property.numericValue;
  return object(numeric) ? temperature(numeric.value, numeric.unit) : null;
}
function probability(value, unit) {
  // Millimetres of rain are never a substitute for a probability.
  return finite(value) && unit === '%' && value >= 0 && value <= 100 ? Math.round(value) : null;
}
function scalarProbability(property) {
  var numeric = object(property) && property.numericValue;
  return object(numeric) ? probability(numeric.value, numeric.unit) : null;
}
function validUnit(unit, rain) { return rain ? unit === '%' : unit === '°C' || unit === '°F'; }

// Pebble's built-in WeatherPlugin anchors both series to local midnight on
// the forecast's original day, rather than the time our subscription reads it.
// Require the place's offset; the phone's timezone can belong to another place.
function seriesOf(property, step, offset, rain) {
  var series = object(property) && property.series;
  var numeric = object(series) && series.numericValue;
  if (!object(series) || !epoch(series.start) || series.stepSec !== step ||
      !object(numeric) || !Array.isArray(numeric.values) || !numeric.values.length ||
      numeric.values.length > (step === HOUR ? 96 : 32) || !validUnit(numeric.unit, rain) ||
      (series.start + offset) % DAY !== 0) { return null; }
  return {start: series.start, values: numeric.values, unit: numeric.unit};
}
function dayValue(series, dayStart, rain) {
  if (!series) { return null; }
  var index = (dayStart - series.start) / DAY;
  if (index < 0 || Math.floor(index) !== index || index >= series.values.length) { return null; }
  return rain ? probability(series.values[index], series.unit) : temperature(series.values[index], series.unit);
}
function uint32(bytes, at, value) {
  for (var i = 0; i < 4; i++) { bytes[at + i] = Math.floor(value / Math.pow(256, i)) % 256; }
}
function int16(bytes, at, value) {
  var encoded = Math.round(value);
  if (encoded < 0) { encoded += 65536; }
  bytes[at] = encoded % 256;
  bytes[at + 1] = Math.floor(encoded / 256);
}

/**
 * Optional same-day forecast details, packed for the watch without Buffer.
 * confirmedAt is the original successful database read, never an observation
 * timestamp. Repacking a held snapshot cannot extend its six-hour lifetime.
 * Fixed-step daily series cannot describe changing DST rules: conflicting
 * midnight/offset metadata is hidden instead of guessed from the phone clock.
 */
function packDetails(properties, nowSec, confirmedAt, snapshotValidUntilMs) {
  if (!object(properties) || !epoch(nowSec) || !epoch(confirmedAt) || confirmedAt > nowSec) { return []; }
  var offsetShape = object(properties.utc_offset) && properties.utc_offset.numericValue;
  if (!object(offsetShape) || offsetShape.unit !== 'min' || !finite(offsetShape.value) ||
      Math.floor(offsetShape.value) !== offsetShape.value || offsetShape.value < -840 || offsetShape.value > 840) { return []; }
  var offset = offsetShape.value * 60;
  var dayStart = Math.floor((nowSec + offset) / DAY) * DAY - offset;
  var dayEnd = dayStart + DAY;
  var validUntil = Math.min(dayEnd, confirmedAt + 6 * HOUR, MAX_EPOCH);
  if (snapshotValidUntilMs !== null && snapshotValidUntilMs !== undefined) {
    if (!finite(snapshotValidUntilMs)) { return []; }
    validUntil = Math.min(validUntil, Math.floor(snapshotValidUntilMs / 1000));
  }
  if (!epoch(dayStart) || validUntil <= nowSec) { return []; }

  var highSeries = seriesOf(properties.daily_high, DAY, offset, false);
  var lowSeries = seriesOf(properties.daily_low, DAY, offset, false);
  var rainSeries = seriesOf(properties.daily_precipitation, DAY, offset, true);
  var hourly = seriesOf(properties.hourly_temperature, HOUR, offset, false);
  var anchors = [hourly, highSeries, lowSeries, rainSeries].filter(function(series) { return series !== null; });
  var scalarDayKnown = anchors.length > 0 && anchors.every(function(series) { return series.start === dayStart; });
  var low = null;
  var high = null;
  var rain = null;

  // A present but missing/malformed daily slot deliberately blocks a scalar
  // fallback: that scalar may still describe the forecast's first, older day.
  if (own(properties, 'daily_high') || own(properties, 'daily_low')) {
    high = dayValue(highSeries, dayStart, false);
    low = dayValue(lowSeries, dayStart, false);
  } else if (scalarDayKnown) {
    high = scalarTemperature(properties.high);
    low = scalarTemperature(properties.low);
  }
  if (own(properties, 'daily_precipitation')) {
    rain = dayValue(rainSeries, dayStart, true);
  } else if (scalarDayKnown) {
    rain = scalarProbability(properties.precipitation);
  }
  var rangeValid = low !== null && high !== null && low.c <= high.c;
  var rainValid = rain !== null;
  if (!rangeValid && !rainValid) { return []; }

  var bytes = [];
  for (var i = 0; i < 23; i++) { bytes.push(0); }
  bytes[0] = 1;
  bytes[1] = (rangeValid ? 1 : 0) | (rainValid ? 2 : 0);
  uint32(bytes, 2, dayStart);
  uint32(bytes, 6, validUntil);
  uint32(bytes, 10, confirmedAt);
  if (rangeValid) {
    // Convert each original numeric value before independently rounding C/F.
    int16(bytes, 14, low.c);
    int16(bytes, 16, low.f);
    int16(bytes, 18, high.c);
    int16(bytes, 20, high.f);
  }
  if (rainValid) { bytes[22] = rain; }
  return bytes;
}

module.exports = {packDetails: packDetails};
