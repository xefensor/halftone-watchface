'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const create=require('pebble-watchface-core/readings').createComplications;
const namespace='halftone-complications-v1';
function reopen(signature,records){
  const storage={[namespace]:JSON.stringify({signature,records})};
  create({cacheKey:namespace,pebble:{},keys:{},storage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=v;}},
    send(){},now:()=>1700000100000,later:()=>1,cancelLater(){}});
  return JSON.parse(storage[namespace]);
}
test('upgrading the Halftone namespace removes legacy private values before source discovery',()=>{
  const descriptors=[{category:'music',item:'now_playing',property:'title'},{category:'weather',item:'current',property:'temperature'}];
  const records=[{text:'private title',confirmedAt:1700000000,expiresAt:1700000120},{text:'5°C',confirmedAt:1700000000,expiresAt:1700007200}];
  const actual=reopen(JSON.stringify(descriptors),records);
  assert.equal(actual.records[0],null);
  assert.deepEqual(actual.records[1],records[1],'public receipt and original validity survive without renewal');
  assert.ok(!JSON.stringify(actual).includes('private title'));
});
test('unclassifiable legacy records are discarded instead of retaining possible private content',()=>{
  assert.deepEqual(reopen('invalid signature',[{text:'private'}]).records,[null]);
});
