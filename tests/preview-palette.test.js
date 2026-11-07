'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
// Exercise the actual helper inside Clay's serialized custom hook.
const hook=require('../src/pkjs/settings-page').toString();
const start=hook.indexOf('function recolorPreview(');
assert.ok(start>=0);
let end=hook.indexOf('{',start)+1,depth=1;
while(depth){depth+=(hook[end]==='{')-(hook[end]==='}');end++;}
const recolor=vm.runInNewContext('('+hook.slice(start,end)+')');
function image(){const data=new Uint8ClampedArray(200*228*4);data.fill(255);return{data};}
function set(p,x,y,color){const i=(y*200+x)*4;p.data[i]=color>>16&255;p.data[i+1]=color>>8&255;p.data[i+2]=color&255;}
function get(p,x,y){const i=(y*200+x)*4;return(p.data[i]<<16)|(p.data[i+1]<<8)|p.data[i+2];}
test('custom backgrounds fill the gaps around black bezel dots without changing their ink',()=>{
  for(const background of [0xff5500,0x0055aa,0x550055,0]) {
    const p=image();set(p,14,100,0);set(p,60,60,0);set(p,7,90,0x555555);
    recolor(p,[],0xffffff,background,0x55aaff,false);
    for(const [x,y] of [[20,100],[100,5],[180,100],[100,220]])assert.equal(get(p,x,y),background,'background between dots');
    assert.equal(get(p,14,100),0,'bezel ink stays black');
    assert.equal(get(p,60,60),0xffffff,'text uses the selected foreground, independently of the bezel cache');
    assert.notEqual(get(p,7,90),0x555555,'bezel edge coverage is blended against the new background');
  }
});
test('provider artwork and the native Timeline panel keep their original pixels',()=>{
  const p=image(),keep=[{x:24,y:180,width:28,height:28},{x:0,y:171,width:200,height:57}];
  set(p,24,185,0x55aaff);set(p,100,180,0x00aaff);set(p,14,100,0);set(p,100,160,0);
  recolor(p,keep,0xffffff,0xff5500,0x00ff00,true);
  assert.equal(get(p,24,185),0x55aaff);assert.equal(get(p,100,180),0x00aaff);
  assert.equal(get(p,14,100),0);assert.equal(get(p,100,160),0,'Peek bezel remains black');
  assert.equal(get(p,20,155),0xff5500,'Peek bezel gaps use the selected background');
});
test('the canvas keeps its native aspect ratio when its width is constrained',()=>{
  assert.match(hook,/canvas\{[^}]*height:auto/);
  assert.match(hook,/canvas\{[^}]*aspect-ratio:200\/228/);
});


test('preview accent contrast follows the native fallback while provider images stay unchanged',()=>{
  const p=image();set(p,40,100,0x55aaff);set(p,24,185,0x55aaff);
  recolor(p,[{x:24,y:180,width:28,height:28}],0xffffff,0xff5500,0x55aaff,false);
  assert.equal(get(p,40,100),0xffffff,'blue accent falls back to white on orange, as on the watch');
  assert.equal(get(p,24,185),0x55aaff,'provider image keeps its palette');
});
