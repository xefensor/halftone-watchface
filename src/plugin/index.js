'use strict';

var navigation=require('../common/activity-navigation');
Pebble.registerSourceHandler(function(request,respond){
  if(!request||request.category!=='navigation'||request.item!=='presented_activities'){
    respond.error('INVALID_REQUEST');return;
  }
  respond.data(navigation.source(localStorage,Date.now()));
});
if (typeof Pebble.registerConfigHandler === 'function') Pebble.registerConfigHandler(function(message,respond){
  try {
    // A navigation read must not initialise settings/localisation or the host
    // helpers on the Quick Launch path.
    var settings=require('../common/settings-state');
    var display=require('../common/display-state');
    message = message || {};
    if (message.type === 'load_settings') {
      var current = settings.read(localStorage);
      respond(current ? require('../common/settings-config')(current,message.language,{save:display.status(localStorage).delivery}) : {ok:false});
    } else if (message.type === 'save_settings') {
      var saved=settings.save(localStorage,message.settings);if(saved.ok)saved.delivery=display.status(localStorage).delivery;respond(saved);
    } else if(message.type==='display_status'||message.type==='retry_display')respond(display.status(localStorage));
    else respond({ok:false,notSaved:true});
  } catch (ignored) { respond({ok:false}); }
});
