'use strict';
// Executes the real installed config HTML, config plugin and PKJS in Chromium.
// Only the SDK bridge and separate Android native/DOM stores are simulated.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),version=require(root+'/package.json').version;
const output=path.resolve(process.argv[2]||(process.env.PEBBLE_QA_OUTPUT_ROOT||root+'/build/qa')+'/settings-stay-open');
const endpoint=process.env.HALFTONE_CHROMIUM_ENDPOINT||'http://127.0.0.1:9227';
const artifact=path.resolve(process.env.HALFTONE_QA_PBW||process.env.PEBBLE_PBW||root+'/build/candidate/Halftone-'+version+'.pbw');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const files=process.env.HALFTONE_QA_FILES?JSON.parse(fs.readFileSync(process.env.HALFTONE_QA_FILES,'utf8')):JSON.parse(cp.execFileSync('python3',['-c',
  'import json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z: print(json.dumps({n:z.read(n).decode() for n in ["config.html","plugin.js","pebble-js-app.js"]}))',artifact],{encoding:'utf8',maxBuffer:16*1024*1024}));
const hash=sha(fs.readFileSync(artifact));
if(process.env.HALFTONE_EXPECTED_SHA256)assert.equal(hash,process.env.HALFTONE_EXPECTED_SHA256);
assert.equal(files['config.html'],fs.readFileSync(root+'/config.html','utf8'),'packaged config is current');
const state=require(root+'/src/common/settings-state'),localization=require(root+'/src/pkjs/localization');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'halftone-stay-open-'));
fs.mkdirSync(output,{recursive:true});
let socket;
function modeledSdk(seed,faults,pluginCode,pkjsCode,persistenceKey,language) {
  const copy=value=>JSON.parse(JSON.stringify(value));
  const previous=sessionStorage.getItem(persistenceKey);
  const data=window.__qa={native:previous?JSON.parse(previous):copy(seed),dom:null,active:false,
    requests:[],writes:[],watchMessages:[],subscriptions:[],faults,targets:[],navigation:[],language};
  const persist=()=>sessionStorage.setItem(persistenceKey,JSON.stringify(data.native));
  const has=(source,key)=>Object.prototype.hasOwnProperty.call(source,key)?source[key]:null;
  const nativeStore={getItem:key=>has(data.native,key),setItem:(key,value)=>{data.native[key]=String(value);data.writes.push({target:'plugin',key});persist();}};
  let handler,events={};
  new Function('Pebble','localStorage',pluginCode)({
    registerSourceHandler(){},registerConfigHandler(fn){handler=fn;}
  },nativeStore);
  data.startPkjs=function() {
    data.dom=copy(data.native);events={};data.active=true;
    const store={getItem:key=>has(data.dom,key),setItem:(key,value)=>{data.dom[key]=String(value);data.native[key]=String(value);data.writes.push({target:'pkjs',key});persist();},
      removeItem:key=>{delete data.dom[key];delete data.native[key];persist();}};
    const pebble={platform:'test',getActiveWatchInfo:()=>({language}),getAccountToken:()=>'',getWatchToken:()=>'',
      addEventListener:(name,fn)=>(events[name]||(events[name]=[])).push(fn),
      sendAppMessage(message,success){data.watchMessages.push(copy(message));if(success)success();},
      enumeratePlugins:()=>[],subscribeToSource(request){data.subscriptions.push({category:request.category,item:request.item});return{unsubscribe(){}};},
      invokeAction:()=>Promise.reject(Error('No actions in settings test')),openURL:url=>data.navigation.push(url)};
    new Function('Pebble','localStorage','navigator','setTimeout','clearTimeout','console',pkjsCode)(
      pebble,store,{language},setTimeout,clearTimeout,{log(){},warn(){},error(){}});
    // No ready/appmessage dispatch: config writes must work independently.
  };
  data.teardownPkjs=function(){data.native=copy(data.dom);data.active=false;events={};persist();};
  if(faults.active)data.startPkjs();
  window.Pebble={
    targets(){data.targets.push(data.active);if(data.faults.targets){data.faults.targets--;return Promise.reject(Error('targets'));}return Promise.resolve(data.active?[{id:'plugin'},{id:'pkjs'}]:[{id:'plugin'}]);},
    addEventListener(name,fn){if(name==='ready')document.addEventListener('DOMContentLoaded',()=>fn({target:'plugin'}));},
    sendMessage(target,message){
      data.requests.push({target,message:copy(message)});
      return new Promise((resolve,reject)=>{
        if(message.type==='load_settings'&&data.faults.load){data.faults.load--;reject(Error('load'));return;}
        if(message.type==='save_settings'&&data.faults.reject){data.faults.reject--;resolve({ok:false,notSaved:true});return;}
        if(message.type==='save_settings'&&data.faults.mismatch){data.faults.mismatch--;resolve({ok:true,settings:{}});return;}
        if(message.type==='save_settings'&&target==='pkjs'&&data.faults.pkjsReject){data.faults.pkjsReject--;if(data.faults.gone)data.teardownPkjs();reject(Error('pkjs'));return;}
        const dispatch=respond=>{
          if(target==='plugin')handler(message,response=>{
            if(message.type==='save_settings'&&data.faults.appear){data.faults.appear--;data.startPkjs();}
            respond(response);
          });
          else if(data.active&&events.configmessage)events.configmessage.forEach(fn=>fn({data:message,respond}));
          else reject(Error('No target'));
        };
        if(message.type==='save_settings'&&data.faults.lost){data.faults.lost--;dispatch(()=>reject(Error('lost acknowledgement')));return;}
        if(message.type==='save_settings'&&data.faults.timeout){data.faults.timeout--;dispatch(()=>{});return;}
        setTimeout(()=>dispatch(resolve),data.faults.delay||0);
      });
    }
  };
}
function fixture(seed={},faults={},language='en') {
  const args=[seed,faults,files['plugin.js'],files['pebble-js-app.js'],'halftone-ui-'+crypto.randomBytes(6).toString('hex'),language]
    .map(value=>JSON.stringify(value).replace(/<\/script/gi,'<\\/script'));
  const shim='<script>('+modeledSdk.toString()+')('+args.join(',')+');</script>';
  const hook='customFn.call(clayConfig, minified);';
  assert.equal(files['config.html'].split(hook).length,2,'one stock Clay invocation');
  // Expose an existing instance, without replacing the real custom function.
  const html=files['config.html'].replace(hook,'window.__testClay=clayConfig;'+hook).replace('<script>',()=>shim+'<script>');
  const file=path.join(scratch,crypto.randomBytes(6).toString('hex')+'.html');fs.writeFileSync(file,html);
  return 'file://'+file;
}
async function run() {
  const tabs=await(await fetch(endpoint+'/json')).json();socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  const pending=new Map(),errors=[];let sequence=0;
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const item=pending.get(message.id);pending.delete(message.id);message.error?item.reject(message.error):item.resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(result.exceptionDetails,undefined,expression);return result.result.value;};
  const wait=async expression=>{for(let i=0;i<210;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,40));}throw Error('Timed out: '+expression);};
  const load=async(url)=>{await send('Page.navigate',{url});await wait('document.readyState==="complete"');};
  const ready=async(url)=>{await load(url);await wait('!!window.__testClay&&!!window.HalftoneSettingsBridge&&!!document.querySelector(".halftone-primary-save")');await evaluate('document.fonts.ready');};
  const change=async(key,value)=>evaluate('window.__testClay.getItemByMessageKey('+JSON.stringify(key)+').set('+JSON.stringify(value)+')');
  const save=async()=>evaluate('document.getElementById("main-form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');
  const saved=async(locale='en')=>wait('document.querySelector(".halftone-save-state").textContent.includes('+JSON.stringify(localization.settingsStrings(locale).phoneSaved)+')');
  const status=async()=>evaluate('document.querySelector(".halftone-save-state").textContent.trim()');
  const captures=[],checks=[],layouts=[];let discardViewport;
  const capture=async name=>{const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const bytes=Buffer.from(result.data,'base64');fs.writeFileSync(path.join(output,name+'.png'),bytes);captures.push({file:name+'.png',sha256:sha(bytes)});};
  await send('Page.enable');await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:'Object.defineProperty(navigator,"language",{configurable:true,get:()=>window.__qa&&window.__qa.language||"en"});'});
  const custom=state.read({getItem:()=>null});
  custom.BACKGROUND_COLOR=0x112233;custom.TEXT_COLOR=0xfefefe;custom.ACCENT_COLOR=0x22bb88;
  custom.SHOW_NOTIFICATIONS=false;custom.NOTIFICATION_PREVIEW=true;custom.NOTIFICATION_APP_ONLY=true;
  custom[state.preferencesKey]={order:['builtin:music','builtin:notifications'],hidden:['builtin:notifications']};
  const seed={'clay-settings':JSON.stringify(custom)};

  for(const language of ['en','cs'])for(const width of [320,360])for(const appearance of ['light','dark']){
    await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:true});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:appearance}]});
    await ready(fixture(seed,{},language));
    const initial=await evaluate('window.HalftoneSettingsBridge.snapshot(window.__testClay.serialize())');
    assert.equal(initial.BACKGROUND_COLOR,custom.BACKGROUND_COLOR);assert.equal(initial.TEXT_COLOR,custom.TEXT_COLOR);assert.equal(initial.ACCENT_COLOR,custom.ACCENT_COLOR);
    assert.equal(initial.SHOW_NOTIFICATIONS,false);assert.equal(initial.NOTIFICATION_PREVIEW,true);assert.equal(initial.NOTIFICATION_APP_ONLY,true);
    assert.equal(await evaluate('__qa.writes.length'),0,'opening a page does not save defaults');
    assert.equal(await evaluate('document.activeElement.matches("input,textarea,select")'),false);
    assert.equal(await evaluate('document.querySelector(".halftone-primary-save").disabled'),true);
    const layout=await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,language:document.documentElement.lang,background:getComputedStyle(document.body).backgroundColor})');
    assert.ok(layout.scroll<=width);assert.equal(layout.language,language);layouts.push(layout);
    await capture('initial-'+language+'-'+width+'-'+appearance);
  }
  checks.push('real packaged Clay boots only after load, retains custom watch colours and hidden notification privacy; EN/CS at 320/360 light/dark; no load writes or autofocus');
  assert.equal(localization.languages.length,17);for(const language of localization.languages){const words=localization.settingsStrings(language);assert.ok(words.phoneSaved&&words.phoneSaveUncertain&&words.phoneLoadFailed);assert.ok(files['config.html'].includes(words.phoneSaved));}
  checks.push('all 17 existing language dictionaries retain new save and load text in the actual offline configuration');

  await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});await ready(fixture(seed));
  await change('ANIMATIONS',false);
  assert.equal(await status(),localization.settingsStrings('en').saveUnsaved);
  const before=await evaluate('window.scrollY');await save();await saved();
  assert.equal(await evaluate('window.scrollY'),before);assert.equal(await evaluate('document.activeElement.matches("input,textarea,select")'),false);
  assert.equal(await evaluate('document.querySelector(".halftone-primary-save").disabled'),true);
  assert.equal(await evaluate('__qa.navigation.length'),0);
  const stored=await evaluate('__qa.native');
  assert.equal(state.read({getItem:key=>stored[key]??null}).ANIMATIONS,false);
  assert.equal(state.read({getItem:key=>stored[key]??null}).BACKGROUND_COLOR,0x112233,'unrelated Save preserves the exact old RGB');
  assert.equal(state.read({getItem:key=>stored[key]??null}).TEXT_COLOR,0xfefefe);
  assert.equal(state.read({getItem:key=>stored[key]??null}).ACCENT_COLOR,0x22bb88);
  await evaluate('new Promise(resolve=>setTimeout(resolve,150))');assert.equal(await status(),localization.settingsStrings('en').phoneSaved);
  await capture('saved-en-360');
  await change('SHOW_STATUS',false);assert.equal(await status(),localization.settingsStrings('en').saveUnsaved);
  await save();await saved();const reopened=await evaluate('__qa.native');
  await ready(fixture(reopened,{active:true}));assert.equal(await evaluate('window.__testClay.getItemByMessageKey("SHOW_STATUS").get()'),false);
  await change('ANIMATIONS',true);await save();await saved();await evaluate('__qa.teardownPkjs()');await send('Page.reload');await wait('!!window.__testClay');
  assert.equal(await evaluate('window.__testClay.getItemByMessageKey("ANIMATIONS").get()'),true);
  assert.ok((await evaluate('__qa.requests.filter(r=>r.message.type==="save_settings").map(r=>r.target)')).every(target=>target==='pkjs'));
  checks.push('confirmed Save stays open, persists inline without scroll/focus jump, becomes dirty on edit, and survives repeated Save, cold reopening, active Android teardown and full reload');

  await ready(fixture(seed,{delay:250}));
  const oldRendered=await evaluate('window.__testClay.getItemByMessageKey("BACKGROUND_COLOR").get()');
  await change('BACKGROUND_COLOR',0xaa5500);await save();
  await change('BACKGROUND_COLOR',oldRendered);
  await wait('JSON.parse(__qa.native["clay-settings"]).BACKGROUND_COLOR===11162880');
  await wait('document.querySelector(".halftone-save-state").textContent.includes('+JSON.stringify(localization.settingsStrings('en').saveUnsaved)+')');
  assert.equal(await evaluate('document.querySelector(".halftone-primary-save").disabled'),false);
  assert.equal(await evaluate('window.HalftoneSettingsBridge.snapshot(window.__testClay.serialize()).BACKGROUND_COLOR'),oldRendered);
  await save();await saved();
  assert.equal(JSON.parse(await evaluate('__qa.native["clay-settings"]')).BACKGROUND_COLOR,oldRendered);
  checks.push('a deliberate colour pick saves normally; changing/reverting during an in-flight save retains a dirty draft and a later explicit Save commits it');

  const discardSettings=JSON.parse(JSON.stringify(custom));
  discardSettings.SHOW_NOTIFICATIONS=true;discardSettings.NOTIFICATION_APP_ONLY=false;
  discardSettings.NOTIFICATION_PREVIEW=true;discardSettings.NOTIFICATION_APPS='Signal, Telegram';
  discardSettings[state.preferencesKey]={order:['builtin:music','builtin:notifications'],hidden:[]};
  await ready(fixture({'clay-settings':JSON.stringify(discardSettings)}));
  const controls=()=>evaluate(`({
    snapshot:window.HalftoneSettingsBridge.snapshot(window.__testClay.serialize()),
    theme:document.getElementById("halftone-theme-select").value,
    notice:document.getElementById("halftone-notification-mode-select").value,
    mode:document.getElementById("halftone-app-mode-select").value,
    chips:Array.from(document.querySelectorAll(".halftone-app-chip span"),node=>node.textContent),
    rows:Array.from(document.querySelectorAll(".halftone-activity-row"),node=>[node.getAttribute("data-provider"),node.getAttribute("data-hidden")])})`);
  const initialControls=await controls();
  assert.equal(await evaluate('document.querySelector(".halftone-discard").disabled'),true);
  await evaluate(`document.querySelector(".halftone-app-chip button").click()`);
  assert.equal(await evaluate('document.activeElement.matches("input,textarea,select")'),false,'removing a chip must not summon the keyboard');
  await evaluate(`function choose(id,value){const node=document.getElementById(id);node.value=value;node.dispatchEvent(new Event("change",{bubbles:true}));}
    choose("halftone-theme-select","light");choose("halftone-notification-mode-select","app");
    choose("halftone-app-mode-select","all");choose("halftone-app-mode-select","selected");
    const input=document.getElementById("halftone-app-entry");input.value="Bad, entry";input.dispatchEvent(new Event("input",{bubbles:true}));
    document.querySelector('.halftone-activity-row [data-action="down"]').click();
    const visible=document.querySelector('.halftone-activity-row[data-provider="builtin:music"] input');visible.checked=false;visible.dispatchEvent(new Event("change",{bubbles:true}));`);
  await change('ANIMATIONS',false);await change('NIGHT_PALETTE',true);await change('ACCENT_COLOR',0xff00aa);
  assert.equal(await evaluate('document.getElementById("halftone-app-entry").validity.valid'),false);
  assert.equal(await evaluate('document.querySelector(".halftone-discard").disabled'),false);
  const callsBeforeDiscard=await evaluate('__qa.requests.length'),writesBeforeDiscard=await evaluate('__qa.writes.length');
  await evaluate('document.activeElement.blur();window.scrollTo(0,500)');
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const viewportMetrics=()=>evaluate('({scrollY,scrollHeight:document.documentElement.scrollHeight,innerHeight,previewTop:document.querySelector(".halftone-preview-stage").getBoundingClientRect().top})');
  const beforeDiscard=await viewportMetrics();
  await evaluate('document.querySelector(".halftone-discard").click()');
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  discardViewport={before:beforeDiscard,after:await viewportMetrics()};
  assert.deepEqual(await controls(),initialControls,'Discard restores every saved field and its custom control');
  assert.equal(await evaluate('document.getElementById("halftone-app-entry").value'),'');
  assert.equal(await evaluate('document.getElementById("halftone-app-entry").validity.valid'),true,'invalid draft validity is cleared');
  assert.equal(await evaluate('__qa.requests.length'),callsBeforeDiscard);assert.equal(await evaluate('__qa.writes.length'),writesBeforeDiscard);
  assert.equal(await evaluate('document.activeElement.matches("input,textarea,select")'),false);
  assert.ok(Math.abs(discardViewport.before.previewTop-discardViewport.after.previewTop)<=2,'browser anchoring keeps the visible preview stable while restored controls reflow');
  assert.equal(await evaluate('document.querySelector(".halftone-primary-save").disabled'),true);
  assert.equal(await evaluate('document.querySelector(".halftone-discard").disabled'),true);
  assert.equal(await status(),localization.settingsStrings('en').phoneNoChanges);
  await change('ANIMATIONS',false);await save();await saved();
  await change('ANIMATIONS',true);const callsAfterConfirmedSave=await evaluate('__qa.requests.length');
  await evaluate('document.querySelector(".halftone-discard").click()');
  assert.equal(await evaluate('window.__testClay.getItemByMessageKey("ANIMATIONS").get()'),false,'Discard restores the latest confirmed Save, not the initial load');
  assert.equal(await evaluate('__qa.requests.length'),callsAfterConfirmedSave);assert.equal(await status(),localization.settingsStrings('en').phoneSaved);
  checks.push('Discard restores palette, privacy mode, filter chips, invalid draft, activity order/visibility and the latest confirmed fields locally without SDK calls or keyboard focus; visible anchoring survives control reflow');

  for(const faults of [{reject:1},{lost:1},{timeout:1},{mismatch:1},{active:true,pkjsReject:1},{targets:1}]){
    await ready(fixture(seed,faults.targets?{}:faults));
    if(faults.targets)await evaluate('__qa.faults.targets=1');
    await change('ANIMATIONS',false);await save();
    const expected=faults.reject?localization.settingsStrings('en').phoneSaveFailed:localization.settingsStrings('en').phoneSaveUncertain;
    await wait('document.querySelector(".halftone-save-state").textContent.includes('+JSON.stringify(expected)+')');
    assert.equal(await evaluate('window.__testClay.getItemByMessageKey("ANIMATIONS").get()'),false);
    assert.equal(await evaluate('document.querySelector(".halftone-primary-save").disabled'),false);
    if(faults.reject)assert.equal(await evaluate('__qa.writes.length'),0);
    if(!faults.reject)assert.equal(await evaluate('document.querySelector(".halftone-discard").disabled'),true,'uncertain writes cannot promise a local rollback');
    if(faults.lost)assert.equal(await evaluate('document.querySelector(".halftone-reload-saved").hidden'),false);
    await save();await saved();
  }
  checks.push('known rejection differs from unknown/mismatched/lost/timed-out ACK or failed target; retained drafts support explicit retry without false success');

  await ready(fixture(seed,{active:true,pkjsReject:1,gone:true}));await change('ANIMATIONS',false);await save();await saved();
  assert.deepEqual(await evaluate('__qa.requests.filter(r=>r.message.type==="save_settings").map(r=>r.target)'),['pkjs','plugin']);
  await ready(fixture(seed,{appear:1}));await change('ANIMATIONS',false);await save();await saved();
  assert.deepEqual(await evaluate('__qa.requests.filter(r=>r.message.type==="save_settings").map(r=>r.target)'),['plugin','pkjs']);
  await evaluate('__qa.teardownPkjs()');assert.equal(JSON.parse(await evaluate('__qa.native["clay-settings"]')).ANIMATIONS,false);
  checks.push('plugin fallback requires confirmed PKJS exit; a PKJS appearing after plugin Save receives the exact write before stale DOM teardown');

  for(const value of ['{broken','[]']){
    await load(fixture({'clay-settings':value}));
    await wait('!document.getElementById("halftone-bootstrap-retry").hidden');
    assert.equal(await evaluate('!!window.__testClay'),false);assert.equal(await evaluate('__qa.writes.length'),0);
  }
  await load(fixture(seed,{load:1}));await wait('!document.getElementById("halftone-bootstrap-retry").hidden');
  assert.equal(await evaluate('!!window.__testClay'),false);
  await evaluate('document.getElementById("halftone-bootstrap-retry").click()');await wait('!!window.__testClay');
  checks.push('failed/corrupt load leaves no editable replacement defaults; explicit Retry boots the real page');

  const numeric={'2':0x0055aa,SHOW_MUSIC:false,SHOW_NOTIFICATIONS:false,NOTIFICATION_PREVIEW:true,DEPTH_EFFECT:true};
  const old={'clay-settings':JSON.stringify(numeric),'halftone-activity-preferences-v1':JSON.stringify({order:['builtin:notifications','builtin:music'],hidden:['builtin:music']})};
  await ready(fixture(old));assert.equal(await evaluate('__qa.writes.length'),0);
  assert.equal(await evaluate('window.__testClay.getItemByMessageKey("BACKGROUND_COLOR").get()'),0x0055aa);
  await change('ANIMATIONS',false);await save();await saved();
  const migrated=JSON.parse(await evaluate('__qa.native["clay-settings"]'));
  assert.equal(migrated.DEPTH_EFFECT,true);assert.equal(migrated.BACKGROUND_COLOR,0x0055aa);
  assert.ok(migrated[state.preferencesKey].order.includes('builtin:notifications'));
  checks.push('numeric legacy colours and retired fields survive; saved stable activity order/privacy migrate into the single existing settings record only on explicit Save');

  await send('Emulation.setDeviceMetricsOverride',{width:320,height:360,deviceScaleFactor:1,mobile:true});
  await ready(fixture(seed));await evaluate('Array.from(document.querySelectorAll("body,body *"),node=>[node,parseFloat(getComputedStyle(node).fontSize)]).forEach(([node,size])=>{if(size)node.style.fontSize=(size*2)+"px";})');
  await change('ANIMATIONS',false);await save();await saved();
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await capture('short-large-text-320');
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});await ready(fixture(seed,{},'cs'));
  await change('ANIMATIONS',false);await save();await saved('cs');await capture('saved-cs-360');
  checks.push('short/narrow enlarged-text layout remains bounded; Czech Save feedback uses actual packaged translations');
  assert.deepEqual(errors,[]);
  const report={version,result:'PASS',pbw:{file:path.basename(artifact),sha256:hash},executedPackagedFiles:Object.fromEntries(Object.entries(files).map(([name,value])=>[name,sha(value)])),checks,captures,layouts,discardViewport,errors,
    scope:'Actual packaged config.html, plugin.js and PKJS in installed Chromium with a simulated SDK bridge and separate Android native/DOM preference snapshots. The stock Clay instance is exposed just before its unchanged customFn call. No live phone WebView or physical-watch verification.'};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({result:'PASS',output,captures:captures.length,checks},null,2));
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{if(socket)socket.close();fs.rmSync(scratch,{recursive:true,force:true});});
