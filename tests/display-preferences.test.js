'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const state=require('../src/common/settings-state'),display=require('../src/common/display-state'),create=require('../src/pkjs/display-controller').create;
function rig(initial){
 const data=Object.assign({},initial),sent=[],timers=new Map();let sequence=0,broken=false,changes=0;
 const storage={getItem:key=>data[key]===undefined?null:data[key],setItem:(key,value)=>{if(broken&&key===display.key)throw Error('disk');data[key]=value;}};
 const controller=create({storage,send:(payload,success,failure)=>sent.push({payload,success,failure}),later:fn=>{timers.set(++sequence,fn);return sequence;},cancel:id=>timers.delete(id),changed:()=>changes++});
 return {storage,data,sent,timers,controller,breakStorage:value=>broken=value,changes:()=>changes,run:()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
function selected(extra){return Object.assign({},state.defaults,{[state.preferencesKey]:{order:[],hidden:[]}},extra);}
function saved(extra){return {'clay-settings':JSON.stringify(selected(extra))};}
function frame(rig,index){return rig.sent[index===undefined?rig.sent.length-1:index].payload.DISPLAY_PREFERENCES;}
test('wire validates all seventeen fields and preserves exact legacy RGBs',()=>{
 const choices=selected({BACKGROUND_COLOR:0x123456,NIGHT_ACCENT_COLOR:0xabcdef,TEXT_SIZE:3,APPEARANCE_MODE:0,MANUAL_APPEARANCE:1});
 const v=display.values(choices),bytes=display.encode(v,0xffffffff,0,true),decoded=display.decode(bytes);
 assert.deepEqual(decoded,{values:v,revision:0xffffffff,status:0,hello:true});assert.equal(bytes.length,76);
 for(const [i,n] of [[0,0x1000000],[6,13],[7,2],[9,3],[10,4],[11,3],[12,2],[13,2],[14,2],[15,2],[16,2]]){const invalid=v.slice();invalid[i]=n;assert.equal(display.decode(display.encode(invalid,1)),null);}
 assert.equal(display.decode(bytes.slice(1)),null);assert.equal(display.next(0xffffffff),1);
});
test('legacy Quiet Time migrates independently of the stored day and night palettes',()=>{
 const previous=selected({BACKGROUND_COLOR:0x123456,NIGHT_BACKGROUND_COLOR:0x654321,NIGHT_PALETTE:true});delete previous.TEXT_SIZE;delete previous.APPEARANCE_MODE;delete previous.MANUAL_APPEARANCE;
 const r=rig({'clay-settings':JSON.stringify(previous)});const value=state.read(r.storage);
 assert.equal(value.APPEARANCE_MODE,1);assert.equal(value.TEXT_SIZE,0);assert.equal(value.MANUAL_APPEARANCE,0);assert.equal(value.BACKGROUND_COLOR,0x123456);assert.equal(value.NIGHT_BACKGROUND_COLOR,0x654321);
 assert.equal(state.save(r.storage,previous).ok,true);
});
test('transport ACK stays pending; only the exact native snapshot receipt establishes applied',()=>{
 const r=rig(saved({TEXT_SIZE:3,APPEARANCE_MODE:2,MANUAL_APPEARANCE:1}));r.controller.reconcile(true);const request=frame(r);
 r.sent[0].success();assert.equal(r.controller.status().delivery.applied,false);
 const wrong=request.slice();wrong[8]^=1;assert.equal(r.controller.receive(wrong),false);assert.equal(r.controller.status().delivery.applied,false);
 assert.equal(r.controller.receive(request),true);assert.equal(r.controller.status().delivery.applied,true);
 r.sent[0].failure();r.run();assert.equal(r.sent.length,1);
 assert.equal(create({storage:r.storage}).status().delivery.applied,true);
});
test('a fresh mismatched native hello and explicit Retry invalidate old receipts',()=>{
 const r=rig(saved({TEXT_SIZE:3}));r.controller.reconcile(true);const old=frame(r);r.controller.receive(old);
 const other=display.values(selected({TEXT_SIZE:1}));r.controller.receive(display.encode(other,0,0,true));const fresh=frame(r);
 assert.notEqual(display.decode(old).revision,display.decode(fresh).revision);r.controller.receive(old);assert.equal(r.controller.status().delivery.applied,false);
 r.controller.reconcile(true);const retry=frame(r);r.controller.receive(fresh);assert.equal(r.controller.status().delivery.applied,false);
 r.controller.receive(retry);assert.equal(r.controller.status().delivery.applied,true);
});
test('failed revision storage cancels old callbacks and cannot send a reusable revision',()=>{
 const r=rig(saved());r.controller.reconcile(true);const old=frame(r);r.sent[0].success();r.breakStorage(true);
 r.controller.receive(display.encode(display.values(selected({TEXT_SIZE:3})),0,0,true));r.controller.receive(old);r.sent[0].failure();r.run();
 assert.equal(r.sent.length,1);assert.equal(r.controller.status().delivery.applied,false);
 r.breakStorage(false);r.controller.reconcile(false);assert.equal(r.sent.length,2);assert.notEqual(display.decode(frame(r)).revision,display.decode(old).revision);
});
test('source traffic cannot reset exhausted receipt retries',()=>{
 const r=rig(saved());r.controller.reconcile(true);
 for(let i=0;i<3;i++){r.sent[i].success();r.run();}
 assert.equal(r.sent.length,3);for(let i=0;i<20;i++)r.controller.reconcile(false);assert.equal(r.sent.length,3);
 assert.equal(r.controller.status().delivery.pending,true);
});
test('phone reset adopts native raw colours and mode without replacing phone-only privacy choices',()=>{
 const r=rig({'clay-settings':JSON.stringify({SHOW_NOTIFICATIONS:true,NOTIFICATION_PREVIEW:false,retired:42})});
 assert.equal(r.controller.reconcile(true),false);assert.equal(r.sent.length,0);
 const native=display.values(selected({BACKGROUND_COLOR:0x123456,NIGHT_BACKGROUND_COLOR:0x654321,APPEARANCE_MODE:1,TEXT_SIZE:2}));
 r.controller.receive(display.encode(native,0,0,true));
 const actual=state.read(r.storage);assert.equal(actual.BACKGROUND_COLOR,0x123456);assert.equal(actual.NIGHT_BACKGROUND_COLOR,0x654321);assert.equal(actual.APPEARANCE_MODE,1);assert.equal(actual.SHOW_NOTIFICATIONS,true);assert.equal(actual.NOTIFICATION_PREVIEW,false);assert.equal(JSON.parse(r.data['clay-settings']).retired,42);
 assert.equal(r.changes(),1);assert.deepEqual(display.decode(frame(r)).values,native);r.controller.receive(frame(r));assert.equal(r.controller.status().delivery.applied,true);
});
test('old transport-only delivery status cannot establish application of the desired choices',()=>{
 const r=rig(Object.assign(saved(),{[display.key]:JSON.stringify({id:'old',state:'saved'})}));assert.equal(r.controller.status().delivery.applied,false);r.controller.reconcile(true);assert.equal(r.sent.length,1);
});
test('native save failure remains pending; changing phone choices rejects previous receipts',()=>{
 const r=rig(saved());r.controller.reconcile(true);const old=frame(r),fail=old.slice();fail[2]=1;r.controller.receive(fail);assert.equal(r.controller.status().delivery.error,'watch_save_unconfirmed');
 assert.equal(state.save(r.storage,selected({APPEARANCE_MODE:2,MANUAL_APPEARANCE:1})).ok,true);r.controller.reconcile(false);r.controller.receive(old);assert.equal(r.controller.status().delivery.applied,false);r.controller.receive(frame(r));assert.equal(r.controller.status().delivery.applied,true);
});

test('all supported legacy Quiet Time boolean encodings preserve the selected mode',()=>{
 for(const value of [true,1,'true','1',false,0,'false','0']){
  const r=rig({'clay-settings':JSON.stringify({NIGHT_PALETTE:value})}),loaded=state.read(r.storage);
  assert.equal(loaded.APPEARANCE_MODE,[true,1,'true','1'].includes(value)?1:2);
 }
});
