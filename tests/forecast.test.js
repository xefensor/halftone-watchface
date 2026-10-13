const assert = require('node:assert/strict');
const {test} = require('node:test');
const pack = require('../src/pkjs/forecast');
const START = 1791849600;
const NOW = (START + 900) * 1000;
const times = Array.from({length: 9}, (_, i) => START + i * 3600);
const temps = times.map((_, i) => -5.5 + i);

test('Forecast packs only the current hour and six hours ahead, with UTC timestamps', () => {
  const bytes = pack(times, temps, false, NOW);
  const b = Buffer.from(bytes);
  assert.equal(bytes.length, 37);
  assert.equal(b.readUInt32LE(0), START);
  assert.equal(b.readUInt32LE(4), NOW / 1000);
  assert.equal(b[8], 7);
  assert.equal(b.readInt16LE(9), -5);
  assert.equal(b.readInt16LE(11), 22);
  assert.equal(b.readInt16LE(9 + 6 * 4), 1);
});

test('Forecast uses the correct hour across midnight and supports half-hour timezones', () => {
  const b = Buffer.from(pack(times, temps, false, (START + 1800 + 3600) * 1000));
  assert.equal(b.readUInt32LE(0), START + 3600);
  const halfTimes = times.map(t => t + 1800);
  const half = Buffer.from(pack(halfTimes, temps, false, (START + 2700) * 1000));
  assert.equal(half.readUInt32LE(0), START + 1800);
});

test('Forecast retains native Fahrenheit and converts unrounded Celsius only once', () => {
  const f = Buffer.from(pack(times, times.map(() => 44), true, NOW));
  assert.equal(f.readInt16LE(9), 7);
  assert.equal(f.readInt16LE(11), 44);
  const c = Buffer.from(pack(times, times.map(() => 24.6), false, NOW));
  assert.equal(c.readInt16LE(9), 25);
  assert.equal(c.readInt16LE(11), 76);
});

test('Missing current slot, gaps, nulls, mismatched arrays and bad values are rejected', () => {
  assert.deepEqual(pack(times.slice(1), temps.slice(1), false, NOW), []);
  const gaps = times.slice(); gaps[2] += 3600;
  assert.deepEqual(pack(gaps, temps, false, NOW), []);
  for (const bad of [null, '20', NaN, Infinity, 200]) {
    const values = temps.slice(); values[3] = bad;
    assert.deepEqual(pack(times, values, false, NOW), []);
  }
  assert.deepEqual(pack(times, [], false, NOW), []);
  assert.deepEqual(pack(null, temps, false, NOW), []);
});
