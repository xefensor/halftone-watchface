const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/pkjs/index.js'), 'utf8');
const packageInfo = require('../package.json');
const keys = Object.fromEntries(packageInfo.pebble.messageKeys.map((key,i) => [key,10000+i]));

function fixture(settings = {}, locales = {}) {
  let watchLanguage = locales.watch;
  let saved = JSON.stringify(settings);
  let options, contextOptions, clay, fail = false, configured = 0, refreshed = 0, contextConfigured = 0, timerId = 0;
  const contextRefreshes=[], connections=[];
  const handlers = {}, deliveries = [], urls = [], timers = [];
  const status = {available:true,configured:0,ready:0,error:'',slots:[]};
  const contextStatus = {available:true,ready:false,error:''};
  vm.runInNewContext(source, {
    require: name => {
      if (name === 'message_keys') return keys;
      if (name === './config') return require('../src/pkjs/config');
      if (name === './settings-page') return require('../src/pkjs/settings-page');
      if (name === './localization') return require('../src/pkjs/localization');
      if (name === '@rebble/clay') return function(config,_custom,opts) {
        assert.equal(opts.autoHandleEvents,false);
        this.config=JSON.parse(JSON.stringify(config));
        this.generateUrl=()=> 'data:text/html,settings';
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
      if (name === './complications') return received=> {
        options=received;
        return {refresh:()=>refreshed++,configure:()=>configured++,status:()=>status};
      };
      if (name === './message-queue') return require('../src/pkjs/message-queue');
      if (name === './context') return received=> {
        contextOptions=received;
        return {refresh:value=>contextRefreshes.push(value),configure:()=>contextConfigured++,
          connectionChanged:(value,token)=>connections.push({value,token}),status:()=>contextStatus};
      };
      throw Error('Unexpected dependency '+name);
    },
    Pebble: {
      getActiveWatchInfo:()=> {if(locales.throwWatchInfo)throw Error('Disconnected');return {language:watchLanguage};},
      addEventListener:(event,fn)=> {handlers[event]=fn;},
      sendAppMessage:(payload,ok,error)=> {deliveries.push(payload);if(fail){if(error)error();}else if(ok)ok();},
      openURL:url=>urls.push(url)
    },
    navigator:{language:locales.phone || 'en-US'},
    localStorage:{getItem:()=>saved,setItem:(_key,value)=>{saved=value;}},
    setTimeout:(fn,delay)=>{const id=++timerId;timers.push({fn,delay,id});return id;},
    clearTimeout:id=>{const at=timers.findIndex(timer=>timer.id===id);if(at>=0)timers.splice(at,1);},
    console:{log:()=>{}}
  });
  return {handlers,deliveries,urls,status,contextStatus,clay,options,contextOptions,timers,contextRefreshes,connections,
    refreshes:()=>refreshed,configured:()=>configured,settings:()=>JSON.parse(saved),
    contextConfigured:()=>contextConfigured,
    fail:value=>{fail=value;},watchLanguage:value=>{watchLanguage=value;}};
}
const item=(f,id)=>f.clay.config.flatMap(section=>section.items || []).find(x=>x.id===id);
const named=(f,key)=>f.clay.config.flatMap(section=>section.items || []).find(x=>x.messageKey===key);

test('ready and named/numeric complication requests refresh the generic coordinator',()=>{
  const f=fixture();f.handlers.ready();
  f.handlers.appmessage({payload:{REQUEST_COMPLICATIONS:1}});
  f.handlers.appmessage({payload:{10022:1}});
  f.handlers.appmessage({payload:{REQUEST_WEATHER:1,USE_FAHRENHEIT:1}});
  f.handlers.appmessage({payload:{TEXT_COLOR:123}});f.handlers.appmessage({});
  assert.equal(f.refreshes(),3);
});

test('the coordinator receives saved clock preference and active-watch language',()=>{
  for(const previous of [{USE_12_HOUR:true},{10007:true}]) {
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
    const payload=f.deliveries.at(-1);
    assert.equal(payload[keys.LAYOUT_STYLE],undefined);
    assert.equal(payload[keys.TEXT_COLOR],0);
    assert.equal(payload[keys.LARGE_TEXT],1);
    assert.equal(f.settings().LAYOUT_STYLE,value);
  }
  assert.equal(f.configured(),4);
});

test('invalid layouts and unsupported fields cannot override unrelated visual settings',()=>{
  const f=fixture();
  for(const value of [-1,3,1.5,null,'','01','Classic',{},[]]) {
    f.handlers.webviewclosed({response:JSON.stringify({LAYOUT_STYLE:{value},TEXT_COLOR:{value:123},COMPLICATION_DATA:{value:'bad'}})});
    const payload=f.deliveries.at(-1);
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
  assert.deepEqual(Object.keys(f.deliveries[0]).sort(),[String(keys.TEXT_COLOR),String(keys.USE_12_HOUR)].sort());
  assert.equal(f.deliveries[0][keys.USE_12_HOUR],1);
  assert.equal(f.configured(),1);
});

test('boolean settings preserve explicit off and reject malformed values',()=>{
  const f=fixture();
  f.handlers.webviewclosed({response:JSON.stringify({DEPTH_EFFECT:false,TEXT_SHADOW:true,LARGE_TEXT:'false',USE_12_HOUR:2,BACKGROUND_COLOR:-1,TEXT_COLOR:0x1000000})});
  assert.deepEqual(Object.keys(f.deliveries[0]).sort(),[String(keys.DEPTH_EFFECT),String(keys.TEXT_SHADOW)].sort());
  assert.equal(f.deliveries[0][keys.DEPTH_EFFECT],0);assert.equal(f.deliveries[0][keys.TEXT_SHADOW],1);
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
  assert.match(item(f,'complications-status').defaultValue,/Halftone 1\.9\.0 rc\.1/);
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
  assert.equal(f.deliveries.length,1);assert.equal(f.configured(),0);assert.equal(f.timers[0].delay,1000);
  f.timers.shift().fn();assert.equal(f.deliveries.length,2);
  f.fail(false);f.timers.shift().fn();assert.equal(f.deliveries.length,3);assert.equal(f.configured(),1);
  assert.ok(f.deliveries.every(p=>p[keys.USE_12_HOUR]===1));
});

test('settings delivery failure is bounded instead of retrying forever',()=>{
  const f=fixture();f.fail(true);f.handlers.webviewclosed({response:JSON.stringify({TEXT_COLOR:123})});
  while(f.timers.length)f.timers.shift().fn();
  assert.equal(f.deliveries.length,3);assert.equal(f.configured(),1);
});

test('context source defaults and saved named/numeric settings preserve explicit opt-outs',()=>{
  const defaults=fixture();
  assert.deepEqual(JSON.parse(JSON.stringify(defaults.contextOptions.getSettings())),
    {showMusic:true,showNotifications:false,notificationPreview:false,notificationApps:'',showStatus:true});
  for(const settings of [{SHOW_MUSIC:false,SHOW_NOTIFICATIONS:true,NOTIFICATION_PREVIEW:true,NOTIFICATION_APPS:'Signal, WhatsApp',SHOW_STATUS:false},
    {[keys.SHOW_MUSIC]:0,[keys.SHOW_NOTIFICATIONS]:1,[keys.NOTIFICATION_PREVIEW]:1,[keys.NOTIFICATION_APPS]:'Signal, WhatsApp',[keys.SHOW_STATUS]:0}]) {
    const f=fixture(settings);
    assert.deepEqual(JSON.parse(JSON.stringify(f.contextOptions.getSettings())),
      {showMusic:false,showNotifications:true,notificationPreview:true,notificationApps:'Signal, WhatsApp',showStatus:false});
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
  assert.equal(f.configured(),0);
  assert.deepEqual(Object.keys(f.deliveries[0]).sort(),[String(keys.SHOW_STATUS),String(keys.TEXT_COLOR)].sort());
  assert.equal(f.deliveries[0][keys.SHOW_STATUS],0);
  assert.equal(f.contextOptions.getSettings().notificationApps,'Signal');
});

test('dynamic source errors use translated framing and literal HTML-escaped diagnostics',()=>{
  const f=fixture();f.contextStatus.error='PERMISSION_DENIED <test>';
  f.handlers.showConfiguration();
  assert.match(item(f,'context-status').defaultValue,/PERMISSION_DENIED &lt;test&gt;/);
  f.contextStatus.error='';f.contextStatus.ready=true;f.handlers.showConfiguration();
  assert.match(item(f,'context-status').defaultValue,/Dynamic content: ready/);
});

test('brief panel transitions are a validated native setting, with explicit off preserved',()=>{
  const f=fixture();
  f.handlers.webviewclosed({response:JSON.stringify({PANEL_TRANSITIONS:false})});
  assert.equal(f.deliveries.at(-1)[keys.PANEL_TRANSITIONS],0);
  f.handlers.webviewclosed({response:JSON.stringify({PANEL_TRANSITIONS:true})});
  assert.equal(f.deliveries.at(-1)[keys.PANEL_TRANSITIONS],1);
  const before=f.deliveries.length;
  f.handlers.webviewclosed({response:JSON.stringify({PANEL_TRANSITIONS:'false'})});
  assert.equal(f.deliveries.length,before);
});
