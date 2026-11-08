'use strict';

// Serialized into the bundled configuration page. The host supplies Pebble's
// config bridge; Clay is started only after a confirmed settings read.
module.exports = function(wordsByLanguage,fieldDefaults,preferenceKey) {
  var language = String(navigator.language || 'en').toLowerCase().split('-')[0];
  var words = wordsByLanguage[language] || wordsByLanguage.en;
  var ready = false, started = false, generation = 0, timeout = null;
  var shell = document.getElementById('halftone-bootstrap');
  var label = document.getElementById('halftone-bootstrap-status');
  var retry = document.getElementById('halftone-bootstrap-retry');
  function text(key) { return words[key] || wordsByLanguage.en[key] || key; }
  function fail() { label.textContent = text('phoneLoadFailed'); retry.hidden = false; }
  retry.textContent = text('phoneRetry');
  label.textContent = text('phoneLoading');
  function request(target,message,complete,failed) {
    var id = ++generation;
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(function(){if(id===generation){generation++;timeout=null;failed();}},6500);
    function finish(callback,value) { if(id!==generation)return;generation++;clearTimeout(timeout);timeout=null;callback(value); }
    try {
      var result = Pebble.sendMessage(target,message);
      if(!result || typeof result.then !== 'function'){finish(failed);return;}
      result.then(function(value){finish(complete,value);},function(){finish(failed);});
    } catch(ignored){finish(failed);}
  }
  function target(complete,failed) {
    var settled = false;
    var timer = setTimeout(function(){finish(failed);},6500);
    function finish(callback,value){if(settled)return;settled=true;clearTimeout(timer);callback(value);}
    try {
      if(typeof Pebble.targets !== 'function'){finish(complete,'plugin');return;}
      Promise.resolve(Pebble.targets()).then(function(targets){
        if(!Array.isArray(targets)){finish(failed);return;}
        finish(complete,targets.some(function(item){return item && item.id === 'pkjs';})?'pkjs':'plugin');
      },function(){finish(failed);});
    }catch(ignored){finish(failed);}
  }
  function stable(value) {
    if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
    if(value && typeof value === 'object')return '{'+Object.keys(value).sort().map(function(key){return JSON.stringify(key)+':'+stable(value[key]);}).join(',')+'}';
    return JSON.stringify(value);
  }
  var rendered = null, confirmed = null;
  function snapshot(serialized,raw) {
    var result = {};
    Object.keys(fieldDefaults).forEach(function(name){
      var value = serialized[name];
      if(value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value,'value'))value=value.value;
      if(typeof fieldDefaults[name] === 'boolean')value=!!value;
      // Clay's fixed 64-colour palette can display a legacy RGB as a nearby
      // swatch. An unrelated Save must not rewrite that original preference.
      if(!raw && /_COLOR$/.test(name) && rendered && confirmed && value===rendered[name])value=confirmed[name];
      result[name]=value;
    });
    var preferences=serialized[preferenceKey];
    if(preferences && typeof preferences === 'object' && Object.prototype.hasOwnProperty.call(preferences,'value'))preferences=preferences.value;
    if(typeof preferences === 'string')preferences=JSON.parse(preferences);
    result[preferenceKey]=preferences;
    return result;
  }
  function load() {
    if(started)return;
    retry.hidden=true;label.textContent=text('phoneLoading');
    if(!ready){clearTimeout(timeout);timeout=setTimeout(fail,6500);return;}
    target(function(destination){request(destination,{type:'load_settings',language:language},function(page){
      if(!page || page.ok !== true || !Array.isArray(page.config) || !page.settings || !page.values){fail();return;}
      started=true;document.documentElement.lang=page.language || 'en';
      confirmed=page.settings;
      window.HalftoneSettingsBridge={
        snapshot:snapshot,
        remember:function(serialized,settings){rendered=snapshot(serialized,true);if(settings)confirmed=settings;},
        display:function(retryDelivery,complete){
          // Read polling has its own deadline and never supersedes a Save.
          target(function(destination){
            var done=false,deadline=setTimeout(function(){finish(null);},6500);
            function finish(value){if(done)return;done=true;clearTimeout(deadline);complete(value);}
            try{Promise.resolve(Pebble.sendMessage(destination,{type:retryDelivery?'retry_display':'display_status'})).then(function(value){
              finish(value&&value.ok?stable(value.settings)===stable(confirmed)?value.delivery:{applied:false,pending:true,state:'pending'}:null);
            },function(){finish(null);});}catch(ignored){finish(null);}
          },function(){complete(null);});
        },
        reload:function(){try{sessionStorage.setItem('halftone-settings-scroll',String(window.scrollY));}catch(ignored){}location.reload();},
        save:function(selected,complete){
          var attempts=0;
          function failed(){complete({ok:false});}
          function write(destination){
            if(++attempts>3){failed();return;}
            request(destination,{type:'save_settings',settings:selected},function(response){
              if(!response || response.ok!==true){complete({ok:false,notSaved:!!response&&response.notSaved===true});return;}
              if(stable(response.settings)!==stable(selected)){failed();return;}
              if(destination==='plugin')target(function(next){if(next==='pkjs')write(next);else complete(response);},failed);
              else complete(response);
            },function(){
              if(destination!=='pkjs'){failed();return;}
              target(function(next){if(next==='plugin')write(next);else failed();},failed);
            });
          }
          target(write,failed);
        }
      };
      shell.remove();
      window.__halftoneStartClay(page);
      try {
        var previous=Number(sessionStorage.getItem('halftone-settings-scroll'));
        sessionStorage.removeItem('halftone-settings-scroll');
        if(isFinite(previous)&&previous>0)requestAnimationFrame(function(){window.scrollTo({top:previous,behavior:'instant'});});
      }catch(ignored){}
    },fail);},fail);
  }
  retry.onclick=load;
  if(typeof Pebble !== 'undefined' && typeof Pebble.addEventListener==='function')Pebble.addEventListener('ready',function(){if(ready)return;ready=true;clearTimeout(timeout);load();});
  load();
};
