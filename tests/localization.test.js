'use strict';

const assert=require('node:assert/strict');
const {test}=require('node:test');
const localization=require('../src/pkjs/localization');
const config=require('../src/pkjs/config');

const DYNAMIC=['complicationsStatus','complicationsWaiting','complicationsDisabled','complicationsError','stateOn','stateOff',
  'contextWaiting','contextReady','contextError'];
const ADAPTIVE_KEYS=['appearance','statusHelp','largeText','adaptiveHelp','adaptivePeek','dynamicContent','showMusic','showNotifications',
  'notificationPreview','notificationApps','notificationAppsHelp','notificationsHelp','showStatus',
  'panelTransitions','panelTransitionsHelp','statusIndicatorsHelp','largeTextHelp'];

function visible(config) {
  const out=[];
  function walk(value) {
    if(Array.isArray(value)) return value.forEach(walk);
    if(!value||typeof value!=='object') return;
    if(typeof value.label==='string') out.push(value.label);
    if(typeof value.description==='string') out.push(value.description);
    if(['text','heading','submit'].includes(value.type)&&typeof value.defaultValue==='string') out.push(value.defaultValue);
    Object.values(value).forEach(walk);
  }
  walk(config);
  return out;
}
function items(config) {
  const out=[];
  function walk(value) {
    if(Array.isArray(value)) return value.forEach(walk);
    if(!value||typeof value!=='object') return;
    out.push(value);
    Object.values(value).forEach(walk);
  }
  walk(config);
  return out;
}

test('Watch locale takes precedence; BCP47/POSIX tags and Norwegian aliases normalize predictably',()=>{
  for(const [watch,phone,expected] of [
    ['CS_cz.UTF-8','de-DE','cs'],[' FR-ca ','cs-CZ','fr'],['pt_BR','en-US','pt'],
    ['nb_NO','en','no'],['NN-no@variant','en','no'],['no-NO','en','no'],
    ['xx-YY','SK_sk.UTF-8','sk'],[undefined,'tr-TR','tr'],[null,null,'en'],
    ['','fi-FI','fi'],['unsupported','unknown','en'],[{},['cs'],'en']
  ]) assert.equal(localization.resolveLanguage(watch,phone),expected);
});

test('All seventeen languages translate every visible setting and complication status key',()=>{
  assert.deepEqual(localization.languages,['en','cs','sk','de','fr','es','it','pt','nl','pl','da','sv','no','fi','hu','ro','tr']);
  const english=visible(config);
  assert.ok(english.length>20,'checks the whole active settings schema');
  for(const language of localization.languages) {
    const translated=visible(localization.translateConfig(config,language));
    assert.equal(translated.length,english.length,language);
    for(let i=0;i<english.length;i++) {
      assert.equal(typeof translated[i],'string');
      assert.ok(translated[i].length>0,language+' missing '+english[i]);
      // These words are also natural translations, rather than missing entries.
      const sameWord=english[i]==='Layout'&&['da','sv'].includes(language)||
        english[i]==='Complications'&&language==='fr';
      if(language!=='en'&&!sameWord) assert.notEqual(translated[i],english[i],language+' untranslated '+english[i]);
    }
    for(const key of DYNAMIC) {
      const text=localization.t(key,language);
      assert.notEqual(text,key,language+' missing dynamic key '+key);
      assert.ok(text.length>0);
      if(language!=='en') assert.notEqual(text,localization.t(key,'en'),language+' untranslated '+key);
    }
  }
});

test('Czech settings include established controls, the single layout and dynamic content',()=>{
  const strings=visible(localization.translateConfig(config,'cs-CZ'));
  for(const text of ['Nastavení Halftone','Barva pozadí','Vzhled','Komplikace','Uložit nastavení']) assert.ok(strings.includes(text));
  assert.ok(strings.some(text=>text.includes('pozice 1 a 2')&&text.includes('Pebble')));
  assert.ok(strings.includes('Stav a nápověda'));
  assert.ok(strings.includes('Velký text'));
  assert.ok(strings.some(text=>text.includes('Zvětší čas, datum a obě komplikace')));
  assert.ok(strings.includes('Zobrazit hudbu při přehrávání'));
  assert.ok(strings.includes('Nová oznámení'));
  assert.ok(strings.some(text=>text.includes('Komplikace 1 a 2 jsou vedle sebe')&&text.includes('Obě se zmenší')));
  assert.ok(strings.some(text=>text.includes('Timeline Peek')&&text.includes('komplikace 1 a 2')));
  assert.ok(strings.includes('Krátké tečkované přechody'));
  assert.ok(strings.some(text=>text.includes('Čas a rámeček zůstanou nehybné')));
});

test('Unknown text and locales fall back safely, and English literals remain translation keys',()=>{
  assert.equal(localization.t('Colors','cs'),'Barvy');
  assert.equal(localization.t('colors','xx'),'Colors');
  assert.equal(localization.t('Complications','cs'),'Komplikace');
  assert.equal(localization.t('An unknown future setting','cs'),'An unknown future setting');
  assert.equal(localization.t('constructor','cs'),'constructor');
  assert.equal(localization.t('Extra-large clock','cs'),'Velký text');
  assert.equal(localization.t('Extra-large edge-to-edge text','cs'),'Velký text');
  assert.equal(localization.t('Timeline Peek keeps the clock and complication 1.','cs'),localization.t('adaptivePeek','cs'));
  assert.deepEqual(localization.translateConfig(config,'unsupported'),config);
});

test('Complication status translations preserve zero counts and source error data',()=>{
  const parameters={ready:0,configured:2,error:'PERMISSION_DENIED'};
  for(const language of localization.languages) {
    assert.ok(localization.t('complicationsStatus',language,parameters).includes('0/2'),language);
    assert.ok(localization.t('complicationsError',language,parameters).includes('PERMISSION_DENIED'),language);
    assert.equal(localization.t('complicationsStatus',language).match(/\{[^}]+\}/g).join(','),'{ready},{configured}');
    assert.equal(localization.t('complicationsError',language).match(/\{[^}]+\}/g).join(','),'{error}');
    assert.equal(localization.t('contextError',language).match(/\{[^}]+\}/g).join(','),'{error}');
    assert.ok(localization.t('contextError',language,parameters).includes('PERMISSION_DENIED'),language);
    assert.notEqual(localization.t('stateOn',language),localization.t('stateOff',language),language);
  }
  assert.equal(localization.t('complicationsStatus','en',parameters),'Complications: 0/2 ready');
  assert.equal(localization.t('complicationsError','cs',parameters),'Chyba komplikace: PERMISSION_DENIED');
  assert.deepEqual(parameters,{ready:0,configured:2,error:'PERMISSION_DENIED'});
});

test('Translation deep-clones Clay data while preserving keys, IDs, saved values, colors and units',()=>{
  const original=JSON.parse(JSON.stringify(config));
  const translated=localization.translateConfig(config,'de');
  function compare(a,b) {
    assert.notEqual(a,b,'every array/object must be cloned');
    if(Array.isArray(a)) {
      assert.equal(a.length,b.length);
      a.forEach((value,index)=>{if(value&&typeof value==='object') compare(value,b[index]);});
      return;
    }
    assert.deepEqual(Object.keys(a),Object.keys(b));
    for(const key of Object.keys(a)) {
      if(a[key]&&typeof a[key]==='object') compare(a[key],b[key]);
      else if(key!=='label'&&key!=='description'&&!(key==='defaultValue'&&['text','heading','submit'].includes(a.type))) assert.equal(a[key],b[key],key);
    }
  }
  compare(config,translated);
  translated[0].defaultValue='Changed only in translated copy';
  assert.deepEqual(config,original);
  const sample=[{type:'section',items:[{type:'select',messageKey:'UNITS',defaultValue:'°C',label:'Colors',
    id:'unit-picker',options:[{label:'Text size',value:'°F'}]}]}];
  const result=localization.translateConfig(sample,'cs');
  assert.equal(result[0].items[0].defaultValue,'°C');
  assert.equal(result[0].items[0].options[0].value,'°F');
  assert.equal(result[0].items[0].id,'unit-picker');
  assert.equal(result[0].items[0].options[0].label,'Velikost textu');
});

test('Active settings retain appearance controls and add opt-in notification settings without a layout picker',()=>{
  const messageKeys=items(config).filter(item=>item.messageKey).map(item=>item.messageKey);
  assert.deepEqual(messageKeys,['BACKGROUND_COLOR','TEXT_COLOR','USE_12_HOUR','LARGE_TEXT','SHOW_STATUS',
    'SHOW_MUSIC','SHOW_NOTIFICATIONS','NOTIFICATION_PREVIEW','NOTIFICATION_APPS','PANEL_TRANSITIONS','DEPTH_EFFECT','TEXT_SHADOW']);
  assert.ok(!items(config).some(item=>item.id==='weather-status'));
  const status=items(config).find(item=>item.id==='complications-status');
  assert.equal(status.defaultValue,'Complications: waiting for Pebble');
  assert.equal(status.messageKey,undefined,'the source status is informational, not a watch setting');
  assert.equal(items(config).find(item=>item.messageKey==='USE_12_HOUR').defaultValue,false);
  assert.equal(items(config).find(item=>item.messageKey==='LARGE_TEXT').defaultValue,false);
  assert.ok(!items(config).some(item=>item.messageKey==='LAYOUT_STYLE'));
  assert.equal(items(config).find(item=>item.messageKey==='SHOW_MUSIC').defaultValue,true);
  assert.equal(items(config).find(item=>item.messageKey==='SHOW_NOTIFICATIONS').defaultValue,false);
  assert.equal(items(config).find(item=>item.messageKey==='NOTIFICATION_PREVIEW').defaultValue,false);
  assert.equal(items(config).find(item=>item.messageKey==='NOTIFICATION_APPS').defaultValue,'');
  assert.equal(items(config).find(item=>item.messageKey==='SHOW_STATUS').defaultValue,true);
  assert.equal(items(config).find(item=>item.messageKey==='PANEL_TRANSITIONS').defaultValue,true);
  const context=items(config).find(item=>item.id==='context-status');
  assert.equal(context.defaultValue,'Dynamic content: waiting for Pebble');
  assert.equal(context.messageKey,undefined);
});

test('Every language explains the adaptive layout and both-reading Peek behavior',()=>{
  for(const language of localization.languages) {
    const help=localization.t('complicationsHelp',language);
    assert.ok(help.includes('1')&&help.includes('2')&&help.includes('Pebble'),language);
    assert.ok(!help.includes('1–5'),language+' must explain the two visible choices');
    const adaptive=localization.t('adaptiveHelp',language);
    assert.ok(adaptive.includes('1')&&adaptive.includes('2'),language);
    assert.ok(!adaptive.includes('2–5'),language+' must describe only the two selected readings');
    const peek=localization.t('adaptivePeek',language);
    assert.ok(peek.includes('Timeline Peek')&&peek.includes('1')&&peek.includes('2'),language);
    const rendered=visible(localization.translateConfig(config,language));
    for(const key of ADAPTIVE_KEYS) assert.ok(rendered.includes(localization.t(key,language)),language+' does not display '+key);
    assert.ok(rendered.includes(localization.t('complicationsUnits',language)),language+' must explain source-owned units');
  }
});

test('Complication help identifies source-owned units without retaining active weather controls',()=>{
  assert.equal(localization.t('complicationsUnits','en'),'Units come from Pebble and the selected plugin.');
  const english=visible(config).join('\n');
  assert.doesNotMatch(english,/Fahrenheit|weather column|today.s low|rain \/ snow|Show weather icon|Follow Pebble temperature/);
  for(const language of localization.languages) {
    const text=localization.t('complicationsDisabled',language);
    assert.ok(text.includes('Pebble'),language);
    assert.ok(text!==localization.t('complicationsWaiting',language),language+' distinguishes disabled from waiting');
  }
});

test('All new controls translate while preserving app filters, privacy defaults and source schema',()=>{
  const original=JSON.parse(JSON.stringify(config));
  for(const language of localization.languages) {
    const translated=items(localization.translateConfig(config,language));
    for(const key of ADAPTIVE_KEYS) {
      const result=localization.t(key,language);
      assert.notEqual(result,key,language+' missing '+key);
      if(language!=='en') assert.notEqual(result,localization.t(key,'en'),language+' English fallback '+key);
    }
    const apps=translated.find(item=>item.messageKey==='NOTIFICATION_APPS');
    assert.equal(apps.defaultValue,'');
    assert.equal(apps.type,'input');
    assert.equal(apps.attributes.maxlength,160);
    assert.equal(translated.find(item=>item.messageKey==='SHOW_NOTIFICATIONS').defaultValue,false);
    assert.equal(translated.find(item=>item.messageKey==='NOTIFICATION_PREVIEW').defaultValue,false);
    assert.equal(translated.find(item=>item.messageKey==='PANEL_TRANSITIONS').defaultValue,true);
    assert.equal(translated.find(item=>item.id==='context-status').defaultValue,localization.t('contextWaiting',language));
  }
  assert.deepEqual(config,original);
  const sample=[{type:'input',messageKey:'NOTIFICATION_APPS',label:'Apps to show',defaultValue:'Signal, Colors'}];
  assert.equal(localization.translateConfig(sample,'cs')[0].defaultValue,'Signal, Colors');
  assert.ok(!items(config).some(item=>/TIMER|CALENDAR/.test(item.messageKey||'')));
});


test('Settings put common appearance controls first, keep diagnostics last and attach help to its control',()=>{
  const sections=config.filter(item=>item.type==='section');
  assert.deepEqual(sections.map(section=>section.items[0].defaultValue),
    ['Appearance','Complications','Dynamic content','Optical effects','Status & help']);
  assert.deepEqual(sections[0].items.filter(item=>item.messageKey).map(item=>item.messageKey),
    ['BACKGROUND_COLOR','TEXT_COLOR','USE_12_HOUR','LARGE_TEXT','SHOW_STATUS']);
  const diagnostics=sections[sections.length-1];
  assert.deepEqual(diagnostics.items.filter(item=>item.id).map(item=>item.id),
    ['complications-status','context-status']);
  assert.ok(!sections.slice(0,-1).some(section=>section.items.some(item=>/-status$/.test(item.id||''))));
  const all=items(config);
  for(const key of ['LARGE_TEXT','SHOW_STATUS','SHOW_NOTIFICATIONS','NOTIFICATION_APPS','PANEL_TRANSITIONS']) {
    assert.ok(all.find(item=>item.messageKey===key).description,key+' keeps help next to the control');
  }
  assert.equal(config[config.length-1].type,'submit');
});

test('Inline descriptions translate without changing saved app filters or other values',()=>{
  const sample=[{type:'input',messageKey:'NOTIFICATION_APPS',label:'Apps to show',
    description:'Separate app names with commas. Empty means all allowed apps.',defaultValue:'Signal, Colors'}];
  for(const language of localization.languages) {
    const result=localization.translateConfig(sample,language)[0];
    assert.equal(result.defaultValue,'Signal, Colors');
    assert.equal(result.description,localization.t('notificationAppsHelp',language));
    if(language!=='en') assert.notEqual(result.description,sample[0].description);
  }
  assert.match(localization.t('adaptiveHelp','en'),/side by side.*Both shrink/);
  assert.doesNotMatch(visible(config).join('\n'),/replace complication 2|larger and stays visible/);
});
