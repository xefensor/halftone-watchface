var MessageKeys = require('message_keys');
var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var createComplications = require('./complications');
var localization = require('./localization');
var clay = new Clay(clayConfig, null, {autoHandleEvents: false});

function settingsLanguage() {
  var watchLanguage;
  try {
    var watch = typeof Pebble.getActiveWatchInfo === 'function' && Pebble.getActiveWatchInfo();
    watchLanguage = watch && watch.language;
  } catch (ignored) {}
  var phoneLanguage = typeof navigator !== 'undefined' &&
    (navigator.language || navigator.userLanguage || (navigator.languages && navigator.languages[0]));
  return localization.resolveLanguage(watchLanguage, phoneLanguage);
}
function messageValue(payload, name) {
  return payload[name] !== undefined ? payload[name] : payload[MessageKeys[name]];
}
function savedSettings() {
  try { return JSON.parse(localStorage.getItem('clay-settings')) || {}; }
  catch (error) { return {}; }
}
function send(payload, success, failure) { Pebble.sendAppMessage(payload, success, failure); }
function log(message) { console.log(message); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function(character) {
    return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character];
  });
}

// Every data field comes from the user's global complication slots. There is
// no direct weather client, provider override, GPS lookup or local unit rewrite.
var complications = createComplications({
  pebble: Pebble, keys: MessageKeys, storage: localStorage,
  send: send, now: function() { return Date.now(); },
  later: function(callback, delay) { return setTimeout(callback, delay); },
  cancelLater: function(timer) { clearTimeout(timer); }, log: log,
  getSettings: function() {
    return {use12Hour: !!messageValue(savedSettings(), 'USE_12_HOUR'), language: settingsLanguage()};
  },
  localizeBoolean: function(value) {
    return localization.t(value ? 'stateOn' : 'stateOff', settingsLanguage());
  }
});

Pebble.addEventListener('ready', function() { complications.refresh(); });
Pebble.addEventListener('appmessage', function(event) {
  if (messageValue(event.payload || {}, 'REQUEST_COMPLICATIONS')) { complications.refresh(); }
});
Pebble.addEventListener('showConfiguration', function() {
  var language = settingsLanguage();
  clay.config = localization.translateConfig(clayConfig, language);
  var status = complications.status();
  function t(key, params) { return localization.t(key, language, params); }
  clay.config.forEach(function(section) {
    (section.items || []).forEach(function(item) {
      if (item.id !== 'complications-status') { return; }
      var summary = status.available === false ? t('complicationsDisabled') :
        status.configured ? t('complicationsStatus', {ready: status.ready || 0, configured: status.configured}) :
        t('complicationsWaiting');
      var issue = status.error;
      var problem = (status.slots || []).filter(function(slot) { return slot.error === issue; })[0];
      if (issue && problem) {
        issue = '#' + problem.slot + ' · ' + problem.category + '/' + problem.item + ' · ' + issue +
          (problem.message ? ' · ' + problem.message : '');
      } else if (issue && status.message) { issue += ' · ' + status.message; }
      // Clay text fields support HTML. Source diagnostics remain literal text,
      // including provider-supplied error messages and category/item names.
      item.defaultValue = escapeHtml('Halftone 1.6.1 beta 8. ' + summary +
        (issue ? ' · ' + t('complicationsError', {error: issue}) : ''));
    });
  });
  Pebble.openURL(clay.generateUrl());
});

function watchSettings(payload) {
  var result = {};
  ['BACKGROUND_COLOR', 'TEXT_COLOR', 'DEPTH_EFFECT', 'TEXT_SHADOW', 'LARGE_TEXT',
    'USE_12_HOUR', 'LAYOUT_STYLE'].forEach(function(name) {
    var value = messageValue(payload, name);
    if (value === undefined) { return; }
    if (name === 'LAYOUT_STYLE') {
      if (value === 0 || value === 1 || value === 2 ||
          (typeof value === 'string' && /^[012]$/.test(value))) { value = Number(value); }
      else { return; }
    } else if (name === 'BACKGROUND_COLOR' || name === 'TEXT_COLOR') {
      if (typeof value !== 'number' || !isFinite(value) || Math.floor(value) !== value ||
          value < 0 || value > 0xFFFFFF) { return; }
    } else {
      if (value === true || value === false || value === 0 || value === 1) { value = Number(value); }
      else { return; }
    }
    result[MessageKeys[name]] = value;
  });
  return result;
}
Pebble.addEventListener('webviewclosed', function(event) {
  if (!event || !event.response) { return; }
  var payload;
  try { payload = watchSettings(clay.getSettings(event.response)); }
  catch (error) { log('Invalid settings response'); return; }
  if (!Object.keys(payload).length) { complications.configure(); return; }
  function deliver(attempt) {
    send(payload, function() { complications.configure(); }, function() {
      if (attempt < 3) { setTimeout(function() { deliver(attempt + 1); }, attempt * 1000); }
      else { log('Settings delivery failed'); complications.configure(); }
    });
  }
  deliver(1);
});
