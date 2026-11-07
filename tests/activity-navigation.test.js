'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const nav=require('../src/common/activity-navigation');
const TIMER='50e9ef12-a5ab-4369-a3b5-3447bfba5151',MUSIC='1f03293d-47af-4f28-b960-f2b02a6dd757';
function fixture(){let now=1793700000000;const data={};const storage={getItem:k=>Object.hasOwn(data,k)?data[k]:null,setItem:(k,v)=>{data[k]=v;},removeItem:k=>{delete data[k];}};
  const state=nav.create({storage,now:()=>now});return {state,storage,data,setNow:value=>now=value,now:()=>now};}
function view(sequence=1){return {session:7,sequence,cards:[{validUntil:1793700100,openApp:{watchAppUuid:TIMER}},{validUntil:1793700200,openApp:{watchAppUuid:MUSIC}}]};}
function status(extra={}){const b=Buffer.alloc(24);b[0]=1;b[1]=0;b[2]=1;b.writeUInt32LE(7,4);b.writeUInt32LE(1,8);b.writeUInt32LE(1,12);b.writeUInt32LE(1793700000,16);b.writeUInt32LE(1793700100,20);
  for(const [key,value]of Object.entries(extra)){if(key==='primary')b[1]=value;else if(key==='secondary')b[2]=value;else b.writeUInt32LE(value,{session:4,view:8,presentation:12,reported:16,expiry:20}[key]);}return b;}
test('native presentation confirms exact roles and retains only navigation metadata',()=>{const f=fixture();f.state.view(view());assert.equal(nav.read(f.storage,f.now()),null);
  assert.ok(f.state.receive(status()));const saved=nav.read(f.storage,f.now());assert.equal(saved.primary.watchAppUuid,TIMER);assert.equal(saved.secondary.watchAppUuid,MUSIC);assert.equal(saved.nativeSession,7);assert.equal(saved.expiresAtMs-f.now(),45000);
  assert.deepEqual(Object.keys(saved).sort(),['schema','watchfaceUuid','nativeSession','viewSequence','presentationSequence','presentedAtMs','expiresAtMs','primary','secondary'].sort());});
test('promotion follows native indices without reranking or source lookup',()=>{const f=fixture();f.state.view(view());assert.ok(f.state.receive(status({primary:1,secondary:255})));const saved=nav.read(f.storage,f.now());assert.equal(saved.primary.watchAppUuid,MUSIC);assert.equal(saved.secondary,null);});
test('missing app destination remains null independently in each role',()=>{const f=fixture();const v=view();delete v.cards[0].openApp;f.state.view(v);f.state.receive(status());const saved=nav.read(f.storage,f.now());assert.equal(saved.primary,null);assert.equal(saved.secondary.watchAppUuid,MUSIC);});
test('a source read does not renew observation or validity and expired data is removed',()=>{const f=fixture();f.state.view(view());f.state.receive(status());const first=nav.source(f.storage,f.now());f.setNow(f.now()+20000);assert.deepEqual(nav.source(f.storage,f.now()),first);f.setNow(1793700045000);assert.equal(nav.source(f.storage,f.now()).instances.length,0);assert.equal(f.storage.getItem(nav.KEY),null);});
test('old view, native session, duplicate status and invalid indices cannot publish',()=>{const f=fixture();f.state.view(view());assert.equal(f.state.receive(status({view:2})),false);assert.equal(f.state.receive(status({session:8})),false);assert.equal(f.state.receive(status({secondary:0})),false);assert.equal(f.state.receive(status({primary:2})),false);assert.ok(f.state.receive(status()));assert.equal(f.state.receive(status()),false);});
test('new destination mapping clears old hint until that exact view is presented',()=>{const f=fixture();f.state.view(view());f.state.receive(status());const next=view(2);next.cards[0].openApp={watchAppUuid:MUSIC};f.state.view(next);assert.equal(nav.read(f.storage,f.now()),null);assert.equal(f.state.receive(status()),false);assert.ok(f.state.receive(status({view:2,presentation:2})));assert.equal(nav.read(f.storage,f.now()).primary.watchAppUuid,MUSIC);});
test('source lease and native role changing deadline cap the routing lease',()=>{const f=fixture();const v=view();v.cards[1].validUntil=1793700008;f.state.view(v);f.state.receive(status({expiry:1793700010}));assert.equal(nav.read(f.storage,f.now()).expiresAtMs,1793700008000);});
test('delayed reports cannot manufacture another 45 seconds of freshness',()=>{const f=fixture();f.state.view(view());f.setNow(f.now()+40000);f.state.receive(status());assert.equal(nav.read(f.storage,f.now()).expiresAtMs,1793700045000);});
test('absent or non-openable presentation clears the hint',()=>{const f=fixture();f.state.view(view());f.state.receive(status());f.state.receive(status({presentation:2,primary:255,secondary:255,expiry:0}));assert.equal(nav.read(f.storage,f.now()),null);});
test('native clearing cannot be undone by an older presentation',()=>{const f=fixture();f.state.view(view());f.state.receive(status());f.state.receive(status({presentation:2,primary:255,secondary:255,expiry:0}));assert.equal(f.state.receive(status()),false);assert.equal(nav.read(f.storage,f.now()),null);});
test('invalid saved records never gain source validity',()=>{const f=fixture();for(const value of ['', 'x'.repeat(513),'bad-json',JSON.stringify({schema:1}),JSON.stringify({schema:2,primary:{watchAppUuid:TIMER}})]){f.storage.setItem(nav.KEY,value);assert.equal(nav.source(f.storage,f.now()).instances.length,0);assert.equal(f.storage.getItem(nav.KEY),null);}});
test('storage failure does not claim acceptance or log contents',()=>{const f=fixture();f.storage.setItem=()=>{throw Error('unavailable');};f.state.view(view());assert.equal(f.state.receive(status()),false);});

test('Notifications opens from either shared role without a special native status',()=>{
  const target='b2cae818-10f8-46df-ad2b-98ad2254a3c1';
  for(const index of [0,1]) {
    const f=fixture(),snapshot=view();snapshot.cards[index].openApp={watchAppUuid:target};
    snapshot.cards[index].validUntil=1793700008;f.state.view(snapshot);
    assert.ok(f.state.receive(status({expiry:1793700008})));
    const hint=nav.read(f.storage,f.now());
    assert.equal(hint[index?'secondary':'primary'].watchAppUuid,target);
    assert.equal(hint.expiresAtMs,1793700008000);
  }
  const f=fixture();f.state.view(view());const invalid=status();invalid[3]=1;
  assert.equal(f.state.receive(invalid),false);
});
