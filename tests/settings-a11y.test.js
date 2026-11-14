'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const hook=require('../src/pkjs/settings-page').toString();
// Clay serializes the custom hook. Test those exact self-contained helpers,
// with a small DOM/event model rather than a second implementation of them.
function helper(name){
 const start=hook.indexOf('function '+name+'(');assert.ok(start>=0,name+' is serialized');
 const brace=hook.indexOf('{',start);let depth=0,end=brace;
 for(;end<hook.length;end++){if(hook[end]==='{')depth++;if(hook[end]==='}'&&!--depth)break;}
 return vm.runInNewContext('('+hook.slice(start,end+1)+')');
}
function node(doc,rect={left:0,top:0,width:18,height:18}){
 const classes=new Set(),handlers={},attributes={};
 return {attributes,handlers,tabIndex:-1,id:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
 setAttribute(name,value){attributes[name]=String(value);if(name==='id')this.id=String(value);},getAttribute(name){return attributes[name];},
 addEventListener(name,callback){(handlers[name]??=[]).push(callback);},
 focus(){doc.activeElement=this;for(const handler of handlers.focus??[])handler({target:this});},
 key(key){let prevented=false;for(const handler of handlers.keydown??[])handler({key,preventDefault(){prevented=true;}});return prevented;},
 getBoundingClientRect:()=>rect};
}
function palette(positions,selected){
 const doc={activeElement:null},opener=node(doc),picker=node(doc),boxes=positions.map((position,index)=>{
  const box=node(doc,{left:position[0],top:position[1],width:18,height:18});box.setAttribute('data-value',index*85);return box;
 });
 if(selected>=0)boxes[selected].classList.add('selected');let commits=0;
 opener.click=()=>picker.classList.add('show');
 boxes.forEach(box=>{box.click=()=>{commits++;boxes.forEach(x=>x.classList.remove('selected'));box.classList.add('selected');picker.classList.remove('show');};});
 const element={querySelector:()=>picker,querySelectorAll:()=>boxes};
 const sync=helper('installPaletteKeyboard')(element,opener,doc);
 return {doc,opener,picker,boxes,sync,commits:()=>commits};
}
test('unchanged live status has no mutation; actual transitions remain announced',()=>{
 let value='',writes=0;const live={get textContent(){return value;},set textContent(next){value=next;writes++;}};
 const render=helper('setLiveText');render(live,'Waiting for watch');for(let i=0;i<10;i++)render(live,'Waiting for watch');
 assert.equal(writes,1);render(live,'Applied on watch');assert.equal(writes,2);assert.equal(value,'Applied on watch');
});
test('watch Retry needs a delivery API and saved unapplied native preferences',()=>{
 const retry=helper('watchRetryAvailable'),bridge={display(){}};
 for(const saved of [{},{state:'none'},{state:'saved',applied:true}])assert.equal(retry(bridge,saved),false);
 assert.equal(retry(null,{state:'pending'}),false);assert.equal(retry({}, {state:'pending'}),false);
 assert.equal(retry(bridge,{state:'pending',applied:false}),true);assert.equal(retry(bridge,{state:'failed',error:true}),true);
});
test('preview selection connects one active tab with its named panel',()=>{
 const doc={},tabs={children:['idle','music','timer'].map(name=>Object.assign(node(doc),{id:'preview-tab-'+name}))},panel=Object.assign(node(doc),{id:'preview-panel'});
 helper('selectPreviewTab')(tabs,panel,tabs.children[1]);
 assert.equal(panel.attributes['aria-labelledby'],'preview-tab-music');
 assert.deepEqual(tabs.children.map(tab=>tab.tabIndex),[-1,0,-1]);
 assert.deepEqual(tabs.children.map(tab=>tab.attributes['aria-selected']),['false','true','false']);
 assert.ok(tabs.children.every(tab=>tab.attributes['aria-controls']==='preview-panel'));
 assert.match(hook,/stage\.setAttribute\('role','tabpanel'\)/);assert.match(hook,/canvas\.setAttribute\('role','img'\)/);
});
test('a64-colour picker has one Tab stop and opens at the selected colour',()=>{
 const positions=Array.from({length:64},(_,i)=>[(i%8)*20,Math.floor(i/8)*20]),p=palette(positions,35);
 assert.ok(p.boxes.every(box=>box.tabIndex===-1));p.opener.focus();assert.equal(p.opener.key('Enter'),true);
 assert.equal(p.doc.activeElement,p.boxes[35]);assert.equal(p.boxes.filter(box=>box.tabIndex===0).length,1);
 assert.equal(p.boxes[35].attributes['aria-pressed'],'true');assert.equal(p.commits(),0);
 p.boxes[35].key('ArrowRight');assert.equal(p.doc.activeElement,p.boxes[36]);assert.equal(p.commits(),0);
 p.boxes[36].key('Home');assert.equal(p.doc.activeElement,p.boxes[0]);p.boxes[0].key('End');assert.equal(p.doc.activeElement,p.boxes[63]);
 p.boxes[63].key('Escape');assert.equal(p.doc.activeElement,p.opener);assert.ok(p.boxes.every(box=>box.tabIndex===-1));assert.equal(p.commits(),0);
});
test('arrow movement follows actual palette rows and gaps without committing',()=>{
 const p=palette([[0,0],[20,0],[40,0],[0,20],[40,20],[20,40]],2);p.opener.key(' ');
 p.boxes[2].key('ArrowDown');assert.equal(p.doc.activeElement,p.boxes[4]);
 p.boxes[4].key('ArrowLeft');assert.equal(p.doc.activeElement,p.boxes[3],'skip an unselectable gap in the same row');
 p.boxes[3].key('ArrowDown');assert.equal(p.doc.activeElement,p.boxes[5],'choose closest available cell in the next row');
 p.boxes[5].key('ArrowDown');assert.equal(p.doc.activeElement,p.boxes[5],'edge does not jump to another row');assert.equal(p.commits(),0);
 p.boxes[5].key('Enter');assert.equal(p.commits(),1);assert.equal(p.doc.activeElement,p.opener);assert.equal(p.boxes[5].attributes['aria-pressed'],'true');
});

test('a legacy RGB outside the native palette is not announced as another selected colour',()=>{
 const p=palette([[0,0],[20,0],[40,0]],-1);p.opener.key('Enter');
 assert.equal(p.doc.activeElement,p.boxes[0]);assert.ok(p.boxes.every(box=>box.attributes['aria-pressed']==='false'));assert.equal(p.commits(),0);
});
