'use strict';
var state = require('./settings-state');
var localization = require('../pkjs/localization');
var sourceConfig = require('../pkjs/config');
function html(value) { return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function page(settings,language,metadata,systemFormat) {
  language = localization.resolveLanguage(language,'en');
  var normalized = state.normalize(settings,false);
  if (!normalized) return null;
  var data = metadata || {slots:[{},{}],sources:{},activityProviders:[],save:{state:'none'}};
  data.language = language;
  data.activityPreferences = metadata && metadata.activityPreferences || normalized[state.preferencesKey];
  var config = localization.translateConfig(sourceConfig,language);
  function visit(items) { items.forEach(function(item) {
    if (item.items) visit(item.items);
    if (item.messageKey && normalized[item.messageKey] !== undefined && item.messageKey !== state.preferencesKey) item.defaultValue = normalized[item.messageKey];
    if (item.messageKey === state.preferencesKey) item.defaultValue = JSON.stringify(normalized[state.preferencesKey]);
    if (item.id === 'halftone-settings-data') item.defaultValue = html(JSON.stringify(data));
    if (item.id === 'halftone-settings-strings') item.defaultValue = html(JSON.stringify(localization.settingsStrings(language)));
  }); }
  visit(config);
  var values = {}; Object.keys(normalized).forEach(function(key){if(key!==state.preferencesKey)values[key]=normalized[key];});
  return {ok:true,settings:normalized,config:config,values:values,language:language,systemFormat:systemFormat === 12 || systemFormat === 24 ? systemFormat : null};
}
module.exports = page;
