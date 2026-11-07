'use strict';

// The existing Clay key remains authoritative. Keeping the stable activity
// preferences in this same verified record makes one Save one storage write.
var selection = require('pebble-activities/host').selection;
var KEY = 'clay-settings';
var PREFERENCES = '__halftoneActivityPreferences';
var OLD_PREFERENCES = 'halftone-activity-preferences-v1';
var names = ['TEMPERATURE','REQUEST_WEATHER','BACKGROUND_COLOR','TEXT_COLOR','DEPTH_EFFECT','TEXT_SHADOW','LARGE_TEXT','USE_12_HOUR','USE_FAHRENHEIT','TEMPERATURE_FAHRENHEIT','WEATHER_UPDATED_AT','FORECAST_DATA','FOLLOW_PEBBLE_UNITS','WEATHER_LOCATION','WEATHER_CLEAR','SHOW_DAILY_RANGE','SHOW_RAIN_CHANCE','WEATHER_DETAILS','LAYOUT_STYLE','SHOW_WEATHER_ICON','WEATHER_CONDITION','COMPLICATION_DATA','REQUEST_COMPLICATIONS','CONTEXT_DATA','REQUEST_CONTEXT','SHOW_MUSIC','SHOW_NOTIFICATIONS','NOTIFICATION_PREVIEW','NOTIFICATION_APPS','SHOW_STATUS','PANEL_TRANSITIONS','ACCENT_COLOR','ANIMATIONS','CLOCK_FORMAT','NOTIFICATION_VIBRATION','NIGHT_PALETTE','NIGHT_BACKGROUND_COLOR','NIGHT_TEXT_COLOR','NIGHT_ACCENT_COLOR','NOTIFICATION_APP_ONLY','CONTEXT_STATE','ACTIVITY_DATA','REQUEST_ACTIVITIES','SHOW_ACTIVITIES','ACTIVITY_PRESENTED','REQUEST_PRESENTATION'];
var defaults = {BACKGROUND_COLOR:0xff5500,TEXT_COLOR:0xffffff,DEPTH_EFFECT:false,TEXT_SHADOW:false,LARGE_TEXT:false,PANEL_TRANSITIONS:true,ACCENT_COLOR:0x55aaff,CLOCK_FORMAT:0,ANIMATIONS:true,SHOW_STATUS:true,SHOW_ACTIVITIES:true,SHOW_MUSIC:true,SHOW_NOTIFICATIONS:false,NOTIFICATION_PREVIEW:false,NOTIFICATION_APP_ONLY:false,NOTIFICATION_VIBRATION:0,NIGHT_PALETTE:false,NIGHT_BACKGROUND_COLOR:0,NIGHT_TEXT_COLOR:0xffffff,NIGHT_ACCENT_COLOR:0x55aaff,NOTIFICATION_APPS:''};
function object(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function unwrap(value) { return object(value) && Object.prototype.hasOwnProperty.call(value,'value') ? value.value : value; }
function value(source,name) {
  var index=names.indexOf(name);
  return unwrap(source[name] !== undefined ? source[name] : source[10000+index] !== undefined ? source[10000+index] : source[index]);
}
function valid(name,input) {
  if (/_COLOR$/.test(name)) return typeof input === 'number' && isFinite(input) && Math.floor(input) === input && input >= 0 && input <= 0xffffff;
  if (name === 'CLOCK_FORMAT') return input === 0 || input === 12 || input === 24;
  if (name === 'NOTIFICATION_VIBRATION') return input === 0 || input === 1 || input === 2;
  if (name === 'NOTIFICATION_APPS') return typeof input === 'string' && input.length <= 160 && !/[\u0000-\u001f]/.test(input);
  return input === true || input === false || input === 0 || input === 1;
}
function normalize(source,strict) {
  if (!object(source)) return null;
  var result = {}, invalid = false;
  Object.keys(defaults).forEach(function(name) {
    var input = value(source,name);
    if (!strict && typeof defaults[name] === 'boolean' && ['true','false','0','1'].indexOf(input) >= 0) input = input === 'true' || input === '1';
    if (input === undefined && name === 'CLOCK_FORMAT') {
      var old = value(source,'USE_12_HOUR');
      if (old === true || old === 1) input = 12;
      else if (old === false || old === 0) input = 24;
    }
    if (!valid(name,input)) { if (strict) invalid = true; input = defaults[name]; }
    result[name] = typeof defaults[name] === 'boolean' ? !!input : input;
  });
  var preferences = source[PREFERENCES];
  preferences = unwrap(preferences);
  if (typeof preferences === 'string') { try { preferences = JSON.parse(preferences); } catch (ignored) { invalid = true; } }
  if (strict && !object(preferences)) invalid = true;
  result[PREFERENCES] = selection.normalizePreferences(preferences);
  return invalid ? null : result;
}
function read(storage) {
  var raw = storage.getItem(KEY), source = {};
  if (raw !== null && raw !== undefined && raw !== '') {
    try { source = JSON.parse(raw); } catch (ignored) { return null; }
    if (!object(source)) return null;
  }
  if (source[PREFERENCES] === undefined) {
    try { source[PREFERENCES] = JSON.parse(storage.getItem(OLD_PREFERENCES)); } catch (ignored) {}
  }
  return normalize(source,false);
}
function save(storage,candidate) {
  var selected = normalize(candidate,true);
  if (!selected) return {ok:false,notSaved:true};
  try {
    // Preserve retired/unknown saved keys for compatibility, but never accept
    // new unrecognised fields or activity content from the configuration page.
    var previous = {}, raw = storage.getItem(KEY);
    if (raw) { try { var parsed = JSON.parse(raw); if (object(parsed)) previous = parsed; } catch (ignored) {} }
    Object.keys(selected).forEach(function(name) { previous[name] = selected[name]; });
    var serialized = JSON.stringify(previous);
    if (raw !== serialized) storage.setItem(KEY,serialized);
    if (storage.getItem(KEY) !== serialized) return {ok:false};
    var actual = read(storage);
    if (JSON.stringify(actual) !== JSON.stringify(selected)) return {ok:false};
    return {ok:true,settings:actual};
  } catch (ignored) { return {ok:false}; }
}
module.exports = {read:read,save:save,normalize:normalize,defaults:defaults,names:names,preferencesKey:PREFERENCES};
