// Wire format: start UTC (u32 LE), fetched UTC (u32 LE), count (u8),
// then count pairs of Celsius/Fahrenheit (i16 LE). Seven hourly slots fit in
// 37 bytes, covering the current hour and the next six hours.
module.exports = function(times, temperatures, useFahrenheit, now) {
  if (!Array.isArray(times) || !Array.isArray(temperatures) ||
      times.length !== temperatures.length) { return []; }
  var nowSeconds = Math.floor(now / 1000);
  var first = -1;
  for (var i = 0; i < times.length; i++) {
    if (typeof times[i] === 'number' && isFinite(times[i]) &&
        times[i] > 0 && Math.floor(times[i]) === times[i] &&
        times[i] <= nowSeconds && nowSeconds < times[i] + 3600) { first = i; }
  }
  if (first < 0) { return []; }
  var bytes = [];
  function u32(value) {
    for (var b = 0; b < 4; b++) { bytes.push((value >>> (b * 8)) & 255); }
  }
  function i16(value) {
    bytes.push(value & 255, (value >> 8) & 255);
  }
  var count = Math.min(7, times.length - first);
  u32(times[first]);
  u32(nowSeconds);
  bytes.push(count);
  for (i = 0; i < count; i++) {
    var temperature = temperatures[first + i];
    if (times[first + i] !== times[first] + i * 3600 ||
        typeof temperature !== 'number' || !isFinite(temperature)) { return []; }
    var celsius = useFahrenheit ? (temperature - 32) * 5 / 9 : temperature;
    var fahrenheit = useFahrenheit ? temperature : temperature * 9 / 5 + 32;
    if (celsius < -100 || celsius > 100 || fahrenheit < -148 || fahrenheit > 212) {
      return [];
    }
    i16(Math.round(celsius));
    i16(Math.round(fahrenheit));
  }
  return bytes;
};
