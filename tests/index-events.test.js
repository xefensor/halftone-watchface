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
  let options, clay, fail = false, configured = 0, refreshed = 0;
  const handlers = {}, deliveries = [], urls = [], timers = [];
  const status = {available:true,configured:0,ready:0,error:'',slots:[]};
  vm.runInNewContext(source, {
    require: name => {
      if (name === 'message_keys') return keys;
      if (name === './config') return require('../src/pkjs/config');
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
    setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeout:()=>{},
    console:{log:()=>{}}
  });
  return {handlers,deliveries,urls,status,clay,options,timers,
    refreshes:()=>refreshed,configured:()=>configured,settings:()=>JSON.parse(saved),
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

test('all layout values reach the watch as integers and retain visual settings',()=>{
  const f=fixture();
  for(const value of ['1','2','0',2]) {
    f.handlers.webviewclosed({response:JSON.stringify({LAYOUT_STYLE:{value},TEXT_COLOR:{value:0},LARGE_TEXT:{value:true}})});
    const payload=f.deliveries.at(-1);
    assert.equal(payload[keys.LAYOUT_STYLE],Number(value));
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
  const f=fixture();Object.assign(f.status,{configured:5,ready:4,error:'PERMISSION_DENIED'});
  f.status.slots=[{slot:4,category:'weather',item:'location',error:'PERMISSION_DENIED',message:'Location permission required'}];
  f.handlers.showConfiguration();
  assert.match(item(f,'complications-status').defaultValue,/Halftone 1\.6\.1 beta 8/);
  assert.match(item(f,'complications-status').defaultValue,/4\/5 ready/);
  assert.match(item(f,'complications-status').defaultValue,/Complication error: #4 · weather\/location · PERMISSION_DENIED · Location permission required/);
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
  const f=fixture({}, {watch:'cs_CZ',phone:'de-DE'});Object.assign(f.status,{configured:3,ready:2});
  f.handlers.showConfiguration();const czech=item(f,'complications-status').defaultValue;
  assert.match(czech,/2\/3/);assert.doesNotMatch(czech,/Complications:| ready/);
  assert.equal(named(f,'LAYOUT_STYLE').messageKey,'LAYOUT_STYLE');
  assert.deepEqual(Array.from(named(f,'LAYOUT_STYLE').options,x=>x.value),['0','1','2']);
  f.watchLanguage('de-DE');f.handlers.showConfiguration();assert.notEqual(item(f,'complications-status').defaultValue,czech);
  f.watchLanguage('en-US');f.handlers.showConfiguration();assert.match(item(f,'complications-status').defaultValue,/Complications: 2\/3 ready/);
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
