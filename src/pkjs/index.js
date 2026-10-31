var MessageKeys = require('message_keys');
var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var createComplications = require('./complications');
var createContext = require('./context');
var createMessageQueue = require('./message-queue');
var localization = require('./localization');
var clay = new Clay(clayConfig, require('./settings-page'), {autoHandleEvents: false});

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
var send = createMessageQueue({
  send: function(payload, success, failure) { Pebble.sendAppMessage(payload, success, failure); },
  later: function(callback, delay) { return setTimeout(callback, delay); },
  cancelLater: function(timer) { clearTimeout(timer); }
});
function log(message) { console.log(message); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function(character) {
    return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character];
  });
}

// The default readings follow global complication choices. Context uses the
// same source API for music, optional new notifications and phone battery.
// There is no direct weather client, provider override or local unit rewrite.
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

function enabledSetting(name, fallback) {
  var value = messageValue(savedSettings(), name);
  return value === undefined ? fallback : value === true || value === 1 || value === 'true' || value === '1';
}
var context = createContext({
  pebble: Pebble, keys: MessageKeys, send: send,
  now: function() { return Date.now(); },
  later: function(callback, delay) { return setTimeout(callback, delay); },
  cancelLater: function(timer) { clearTimeout(timer); },
  getSettings: function() {
    var apps = messageValue(savedSettings(), 'NOTIFICATION_APPS');
    return {showMusic:enabledSetting('SHOW_MUSIC', true),
      showNotifications:enabledSetting('SHOW_NOTIFICATIONS', false),
      notificationPreview:enabledSetting('NOTIFICATION_PREVIEW', false),
      notificationApps:typeof apps === 'string' ? apps : '',
      showStatus:enabledSetting('SHOW_STATUS', true)};
  }
});

function requestContextSession(attempt) {
  var query = {}; query[MessageKeys.REQUEST_CONTEXT] = 1;
  send(query, null, function() {
    if (attempt < 3) { setTimeout(function() { requestContextSession(attempt + 1); }, attempt * 1000); }
  });
}
Pebble.addEventListener('ready', function() {
  complications.refresh(); context.refresh(true); requestContextSession(1);
});
Pebble.addEventListener('appmessage', function(event) {
  if (messageValue(event.payload || {}, 'REQUEST_COMPLICATIONS')) { complications.refresh(); }
  var requested = messageValue(event.payload || {}, 'REQUEST_CONTEXT');
  var token = Number(requested);
  if (Number.isInteger(token) && token >= 2 && token <= 2147483647) { context.connectionChanged(true, token); }
  else if (token === 1) { context.refresh(); }
});
Pebble.addEventListener('showConfiguration', function() {
  var language = settingsLanguage();
  clay.config = localization.translateConfig(clayConfig, language);
  var status = complications.status();
  function t(key, params) { return localization.t(key, language, params); }
  clay.config.forEach(function(section) {
    (section.items || []).forEach(function(item) {
      if (item.id === 'context-status') {
        var dynamic = context.status();
        item.defaultValue = escapeHtml(t(dynamic.error ? 'contextError' : dynamic.ready ? 'contextReady' : 'contextWaiting',
          {error:dynamic.error || ''}));
        return;
      }
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
      item.defaultValue = escapeHtml('Halftone 1.9.0 rc.4. ' + summary +
        (issue ? ' · ' + t('complicationsError', {error: issue}) : ''));
    });
  });
  Pebble.openURL(clay.generateUrl());
});

function watchSettings(payload) {
  var result = {};
  ['BACKGROUND_COLOR', 'TEXT_COLOR', 'DEPTH_EFFECT', 'TEXT_SHADOW', 'LARGE_TEXT',
    'USE_12_HOUR', 'SHOW_STATUS', 'PANEL_TRANSITIONS'].forEach(function(name) {
    var value = messageValue(payload, name);
    if (value === undefined) { return; }
    if (name === 'BACKGROUND_COLOR' || name === 'TEXT_COLOR') {
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
  // Apply phone-only source controls immediately, including privacy switches.
  // Theme delivery can retry independently without postponing a context clear.
  context.configure();
  if (!Object.keys(payload).length) { complications.configure(); return; }
  function deliver(attempt) {
    send(payload, function() { complications.configure(); }, function() {
      if (attempt < 3) { setTimeout(function() { deliver(attempt + 1); }, attempt * 1000); }
      else { log('Settings delivery failed'); complications.configure(); }
    });
  }
  deliver(1);
});
