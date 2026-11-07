'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const label=require('../src/pkjs/reading-label');
const weather=(index,property='temperature')=>({category:'weather',item:'location',property,index});
const named=name=>({instanceId:'place',properties:{name:{shortText:{text:name}}}});

test('one weather location retains familiar qualifiers; different selected locations gain public names',()=>{
  const temperature=weather(0),rain=weather(0,'precipitation'),other=weather(1,'precipitation');
  assert.equal(label(temperature,named('Praha'),[temperature,rain]),undefined);
  assert.equal(label(rain,named('Praha'),[temperature,rain]),undefined);
  assert.equal(label(temperature,named('Praha'),[temperature,other]),'Praha');
  assert.equal(label(other,named('Brno'),[temperature,other]),'Brno');
  assert.equal(label(temperature,named('Praha'),[temperature,null]),undefined);
  assert.equal(label(temperature,named('Praha'),[temperature,{invalid:true,index:1}]),undefined);
});
test('explicit public custom labels win without changing descriptors or instances',()=>{
  const slot={...weather(0),label:'  Home  '},instance=named('Prague');
  const snapshot=JSON.stringify([slot,instance]);
  assert.equal(label(slot,instance,[slot,weather(1)]),'Home');
  assert.equal(JSON.stringify([slot,instance]),snapshot);
});
test('home and generic names add identity without repeating the property or displayed value',()=>{
  const slot={category:'home',item:'light',property:'on',index:0};
  assert.equal(label(slot,named('Kitchen'),[slot]),'Kitchen');
  assert.equal(label(slot,named('light'),[slot]),undefined);
  assert.equal(label({...slot,category:'device',item:'router',property:'status'},named('Router'),[]),undefined);
  assert.equal(label({...slot,category:'device',item:'router',property:'status'},named('Office'),[]),'Office');
  assert.equal(label(slot,{name:'Kitchen',properties:{on:{shortText:{text:'Kitchen'}}}},[]),undefined);
});
test('finance uses an explicit public ticker or instance identity without guessing a company name',()=>{
  const slot={category:'finance',item:'stock',property:'price',index:0};
  assert.equal(label(slot,{...named('Apple Inc.'),instanceId:'AAPL'},[]),'AAPL');
  assert.equal(label(slot,{...named('Berkshire Hathaway'),instanceId:'BRK.B'},[]),'BRK.B');
  for(const ticker of ['^GSPC','EURUSD=X','GC=F','BTC-USD']) {
    assert.equal(label(slot,{...named('Provider display name'),instanceId:ticker},[]),ticker);
  }
  assert.equal(label(slot,{...named('Company'),instanceId:'x',properties:{ticker:{shortText:{text:'BTC-USD'}}}},[]),'BTC-USD');
  assert.equal(label(slot,{...named('Apple Inc.'),instanceId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'},[]),undefined);
  assert.equal(label(slot,named('Apple Inc.'),[]),'place');
});
test('private sources never expose a label even if called outside Core safeguards',()=>{
  for(const category of ['music','notifications']) {
    assert.equal(label({category,item:'track',property:'title',index:0,label:'Private custom'},named('Secret'),[]),undefined);
  }
  assert.equal(label(null,named('Kitchen'),[]),undefined);
});
