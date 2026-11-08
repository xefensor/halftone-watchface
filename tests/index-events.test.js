const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/pkjs/index.js'), 'utf8');
const packageInfo = require('../package.json');
const shared = require('pebble-watchface-core');
const activityLibrary = require('pebble-activities');
const presentationModule = {exports:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../src/pkjs/activity-presentation.js'),'utf8'),{
  module:presentationModule,require:name=>{assert.equal(name,'pebble-activities/host');return activityLibrary;}
});
const TIMER='50e9ef12-a5ab-4369-a3b5-3447bfba5151', HEALTH='c9e7cb18-eaf7-4b30-9b09-9a8fae187801',N=1700000000;
function activity(extra={}) {
  const card={provider:HEALTH,id:'activity',kind:'workout',state:'active',revision:1,
    observedAt:N,validUntil:N+3600,caption:'App',private:false,main:{type:'text',label:'Activity',text:'Current'},...extra};
  if(card.main&&!card.main.label)card.main={label:'Activity',...card.main};
  if(card.support&&!card.support.label)card.support={label:'Elapsed',...card.support};
  return card;
}
const keys = Object.fromEntries(packageInfo.pebble.messageKeys.map((key,i) => [key,10000+i]));

function fixture(settings = {}, locales = {}) {
  let watchLanguage = locales.watch;
  let saved = JSON.stringify(settings);
  const storage = Object.assign({},locales.storage || {});
  let options, contextOptions, activityOptions, activityConfigured=0, activityReprojects=0, musicActivity=null, notificationActivity=null, clay, fail = false, hold = false, configured = 0, refreshed = 0, contextConfigured = 0, timerId = 0;
  const activityProviders=[];
  const deferred=[];
  const contextRefreshes=[], connections=[],activityRefreshes=[],activityConnections=[];
  const imports=[],storageReads={};
  const handlers = {}, deliveries = [], clockQueries = [], urls = [], timers = [], activitySourceRequests=[];
  const status = {available:true,configured:0,ready:0,error:'',slots:[]};
  const contextStatus = {available:true,ready:false,error:''};
  vm.runInNewContext(source, {
    require: name => {
      imports.push(name);
      if (name === 'message_keys') return keys;
      if (name === 'pebble-xoce-ui/settings-style') return require('pebble-xoce-ui/settings-style');
      if (name === '../common/activity-navigation') return require('../src/common/activity-navigation');
      if (name === '../common/settings-state') return require('../src/common/settings-state');
      if (name === '../common/settings-config') return require('../src/common/settings-config');
      if (name === './display-controller') return require('../src/pkjs/display-controller');
      if (name === './config') return require('../src/pkjs/config');
      if (name === './settings-page') return require('../src/pkjs/settings-page');
      if (name === './settings-preview') return require('../src/pkjs/settings-preview');
      if (name === './localization') return require('../src/pkjs/localization');
      if (name === './reading-label') return require('../src/pkjs/reading-label');
      if (name === './activity-presentation') return presentationModule.exports;
      if (name === '@rebble/clay') return function(config,_custom,opts) {
        assert.equal(opts.autoHandleEvents,false);
        assert.equal(opts.userData.settingsStyle,require('pebble-xoce-ui/settings-style'));
        this.meta={userData:{}};
        this.config=JSON.parse(JSON.stringify(config));
        this.generateUrl=()=> {
          assert.equal(this.meta.userData.settingsStyle,require('pebble-xoce-ui/settings-style'));
          return 'data:text/html,settings';
        };
        this.getSettings=response=> {
          const raw=JSON.parse(response);
          const flat=Object.fromEntries(Object.entries(raw).map(([key,value])=>
            [key,value && typeof value==='object'?value.value:value]));
          saved=JSON.stringify(flat);
          return Object.fromEntries(Object.entries(flat).map(([key,value])=>
            [keys[key]===undefined?key:keys[key],typeof value==='boolean'?Number(value):value]));
        };
        clay=this;
      };
      if (name === 'pebble-watchface-core/readings') return {
        createComplications: received=> {
          options=received;
          return {refresh:()=>refreshed++,configure:()=>configured++,status:()=>status};
        },
        createMessageQueue: shared.createMessageQueue
      };
      if (name === 'pebble-activities/host') return {
        selection:activityLibrary.selection,
        createActivities: received=> {
          activityOptions=received;
          return {refresh:(...args)=>activityRefreshes.push(args),configure:()=>activityConfigured++,
            reproject:()=>activityReprojects++,providers:()=>activityProviders,
            connectionChanged:(...args)=>activityConnections.push(args),status:()=>({available:true,ready:false,count:0,error:''})};
        },
        createContext: received=> {
          contextOptions=received;
          return {refresh:value=>contextRefreshes.push(value),configure:()=>contextConfigured++,
            musicActivity:()=>musicActivity,
            notificationActivity:()=>notificationActivity,
            connectionChanged:(value,token)=>connections.push({value,token}),status:()=>contextStatus};
        }
      };
      throw Error('Unexpected dependency '+name);
    },
    Pebble: {
      enumeratePlugins:()=>[],
      subscribeToSource:request=>{activitySourceRequests.push(request);return {unsubscribe:()=>{}};},
      getActiveWatchInfo:()=> {if(locales.throwWatchInfo)throw Error('Disconnected');return {language:watchLanguage};},
      addEventListener:(event,fn)=> {handlers[event]=fn;},
      sendAppMessage:(payload,ok,error)=> {if(payload[keys.CLOCK_FORMAT]===255)clockQueries.push(payload);else deliveries.push(payload);if(hold){deferred.push({ok,error});}else if(fail){if(error)error();}else if(ok)ok();},
      openURL:url=>urls.push(url)
    },
    navigator:{language:locales.phone || 'en-US'},
    localStorage:{getItem:key=>{storageReads[key]=(storageReads[key]||0)+1;return key==='clay-settings'?saved:storage[key] || null;},
      setItem:(key,value)=>{if(locales.failPreferencesWrite&&key==='halftone-activity-preferences-v1')throw Error('Storage failed');if(key==='clay-settings')saved=value;else storage[key]=value;}},
    setTimeout:(fn,delay)=>{const id=++timerId;timers.push({fn,delay,id});return id;},
    clearTimeout:id=>{const at=timers.findIndex(timer=>timer.id===id);if(at>=0)timers.splice(at,1);},
    console:{log:()=>{}}
  });
  return {imports,storageReads,handlers,deliveries,clockQueries,urls,status,contextStatus,get clay(){return clay;},options,contextOptions,activityOptions,activitySourceRequests,timers,contextRefreshes,connections,activityRefreshes,activityConnections,activityConfigured:()=>activityConfigured,
    refreshes:()=>refreshed,configured:()=>configured,settings:()=>JSON.parse(saved),
    contextConfigured:()=>contextConfigured,storage,activityProviders,activityReprojects:()=>activityReprojects,
    setMusic:card=>{musicActivity=card;},
    setNotification:card=>{notificationActivity=card;},
    fail:value=>{fail=value;},hold:value=>{hold=value;},deferred,watchLanguage:value=>{watchLanguage=value;}};
}
const displayState=require('../src/common/display-state');
function nativePayload(payload){
  assert.ok(payload&&(payload.DISPLAY_PREFERENCES||payload[keys.DISPLAY_PREFERENCES]),'expected a native preference frame');
  assert.equal(Object.keys(payload).length,1,'only the complete display snapshot leaves the phone');
  const decoded=displayState.decode(payload.DISPLAY_PREFERENCES||payload[keys.DISPLAY_PREFERENCES]);assert.ok(decoded);assert.ok(decoded.revision>0);
  const result=Object.fromEntries(displayState.fields.map((key,i)=>[keys[key],decoded.values[i]]));
  result[keys.NIGHT_PALETTE]=decoded.values[11]===1?1:0;result[keys.USE_12_HOUR]=decoded.values[6]===12?1:0;return result;
}
function nativeMessages(f){return f.deliveries.filter(p=>p.DISPLAY_PREFERENCES!==undefined||p[keys.DISPLAY_PREFERENCES]!==undefined);}
function nativeReceipt(f,payload){f.handlers.appmessage({payload:{[keys.DISPLAY_PREFERENCES_RESULT]:payload.DISPLAY_PREFERENCES||payload[keys.DISPLAY_PREFERENCES]}});}
const allItems=f=>f.clay.config.flatMap(section=>[section].concat(section.items || []));
const item=(f,id)=>allItems(f).find(x=>x.id===id);
const named=(f,key)=>allItems(f).find(x=>x.messageKey===key);

test('Halftone requests display and open-app data without action or entity descriptors',()=>{
  const f=fixture(),request={plugin:TIMER,category:'activity',item:'summary',
    properties:['schema_version','content','actions','entity_ref','open_app']};
  const handle=f.activityOptions.pebble.subscribeToSource(request);
  assert.equal(typeof handle.unsubscribe,'function');
  assert.deepEqual(Array.from(f.activitySourceRequests[0].properties),['schema_version','content','open_app']);
  assert.deepEqual(request.properties,['schema_version','content','actions','entity_ref','open_app']);
  assert.equal(f.activitySourceRequests[0].item,'summary');
});

test('ready and named/numeric complication requests refresh the generic coordinator',()=>{
  const f=fixture();f.handlers.ready();
  f.handlers.appmessage({payload:{REQUEST_COMPLICATIONS:1}});
  f.handlers.appmessage({payload:{[keys.REQUEST_COMPLICATIONS]:1}});
  f.handlers.appmessage({payload:{REQUEST_WEATHER:1,USE_FAHRENHEIT:1}});
  f.handlers.appmessage({payload:{TEXT_COLOR:123}});f.handlers.appmessage({});
  assert.equal(f.refreshes(),3);
});

test('native baseline cancels bootstrap retries including an already queued timer callback',()=>{
  const f=fixture();f.fail(true);f.handlers.ready();
  assert.equal(f.deliveries.length,1);assert.equal(f.timers.length,1);
  const late=f.timers[0].fn;
  f.handlers.appmessage({payload:{REQUEST_CONTEXT:91}});
  assert.equal(f.timers.length,0);
  late();assert.equal(f.deliveries.length,1);
  assert.deepEqual(f.connections,[{value:true,token:91}]);
});

test('obsolete bootstrap waiting behind settings never resets the new native session',()=>{
  const f=fixture();f.hold(true);
  f.handlers.webviewclosed({response:JSON.stringify({TEXT_COLOR:111})});
  f.handlers.ready();f.handlers.showConfiguration();
  f.handlers.webviewclosed({response:JSON.stringify({TEXT_COLOR:222})});
  f.handlers.appmessage({payload:{[keys.REQUEST_CONTEXT]:92}});
  f.hold(false);f.deferred.shift().ok();
  assert.equal(f.deliveries.filter(p=>p[keys.REQUEST_CONTEXT]===1).length,0);
  assert.deepEqual(nativeMessages(f).map(p=>nativePayload(p)[keys.TEXT_COLOR]),[111,111,222]);
  assert.equal(f.clockQueries.length,1,'the unrelated clock query retains its FIFO place');
});

test('another ready event replaces the bootstrap retry generation without duplicate chains',()=>{
  const f=fixture();f.fail(true);f.handlers.ready();
  const late=f.timers[0].fn;
  f.handlers.ready();assert.equal(f.timers.length,1);
  const before=f.deliveries.length;late();assert.equal(f.deliveries.length,before);
  while(f.timers.length)f.timers.shift().fn();
  assert.equal(f.deliveries.length,4,'one obsolete attempt plus three bounded current attempts');
});

test('late bootstrap transport failure cannot recreate a retry after native confirmation',()=>{
  const f=fixture();f.hold(true);f.handlers.ready();
  f.handlers.appmessage({payload:{REQUEST_CONTEXT:93}});
  f.deferred.shift().error({code:'DISCONNECTED'});
  assert.equal(f.timers.length,0);
  assert.equal(f.deliveries.length,1);
});

test('the coordinator receives saved clock preference and active-watch language',()=>{
  for(const previous of [{USE_12_HOUR:true},{[keys.USE_12_HOUR]:true}]) {
    const f=fixture(previous,{watch:'cs-CZ',phone:'de-DE'});
    assert.equal(f.options.getSettings().use12Hour,true);
    assert.equal(f.options.getSettings().language,'cs');
    assert.equal(f.options.localizeBoolean(true),'Zapnuto');
    assert.equal(f.options.localizeBoolean(false),'Vypnuto');
    f.handlers.ready();assert.deepEqual(f.settings(),previous,'opening the face does not rewrite visual preferences');
  }
});

test('obsolete layout choices are ignored while unrelated appearance settings survive',()=>{
  const f=fixture();
  for(const value of ['1','2','0',2]) {
    f.handlers.webviewclosed({response:JSON.stringify({LAYOUT_STYLE:{value},TEXT_COLOR:{value:0},LARGE_TEXT:{value:true}})});
    const payload=nativePayload(f.deliveries.at(-1));
    assert.equal(payload[keys.LAYOUT_STYLE],undefined);
    assert.equal(payload[keys.TEXT_COLOR],0);
    assert.equal(payload[keys.LARGE_TEXT],1);
    assert.equal(f.settings().LAYOUT_STYLE,undefined,'retired page controls cannot replace active settings');
  }
  assert.equal(f.configured(),4);
});

test('Big text and all optical choices survive native receipts, numeric keys and reopening',()=>{
  for(const name of ['LARGE_TEXT','DEPTH_EFFECT','TEXT_SHADOW','PANEL_TRANSITIONS'])for(const field of [name,String(keys[name])])for(const value of [false,true]){
    const f=fixture({[field]:value,TEXT_COLOR:123});f.handlers.showConfiguration();assert.equal(named(f,name).defaultValue,value);
    f.handlers.webviewclosed({response:JSON.stringify({[field]:{value:!value}})});
    const frame=nativeMessages(f).at(-1);assert.equal(nativePayload(frame)[keys[name]],Number(!value));
    assert.equal(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied,null);nativeReceipt(f,frame);assert.ok(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied);
    f.handlers.showConfiguration();assert.equal(named(f,name).defaultValue,!value);
  }
});
test('older pending optical settings migrate without transport-only success',()=>{
  const f=fixture();f.storage['halftone-settings-delivery-v1']=JSON.stringify({id:'old-optics',state:'pending',payload:{[keys.LARGE_TEXT]:1,[keys.DEPTH_EFFECT]:1}});
  f.handlers.ready();const frame=nativeMessages(f)[0];assert.equal(nativePayload(frame)[keys.LARGE_TEXT],1);assert.equal(nativePayload(frame)[keys.DEPTH_EFFECT],1);
  assert.equal(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied,null);nativeReceipt(f,frame);assert.ok(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied);
});

test('invalid layouts and unsupported fields cannot override unrelated visual settings',()=>{
  const f=fixture();
  for(const value of [-1,3,1.5,null,'','01','Classic',{},[]]) {
    f.handlers.webviewclosed({response:JSON.stringify({LAYOUT_STYLE:{value},TEXT_COLOR:{value:123},COMPLICATION_DATA:{value:'bad'}})});
    const payload=nativePayload(f.deliveries.at(-1));
    assert.equal(payload[keys.LAYOUT_STYLE],undefined);
    assert.equal(payload[keys.COMPLICATION_DATA],undefined);
    assert.equal(payload[keys.TEXT_COLOR],123);
  }
});

test('obsolete weather/unit controls never reach the new complication-only watch UI',()=>{
  const f=fixture({FOLLOW_PEBBLE_UNITS:false,USE_FAHRENHEIT:true,WEATHER_LOCATION:'home'});
  f.handlers.webviewclosed({response:JSON.stringify({FOLLOW_PEBBLE_UNITS:true,USE_FAHRENHEIT:true,
    WEATHER_LOCATION:'office',SHOW_DAILY_RANGE:true,SHOW_RAIN_CHANCE:true,SHOW_WEATHER_ICON:false,
    TEXT_COLOR:456,USE_12_HOUR:true})});
  nativePayload(f.deliveries[0]);
  assert.equal(nativePayload(f.deliveries[0])[keys.USE_12_HOUR],1);
  assert.equal(f.configured(),1);
});

test('boolean settings preserve explicit off and reject malformed values',()=>{
  const f=fixture();
  f.handlers.webviewclosed({response:JSON.stringify({DEPTH_EFFECT:false,TEXT_SHADOW:true,LARGE_TEXT:'false',USE_12_HOUR:2,BACKGROUND_COLOR:-1,TEXT_COLOR:0x1000000,SHOW_STATUS:false})});
  nativePayload(f.deliveries[0]);
  assert.equal(nativePayload(f.deliveries[0])[keys.DEPTH_EFFECT],0);assert.equal(nativePayload(f.deliveries[0])[keys.TEXT_SHADOW],1);
  assert.equal(nativePayload(f.deliveries[0])[keys.SHOW_STATUS],0);
});

test('cancelled or invalid settings do nothing, empty valid settings reconfigure only',()=>{
  const f=fixture();f.handlers.webviewclosed({});f.handlers.webviewclosed({response:'bad json'});
  assert.equal(f.deliveries.length,0);assert.equal(f.configured(),0);
  f.handlers.webviewclosed({response:'{}'});assert.equal(f.deliveries.length,0);assert.equal(f.configured(),1);
});

test('settings show complication counts/errors and no hard-coded weather picker',()=>{
  const f=fixture();Object.assign(f.status,{configured:2,ready:1,error:'PERMISSION_DENIED'});
  f.status.slots=[{slot:2,category:'weather',item:'location',error:'PERMISSION_DENIED',message:'Location permission required'}];
  f.handlers.showConfiguration();
  assert.ok(item(f,'complications-status').defaultValue.startsWith(
    'Halftone ' + packageInfo.version + '. '));
  assert.match(item(f,'complications-status').defaultValue,/1\/2 ready/);
  assert.match(item(f,'complications-status').defaultValue,/Complication error: #2 · weather\/location · PERMISSION_DENIED · Location permission required/);
  assert.equal(named(f,'WEATHER_LOCATION'),undefined);
  assert.equal(named(f,'SHOW_DAILY_RANGE'),undefined);
  assert.deepEqual(f.urls,['data:text/html,settings']);
});

test('provider error messages are displayed as literal text in Clay settings',()=>{
  const f=fixture();Object.assign(f.status,{configured:1,ready:0,error:'PLUGIN_UNAVAILABLE'});
  f.status.slots=[{slot:1,category:'weather',item:'location',error:'PLUGIN_UNAVAILABLE',message:'No plugin <b>Weather</b> & "missing"'}];
  f.handlers.showConfiguration();
  const text=item(f,'complications-status').defaultValue;
  assert.match(text,/PLUGIN_UNAVAILABLE · No plugin &lt;b&gt;Weather&lt;\/b&gt; &amp; &quot;missing&quot;/);
  assert.doesNotMatch(text,/<b>|<\/b>/);
});

test('complication controls/status follow the active watch language and rebuild after a language change',()=>{
  const f=fixture({}, {watch:'cs_CZ',phone:'de-DE'});Object.assign(f.status,{configured:2,ready:1});
  f.handlers.showConfiguration();const czech=item(f,'complications-status').defaultValue;
  assert.match(czech,/1\/2/);assert.doesNotMatch(czech,/Complications:| ready/);
  assert.equal(named(f,'LAYOUT_STYLE'),undefined);
  assert.equal(named(f,'SHOW_MUSIC').messageKey,'SHOW_MUSIC');
  f.watchLanguage('de-DE');f.handlers.showConfiguration();assert.notEqual(item(f,'complications-status').defaultValue,czech);
  f.watchLanguage('en-US');f.handlers.showConfiguration();assert.match(item(f,'complications-status').defaultValue,/Complications: 1\/2 ready/);
});

test('disabled plugin status is explicit and locale lookup falls back to the phone',()=>{
  const f=fixture({}, {throwWatchInfo:true,phone:'cs-CZ'});f.status.available=false;f.handlers.showConfiguration();
  assert.doesNotMatch(item(f,'complications-status').defaultValue,/Enable plugins/);
  assert.equal(f.options.getSettings().language,'cs');
  const english=fixture({}, {watch:'ja-JP',phone:'ko-KR'});english.status.available=false;english.handlers.showConfiguration();
  assert.match(item(english,'complications-status').defaultValue,/Enable plugins in Pebble/);
});

test('settings delivery retries busy transport, then reconfigures once',()=>{
  const f=fixture();f.fail(true);f.handlers.webviewclosed({response:JSON.stringify({USE_12_HOUR:true})});
  assert.equal(f.configured(),1);f.fail(false);f.timers.shift().fn();
  assert.equal(nativeMessages(f).length,2);assert.equal(nativePayload(nativeMessages(f)[1])[keys.CLOCK_FORMAT],12);
  assert.equal(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied,null);nativeReceipt(f,nativeMessages(f)[1]);
  assert.ok(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied);
});

test('settings delivery failure is bounded instead of retrying forever',()=>{
  const f=fixture();f.fail(true);f.handlers.webviewclosed({response:JSON.stringify({TEXT_COLOR:123})});
  while(f.timers.length)f.timers.shift().fn();
  assert.equal(f.deliveries.length,3);assert.equal(f.configured(),1);
});

test('context source defaults and saved named/numeric settings preserve explicit opt-outs',()=>{
  const defaults=fixture();
  assert.deepEqual(JSON.parse(JSON.stringify(defaults.contextOptions.getSettings())),
    {showMusic:true,showNotifications:false,notificationPreview:false,notificationAppOnly:false,notificationApps:'',showStatus:true});
  for(const settings of [{SHOW_MUSIC:false,SHOW_NOTIFICATIONS:true,NOTIFICATION_PREVIEW:true,NOTIFICATION_APPS:'Signal, WhatsApp',SHOW_STATUS:false},
    {[keys.SHOW_MUSIC]:0,[keys.SHOW_NOTIFICATIONS]:1,[keys.NOTIFICATION_PREVIEW]:1,[keys.NOTIFICATION_APPS]:'Signal, WhatsApp',[keys.SHOW_STATUS]:0}]) {
    const f=fixture(settings);
    assert.deepEqual(JSON.parse(JSON.stringify(f.contextOptions.getSettings())),
      {showMusic:false,showNotifications:true,notificationPreview:true,notificationAppOnly:false,notificationApps:'Signal, WhatsApp',showStatus:false});
  }
});

test('startup and reconnect context requests rebaseline while ordinary requests preserve notification history',()=>{
  const f=fixture();f.handlers.ready();
  f.handlers.appmessage({payload:{REQUEST_CONTEXT:1}});
  f.handlers.appmessage({payload:{[keys.REQUEST_CONTEXT]:2}});
  assert.deepEqual(f.contextRefreshes,[true,undefined]);
  assert.deepEqual(f.connections,[{value:true,token:2}]);
  assert.equal(f.deliveries[0][keys.REQUEST_CONTEXT],1,'Ready asks the native app for its current session');
});

test('phone-only notification and music choices never enter watch packets and apply before theme retries',()=>{
  const f=fixture();f.fail(true);
  f.handlers.webviewclosed({response:JSON.stringify({SHOW_NOTIFICATIONS:true,NOTIFICATION_PREVIEW:true,
    NOTIFICATION_APPS:'Signal',SHOW_MUSIC:false,SHOW_STATUS:false,TEXT_COLOR:123})});
  assert.equal(f.contextConfigured(),1);
  assert.equal(f.configured(),1);
  nativePayload(f.deliveries[0]);
  assert.equal(nativePayload(f.deliveries[0])[keys.SHOW_STATUS],0);
  assert.equal(f.contextOptions.getSettings().notificationApps,'Signal');
});

test('halftone source errors use translated framing and literal HTML-escaped diagnostics',()=>{
  const f=fixture();f.contextStatus.error='PERMISSION_DENIED <test>';
  f.handlers.showConfiguration();
  assert.match(item(f,'context-status').defaultValue,/PERMISSION_DENIED &lt;test&gt;/);
  f.contextStatus.error='';f.contextStatus.ready=true;f.handlers.showConfiguration();
  assert.match(item(f,'context-status').defaultValue,/Halftone content: ready/);
});

test('Halftone border effects retain their saved wire keys in the complete snapshot',()=>{
  const f=fixture();f.handlers.webviewclosed({response:JSON.stringify({PANEL_TRANSITIONS:true,DEPTH_EFFECT:true,TEXT_COLOR:123})});
  const value=nativePayload(f.deliveries[0]);assert.equal(value[keys.PANEL_TRANSITIONS],1);assert.equal(value[keys.DEPTH_EFFECT],1);assert.equal(value[keys.TEXT_COLOR],123);
  f.handlers.showConfiguration();assert.equal(named(f,'PANEL_TRANSITIONS').defaultValue,true);assert.equal(named(f,'DEPTH_EFFECT').defaultValue,true);
});

test('Halftone uses the installed core API and its own complication cache namespace',()=>{
  const f=fixture();
  assert.equal(f.options.cacheKey,'halftone-complications-v1');
  assert.doesNotMatch(source,/require\(['"]\.\/(?:complications|context|message-queue|complication-data)['"]\)/);
  assert.match(source,/require\('pebble-watchface-core\/readings'\)/);
  assert.match(source,/require\('pebble-activities\/host'\)/);
});


test('accent colors preserve zero and valid named/numeric values',()=>{
  for(const value of [0,0x55AAFF,0xFFFFFF])for(const field of ['ACCENT_COLOR',String(keys.ACCENT_COLOR)]) {
    const f=fixture();
    f.handlers.webviewclosed({response:JSON.stringify({[field]:{value}})});
    nativePayload(f.deliveries[0]);
    assert.equal(nativePayload(f.deliveries[0])[keys.ACCENT_COLOR],value);
    assert.equal(f.contextConfigured(),1);
  }
});

test('invalid accent colors are omitted while valid page settings still deliver',()=>{
  for(const value of [-1,0x1000000,1.5,null,'0x55AAFF',{},[]]) {
    const f=fixture();
    f.handlers.webviewclosed({response:JSON.stringify({ACCENT_COLOR:{value},TEXT_COLOR:123})});
    nativePayload(f.deliveries[0]);
    assert.equal(nativePayload(f.deliveries[0])[keys.ACCENT_COLOR],0x55aaff);
  }
});

test('existing colors and privacy choices remain untouched when opening the rebuilt face',()=>{
  const saved={BACKGROUND_COLOR:0,TEXT_COLOR:0xFFFFFF,ACCENT_COLOR:0xFF5500,
    SHOW_NOTIFICATIONS:false,NOTIFICATION_PREVIEW:false,TEXT_SHADOW:true};
  const f=fixture(saved);f.handlers.ready();f.handlers.showConfiguration();
  assert.deepEqual(f.settings(),saved);
  assert.equal(named(f,'TEXT_SHADOW').defaultValue,true);
});

test('new appearance keys extend the original wire contract without renumbering existing keys',()=>{
  const legacy=['TEMPERATURE','REQUEST_WEATHER','BACKGROUND_COLOR','TEXT_COLOR','DEPTH_EFFECT',
    'TEXT_SHADOW','LARGE_TEXT','USE_12_HOUR','USE_FAHRENHEIT','TEMPERATURE_FAHRENHEIT',
    'WEATHER_UPDATED_AT','FORECAST_DATA','FOLLOW_PEBBLE_UNITS','WEATHER_LOCATION','WEATHER_CLEAR',
    'SHOW_DAILY_RANGE','SHOW_RAIN_CHANCE','WEATHER_DETAILS','LAYOUT_STYLE','SHOW_WEATHER_ICON',
    'WEATHER_CONDITION','COMPLICATION_DATA','REQUEST_COMPLICATIONS','CONTEXT_DATA','REQUEST_CONTEXT',
    'SHOW_MUSIC','SHOW_NOTIFICATIONS','NOTIFICATION_PREVIEW','NOTIFICATION_APPS','SHOW_STATUS','PANEL_TRANSITIONS'];
  assert.deepEqual(packageInfo.pebble.messageKeys.slice(0,31),legacy);
  assert.equal(packageInfo.pebble.messageKeys.length,51);
  assert.equal(keys.ACCENT_COLOR,10031);
  assert.equal(keys.ANIMATIONS,10032);
  assert.equal(keys.CLOCK_FORMAT,10033);
});

test('animations deliver explicit on and off through named and numeric settings',()=>{
  for(const field of ['ANIMATIONS',String(keys.ANIMATIONS)])for(const value of [false,0,true,1]) {
    const f=fixture();
    f.handlers.webviewclosed({response:JSON.stringify({[field]:{value}})});
    nativePayload(f.deliveries[0]);
    assert.equal(nativePayload(f.deliveries[0])[keys.ANIMATIONS],Number(value));
    assert.equal(f.contextConfigured(),1);
    assert.equal(f.contextOptions.getSettings().showNotifications,false);
    assert.equal(f.contextOptions.getSettings().notificationPreview,false);
  }
});

test('malformed animation settings cannot override other valid settings',()=>{
  for(const field of ['ANIMATIONS',String(keys.ANIMATIONS)])for(const value of [-1,2,0.5,null,'true','false','1','0',{},[]]) {
    const f=fixture();
    f.handlers.webviewclosed({response:JSON.stringify({[field]:{value},TEXT_COLOR:123})});
    nativePayload(f.deliveries[0]);
    assert.equal(nativePayload(f.deliveries[0])[keys.ANIMATIONS],1);
  }
});

test('opening the face and settings retains saved animation opt-outs',()=>{
  for(const saved of [{ANIMATIONS:false},{ANIMATIONS:0},{[keys.ANIMATIONS]:false},{[keys.ANIMATIONS]:0}]) {
    const f=fixture(saved);f.handlers.ready();f.handlers.showConfiguration();
    assert.deepEqual(f.settings(),saved);
    assert.equal(named(f,'ANIMATIONS').defaultValue,false,'the form retains the opt-out for either key format');
    assert.equal(f.contextOptions.getSettings().showMusic,true);
    assert.equal(f.contextOptions.getSettings().showNotifications,false);
  }
});

test('missing or malformed saved animation choices retain the enabled new-install default',()=>{
  for(const saved of [{},{ANIMATIONS:null},{ANIMATIONS:'false'},{ANIMATIONS:2},{[keys.ANIMATIONS]:-1}]) {
    const f=fixture(saved);f.handlers.showConfiguration();
    assert.equal(named(f,'ANIMATIONS').defaultValue,true);
    assert.deepEqual(f.settings(),saved);
  }
});

test('clock format follows Pebble for new installs and preserves legacy explicit choices',()=>{
  for(const [saved,wanted] of [[{},0],[{USE_12_HOUR:true},12],[{USE_12_HOUR:false},24],
    [{[keys.USE_12_HOUR]:0},24],[{CLOCK_FORMAT:0,USE_12_HOUR:true},0],
    [{CLOCK_FORMAT:12},12],[{[keys.CLOCK_FORMAT]:24},24]]) {
    const f=fixture(saved);f.handlers.showConfiguration();
    assert.equal(named(f,'CLOCK_FORMAT').defaultValue,wanted);
    assert.equal(f.options.getSettings().clockFormat,wanted);
    assert.deepEqual(f.settings(),saved);
  }
});

test('clock format accepts only the three supported numeric choices',()=>{
  for(const value of [0,12,24]) {
    const f=fixture();f.handlers.webviewclosed({response:JSON.stringify({CLOCK_FORMAT:{value}})});
    assert.equal(nativePayload(f.deliveries[0])[keys.CLOCK_FORMAT],value);
  }
  for(const value of [-1,1,13,12.5,null,'12',true,{},[]]) {
    const f=fixture();f.handlers.webviewclosed({response:JSON.stringify({CLOCK_FORMAT:{value},TEXT_COLOR:123})});
    nativePayload(f.deliveries[0]);
  }
});

test('failed settings remain pending for reconnect and clear only after watch acknowledgement',()=>{
  const f=fixture();f.fail(true);f.handlers.webviewclosed({response:JSON.stringify({TEXT_COLOR:123})});while(f.timers.length)f.timers.shift().fn();
  let record=JSON.parse(f.storage['halftone-settings-delivery-v1']);assert.equal(record.applied,null);assert.equal(record.values[1],123);
  f.fail(false);f.handlers.appmessage({payload:{REQUEST_COMPLICATIONS:1}});assert.equal(nativeMessages(f).length,3,'source traffic cannot reset exhausted retries');
  const hello=displayState.encode(displayState.values(require('../src/common/settings-state').defaults),0,0,true);
  f.handlers.appmessage({payload:{DISPLAY_PREFERENCES_RESULT:hello}});assert.equal(nativeMessages(f).length,4);
  assert.equal(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied,null);nativeReceipt(f,nativeMessages(f).at(-1));assert.ok(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied);
});

test('an older settings acknowledgement cannot mark a newer save as delivered',()=>{
  const f=fixture();f.hold(true);f.handlers.webviewclosed({response:JSON.stringify({TEXT_COLOR:123})});f.handlers.webviewclosed({response:JSON.stringify({TEXT_COLOR:456})});
  const latest=JSON.parse(f.storage['halftone-settings-delivery-v1']).revision;f.deferred.shift().ok();
  nativeReceipt(f,nativeMessages(f)[0]);let record=JSON.parse(f.storage['halftone-settings-delivery-v1']);assert.equal(record.revision,latest);assert.equal(record.applied,null);assert.equal(record.values[1],456);
  f.deferred.shift().ok();assert.equal(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied,null);nativeReceipt(f,nativeMessages(f)[1]);assert.ok(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied);
});

test('startup reapplies validated saved presentation without sending private source preferences',()=>{
  for(const saved of [
    {BACKGROUND_COLOR:0,TEXT_COLOR:0xFFFFFF,ACCENT_COLOR:0x55AAFF,CLOCK_FORMAT:12,
      NIGHT_PALETTE:true,NIGHT_BACKGROUND_COLOR:0x005555,NOTIFICATION_VIBRATION:2,
      SHOW_MUSIC:false,SHOW_NOTIFICATIONS:true,NOTIFICATION_PREVIEW:true,NOTIFICATION_APPS:'Private app choice'},
    {[keys.BACKGROUND_COLOR]:0,[keys.TEXT_COLOR]:0xFFFFFF,[keys.NIGHT_PALETTE]:1,
      [keys.NOTIFICATION_VIBRATION]:1,[keys.NOTIFICATION_APPS]:'Private app choice'}]) {
    const f=fixture(saved);f.handlers.ready();
    const presentation=nativePayload(f.deliveries[0]);
    assert.equal(presentation[keys.BACKGROUND_COLOR],0);assert.equal(presentation[keys.TEXT_COLOR],0xFFFFFF);
    assert.equal(presentation[keys.NIGHT_PALETTE],1);
    assert.ok([1,2].includes(presentation[keys.NOTIFICATION_VIBRATION]));
    for(const name of ['SHOW_MUSIC','SHOW_NOTIFICATIONS','NOTIFICATION_PREVIEW','NOTIFICATION_APPS'])assert.equal(presentation[keys[name]],undefined);
    assert.ok(!JSON.stringify(presentation).includes('Private'));
    assert.equal(f.deliveries[1][keys.REQUEST_CONTEXT],1);
    assert.deepEqual(f.settings(),saved,'presentation recovery does not rewrite phone preferences');
    assert.equal(f.contextConfigured(),0,'recovery does not change private source controls');
  }
  const f=fixture({TEXT_COLOR:-1,ACCENT_COLOR:'bad',CLOCK_FORMAT:255,NOTIFICATION_VIBRATION:3,SHOW_MUSIC:true});
  f.handlers.ready();assert.equal(nativePayload(nativeMessages(f)[0])[keys.TEXT_COLOR],0xffffff);assert.equal(f.deliveries.at(-1)[keys.REQUEST_CONTEXT],1);
});

test('native baseline requests recover presentation even when a reset reuses a token',()=>{
  const f=fixture({TEXT_COLOR:0x0055AA,NOTIFICATION_APP_ONLY:true});f.handlers.ready();const initial=nativeMessages(f).length;
  for(const token of [71,71,1,72])f.handlers.appmessage({payload:{REQUEST_CONTEXT:token}});
  assert.equal(nativeMessages(f).length,initial,'a source session request is not a display reset');
  f.handlers.appmessage({payload:{DISPLAY_PREFERENCES_RESULT:displayState.encode(displayState.values(require('../src/common/settings-state').defaults),0,0,true)}});
  assert.equal(nativeMessages(f).length,initial+1);assert.equal(nativePayload(nativeMessages(f).at(-1))[keys.TEXT_COLOR],0x0055AA);
  assert.equal(f.contextOptions.getSettings().notificationAppOnly,true);assert.equal(f.contextConfigured(),0);
});

test('presentation recovery carries pending values forward and ignores late ACKs across a newer save',()=>{
  const f=fixture();f.hold(true);f.handlers.webviewclosed({response:JSON.stringify({BACKGROUND_COLOR:0xffffff,TEXT_COLOR:123})});
  f.handlers.appmessage({payload:{DISPLAY_PREFERENCES_RESULT:displayState.encode(displayState.values(require('../src/common/settings-state').defaults),0,0,true)}});
  f.handlers.webviewclosed({response:JSON.stringify({BACKGROUND_COLOR:0xffffff,TEXT_COLOR:456})});const latest=JSON.parse(f.storage['halftone-settings-delivery-v1']).revision;
  while(f.deferred.length){f.deferred.shift().ok();assert.equal(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied,null);}
  nativeMessages(f).slice(0,-1).forEach(packet=>nativeReceipt(f,packet));assert.equal(JSON.parse(f.storage['halftone-settings-delivery-v1']).revision,latest);assert.equal(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied,null);
  nativeReceipt(f,nativeMessages(f).at(-1));assert.ok(JSON.parse(f.storage['halftone-settings-delivery-v1']).applied);
  const old={id:'prior-runtime',state:'failed',payload:{[keys.TEXT_COLOR]:0x005500,[keys.ACCENT_COLOR]:-1}};
  const restored=fixture({BACKGROUND_COLOR:0xffffff,TEXT_COLOR:0},{storage:{'halftone-settings-delivery-v1':JSON.stringify(old)}});restored.handlers.ready();
  assert.equal(nativePayload(nativeMessages(restored)[0])[keys.TEXT_COLOR],0x005500);assert.equal(nativePayload(nativeMessages(restored)[0])[keys.BACKGROUND_COLOR],0xffffff);
});

test('settings metadata keeps per-slot property and per-feature permission states distinct',()=>{
  const f=fixture({SHOW_NOTIFICATIONS:true});
  f.status.slots=[{slot:1,category:'weather',item:'location',property:'temperature',text:'5°C',status:'ready'},
    {slot:2,category:'weather',item:'location',property:'precipitation',status:'denied',message:'Allow location <access>'}];
  f.contextStatus.sourceStates={music:{state:'idle',message:''},notifications:{state:'denied',message:'PERMISSION_DENIED'},phone:{state:'ready',message:''}};
  f.handlers.showConfiguration();
  const encoded=item(f,'halftone-settings-data').defaultValue;
  const data=JSON.parse(encoded.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
  assert.equal(data.slots[0].property,'temperature');assert.equal(data.slots[0].value,'5°C');
  assert.equal(data.slots[1].status,'denied');assert.equal(data.sources.music.state,'idle');
  assert.equal(data.sources.notifications.state,'denied');assert.equal(data.sources.phone.state,'ready');
  assert.doesNotMatch(encoded,/<access>/);
});

test('private selected readings never enter settings examples or provider error diagnostics',()=>{
  const f=fixture();Object.assign(f.status,{configured:2,ready:0,error:'PLUGIN_UNAVAILABLE'});
  f.status.slots=[{slot:1,category:'music',item:'track',property:'title',label:'Private artist',text:'Private song',status:'unavailable',error:'PLUGIN_UNAVAILABLE',message:'Private provider detail'},
    {slot:2,category:'notifications',item:'notification',property:'body',label:'Private sender',text:'Private message',status:'ready'}];
  f.handlers.showConfiguration();
  const visible=JSON.stringify(f.clay.config);
  assert.doesNotMatch(visible,/Private artist|Private song|Private provider detail|Private sender|Private message/);
  assert.match(visible,/PLUGIN_UNAVAILABLE/);
});

function metadataItem(f,id) {
  return JSON.parse(item(f,id).defaultValue.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'"));
}
test('native system-format replies are cached independently of an explicit clock override',()=>{
  const f=fixture({CLOCK_FORMAT:24});
  f.handlers.appmessage({payload:{CLOCK_FORMAT:12}});
  assert.equal(f.storage['halftone-system-clock-v1'],'12');
  assert.deepEqual(f.settings(),{CLOCK_FORMAT:24});
  assert.equal(f.options.getSettings().clockFormat,24);
  f.handlers.showConfiguration();
  assert.equal(metadataItem(f,'halftone-preview-assets').systemFormat,12);
  assert.equal(f.clockQueries.length,1);assert.equal(f.clockQueries[0][keys.CLOCK_FORMAT],255);
  for(const invalid of [0,255,'12',true,{},null])f.handlers.appmessage({payload:{CLOCK_FORMAT:invalid}});
  assert.equal(f.storage['halftone-system-clock-v1'],'12');
  f.handlers.appmessage({payload:{[keys.CLOCK_FORMAT]:24}});f.handlers.showConfiguration();
  assert.equal(metadataItem(f,'halftone-preview-assets').systemFormat,24);
  assert.deepEqual(f.settings(),{CLOCK_FORMAT:24});
});
test('unknown system-format remains explicit metadata instead of inventing a watch preference',()=>{
  const f=fixture({CLOCK_FORMAT:0});f.handlers.showConfiguration();
  assert.equal(metadataItem(f,'halftone-preview-assets').systemFormat,null);
  assert.equal(require('../src/pkjs/settings-preview').systemFormat,undefined,'shared sample assets are not mutated');
  assert.deepEqual(f.settings(),{CLOCK_FORMAT:0});
});
test('settings group appearance, content and recovery in one three-section page',()=>{
  const f=fixture();f.handlers.showConfiguration();
  const sections=f.clay.config.filter(x=>x.type==='section');
  assert.equal(sections.length,3);
  assert.deepEqual(sections.map(x=>x.items[0].defaultValue),['Appearance','Content & priority','Connection & help']);
});


test('new night palette and haptic controls deliver validated native preferences only',()=>{
  for(const name of ['NIGHT_BACKGROUND_COLOR','NIGHT_TEXT_COLOR','NIGHT_ACCENT_COLOR'])for(const field of [name,String(keys[name])]) {
    for(const value of [0,0x55AAFF,0xFFFFFF]) {
      const f=fixture();f.handlers.webviewclosed({response:JSON.stringify({[field]:{value}})});
      assert.equal(nativePayload(f.deliveries[0])[keys[name]],value);
    }
    for(const value of [-1,0x1000000,1.5,null,'0xFFFFFF',{},[]]) {
      const f=fixture();f.handlers.webviewclosed({response:JSON.stringify({[field]:{value},TEXT_COLOR:123})});
      assert.equal(nativePayload(f.deliveries[0])[keys[name]],require('../src/common/settings-state').defaults[name]);
    }
  }
  for(const value of [false,0,true,1]) {
    const f=fixture();f.handlers.webviewclosed({response:JSON.stringify({NIGHT_PALETTE:{value}})});
    assert.equal(nativePayload(f.deliveries[0])[keys.NIGHT_PALETTE],Number(value));
  }
  for(const value of [0,1,2]) {
    const f=fixture();f.handlers.webviewclosed({response:JSON.stringify({NOTIFICATION_VIBRATION:{value}})});
    assert.equal(nativePayload(f.deliveries[0])[keys.NOTIFICATION_VIBRATION],value);
  }
  for(const value of [-1,3,0.5,null,'1',{},[]]) {
    const f=fixture();f.handlers.webviewclosed({response:JSON.stringify({NOTIFICATION_VIBRATION:{value},TEXT_COLOR:123})});
    assert.equal(nativePayload(f.deliveries[0])[keys.NOTIFICATION_VIBRATION],0);
  }
});

test('app-only is a phone privacy preference and saved native choices survive opening settings',()=>{
  for(const name of ['NOTIFICATION_APP_ONLY',String(keys.NOTIFICATION_APP_ONLY)]) {
    const saved={[name]:true,NOTIFICATION_PREVIEW:true,NOTIFICATION_VIBRATION:2,NIGHT_PALETTE:true,NIGHT_BACKGROUND_COLOR:0x005555};
    const f=fixture(saved);f.handlers.showConfiguration();
    assert.equal(f.contextOptions.getSettings().notificationAppOnly,true);
    assert.equal(f.contextOptions.getSettings().notificationPreview,true);
    assert.equal(named(f,'NOTIFICATION_VIBRATION').defaultValue,2);
    assert.equal(named(f,'NIGHT_PALETTE').defaultValue,true);
    assert.equal(named(f,'NIGHT_BACKGROUND_COLOR').defaultValue,0x005555);
    assert.deepEqual(f.settings(),saved);
    f.handlers.webviewclosed({response:JSON.stringify({[name]:true,TEXT_COLOR:123})});
    assert.equal(nativePayload(f.deliveries[0])[keys.NOTIFICATION_APP_ONLY],undefined);
    assert.equal(f.contextOptions.getSettings().notificationAppOnly,true);
  }
  assert.deepEqual(packageInfo.pebble.messageKeys.slice(34,41),['NOTIFICATION_VIBRATION','NIGHT_PALETTE','NIGHT_BACKGROUND_COLOR','NIGHT_TEXT_COLOR','NIGHT_ACCENT_COLOR','NOTIFICATION_APP_ONLY','CONTEXT_STATE']);
});

test('generic activity discovery starts with the host and follows native session requests',()=>{
  const f=fixture();
  assert.equal(f.activityOptions.getSettings().enabled,true);
  assert.equal(f.activityOptions.nativeFormat,3);
  f.handlers.ready();assert.equal(f.activityRefreshes.length,1);
  f.handlers.appmessage({payload:{REQUEST_ACTIVITIES:81}});
  f.handlers.appmessage({payload:{[keys.REQUEST_ACTIVITIES]:82}});
  assert.deepEqual(f.activityConnections,[[true,81],[true,82]]);
  f.handlers.appmessage({payload:{REQUEST_ACTIVITIES:1}});
  assert.equal(f.activityRefreshes.length,2);
  for(const value of [0,-1,1.2,2147483648,'garbage'])
    f.handlers.appmessage({payload:{REQUEST_ACTIVITIES:value}});
  assert.equal(f.activityConnections.length,2);
});

test('activity preferences remain phone-only and reconfigure before native settings delivery',()=>{
  for(const key of ['SHOW_ACTIVITIES',String(keys.SHOW_ACTIVITIES)]) {
    const f=fixture({[key]:false});
    assert.equal(f.activityOptions.getSettings().enabled,true,'coordinator still transports Music');
    assert.equal(f.activityOptions.acceptActivity({kind:'timer'}),false);
    f.handlers.webviewclosed({response:JSON.stringify({[key]:true,TEXT_COLOR:123})});
    assert.equal(f.activityConfigured(),1);
    assert.equal(f.activityOptions.getSettings().enabled,true);
    assert.equal(nativePayload(f.deliveries[0])[keys.SHOW_ACTIVITIES],undefined);
    assert.equal(nativePayload(f.deliveries[0])[keys.TEXT_COLOR],123);
  }
  assert.deepEqual(packageInfo.pebble.messageKeys.slice(41,46),
    ['ACTIVITY_DATA','REQUEST_ACTIVITIES','SHOW_ACTIVITIES','ACTIVITY_PRESENTED','REQUEST_PRESENTATION']);
});

test('generic sources share activity roles while respecting the media opt-out',()=>{
  for(const saved of [{SHOW_MUSIC:false},{[keys.SHOW_MUSIC]:0}]) {
    const f=fixture(saved),accept=f.activityOptions.acceptActivity;
    for(const kind of ['timer','glucose','workout'])assert.equal(accept({kind}),true);
    assert.equal(accept({kind:'music'}),false);
    for(const kind of ['notification','notifications','Notification'])assert.equal(accept({kind}),true);
    f.handlers.webviewclosed({response:JSON.stringify({SHOW_MUSIC:true})});
    assert.equal(accept({kind:'music'}),true);
  }
  assert.equal(fixture().activityOptions.acceptActivity({kind:'music'}),true);
});

test('ongoing generic activities take priority over music without reordering their sources',()=>{
  const select=fixture().activityOptions.select;
  const music=activity({kind:'music',selectionKey:'builtin:music',id:'song'}),timer=activity({provider:TIMER,kind:'timer',id:'tea'}),glucose=activity({kind:'glucose',id:'level'});
  assert.deepEqual(Array.from(select([music,timer]),card=>card.id),['tea','song']);
  assert.deepEqual(Array.from(select([music,timer,glucose]),card=>card.id),['tea','level']);
  assert.deepEqual(Array.from(select([glucose,timer,music]),card=>card.id),['level','tea']);
});

test('soonest running deadline is projected even from the eighth timer slot',()=>{
  const select=fixture().activityOptions.select;
  const cards=Array.from({length:8},(_,index)=>activity({provider:TIMER,kind:'timer',
    id:String(index),state:'active',main:{type:'clock',mode:'deadline',running:true,anchorAt:1000,baseSeconds:1000-index*100}}));
  const original=cards.slice();
  assert.deepEqual(Array.from(select(cards),card=>card.id),['7','6']);
  cards[7]={...cards[7],state:'paused',main:{...cards[7].main,running:false,anchorAt:0}};
  assert.deepEqual(Array.from(select(cards),card=>card.id),['6','5']);
  assert.equal(original[0].id,'0');
});

test('clock ordering preserves other provider positions and stable equal deadlines',()=>{
  const select=fixture().activityOptions.select;
  const reading=activity({provider:HEALTH,kind:'glucose',id:'reading'});
  const later=activity({provider:TIMER,kind:'timer',id:'later',state:'active',main:{type:'clock',mode:'deadline',running:true,anchorAt:100,baseSeconds:400}});
  const sooner={...later,id:'sooner',main:{...later.main,baseSeconds:200}};
  assert.deepEqual(Array.from(select([reading,later,sooner]),card=>card.id),['reading','sooner']);
  assert.deepEqual(Array.from(select([later,{...later,id:'equal'}]),card=>card.id),['later','equal']);
});

test('native view selection preserves canonical items, units, artwork and source data across roles',()=>{
  const select=fixture().activityOptions.select;
  const reading=activity({provider:HEALTH,id:'reading',kind:'glucose',revision:7,state:'active',caption:'Sensor',
    main:{type:'value',label:'Glucose',text:'6.2 mmol/L'},support:null,image:{width:2,height:1,palette:[192],pixels:[0]}});
  const timer=activity({provider:TIMER,id:'timer',kind:'timer',state:'active',main:{type:'clock',mode:'deadline',running:true,anchorAt:100,baseSeconds:400},support:{type:'clock',mode:'elapsed',running:true,anchorAt:100,baseSeconds:20}});
  const before=JSON.stringify([reading,timer]);
  assert.equal(select([reading,timer])[0].id,reading.id);assert.equal(select([timer,reading])[1].id,reading.id);
  assert.equal(reading.main.text,'6.2 mmol/L');assert.deepEqual(reading.image,{width:2,height:1,palette:[192],pixels:[0]});
  assert.equal(JSON.stringify([reading,timer]),before,'host role selection must not rewrite source or view content');
});

test('retained source results yield to ongoing activities and music',()=>{
  const select=fixture().activityOptions.select;
  const result=activity({kind:'timer',state:'completed',showTerminal:true,id:'finished'}),active=activity({kind:'workout',state:'active',id:'run'}),music=activity({kind:'music',selectionKey:'builtin:music',state:'active',id:'song'});
  assert.deepEqual(Array.from(select([music,result,active]),card=>card.id),['run','song']);
  assert.deepEqual(Array.from(select([result,music]),card=>card.id),['song','finished']);
  assert.deepEqual(Array.from(select([result]),card=>card.id),['finished']);
  assert.deepEqual(Array.from(select([result,{...result,kind:'delivery',id:'delivered'},active]),card=>card.id),['run','finished']);
});

test('deadline ordering uses each datum state and its anchor plus base',()=>{
  const select=fixture().activityOptions.select;
  const first=activity({provider:TIMER,kind:'timer',id:'first',state:'paused',main:{type:'clock',mode:'deadline',running:true,anchorAt:100,baseSeconds:200}});
  const equal={...first,id:'equal',state:'active',main:{...first.main,anchorAt:200,baseSeconds:100}};
  const paused={...first,id:'paused-clock',state:'active',main:{...first.main,running:false,anchorAt:0,baseSeconds:1}};
  assert.deepEqual(Array.from(select([paused,first,equal]),card=>card.id),['first','equal']);
});

test('Halftone provider preferences reorder Timer and built-in Music in either role and survive restart',()=>{
  const timer=activity({provider:TIMER,kind:'timer',id:'tea'});
  const music=activity({kind:'music',selectionKey:'builtin:music',id:'track',private:true});
  const f=fixture();f.setMusic(music);
  assert.deepEqual(Array.from(f.activityOptions.select([timer]),card=>card.kind),['timer','music']);
  function save(order,hidden=[],showMusic=true) {
    f.handlers.webviewclosed({response:JSON.stringify({SHOW_MUSIC:{value:showMusic},
      __halftoneActivityPreferences:{value:JSON.stringify({order,hidden,content:'Never store this',runId:'temporary'})}})});
  }
  save(['builtin:music',TIMER]);
  assert.deepEqual(Array.from(f.activityOptions.select([timer]),card=>card.kind),['music','timer']);
  const restarted=fixture(f.settings(),{storage:f.storage});restarted.setMusic(music);
  assert.deepEqual(Array.from(restarted.activityOptions.select([timer]),card=>card.kind),['music','timer']);
  save([TIMER,'builtin:music']);
  assert.deepEqual(Array.from(f.activityOptions.select([timer]),card=>card.kind),['timer','music']);
  save(['builtin:music',TIMER],[TIMER]);
  assert.deepEqual(Array.from(f.activityOptions.select([timer]),card=>card.kind),['music']);
  save(['builtin:music',TIMER],['builtin:music'],false);
  assert.deepEqual(Array.from(f.activityOptions.select([timer]),card=>card.kind),['timer']);
  assert.equal(f.contextOptions.getSettings().showMusic,false);
  assert.equal(f.contextOptions.musicAsActivity,true);
  assert.ok(f.deliveries.every(payload=>payload.NaN===undefined&&payload.__halftoneActivityPreferences===undefined));
  assert.doesNotMatch(JSON.stringify(f.storage),/Never store this|temporary/);
  assert.deepEqual(f.settings().__halftoneActivityPreferences,{order:['builtin:music',TIMER],hidden:['builtin:music']});
  const previous=f.activityReprojects();f.contextOptions.onChanged();assert.equal(f.activityReprojects(),previous+1);
});

test('installed idle provider metadata and absent provider preferences reach settings without activity contents',()=>{
  const absent='55555555-5555-4555-8555-555555555555';
  const preferences={order:[absent,TIMER,'builtin:music'],hidden:[absent]};
  const f=fixture({SHOW_MUSIC:false},{storage:{'halftone-activity-preferences-v1':JSON.stringify(preferences)}});
  f.activityProviders.push({uuid:TIMER,name:'Timer <safe>',item:'activity_view',available:true});
  f.handlers.showConfiguration();
  const metadata=metadataItem(f,'halftone-settings-data');
  assert.deepEqual(metadata.activityProviders,[{uuid:TIMER,name:'Timer <safe>',item:'activity_view',available:true}]);
  assert.deepEqual(metadata.activityPreferences,{order:['builtin:notifications',...preferences.order],hidden:[absent,'builtin:music','builtin:notifications']});
  assert.deepEqual(JSON.parse(f.storage['halftone-activity-preferences-v1']),preferences,'opening settings preserves absent entries');
  assert.match(item(f,'halftone-settings-data').defaultValue,/Timer &lt;safe&gt;/);
});

test('malformed activity preferences are bounded and cannot become native settings or save content',()=>{
  const f=fixture();
  f.handlers.webviewclosed({response:JSON.stringify({TEXT_COLOR:{value:123},__halftoneActivityPreferences:{value:JSON.stringify({
    order:['temporary-run',TIMER,TIMER,'builtin:music',{},null],hidden:[TIMER,'song title'],title:'Private song'})}})});
  assert.deepEqual(f.settings().__halftoneActivityPreferences,{order:[TIMER,'builtin:music'],hidden:[TIMER]});
  assert.equal(nativePayload(f.deliveries.at(-1))[keys.TEXT_COLOR],123);
  assert.doesNotMatch(JSON.stringify(f.storage),/Private song|song title|temporary-run/);
});

test('phone status does not resend unchanged canonical activities while notification changes reproject',()=>{
  const f=fixture(),change=f.contextOptions.onChanged;
  change();change();assert.equal(f.activityReprojects(),0);
  const music=activity({kind:'music',selectionKey:'builtin:music',id:'track',revision:1,private:true});
  f.setMusic(music);change();assert.equal(f.activityReprojects(),1,'new Music appears immediately');
  for(let i=0;i<20;i++){f.setMusic({...music});change();}
  assert.equal(f.activityReprojects(),1,'other context publishes and cloned getters do not retransmit Music');
  f.setMusic({...music,revision:2});change();assert.equal(f.activityReprojects(),2);
  f.setMusic({...music,revision:2,observedAt:N+1,validUntil:N+3601});change();assert.equal(f.activityReprojects(),3);
  f.setMusic(null);change();change();assert.equal(f.activityReprojects(),4,'clearing Music remains immediate');
  const notification=activity({kind:'notification',selectionKey:'builtin:notifications',id:'arrival',revision:1,private:true});
  f.setNotification(notification);change();assert.equal(f.activityReprojects(),5);
  f.setNotification({...notification});change();assert.equal(f.activityReprojects(),5);
  f.setNotification({...notification,revision:2,validUntil:N+2});change();assert.equal(f.activityReprojects(),6,'expiry contraction reprojects immediately');
  f.setNotification(null);change();assert.equal(f.activityReprojects(),7,'expiry/removal restores the underlying activities');
  f.handlers.webviewclosed({response:JSON.stringify({SHOW_MUSIC:{value:false}})});
  assert.equal(f.activityReprojects(),8,'an explicit settings save still forces re-selection');
  assert.doesNotMatch(JSON.stringify(f.storage),/track|Current|arrival/);
});

test('built-in notifications use either shared role, preserve privacy destinations and migrate into editable priority',()=>{
  const target='b2cae818-10f8-46df-ad2b-98ad2254a3c1';
  const f=fixture({SHOW_NOTIFICATIONS:true});
  assert.equal(f.contextOptions.notificationAsActivity,true);
  const notice=activity({provider:'9ac26690-204f-46b2-aef2-54d61f57c2d7',kind:'message',
    id:'arrival',selectionKey:'builtin:notifications',private:true,caption:'Signal',
    openApp:{watchAppUuid:target},main:{type:'text',text:'Xef'}});
  f.setNotification(notice);
  const timer=activity({provider:TIMER,kind:'timer',id:'tea'});
  assert.deepEqual(Array.from(f.activityOptions.select([timer]),card=>card.id),['arrival','tea']);
  f.handlers.webviewclosed({response:JSON.stringify({SHOW_NOTIFICATIONS:true,__halftoneActivityPreferences:{value:JSON.stringify({
    order:[TIMER,'builtin:notifications'],hidden:[]})}})});
  const selected=f.activityOptions.select([timer]);
  assert.deepEqual(Array.from(selected,card=>card.id),['tea','arrival']);
  assert.equal(selected[1].openApp.watchAppUuid,target);
  f.handlers.webviewclosed({response:JSON.stringify({SHOW_NOTIFICATIONS:false})});
  assert.deepEqual(Array.from(f.activityOptions.select([timer]),card=>card.id),['tea']);
});

test('presented status confirms destination-only navigation metadata for the exact outgoing view',()=>{
  const f=fixture(),now=Math.floor(Date.now()/1000);
  const nav=require('../src/common/activity-navigation');
  f.activityOptions.onView({session:7,sequence:5,cards:[{provider:HEALTH,id:'private-run',title:'private song',validUntil:now+300,openApp:{watchAppUuid:TIMER}}]});
  assert.equal(f.storage[nav.KEY]||'', '');
  const bytes=Buffer.alloc(24);bytes[0]=1;bytes[1]=0;bytes[2]=255;
  bytes.writeUInt32LE(7,4);bytes.writeUInt32LE(5,8);bytes.writeUInt32LE(1,12);bytes.writeUInt32LE(now,16);bytes.writeUInt32LE(now+300,20);
  f.handlers.appmessage({payload:{[keys.ACTIVITY_PRESENTED]:Array.from(bytes)}});
  const hint=JSON.parse(f.storage[nav.KEY]);assert.equal(hint.primary.watchAppUuid,TIMER);assert.equal(hint.nativeSession,7);
  assert.ok(hint.expiresAtMs-hint.presentedAtMs<=45000);assert.doesNotMatch(f.storage[nav.KEY],/private-run|private song|c9e7cb18/);
  f.activityOptions.onView({session:7,sequence:6,cards:[]});assert.equal(f.storage[nav.KEY]||'', '');
});


test('normal activity work defers settings UI and reuses saved preferences',()=>{
  const f=fixture({SHOW_MUSIC:true});f.handlers.ready();
  for(let i=0;i<100;i++){f.activityOptions.getSettings();f.activityOptions.acceptActivity(activity());f.activityOptions.select([]);}
  for(const name of ['@rebble/clay','./config','./settings-page','./settings-preview','pebble-xoce-ui/settings-style']) assert.ok(!f.imports.includes(name),name);
  assert.ok(f.storageReads['clay-settings']<=8,'normal activity work reuses cached preferences');
  assert.ok(f.storageReads['halftone-activity-preferences-v1']<=4);
  f.handlers.showConfiguration();
  assert.ok(f.imports.includes('@rebble/clay'));assert.ok(f.imports.includes('./settings-preview'));
  f.handlers.webviewclosed({response:JSON.stringify({SHOW_MUSIC:{value:false}})});
  assert.equal(f.contextOptions.getSettings().showMusic,false,'save invalidates cached privacy preferences immediately');
});

test('a partial settings storage failure cannot leave the read cache stale',()=>{
  const f=fixture({SHOW_MUSIC:true},{failPreferencesWrite:true});
  assert.equal(f.contextOptions.getSettings().showMusic,true);
  f.handlers.webviewclosed({response:JSON.stringify({SHOW_MUSIC:{value:false},
    __halftoneActivityPreferences:{value:JSON.stringify({version:1,order:[],hidden:[]})}})});
  assert.equal(f.settings().SHOW_MUSIC,false);
  assert.equal(f.contextOptions.getSettings().showMusic,false);
});
