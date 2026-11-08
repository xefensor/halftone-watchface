var MessageKeys = require('message_keys');
var core = require('pebble-watchface-core/readings');
var activityLibrary = require('pebble-activities/host');
var activityPresentation = require('./activity-presentation');
var navigation = require('../common/activity-navigation').create({storage:localStorage,now:function(){return Date.now();}});
var createComplications = core.createComplications;
var createContext = activityLibrary.createContext;
var createMessageQueue = core.createMessageQueue;
var localization = require('./localization');
var settingsState = require('../common/settings-state');
var clay,clayConfig;
function settingsPage() {
  if(!clay) {
    var Clay=require('@rebble/clay');
    var settingsStyle=require('pebble-xoce-ui/settings-style');
    clayConfig=require('./config');
    clay=new Clay(clayConfig,require('./settings-page'),{autoHandleEvents:false,userData:{settingsStyle:settingsStyle}});
    // Lazy creation follows ready; Clay otherwise copies userData only on ready.
    clay.meta.userData.settingsStyle=settingsStyle;
  }
  return clay;
}

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
var cachedSettings,cachedPreferences;
function invalidateSettings() {cachedSettings=undefined;cachedPreferences=undefined;}
function savedSettings() {
  if(cachedSettings===undefined) {
    try { cachedSettings=JSON.parse(localStorage.getItem('clay-settings')) || {}; }
    catch (error) { cachedSettings={}; }
  }
  return cachedSettings;
}
function clockFormat(settings) {
  var value = messageValue(settings, 'CLOCK_FORMAT');
  if (value === 0 || value === 12 || value === 24) { return value; }
  var previous = messageValue(settings, 'USE_12_HOUR');
  if (previous === true || previous === 1) { return 12; }
  if (previous === false || previous === 0) { return 24; }
  return 0;
}
var contextBootstrapGeneration=0,contextBootstrapPending=false,contextBootstrapTimer=null;
var contextBootstrapTickets=[];
function removeBootstrapTicket(ticket) {
  var at=contextBootstrapTickets.indexOf(ticket);
  if(at>=0)contextBootstrapTickets.splice(at,1);
}
function cancelContextBootstrap() {
  ++contextBootstrapGeneration;contextBootstrapPending=false;
  if(contextBootstrapTimer!==null)clearTimeout(contextBootstrapTimer);
  contextBootstrapTimer=null;
}
var send = createMessageQueue({
  keys: MessageKeys,
  snapshotChannels:[{name:'activities',dataKey:'ACTIVITY_DATA',sidecarKeys:['REQUEST_ACTIVITIES']}],
  send: function(payload, success, failure) {
    // The shared queue copies payloads. Keep an ordered, content-free ticket
    // for each bootstrap so a request queued before the native baseline can
    // be discarded at dispatch without changing settings/snapshot FIFO order.
    if(Object.keys(payload).length===1&&messageValue(payload,'REQUEST_CONTEXT')===1) {
      var ticket=contextBootstrapTickets.shift();
      if(!ticket||ticket.generation!==contextBootstrapGeneration||!contextBootstrapPending) {
        failure({code:'SUPERSEDED'});return;
      }
    }
    Pebble.sendAppMessage(payload, success, failure);
  },
  later: function(callback, delay) { return setTimeout(callback, delay); },
  cancelLater: function(timer) { clearTimeout(timer); }
});
var display=require('./display-controller').create({storage:localStorage,send:send,keys:MessageKeys,changed:invalidateSettings,later:function(fn,ms){return setTimeout(fn,ms);},cancel:function(id){clearTimeout(id);}});
function log(message) { console.log(message); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function(character) {
    return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character];
  });
}
function privateReading(slot) { return slot && (slot.category === 'music' || slot.category === 'notifications'); }

// The default readings follow global complication choices. Context uses the
// same source API for music, optional new notifications and phone battery.
// There is no direct weather client, provider override or local unit rewrite.
var complications = createComplications({
  pebble: Pebble, keys: MessageKeys, storage: localStorage,
  cacheKey: 'halftone-complications-v1',
  send: send, now: function() { return Date.now(); },
  later: function(callback, delay) { return setTimeout(callback, delay); },
  cancelLater: function(timer) { clearTimeout(timer); }, log: log,
  getSettings: function() {
    var format = clockFormat(savedSettings());
    return {use12Hour: format === 12, clockFormat: format, language: settingsLanguage()};
  },
  localizeBoolean: function(value) {
    return localization.t(value ? 'stateOn' : 'stateOff', settingsLanguage());
  },
  labelForReading: require('./reading-label')
});

function enabledSetting(name, fallback) {
  var value = messageValue(savedSettings(), name);
  return value === undefined ? fallback : value === true || value === 1 || value === 'true' || value === '1';
}
var ACTIVITY_PREFERENCES_KEY = 'halftone-activity-preferences-v1';
var ACTIVITY_PREFERENCES_RESPONSE = '__halftoneActivityPreferences';
function activityPreferences() {
  if(cachedPreferences)return cachedPreferences;
  var value;
  try {
    value = savedSettings()[ACTIVITY_PREFERENCES_RESPONSE];
    if (value === undefined) value = JSON.parse(localStorage.getItem(ACTIVITY_PREFERENCES_KEY));
  } catch (ignored) {}
  var result = activityLibrary.selection.normalizePreferences(value);
  // Existing source/privacy switches remain authoritative for both built-ins.
  result.hidden = result.hidden.filter(function(id) { return id !== 'builtin:music' && id !== 'builtin:notifications'; });
  if (!enabledSetting('SHOW_MUSIC', true)) { result.hidden.push('builtin:music'); }
  if (!enabledSetting('SHOW_NOTIFICATIONS', false)) { result.hidden.push('builtin:notifications'); }
  // Existing preferences predate this row. New arrivals lead by default until
  // the user saves an explicit Notifications position in Halftone's own order.
  if (result.order.indexOf('builtin:notifications') < 0) {
    result.order = ['builtin:notifications'].concat(result.order).slice(0,64);
  }
  cachedPreferences=result;return result;
}
var contextProjectionSignature = '[null,null]';
function contextChanged() {
  if (!context) { return; }
  // Reproject only a changed canonical receipt. Battery/status traffic does
  // not resend a complete activity view; these RAM signatures contain no text.
  var signature = JSON.stringify([context.musicActivity(),
    typeof context.notificationActivity === 'function' ? context.notificationActivity() : null].map(function(card) {
      return card ? [card.provider,card.id,card.revision,card.observedAt,card.validUntil] : null;
    }));
  if (signature === contextProjectionSignature) { return; }
  contextProjectionSignature = signature;
  if (activities) { activities.reproject(); }
}
var context = createContext({
  pebble: Pebble, keys: MessageKeys, send: send, musicAsActivity:true,notificationAsActivity:true,
  now: function() { return Date.now(); },
  later: function(callback, delay) { return setTimeout(callback, delay); },
  cancelLater: function(timer) { clearTimeout(timer); },
  onChanged:contextChanged,
  getSettings: function() {
    var apps = messageValue(savedSettings(), 'NOTIFICATION_APPS');
    return {showMusic:enabledSetting('SHOW_MUSIC', true),
      showNotifications:enabledSetting('SHOW_NOTIFICATIONS', false),
      notificationPreview:enabledSetting('NOTIFICATION_PREVIEW', false),
      notificationAppOnly:enabledSetting('NOTIFICATION_APP_ONLY', false),
      notificationApps:typeof apps === 'string' ? apps : '',
      showStatus:enabledSetting('SHOW_STATUS', true)};
  }
});

// Halftone displays summaries and opens apps. Action/entity descriptors belong
// to interactive hosts; avoid even requesting their separate source fields.
var activitySourceApi = {};
if (typeof Pebble.enumeratePlugins === 'function') {
  activitySourceApi.enumeratePlugins = function() { return Pebble.enumeratePlugins(); };
}
if (typeof Pebble.subscribeToSource === 'function') {
  activitySourceApi.subscribeToSource = function(request) {
    var display = {};
    Object.keys(request).forEach(function(key) { display[key] = request[key]; });
    if (Array.isArray(request.properties)) {
      display.properties = request.properties.filter(function(property) {
        return property !== 'actions' && property !== 'entity_ref';
      });
    }
    return Pebble.subscribeToSource(display);
  };
}
var activities = activityLibrary.createActivities({
  pebble:activitySourceApi,keys:MessageKeys,send:send,nativeFormat:3,
  onView:function(snapshot){navigation.view(snapshot);},
  // All generic providers share the same roles. Built-in privacy/source
  // controls are handled by their adapters and selection preferences.
  acceptActivity:function(activity){
    var kind=String(activity.kind).toLowerCase();
    var media=activity.type==='media'||activity.presentation===2||kind==='music';
    return enabledSetting('SHOW_ACTIVITIES',true)&&
      (!media||enabledSetting('SHOW_MUSIC',true));
  },
  select:function(cards){
    return activityPresentation.select(cards,activityPreferences(),context.musicActivity(),
      typeof context.notificationActivity === 'function' ? context.notificationActivity() : null);
  },
  now:function(){return Date.now();},
  later:function(callback,delay){return setTimeout(callback,delay);},
  cancelLater:function(timer){clearTimeout(timer);},
  // The coordinator also transports built-in music. Generic plugin visibility
  // is a host filter so music and idle-provider discovery remain available.
  getSettings:function(){return {enabled:true,
    providers:enabledSetting('SHOW_ACTIVITIES',true)?undefined:[],
    disabledProviders:activityPreferences().hidden.filter(function(id){return id!=='builtin:music'&&id!=='builtin:notifications';})};}
});

function requestContextSession(attempt,generation) {
  if(generation!==contextBootstrapGeneration||!contextBootstrapPending)return;
  var query = {}; query[MessageKeys.REQUEST_CONTEXT] = 1;
  var ticket={generation:generation};contextBootstrapTickets.push(ticket);
  send(query, function(){removeBootstrapTicket(ticket);}, function() {
    removeBootstrapTicket(ticket);
    if(generation!==contextBootstrapGeneration||!contextBootstrapPending)return;
    if(attempt<3)contextBootstrapTimer=setTimeout(function() {
      contextBootstrapTimer=null;requestContextSession(attempt+1,generation);
    },attempt*1000);
    else contextBootstrapPending=false;
  });
}
Pebble.addEventListener('ready', function() {
  invalidateSettings();
  display.reconcile(true);
  resyncPresentation();
  complications.refresh(); context.refresh(true); activities.refresh();
  cancelContextBootstrap();contextBootstrapPending=true;
  requestContextSession(1,contextBootstrapGeneration);
});
var SYSTEM_CLOCK_KEY = 'halftone-system-clock-v1';
function systemClockFormat() {
  try {
    var value = JSON.parse(localStorage.getItem(SYSTEM_CLOCK_KEY));
    return value === 12 || value === 24 ? value : null;
  } catch (ignored) { return null; }
}
Pebble.addEventListener('appmessage', function(event) {
  var result=messageValue(event.payload||{},'DISPLAY_PREFERENCES_RESULT');
  if(result!==undefined)display.receive(result);
  var presented=messageValue(event.payload||{},'ACTIVITY_PRESENTED');
  if(presented!==undefined)navigation.receive(presented);
  var format = messageValue(event.payload || {}, 'CLOCK_FORMAT');
  if (format === 12 || format === 24) {
    // This is the OS format, not the watchface's saved override.
    try { localStorage.setItem(SYSTEM_CLOCK_KEY, JSON.stringify(format)); } catch (ignored) {}
  }
  retrySavedSettings();
  if (messageValue(event.payload || {}, 'REQUEST_COMPLICATIONS')) { complications.refresh(); }
  var requested = messageValue(event.payload || {}, 'REQUEST_CONTEXT');
  var token = Number(requested);
  if (Number.isInteger(token) && token >= 2 && token <= 2147483647) {
    cancelContextBootstrap();
    context.connectionChanged(true, token);
    // A reset or another watch can reuse the same counter. Every marked
    // baseline request may need recovery; ordinary refreshes use token 1.
    resyncPresentation();
  }
  else if (token === 1) { context.refresh(); }
  var activityToken=Number(messageValue(event.payload || {},'REQUEST_ACTIVITIES'));
  if(Number.isInteger(activityToken)&&activityToken>=2&&activityToken<=2147483647)
    activities.connectionChanged(true,activityToken);
  else if(activityToken===1)activities.refresh();
});
Pebble.addEventListener('showConfiguration', function() {
  invalidateSettings();settingsPage();
  var previewAssets=require('./settings-preview');
  var clockQuery = {}; clockQuery[MessageKeys.CLOCK_FORMAT] = 255;
  send(clockQuery); // Native replies separately; this offline page remains a snapshot.
  var language = settingsLanguage();
  clay.config = localization.translateConfig(clayConfig, language);
  var saved = savedSettings();
  var status = complications.status();
  var halftone = context.status();
  var metadata = settingsMetadata(status, halftone);
  metadata.language = language;
  function t(key, params) { return localization.t(key, language, params); }
  function visit(items) {
    items.forEach(function(item) {
      if (item.items) { visit(item.items); }
      // Clay restores named keys. Also present legacy numeric-key preferences
      // without rewriting storage merely because the user opened settings.
      var previous = item.messageKey && messageValue(saved, item.messageKey);
      if (item.type === 'toggle' && (previous === true || previous === false || previous === 0 || previous === 1)) {
        item.defaultValue = !!previous;
      }
      if (item.type === 'color' && typeof previous === 'number' && isFinite(previous) && previous >= 0 && previous <= 0xFFFFFF) {
        item.defaultValue = previous;
      }
      if (item.messageKey === 'NOTIFICATION_APPS' && typeof previous === 'string') { item.defaultValue = previous; }
      if (['TEXT_SIZE','APPEARANCE_MODE','MANUAL_APPEARANCE'].indexOf(item.messageKey)>=0) { var nativeSettings=settingsState.read(localStorage);if(nativeSettings)item.defaultValue=nativeSettings[item.messageKey]; }
      if (item.messageKey === 'CLOCK_FORMAT') { item.defaultValue = clockFormat(saved); }
      if (item.messageKey === 'NOTIFICATION_VIBRATION' && [0,1,2].indexOf(previous) >= 0) { item.defaultValue = previous; }
      if (item.id === 'halftone-settings-data') { item.defaultValue = escapeHtml(JSON.stringify(metadata)); return; }
      if (item.id === 'halftone-preview-assets') {
        var assets = Object.assign({}, previewAssets, {systemFormat:systemClockFormat()});
        item.defaultValue = escapeHtml(JSON.stringify(assets)); return;
      }
      if (item.id === 'halftone-settings-strings') {
        item.defaultValue = escapeHtml(JSON.stringify(localization.settingsStrings(language))); return;
      }
      if (item.id === 'context-status') {
        item.defaultValue = escapeHtml(t(halftone.error ? 'contextError' : halftone.ready ? 'contextReady' : 'contextWaiting',
          {error:halftone.error || ''}));
        return;
      }
      if (item.id !== 'complications-status') { return; }
      var summary = status.available === false ? t('complicationsDisabled') :
        status.configured ? t('complicationsStatus', {ready: status.ready || 0, configured: status.configured}) :
        t('complicationsWaiting');
      var issue = status.error;
      var problem = (status.slots || []).filter(function(slot) { return slot.error === issue; })[0];
      if (issue && problem) {
        issue = '#' + problem.slot + ' · ' + problem.category + '/' + problem.item +
          (problem.property ? '/' + problem.property : '') + ' · ' + issue +
          (problem.message && !privateReading(problem) ? ' · ' + problem.message : '');
      } else if (issue && status.message) { issue += ' · ' + status.message; }
      // Clay text fields support HTML. Source diagnostics remain literal text,
      // including provider-supplied error messages and category/item names.
      item.defaultValue = escapeHtml('Halftone ' + previewAssets.version + '. ' + summary +
        (issue ? ' · ' + t('complicationsError', {error: issue}) : ''));
    });
  }
  visit(clay.config);
  Pebble.openURL(clay.generateUrl());
});

function settingsMetadata(status, halftone) {
  var details = halftone.sourceStates || {};
  function source(name, enabled) {
    if (!enabled) { return {state:'off', message:''}; }
    if (details[name]) { return {state:details[name].state, message:details[name].message || ''}; }
    var error = halftone.sources && halftone.sources[name] || '';
    return {state:error === 'PERMISSION_DENIED' ? 'denied' : error || halftone.available === false ? 'unavailable' :
      halftone.connected === false ? 'waiting' : name === 'music' ? halftone.music ? 'playing' : halftone.ready ? 'idle' : 'waiting' :
      halftone.ready ? 'ready' : 'waiting', message:error};
  }
  var slots = status.slots || [];
  var delivery=display.status();
  return {slots:[0,1].map(function(index) {
    var slot = slots[index] || {};
    var privateValue = privateReading(slot);
    return {side:index ? 'right' : 'left', label:privateValue ? slot.property || '' : slot.label || slot.property || '',
      value:privateValue ? '' : slot.text || '',
      status:slot.status || (status.available === false ? 'disabled' : 'empty'), help:privateValue ? '' : slot.message || '',
      receivedAgeSec:typeof slot.receivedAgeSec === 'number' && isFinite(slot.receivedAgeSec) && slot.receivedAgeSec >= 0 ? slot.receivedAgeSec : null,
      observationAgeSec:typeof slot.observationAgeSec === 'number' && isFinite(slot.observationAgeSec) && slot.observationAgeSec >= 0 ? slot.observationAgeSec : null,
      category:slot.category || '', item:slot.item || '', property:slot.property || ''};
  }), sources:{music:source('music', enabledSetting('SHOW_MUSIC', true)),
    notifications:source('notifications', enabledSetting('SHOW_NOTIFICATIONS', false)),
    phone:source('phone', enabledSetting('SHOW_STATUS', true)),
    activities:(function(){
      var status=activities.status();
      return {state:!enabledSetting('SHOW_ACTIVITIES',true)?'off':
        status.error==='PERMISSION_DENIED'?'denied':status.error?'unavailable':
        status.available===false?'disabled':status.ready?(status.count?'ready':'idle'):'waiting',
        message:status.error || ''};
    })()},
    activityPreferences:activityPreferences(),
    activityProviders:typeof activities.providers==='function'?activities.providers():[],
    save:delivery.ok?delivery.delivery:{state:'pending',applied:false,pending:true}};
}
function retrySavedSettings(){display.reconcile(false);}
function resyncPresentation(){display.reconcile(false);}
function applyPhoneSettings(candidate) {
  var confirmed=settingsState.save(localStorage,candidate);
  invalidateSettings();
  if(!confirmed.ok)return confirmed;
  applySavedSettings();
  confirmed.delivery=display.status().delivery;
  return confirmed;
}
function applySavedSettings() {
  // Privacy and source controls apply immediately, independently of native save.
  context.configure();activities.reproject();activities.configure();complications.configure();
  display.reconcile(false);
}
Pebble.addEventListener('webviewclosed',function(event){
  if(!event||!event.response)return;
  try{
    var response=JSON.parse(/^\{/.test(event.response)?event.response:decodeURIComponent(event.response));
    var selected={};
    Object.keys(response).forEach(function(key){var name=MessageKeys[key]!==undefined?key:settingsState.names.filter(function(name){return String(MessageKeys[name])===key;})[0];if(name)selected[name]=response[key];});
    if(response[ACTIVITY_PREFERENCES_RESPONSE]!==undefined)selected[ACTIVITY_PREFERENCES_RESPONSE]=response[ACTIVITY_PREFERENCES_RESPONSE];
    var confirmed=settingsState.patch(localStorage,selected);invalidateSettings();
    if(confirmed.ok)applySavedSettings();
  }catch(ignored){invalidateSettings();log('Invalid settings response');}
});
Pebble.addEventListener('configmessage',function(event){
  if (!event || typeof event.respond !== 'function') return;
  try {
    var message = event.message || event.data || event.payload || {};
    if (typeof message === 'string') message = JSON.parse(message);
    if (message.type==='display_status'||message.type==='retry_display'){
      if(message.type==='retry_display')display.reconcile(true);
      event.respond(display.status());return;
    }
    if (message.type === 'save_settings') { event.respond(applyPhoneSettings(message.settings)); return; }
    if (message.type === 'load_settings') {
      invalidateSettings();
      var current = settingsState.read(localStorage);
      if (!current) { event.respond({ok:false}); return; }
      event.respond(require('../common/settings-config')(current,settingsLanguage(),settingsMetadata(complications.status(),context.status()),systemClockFormat()));
      return;
    }
    event.respond({ok:false,notSaved:true});
  } catch (ignored) { event.respond({ok:false}); }
});
