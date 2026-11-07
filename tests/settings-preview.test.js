'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {test}=require('node:test');
const preview=require('../src/pkjs/settings-preview');

test('offline settings have every native preset and intact 200×228 PNGs',()=>{
  assert.equal(preview.version,require('../package.json').version);
  const expected=[];
  for(const state of ['idle','music','timer','notification','notification-summary','timeline'])
    for(const format of [12,24])for(const theme of ['light','dark'])
      expected.push(`${state}-${format}-${theme}`);
  assert.deepEqual(Object.keys(preview.frames).sort(),expected.sort());
  for(const key of expected){
    const frame=preview.frames[key];
    assert.match(frame.src,/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/,key);
    const png=Buffer.from(frame.src.slice(frame.src.indexOf(',')+1),'base64');
    assert.deepEqual(png.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]),key);
    assert.equal(png.readUInt32BE(16),200,key);assert.equal(png.readUInt32BE(20),228,key);
    assert.equal(crypto.createHash('sha256').update(png).digest('hex'),frame.sha256,key);
    for(const rectangle of frame.preserve){
      for(const name of ['x','y','width','height'])assert.ok(Number.isInteger(rectangle[name]),`${key}/${name}`);
      assert.ok(rectangle.x>=0&&rectangle.y>=0&&rectangle.width>0&&rectangle.height>0,key);
      assert.ok(rectangle.x+rectangle.width<=200&&rectangle.y+rectangle.height<=228,key);
    }
  }
});

test('custom preview preserves source artwork and the native Timeline area',()=>{
  for(const [key,frame]of Object.entries(preview.frames)){
    const expected=['music-','notification-','notification-summary-'].some(prefix=>key.startsWith(prefix))?
      [{x:24,y:180,width:28,height:28}]:key.startsWith('timeline-')?
        [{x:0,y:171,width:200,height:57}]:[];
    assert.deepEqual(frame.preserve,expected,key);
  }
  for(const field of ['emery/pebble-app.bin','emery/app_resources.pbpack'])
    assert.match(preview.source.nativePayloadSha256[field],/^[a-f0-9]{64}$/);
});
