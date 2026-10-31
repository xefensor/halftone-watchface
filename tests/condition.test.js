'use strict';

const assert=require('node:assert/strict');
const {test}=require('node:test');
const {packCondition}=require('../src/pkjs/condition');
const NOW=1791893700;
const properties=code=>({condition_code:{longText:{text:code}}});

test('Canonical current conditions use the exact ten-byte little-endian protocol',()=>{
  const bytes=packCondition(properties('partly_cloudy'),NOW,NOW,null);
  assert.equal(Array.isArray(bytes),true);
  assert.equal(bytes.length,10);
  assert.ok(bytes.every(byte=>Number.isInteger(byte)&&byte>=0&&byte<=255));
  const buffer=Buffer.from(bytes);
  assert.equal(buffer[0],1);
  assert.equal(buffer[1],2);
  assert.equal(buffer.readUInt32LE(2),NOW);
  assert.equal(buffer.readUInt32LE(6),NOW+7200);
});

test('Only the published shared vocabulary maps to the agreed six icon kinds',()=>{
  const expected={sun:1,partly_cloudy:2,cloudy:3,light_rain:4,heavy_rain:4,
    light_snow:5,heavy_snow:5,rain_and_snow:6};
  for(const [code,icon] of Object.entries(expected)) {
    assert.equal(packCondition(properties(code),NOW,NOW)[1],icon,code);
  }
  for(const code of ['unknown','clear','sunny','rain','snow','thunderstorm','fog','wind','SUN',' sun','sun ',
    'rain_and_snow_day','constructor','__proto__','',null,42,{},['sun']]) {
    assert.deepEqual(packCondition(properties(code),NOW,NOW),[],String(code));
  }
});

test('Condition text, probabilities and forecasts never manufacture a current icon',()=>{
  for(const value of [
    {condition:{shortText:{text:'Sunny'}}},
    {precipitation:{numericValue:{value:100,unit:'%'}}},
    {hourly_condition_code:{series:{longText:{values:['sun']}}}},
    {condition_code:{shortText:{text:'sun'}}},
    {condition_code:{longText:{value:'sun'}}},
    {condition_code:{longText:'sun'}},
    {condition_code:'sun'},
    null,[],{}
  ]) assert.deepEqual(packCondition(value,NOW,NOW),[]);
});

test('Source expiry can shorten the exclusive two-hour cap but cannot extend it',()=>{
  const normal=Buffer.from(packCondition(properties('sun'),NOW,NOW,NOW*1000+24*3600000));
  assert.equal(normal.readUInt32LE(6),NOW+7200);
  const shorter=Buffer.from(packCondition(properties('sun'),NOW,NOW,(NOW+60)*1000+999));
  assert.equal(shorter.readUInt32LE(6),NOW+60);
  assert.equal(packCondition(properties('sun'),NOW+59,NOW,(NOW+60)*1000).length,10);
  assert.deepEqual(packCondition(properties('sun'),NOW+60,NOW,(NOW+60)*1000),[]);
  assert.deepEqual(packCondition(properties('sun'),NOW+7200,NOW,null),[]);
});

test('Replaying held conditions or changing units preserves the original confirmation and expiry',()=>{
  const original=packCondition(properties('sun'),NOW,NOW,null);
  const held={...properties('sun'),temperature:{numericValue:{value:68,unit:'°F'}}};
  assert.deepEqual(packCondition(held,NOW+3600,NOW,null),original);
  assert.deepEqual(packCondition(held,NOW+7200,NOW,null),[]);
});

test('Malformed, future and out-of-range clocks or expiry values hide the condition safely',()=>{
  for(const bad of [0,-1,NaN,Infinity,'1791893700',NOW+0.5,4294967296,null,undefined]) {
    assert.deepEqual(packCondition(properties('sun'),bad,NOW),[]);
    assert.deepEqual(packCondition(properties('sun'),NOW,bad),[]);
  }
  assert.deepEqual(packCondition(properties('sun'),NOW,NOW+1),[]);
  for(const expiry of [NaN,Infinity,'later',{},[],0,NOW*1000]) {
    assert.deepEqual(packCondition(properties('sun'),NOW,NOW,expiry),[]);
  }
  const final=Buffer.from(packCondition(properties('sun'),4294967294,4294967294,null));
  assert.equal(final.readUInt32LE(6),4294967295,'u32 cap never wraps the condition lifetime');
});
