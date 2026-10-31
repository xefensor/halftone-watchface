'use strict';

const assert = require('node:assert/strict');
const {test} = require('node:test');
const {packDetails} = require('../src/pkjs/weather-details');
const DAY = 86400;
const HOUR = 3600;
const MIDNIGHT = Date.parse('2026-10-31T00:00:00Z') / 1000;
const NOW = MIDNIGHT + 12 * HOUR;
function numeric(value, unit) { return {numericValue: {value, unit}}; }
function series(start, values, unit = '°C', stepSec = DAY) {
  return {series: {start, stepSec, numericValue: {values, unit}}};
}
function properties(overrides = {}) {
  return Object.assign({
    utc_offset: numeric(0, 'min'), high: numeric(8.2, '°C'), low: numeric(-3.4, '°C'),
    precipitation: numeric(35.4, '%'),
    hourly_temperature: series(MIDNIGHT, [1, 2], '°C', HOUR)
  }, overrides);
}
function decode(bytes) {
  assert.equal(bytes.length, 23);
  assert.ok(Array.isArray(bytes));
  assert.ok(bytes.every(value => Number.isInteger(value) && value >= 0 && value <= 255));
  const data = Buffer.from(bytes);
  return {version: data[0], flags: data[1], from: data.readUInt32LE(2), until: data.readUInt32LE(6),
    confirmed: data.readUInt32LE(10), lowC: data.readInt16LE(14), lowF: data.readInt16LE(16),
    highC: data.readInt16LE(18), highF: data.readInt16LE(20), rain: data[22]};
}

test('same-day scalar details use the exact 23-byte little-endian protocol with independently rounded C/F', () => {
  assert.deepEqual(decode(packDetails(properties(), NOW, NOW, null)), {
    version: 1, flags: 3, from: MIDNIGHT, until: NOW + 6 * HOUR, confirmed: NOW,
    lowC: -3, lowF: 26, highC: 8, highF: 47, rain: 35
  });
});

test('native Fahrenheit precision is converted once before rounding either unit', () => {
  const result = decode(packDetails(properties({low: numeric(32.49, '°F'), high: numeric(74.49, '°F')}), NOW, NOW));
  assert.equal(result.lowC, 0);
  assert.equal(result.lowF, 32);
  assert.equal(result.highC, 24);
  assert.equal(result.highF, 74, 'Converting rounded 24°C back to Fahrenheit would incorrectly yield 75°F');
});

test('range and rain flags are independent, and a real zero-percent probability stays visible', () => {
  const rainOnly = decode(packDetails(properties({high: null, low: null, precipitation: numeric(0, '%')}), NOW, NOW));
  assert.equal(rainOnly.flags, 2);
  assert.equal(rainOnly.rain, 0);
  assert.deepEqual([rainOnly.lowC, rainOnly.lowF, rainOnly.highC, rainOnly.highF], [0, 0, 0, 0]);
  const rangeOnly = decode(packDetails(properties({precipitation: null}), NOW, NOW));
  assert.equal(rangeOnly.flags, 1);
});

test('current daily slots replace scalar values without shifting a missing earlier day', () => {
  const result = decode(packDetails(properties({
    hourly_temperature: series(MIDNIGHT - DAY, [4, 5], '°C', HOUR),
    daily_high: series(MIDNIGHT - DAY, [null, 12.3, 20]),
    daily_low: series(MIDNIGHT - DAY, [null, 2.2, 10]),
    daily_precipitation: series(MIDNIGHT - DAY, [null, 0, 100], '%')
  }), NOW, NOW));
  assert.equal(result.flags, 3);
  assert.equal(result.highC, 12);
  assert.equal(result.lowC, 2);
  assert.equal(result.rain, 0);
  assert.equal(result.from, MIDNIGHT);
});

test('daily series are selected independently by their own starts, not a shared array index', () => {
  const result = decode(packDetails(properties({
    daily_high: series(MIDNIGHT - DAY, [99, 8]),
    daily_low: series(MIDNIGHT, [-5]),
    daily_precipitation: series(MIDNIGHT - 2 * DAY, [99, 88, 42], '%')
  }), NOW, NOW));
  assert.equal(result.highC, 8);
  assert.equal(result.lowC, -5);
  assert.equal(result.rain, 42);
});

test('an explicitly null, absent or malformed current daily slot never falls back to yesterday scalars', () => {
  for (const bad of [series(MIDNIGHT, [null]), series(MIDNIGHT - DAY, [20]),
    series(MIDNIGHT + DAY, [20]), series(MIDNIGHT, [20], 'K'),
    series(MIDNIGHT, [20], '°C', 25 * HOUR), {}, null]) {
    const result = packDetails(properties({daily_high: bad, daily_low: series(MIDNIGHT, [-5]),
      daily_precipitation: series(MIDNIGHT, [null], '%')}), NOW, NOW);
    assert.deepEqual(result, []);
  }
  const rainOnly = decode(packDetails(properties({daily_high: series(MIDNIGHT, [null]),
    daily_low: series(MIDNIGHT, [-5]), daily_precipitation: series(MIDNIGHT, [50], '%')}), NOW, NOW));
  assert.equal(rainOnly.flags, 2);
});

test('a held snapshot cannot renew its original confirmation or exceed six hours', () => {
  const confirmed = NOW - 2 * HOUR;
  const first = decode(packDetails(properties(), NOW, confirmed));
  const later = decode(packDetails(properties(), NOW + HOUR, confirmed));
  assert.equal(first.confirmed, confirmed);
  assert.equal(later.confirmed, confirmed);
  assert.equal(first.until, confirmed + 6 * HOUR);
  assert.equal(later.until, first.until);
  assert.deepEqual(packDetails(properties(), confirmed + 6 * HOUR, confirmed), []);
  assert.deepEqual(packDetails(properties(), NOW, NOW + 1), []);
});

test('snapshot expiry and the local day end are both exclusive and may shorten the six-hour cap', () => {
  assert.equal(decode(packDetails(properties(), NOW, NOW, (NOW + 90) * 1000)).until, NOW + 90);
  assert.deepEqual(packDetails(properties(), NOW, NOW, NOW * 1000), []);
  assert.deepEqual(packDetails(properties(), NOW, NOW, (NOW - 1) * 1000), []);
  const nearMidnight = MIDNIGHT + DAY - 60;
  assert.equal(decode(packDetails(properties(), nearMidnight, nearMidnight)).until, MIDNIGHT + DAY);
});

test('reading old scalar fields again after midnight does not turn them into today forecast', () => {
  assert.deepEqual(packDetails(properties(), MIDNIGHT + DAY, MIDNIGHT + DAY), []);
  const nextDay = decode(packDetails(properties({daily_high: series(MIDNIGHT, [8, 9]),
    daily_low: series(MIDNIGHT, [-3, 4]), daily_precipitation: series(MIDNIGHT, [35, 75], '%')}),
  MIDNIGHT + DAY, MIDNIGHT + DAY));
  assert.equal(nextDay.from, MIDNIGHT + DAY);
  assert.equal(nextDay.highC, 9);
  assert.equal(nextDay.lowC, 4);
  assert.equal(nextDay.rain, 75);
});

test('place UTC offsets select the place date across UTC midnight and support quarter-hour zones', () => {
  for (const offset of [120, 345, -420, -720, 840]) {
    const now = MIDNIGHT + 23 * HOUR;
    const start = Math.floor((now + offset * 60) / DAY) * DAY - offset * 60;
    const result = decode(packDetails(properties({utc_offset: numeric(offset, 'min'),
      hourly_temperature: series(start, [2], '°C', HOUR)}), now, now));
    assert.equal(result.from, start);
    assert.equal(result.until, Math.min(start + DAY, now + 6 * HOUR));
  }
});

test('missing location offsets and inconsistent DST midnight anchors are hidden rather than guessed from the phone timezone', () => {
  assert.deepEqual(packDetails(properties({utc_offset: undefined}), NOW, NOW), []);
  const afterFallBack = Date.parse('2026-10-25T12:00:00Z') / 1000;
  const oldMidnight = Date.parse('2026-10-24T22:00:00Z') / 1000;
  const updatedMidnight = Date.parse('2026-10-24T23:00:00Z') / 1000;
  const input = properties({utc_offset: numeric(60, 'min'),
    hourly_temperature: series(oldMidnight, [2], '°C', HOUR)});
  assert.deepEqual(packDetails(input, afterFallBack, afterFallBack), []);
  input.hourly_temperature = series(updatedMidnight, [2], '°C', HOUR);
  assert.equal(decode(packDetails(input, afterFallBack, afterFallBack)).from, updatedMidnight);
});

test('rain amount, unitless values and text percentages never become a probability', () => {
  for (const unit of ['mm', 'mm/h', undefined, '', 'percent', 'fraction']) {
    assert.deepEqual(packDetails(properties({high: null, low: null, precipitation: numeric(5, unit)}), NOW, NOW), []);
  }
  for (const value of [null, undefined, '', '0', false, true, NaN, Infinity, -1, 100.01]) {
    assert.deepEqual(packDetails(properties({high: null, low: null, precipitation: numeric(value, '%')}), NOW, NOW), []);
  }
  assert.deepEqual(packDetails(properties({high: null, low: null, precipitation: {shortText: {text: '50%'}}}), NOW, NOW), []);
});

test('malformed and physically invalid range values are hidden without coercion or swapping low/high', () => {
  for (const low of [numeric(-101, '°C'), numeric(213, '°F'), numeric('0', '°C'),
    numeric(null, '°C'), numeric(true, '°C'), numeric(NaN, '°C'), numeric(280, 'K'), null]) {
    assert.deepEqual(packDetails(properties({low, precipitation: null}), NOW, NOW), []);
  }
  assert.deepEqual(packDetails(properties({low: numeric(10, '°C'), high: numeric(9, '°C'), precipitation: null}), NOW, NOW), []);
  const extreme = decode(packDetails(properties({low: numeric(-100, '°C'), high: numeric(100, '°C')}), NOW, NOW));
  assert.equal(extreme.lowF, -148);
  assert.equal(extreme.highF, 212);
});

test('invalid clocks, offsets, unaligned series and malformed envelope expiry clear the optional row', () => {
  for (const value of [null, undefined, NaN, Infinity, -1, 0, NOW + 0.5, 4294967296, 'now']) {
    assert.deepEqual(packDetails(properties(), value, NOW), []);
    assert.deepEqual(packDetails(properties(), NOW, value), []);
  }
  for (const value of [-841, 841, 1.5, null, '60', NaN, Infinity]) {
    assert.deepEqual(packDetails(properties({utc_offset: numeric(value, 'min')}), NOW, NOW), []);
  }
  assert.deepEqual(packDetails(properties({utc_offset: numeric(0, 's')}), NOW, NOW), []);
  for (const value of [NaN, Infinity, 'future', {}, 0]) assert.deepEqual(packDetails(properties(), NOW, NOW, value), []);
  for (const anchor of [series(MIDNIGHT + 1, [0], '°C', HOUR), series(MIDNIGHT, [0], '°C', DAY),
    series(MIDNIGHT, [], '°C', HOUR), series(MIDNIGHT, Array(97).fill(0), '°C', HOUR)]) {
    assert.deepEqual(packDetails(properties({hourly_temperature: anchor}), NOW, NOW), []);
  }
  for (const input of [null, undefined, [], 1, 'properties']) assert.deepEqual(packDetails(input, NOW, NOW), []);
});
