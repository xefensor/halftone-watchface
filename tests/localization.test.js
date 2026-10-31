'use strict';

const assert=require('node:assert/strict');
const {test}=require('node:test');
const localization=require('../src/pkjs/localization');
const config=require('../src/pkjs/config');

const DYNAMIC=['complicationsStatus','complicationsWaiting','complicationsDisabled','complicationsError','stateOn','stateOff'];
const MAP_KEYS=['classicSlots','comicSlots','stackedSlots','peekSlots'];

function visible(config) {
  const out=[];
  function walk(value) {
    if(Array.isArray(value)) return value.forEach(walk);
    if(!value||typeof value!=='object') return;
    if(typeof value.label==='string') out.push(value.label);
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

test('Czech settings include established controls, complication configuration and slot mapping',()=>{
  const strings=visible(localization.translateConfig(config,'cs-CZ'));
  for(const text of ['Nastavení Halftone','Barva pozadí','Čas','Komplikace','Uložit nastavení']) assert.ok(strings.includes(text));
  assert.ok(strings.some(text=>text.includes('pozice 1–5')&&text.includes('Pebble')));
  assert.ok(strings.some(text=>text.includes('2/3 nad 4/5')));
  assert.ok(strings.includes('Při Timeline Peek se zobrazuje pouze komplikace 1.'));
});

test('Unknown text and locales fall back safely, and English literals remain translation keys',()=>{
  assert.equal(localization.t('Colors','cs'),'Barvy');
  assert.equal(localization.t('colors','xx'),'Colors');
  assert.equal(localization.t('Complications','cs'),'Komplikace');
  assert.equal(localization.t('An unknown future setting','cs'),'An unknown future setting');
  assert.equal(localization.t('constructor','cs'),'constructor');
  assert.deepEqual(localization.translateConfig(config,'unsupported'),config);
});

test('Complication status translations preserve zero counts and source error data',()=>{
  const parameters={ready:0,configured:5,error:'PERMISSION_DENIED'};
  for(const language of localization.languages) {
    assert.ok(localization.t('complicationsStatus',language,parameters).includes('0/5'),language);
    assert.ok(localization.t('complicationsError',language,parameters).includes('PERMISSION_DENIED'),language);
    assert.equal(localization.t('complicationsStatus',language).match(/\{[^}]+\}/g).join(','),'{ready},{configured}');
    assert.equal(localization.t('complicationsError',language).match(/\{[^}]+\}/g).join(','),'{error}');
    assert.notEqual(localization.t('stateOn',language),localization.t('stateOff',language),language);
  }
  assert.equal(localization.t('complicationsStatus','en',parameters),'Complications: 0/5 ready');
  assert.equal(localization.t('complicationsError','cs',parameters),'Chyba komplikace: PERMISSION_DENIED');
  assert.deepEqual(parameters,{ready:0,configured:5,error:'PERMISSION_DENIED'});
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
      else if(key!=='label'&&!(key==='defaultValue'&&['text','heading','submit'].includes(a.type))) assert.equal(a[key],b[key],key);
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

test('Active settings contain only retained clock and appearance message keys',()=>{
  const messageKeys=items(config).filter(item=>item.messageKey).map(item=>item.messageKey);
  assert.deepEqual(messageKeys,['LAYOUT_STYLE','BACKGROUND_COLOR','TEXT_COLOR','USE_12_HOUR','LARGE_TEXT','DEPTH_EFFECT','TEXT_SHADOW']);
  assert.ok(!items(config).some(item=>item.id==='weather-status'));
  const status=items(config).find(item=>item.id==='complications-status');
  assert.equal(status.defaultValue,'Complications: waiting for Pebble');
  assert.equal(status.messageKey,undefined,'the source status is informational, not a watch setting');
  assert.equal(items(config).find(item=>item.messageKey==='USE_12_HOUR').defaultValue,false);
  assert.equal(items(config).find(item=>item.messageKey==='LARGE_TEXT').defaultValue,false);
  assert.deepEqual(items(config).find(item=>item.messageKey==='LAYOUT_STYLE').options.map(option=>option.value),['0','1','2']);
});

test('Every language explains all five fixed positions and the primary-only Peek layout',()=>{
  for(const language of localization.languages) {
    const help=localization.t('complicationsHelp',language);
    assert.ok(help.includes('1–5')&&help.includes('Pebble'),language);
    const classic=localization.t('classicSlots',language);
    assert.ok(classic.includes('1')&&classic.includes('2/3')&&classic.includes('4/5'),language);
    const comic=localization.t('comicSlots',language);
    const stacked=localization.t('stackedSlots',language);
    for(const number of ['1','2','3','4','5']) assert.ok(comic.includes(number)&&stacked.includes(number),language+' missing '+number);
    const peek=localization.t('peekSlots',language);
    assert.ok(peek.includes('Timeline Peek')&&peek.includes('1'),language);
    const rendered=visible(localization.translateConfig(config,language));
    for(const key of MAP_KEYS) assert.ok(rendered.includes(localization.t(key,language)),language+' does not display '+key);
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

test('All layout controls translate without changing stored layout values or shared source schema',()=>{
  const section=config.find(section=>(section.items||[]).some(item=>item.messageKey==='LAYOUT_STYLE'));
  const original=JSON.parse(JSON.stringify(section));
  for(const language of localization.languages) {
    const translated=localization.translateConfig([section],language)[0];
    const select=translated.items.find(item=>item.messageKey==='LAYOUT_STYLE');
    assert.equal(select.messageKey,'LAYOUT_STYLE');
    assert.equal(select.defaultValue,'0');
    assert.deepEqual(select.options.map(option=>option.value),['0','1','2']);
    assert.deepEqual(select.options.map(option=>option.label),['layoutClassic','layoutComic','layoutStacked'].map(key=>localization.t(key,language)));
  }
  assert.deepEqual(section,original);
  const czech=localization.translateConfig([section],'cs-CZ')[0].items.find(item=>item.messageKey==='LAYOUT_STYLE');
  assert.equal(czech.options[1].label,'Komiksová obálka');
  assert.equal(czech.options[2].label,'Čas pod sebou');
});
