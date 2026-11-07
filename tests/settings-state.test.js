'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const state=require('../src/common/settings-state');
const page=require('../src/common/settings-config');
function store(initial={}) {
  const values={...initial},writes=[];
  return {values,writes,getItem:key=>Object.hasOwn(values,key)?values[key]:null,setItem:(key,value)=>{values[key]=String(value);writes.push(key);}};
}
test('settings keys retain the native contract and legacy reads never rewrite storage',()=>{
  assert.deepEqual(state.names,require('../package.json').pebble.messageKeys);
  const storage=store({'clay-settings':JSON.stringify({'2':0x123456,SHOW_MUSIC:false,USE_12_HOUR:true}),
    'halftone-activity-preferences-v1':JSON.stringify({order:['builtin:music'],hidden:[]})});
  const loaded=state.read(storage);
  assert.equal(loaded.BACKGROUND_COLOR,0x123456);assert.equal(loaded.SHOW_MUSIC,false);assert.equal(loaded.CLOCK_FORMAT,12);
  assert.deepEqual(loaded[state.preferencesKey],{order:['builtin:music'],hidden:[]});assert.deepEqual(storage.writes,[]);
});
test('one verified save commits phone fields and stable activity preferences atomically and survives a new runtime',()=>{
  const storage=store(),selected=state.read(storage);
  selected.SHOW_NOTIFICATIONS=true;selected.NOTIFICATION_APPS='Signal';selected.BACKGROUND_COLOR=0;
  selected[state.preferencesKey]={order:['builtin:notifications','builtin:music'],hidden:['builtin:music']};
  assert.deepEqual(state.save(storage,selected),{ok:true,settings:selected});
  assert.deepEqual(storage.writes,['clay-settings']);assert.deepEqual(state.read(store(storage.values)),selected);
  state.save(storage,selected);assert.equal(storage.writes.length,1,'an identical retry does not write again');
});
test('saved retired keys survive while new private or unrecognised fields cannot be injected',()=>{
  const storage=store({'clay-settings':JSON.stringify({DEPTH_EFFECT:true})}),selected=state.read(storage);
  selected.song='private';selected[state.preferencesKey]={order:['builtin:music','song title'],hidden:[],title:'private'};
  const result=state.save(storage,selected);assert.equal(result.ok,true);
  const saved=JSON.parse(storage.values['clay-settings']);assert.equal(saved.DEPTH_EFFECT,true);
  assert.doesNotMatch(JSON.stringify(saved),/private|song title/);
});
test('invalid complete drafts are known not saved, failed or unverified storage remains uncertain',()=>{
  const storage=store(),selected=state.read(storage);selected.CLOCK_FORMAT=13;
  assert.deepEqual(state.save(storage,selected),{ok:false,notSaved:true});assert.equal(storage.writes.length,0);
  const valid=state.read(storage),failed={getItem:()=>null,setItem:()=>{throw Error('write');}};
  assert.deepEqual(state.save(failed,valid),{ok:false});
  assert.deepEqual(state.save({getItem:()=>null,setItem:()=>{}},valid),{ok:false});
});
test('corrupt saved state is not exposed as editable replacement defaults',()=>{
  for(const value of ['{broken','[]','null','"text"'])assert.equal(state.read(store({'clay-settings':value})),null);
});
test('an active Android runtime must own the save before its restored DOM snapshot is persisted on shutdown',()=>{
  const native=store(),dom=store(native.values),selected=state.read(dom);selected.ANIMATIONS=false;
  const active={getItem:dom.getItem,setItem:(key,value)=>{dom.setItem(key,value);native.setItem(key,value);}};
  assert.equal(state.save(active,selected).ok,true);
  Object.assign(native.values,dom.values);
  assert.equal(state.read(store(native.values)).ANIMATIONS,false);
});
test('page preparation keeps all seventeen languages, literal source metadata and current watch palettes',()=>{
  const localization=require('../src/pkjs/localization'),selected=state.read(store());selected.ACCENT_COLOR=0;
  for(const language of localization.languages){
    const value=page(selected,language,{slots:[],sources:{},activityProviders:[{uuid:'x',name:'<script>private</script>'}]});
    assert.equal(value.language,language);assert.equal(value.values.ACCENT_COLOR,0);
    const data=value.config.find(item=>item.id==='halftone-settings-data');assert.match(data.defaultValue,/&lt;script&gt;/);
    const words=localization.settingsStrings(language);assert.match(words.phoneSaved,/✓/);assert.ok(words.phoneSaveUncertain);
  }
});


test('real SDK numeric keys migrate Halftone colors and optical controls without resetting preferences',()=>{
  const state=require('../src/common/settings-state');
  const legacy={10002:0x0055aa,10003:0xffffff,10004:true,10005:true,10006:true,10007:true,10030:false};
  const actual=state.read({getItem:key=>key==='clay-settings'?JSON.stringify(legacy):null});
  assert.equal(actual.BACKGROUND_COLOR,0x0055aa);assert.equal(actual.TEXT_COLOR,0xffffff);
  for(const name of ['DEPTH_EFFECT','TEXT_SHADOW','LARGE_TEXT'])assert.equal(actual[name],true);
  assert.equal(actual.PANEL_TRANSITIONS,false);assert.equal(actual.CLOCK_FORMAT,12);
  assert.equal(state.normalize({...legacy,LARGE_TEXT:false},false).LARGE_TEXT,false);
});
