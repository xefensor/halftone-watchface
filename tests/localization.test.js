'use strict';

const assert=require('node:assert/strict');
const {test}=require('node:test');
const localization=require('../src/pkjs/localization');
const config=require('../src/pkjs/config');

const DYNAMIC=['sharedSource','legacySource','received','lastRead','savedUnavailable','sourceError',
  'permissionDenied','sourceUnavailable','sourceTimeout','networkError'];

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

test('Watch locale takes precedence; BCP47/POSIX tags and Norwegian aliases normalize predictably',()=>{
  for(const [watch,phone,expected] of [
    ['CS_cz.UTF-8','de-DE','cs'],[' FR-ca ','cs-CZ','fr'],['pt_BR','en-US','pt'],
    ['nb_NO','en','no'],['NN-no@variant','en','no'],['no-NO','en','no'],
    ['xx-YY','SK_sk.UTF-8','sk'],[undefined,'tr-TR','tr'],[null,null,'en'],
    ['','fi-FI','fi'],['unsupported','unknown','en'],[{},['cs'],'en']
  ]) assert.equal(localization.resolveLanguage(watch,phone),expected);
});

test('All seventeen watch languages translate every existing settings field and dynamic status key',()=>{
  assert.deepEqual(localization.languages,['en','cs','sk','de','fr','es','it','pt','nl','pl','da','sv','no','fi','hu','ro','tr']);
  const english=visible(config);
  assert.ok(english.length>20,'checks the whole settings schema rather than only new weather toggles');
  for(const language of localization.languages) {
    const translated=visible(localization.translateConfig(config,language));
    assert.equal(translated.length,english.length,language);
    for(let i=0;i<english.length;i++) {
      assert.equal(typeof translated[i],'string');
      assert.ok(translated[i].length>0,language+' missing '+english[i]);
      // "Layout" is also the natural Danish/Swedish word, not a missing entry.
      if(language!=='en'&&!(english[i]==='Layout'&&['da','sv'].includes(language))) {
        assert.notEqual(translated[i],english[i],language+' untranslated '+english[i]);
      }
    }
    for(const key of DYNAMIC) {
      const text=localization.t(key,language);
      assert.notEqual(text,key,language+' missing dynamic key '+key);
      assert.ok(text.length>0);
      if(language!=='en') assert.notEqual(text,localization.t(key,'en'),language+' untranslated '+key);
    }
  }
});

test('Czech settings translate both established controls and the new weather section',()=>{
  const translated=localization.translateConfig(config,'cs-CZ');
  const strings=visible(translated);
  assert.ok(strings.includes('Nastavení Halftone'));
  assert.ok(strings.includes('Barva pozadí'));
  assert.ok(strings.includes('Zobrazit dnešní minimum a maximum'));
  assert.ok(strings.includes('Zobrazit dnešní pravděpodobnost deště / sněhu'));
  assert.ok(strings.includes('Uložit nastavení'));
});

test('Unknown text and locales fall back safely, and English literals are supported as translation keys',()=>{
  assert.equal(localization.t('Colors','cs'),'Barvy');
  assert.equal(localization.t('colors','xx'),'Colors');
  assert.equal(localization.t('An unknown future setting','cs'),'An unknown future setting');
  assert.equal(localization.t('constructor','cs'),'constructor');
  assert.deepEqual(localization.translateConfig(config,'unsupported'),config);
});

test('Dynamic translations preserve substituted data and support zero minutes without mutating parameters',()=>{
  const parameters={minutes:0,temperature:'44°F',error:'PERMISSION_DENIED'};
  assert.equal(localization.t('lastRead','cs',parameters),'Poslední načtení zdroje před 0 min');
  assert.equal(localization.t('received','fr',parameters),'Reçu : 44°F');
  assert.equal(localization.t('sourceError','cs',parameters),'Chyba zdroje: PERMISSION_DENIED');
  assert.equal(localization.t('received','en'),'Received {temperature}');
  assert.deepEqual(parameters,{minutes:0,temperature:'44°F',error:'PERMISSION_DENIED'});
});

test('Translation deep-clones Clay data while preserving keys, IDs, saved values, colors and units',()=>{
  const original=JSON.parse(JSON.stringify(config));
  const translated=localization.translateConfig(config,'de');
  function compare(a,b) {
    assert.notEqual(a,b,'every array/object must be cloned');
    if(Array.isArray(a)) {
      assert.equal(a.length,b.length);
      a.forEach((value,index)=>{
        if(value&&typeof value==='object') compare(value,b[index]);
      });
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

test('Saved location names are never translated even when they match an English settings label',()=>{
  const locations=[{type:'select',messageKey:'WEATHER_LOCATION',label:'Weather location',defaultValue:'city-1',options:[
    {label:'First Pebble weather location',value:''},{label:'Colors',value:'city-1'},{label:'České Budějovice',value:'city-2'}
  ]}];
  const result=localization.translateConfig(locations,'cs');
  assert.equal(result[0].label,'Místo pro počasí');
  assert.equal(result[0].options[0].label,'První místo pro počasí v Pebble');
  assert.equal(result[0].options[1].label,'Colors');
  assert.equal(result[0].options[2].label,'České Budějovice');
  assert.equal(result[0].defaultValue,'city-1');
});

test('Weather help explains the numeric high-first range and droplet without obsolete letter labels',()=>{
  const meaning={en:['droplet','rain','snow'],cs:['Kapka','deště','sněhu'],sk:['Kvapka','dažďa','snehu'],
    de:['Tropfen','Regen','Schnee'],fr:['goutte','pluie','neige'],es:['gota','lluvia','nieve'],
    it:['goccia','pioggia','neve'],pt:['gota','chuva','neve'],nl:['druppel','regen','sneeuw'],
    pl:['Kropla','deszczu','śniegu'],da:['Dråben','regn','sne'],sv:['Droppen','regn','snö'],
    no:['Dråpen','regn','snø'],fi:['Pisara','sateen','lumisateen'],hu:['csepp','eső','havazás'],
    ro:['Picătura','ploaie','ninsoare'],tr:['Damla','yağmur','kar']};
  for(const [language,words] of Object.entries(meaning)) {
    const help=localization.t('detailsHelp',language);
    assert.ok(help.includes('19/5'),language+' must show the actual high/low format');
    assert.ok(help.includes('Timeline Peek'),language+' must explain when details hide');
    assert.ok(!/L\/H|min\/max|min\/maks|alin\/ylin/.test(help),language+' still describes removed letter labels');
    for(const word of words) assert.ok(help.includes(word),language+' missing '+word+' explanation');
  }
  assert.equal(localization.t('detailsHelp','en'),
    "High/low is shown as 19/5. The droplet shows today's rain or snow chance. Missing data stays hidden. Details hide during Timeline Peek.");
});

test('Weather icon settings translate all languages without changing saved toggle or location data',()=>{
  const iconHelp='Shows the condition supplied by Pebble. Hidden when unavailable.';
  const settings=[{type:'section',items:[
    {type:'toggle',messageKey:'SHOW_WEATHER_ICON',id:'weather-icon',defaultValue:false,label:'Show weather icon'},
    {type:'text',defaultValue:iconHelp},
    {type:'select',messageKey:'WEATHER_LOCATION',defaultValue:'city',label:'Weather location',options:[
      {label:'České Budějovice',value:'city'}
    ]}
  ]}];
  for(const language of localization.languages) {
    const translated=localization.translateConfig(settings,language);
    const [toggle,help,location]=translated[0].items;
    assert.equal(toggle.label,localization.t('showWeatherIcon',language));
    assert.equal(help.defaultValue,localization.t('weatherIconHelp',language));
    assert.ok(help.defaultValue.includes('Pebble'),language+' must identify the real condition source');
    assert.equal(toggle.messageKey,'SHOW_WEATHER_ICON');
    assert.equal(toggle.id,'weather-icon');
    assert.equal(toggle.defaultValue,false);
    assert.equal(location.defaultValue,'city');
    assert.deepEqual(location.options,[{label:'České Budějovice',value:'city'}]);
    if(language!=='en') {
      assert.notEqual(toggle.label,'Show weather icon');
      assert.notEqual(help.defaultValue,iconHelp);
    }
  }
  assert.deepEqual(localization.translateConfig(settings,'unknown'),settings);
  assert.equal(settings[0].items[0].label,'Show weather icon');
});

test('All layout controls and guidance translate without changing the stored layout values',()=>{
  const help='Comic cover keeps a wide clock with a weather column. Stacked time puts hours above minutes. Timeline Peek uses a compact clock.';
  const section=[{type:'section',items:[
    {type:'heading',defaultValue:'Layout'},
    {type:'select',messageKey:'LAYOUT_STYLE',id:'layout-style',label:'Layout style',defaultValue:0,options:[
      {label:'Classic',value:0},{label:'Comic cover',value:1},{label:'Stacked time',value:2}
    ]},
    {type:'text',defaultValue:help}
  ]}];
  const keys=['layout','layoutStyle','layoutClassic','layoutComic','layoutStacked','layoutHelp'];
  const english=['Layout','Layout style','Classic','Comic cover','Stacked time',help];
  for(const language of localization.languages) {
    const translated=localization.translateConfig(section,language);
    const strings=visible(translated);
    assert.deepEqual(strings,keys.map(key=>localization.t(key,language)));
    assert.ok(strings.every(text=>typeof text==='string'&&text.length>0));
    assert.ok(strings[5].includes('Timeline Peek'),'keep the system feature name recognizable');
    for(let i=1;i<strings.length;i++) {
      if(language!=='en') assert.notEqual(strings[i],english[i],language+' missing '+keys[i]);
    }
    const select=translated[0].items[1];
    assert.equal(select.messageKey,'LAYOUT_STYLE');
    assert.equal(select.id,'layout-style');
    assert.equal(select.defaultValue,0);
    assert.deepEqual(select.options.map(option=>option.value),[0,1,2]);
  }
  const czech=localization.translateConfig(section,'cs-CZ');
  assert.equal(czech[0].items[1].options[1].label,'Komiksová obálka');
  assert.equal(czech[0].items[1].options[2].label,'Čas pod sebou');
  assert.deepEqual(localization.translateConfig(section,'unknown'),section);
  assert.equal(section[0].items[1].options[1].label,'Comic cover','translation must not mutate the shared Clay schema');
});
