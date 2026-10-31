'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const manifest=require('../package.json');
const keys=Object.fromEntries(manifest.pebble.messageKeys.map((key,i)=>[key,10000+i]));
const text=value=>({shortText:{text:value}});
const NOW=Date.parse('2026-10-31T17:00:00Z');

function records(bytes) {
  const b=Buffer.from(bytes);let at=6;
  return Array.from({length:5},()=>{
    const r={status:b[at+1],text:b.subarray(at+20,at+20+b[at+2]).toString('utf8')};
    at+=20+b[at+2]+((b[at]&2)?16+b.readUInt16LE(at+14):0);return r;
  });
}
function fixture() {
  const handlers={},subscriptions=[],packets=[],timers=new Map(),storage=new Map();let serial=0;
  const pebble={getActiveWatchInfo:()=>({language:'en-US'}),addEventListener:(name,fn)=>{handlers[name]=fn;},
    subscribeToSource:request=>{
      const sub={request,closed:false,unsubscribe(){this.closed=true;}};subscriptions.push(sub);return sub;
    },sendAppMessage:(payload,ok)=>{packets.push(payload);ok();},openURL:()=>{}};
  class Clock extends Date {static now(){return NOW;}}
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/pkjs/index'),'utf8'),{
    require:name=>{
      if(name==='message_keys')return keys;
      if(name==='@rebble/clay')return function(config){this.config=config;this.generateUrl=()=>'';
        this.getSettings=response=>{const value=JSON.parse(response);storage.set('clay-settings',JSON.stringify(value));return value;};};
      return require('../src/pkjs/'+name.slice(2));
    },Pebble:pebble,Date:Clock,navigator:{language:'en-US'},console:{log:()=>{}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    setTimeout:(fn,delay)=>{const id=++serial;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)
  });
  const latest=(category,item)=>subscriptions.filter(s=>!s.closed&&s.request.category===category&&(!item||s.request.item===item)).at(-1).request;
  const data=(category,instances,item)=>latest(category,item).onData({instances});
  const context=()=>records(packets.filter(p=>p[keys.CONTEXT_DATA]).at(-1)[keys.CONTEXT_DATA]);
  return {handlers,subscriptions,packets,storage,data,context,latest};
}

test('Real entrypoint keeps chosen weather primary while music and opt-in notification snapshots use the separate channel',()=>{
  const f=fixture();f.handlers.ready();
  assert.deepEqual(f.subscriptions.map(s=>s.request.category),['preferences','music','phone']);
  f.handlers.appmessage({payload:{[keys.REQUEST_CONTEXT]:123}});
  f.data('preferences',[{instanceId:'0',properties:{category:text('weather'),item:text('location'),property:text('temperature'),index:{numericValue:{value:0}}}}],'complications');
  f.data('weather',[{instanceId:'city',properties:{temperature:text('7°C')}}]);
  const weather=records(f.packets.filter(p=>p[keys.COMPLICATION_DATA]).at(-1)[keys.COMPLICATION_DATA]);
  assert.equal(weather[0].text,'7°C');
  f.data('music',[{instanceId:'track',properties:{title:text('Genesis'),artist:text('Justice'),playing:{boolean:{value:true}}}}]);
  assert.equal(f.context()[0].text,'Genesis');
  f.handlers.webviewclosed({response:JSON.stringify({SHOW_NOTIFICATIONS:true,NOTIFICATION_PREVIEW:false,NOTIFICATION_APPS:'Signal'})});
  const old={instanceId:'chat',properties:{name:text('Xef'),app:text('Signal'),body:text('Previous message')}};
  f.data('notifications',[old]);assert.equal(f.context()[2].status,0);
  f.data('notifications',[{...old,properties:{...old.properties,body:text('New message')}}]);
  assert.equal(f.context()[2].text,'Signal · Xef');assert.equal(f.context()[3].status,0);
  assert.ok(!JSON.stringify([...f.storage]).includes('Previous message'));
  assert.ok(!JSON.stringify([...f.storage]).includes('New message'));
  assert.equal(records(f.packets.filter(p=>p[keys.COMPLICATION_DATA]).at(-1)[keys.COMPLICATION_DATA])[0].text,'7°C');
  f.handlers.appmessage({payload:{[keys.REQUEST_CONTEXT]:2}});
  f.data('notifications',[old]);assert.equal(f.context()[2].status,0,'Reconnect snapshot is a new baseline');
  f.handlers.webviewclosed({response:JSON.stringify({SHOW_MUSIC:false,SHOW_NOTIFICATIONS:false,SHOW_STATUS:false})});
  assert.deepEqual(f.context().map(r=>r.status),[0,0,0,0,0]);
  assert.ok(!f.subscriptions.some(s=>!s.closed&&['music','notifications','phone'].includes(s.request.category)));
});
