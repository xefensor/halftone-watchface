'use strict';
// Exact packaged plugin/PKJS migration. Native receipts are simulated here;
// the emulator bridge independently exercises actual native persistence.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),pkg=require(root+'/package.json');
const pbw=path.resolve(process.env.PEBBLE_PBW||root+'/build/candidate/'+pkg.pebble.displayName+'-'+pkg.version+'.pbw');
const bundle=JSON.parse(cp.execFileSync('python3',['-c','import json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z: print(json.dumps({n:z.read(n).decode() for n in ["plugin.js","pebble-js-app.js","appinfo.json"]}))',pbw],{encoding:'utf8',maxBuffer:16*1024*1024}));
const info=JSON.parse(bundle['appinfo.json']),count={'cc1281f1-3b4d-45b5-b235-6881b1fd8fbd':13,'d4dd5046-53be-4624-99e8-46e0b377fe66':17}[info.uuid];assert.ok(count);
const cases=[];
for(const encoded of [true,1,'true','1',false,0,'false','0']){
 const expected=[true,1,'true','1'].includes(encoded)?1:2;
 const original=JSON.stringify({NIGHT_PALETTE:encoded,BACKGROUND_COLOR:0x123456,NIGHT_BACKGROUND_COLOR:0xabcdef});
 const values=new Map([['clay-settings',original]]),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
 let handler;const events={},frames=[];let sequence=0;const timers=new Map();
 const context={localStorage:storage,navigator:{language:'en'},console:{log(){},error(){}},setTimeout:fn=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(bundle['plugin.js'],{...context,Pebble:{registerSourceHandler(){},registerConfigHandler(fn){handler=fn;}}});
 let page;handler({type:'load_settings',language:'en'},value=>page=value);
 assert.equal(page.ok,true);assert.equal(page.settings.APPEARANCE_MODE,expected);assert.equal(page.settings.BACKGROUND_COLOR,0x123456);assert.equal(page.settings.NIGHT_BACKGROUND_COLOR,0xabcdef);
 assert.equal(values.get('clay-settings'),original,'loading cannot rewrite old settings');
 vm.runInNewContext(bundle['pebble-js-app.js'],{...context,Pebble:{addEventListener(name,fn){events[name]=fn;},sendAppMessage(payload,ok){
  const bytes=payload.DISPLAY_PREFERENCES||payload[info.messageKeys.DISPLAY_PREFERENCES];
  if(bytes){assert.equal(bytes.length,8+count*4);assert.equal(bytes[1],count);assert.equal(bytes[52],expected);assert.equal(bytes.slice(53,56).join(','),'0,0,0');frames.push(Array.from(bytes));events.appmessage({payload:{DISPLAY_PREFERENCES_RESULT:Array.from(bytes)}});}
  if(ok)ok();
 }}});
 events.ready();assert.ok(frames.length);let status;events.configmessage({data:{type:'display_status'},respond:value=>status=value});assert.equal(status.delivery.applied,true);assert.equal(status.settings.APPEARANCE_MODE,expected);
 assert.equal(values.get('clay-settings'),original);cases.push({legacy:encoded,mode:expected,pluginLoad:true,pkjsFrame:true,simulatedExactReceipt:true});
}
const report={result:'PASS',pbwSha256:crypto.createHash('sha256').update(fs.readFileSync(pbw)).digest('hex'),cases,scope:'Exact packaged plugin and PKJS; legacy boolean migration/read-only load and native-bound frame checked. SDK/transport/receipts simulated; source timers not executed. Native emulator evidence is separate.'};
const out=root+'/build/qa/display-migration';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
