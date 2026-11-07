'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const localization=require('../src/pkjs/localization');
const config=require('../src/pkjs/config');

function items(value) {
  if(Array.isArray(value))return value.flatMap(items);
  if(!value||typeof value!=='object')return [];
  return [value].concat(Object.values(value).flatMap(items));
}
function visible(value) {
  const hidden=['halftone-settings-data','halftone-settings-strings','halftone-preview-assets','halftone-contrast'];
  return items(value).filter(item=>!hidden.includes(item.id)).flatMap(item=>[
    item.label,item.description,
    ['text','heading','submit'].includes(item.type)?item.defaultValue:undefined
  ]).filter(value=>typeof value==='string');
}
const languages=['en','cs','sk','de','fr','es','it','pt','nl','pl','da','sv','no','fi','hu','ro','tr'];
const statusKeys=['complicationsWaiting','complicationsStatus','complicationsDisabled','complicationsError',
  'contextWaiting','contextReady','contextError','stateOn','stateOff'];

test('watch language wins, with phone/English fallback and Norwegian aliases',()=>{
  assert.deepEqual(localization.languages,languages);
  for(const [watch,phone,want] of [
    ['CS_cz.UTF-8','de-DE','cs'],[' FR-ca ','cs-CZ','fr'],['pt_BR','en-US','pt'],
    ['nb_NO','en','no'],['NN-no@variant','en','no'],['no-NO','en','no'],
    ['unsupported','SK_sk.UTF-8','sk'],[undefined,'tr-TR','tr'],[null,null,'en'],
    ['', 'fi-FI','fi'],[{},['cs'],'en']
  ])assert.equal(localization.resolveLanguage(watch,phone),want);
});
for(const language of languages)test(language+' translates every active control and status',()=>{
  const english=visible(config);
  const translated=visible(localization.translateConfig(config,language));
  assert.equal(translated.length,english.length);
  assert.ok(english.length>25);
  translated.forEach((value,index)=>{
    assert.ok(value.length>0,english[index]);
    const sharedWord=english[index]==='Halftone'||language==='fr'&&['Complications','Animations','Notifications'].includes(english[index]);
    if(language!=='en'&&!sharedWord)assert.notEqual(value,english[index],english[index]);
    assert.doesNotMatch(value,/Dynamic|dynamic/);
  });
  for(const key of statusKeys){
    assert.notEqual(localization.t(key,language),key);
    if(language!=='en')assert.notEqual(localization.t(key,language),localization.t(key,'en'));
  }
  assert.match(localization.t('complicationsStatus',language,{ready:0,configured:2}),/0\/2/);
  assert.match(localization.t('contextError',language,{error:'PLUGIN_UNAVAILABLE'}),/PLUGIN_UNAVAILABLE/);
});
test('translation preserves preference identifiers, defaults and schema while cloning',()=>{
  const before=JSON.stringify(config);
  const translated=localization.translateConfig(config,'de');
  const raw=items(config),local=items(translated);
  assert.equal(raw.length,local.length);
  raw.forEach((item,index)=>{
    assert.notEqual(item,local[index]);
    for(const key of ['messageKey','id','type','value','serializeValueAs'])assert.equal(item[key],local[index][key]);
    if(item.messageKey)assert.equal(item.defaultValue,local[index].defaultValue);
  });
  assert.equal(JSON.stringify(config),before);
  assert.deepEqual(localization.translateConfig(config,'unknown'),config);
  assert.equal(localization.t('constructor','cs'),'constructor');
  assert.equal(localization.t('untranslated future string','cs'),'untranslated future string');
  assert.equal(localization.t('Background color','cs'),'Barva pozadí');
});
test('custom settings strings resolve all supported locales and return isolated dictionaries',()=>{
  const english=localization.settingsStrings('en');
  const keys=Object.keys(english);
  for(const language of languages){
    const strings=localization.settingsStrings(language);
    assert.deepEqual(Object.keys(strings),keys);
    for(const key of keys){
      assert.equal(strings[key],localization.t(key,language));
      assert.ok(strings[key].length>0,key);
    }
    strings.title='Changed by a settings page';
    assert.equal(localization.settingsStrings(language).title,localization.t('title',language));
  }
  assert.deepEqual(localization.settingsStrings('unknown'),english);
  assert.deepEqual(localization.settingsStrings('NB_no.UTF-8'),localization.settingsStrings('no'));
});
test('translation preserves provider values and API identifiers in settings metadata',()=>{
  const metadata={slots:[{category:'weather',item:'location',property:'temperature',label:'My place',
    value:'High',unit:'°C',provider:'Weather Service',observationAgeSec:120}],
    sources:{music:{state:'playing',message:'PLUGIN_UNAVAILABLE'}}};
  const input=[{type:'text',id:'halftone-settings-data',defaultValue:JSON.stringify(metadata)}];
  for(const language of languages){
    assert.deepEqual(localization.translateConfig(input,language),input);
  }
});
test('all custom controls, source states and save outcomes have complete translations',()=>{
  const keys=['samplePreview','sampleHelp','previewIdle','previewMusic','previewNotification','previewTimeline',
    'display','theme','themeLight','themeDark','themeCustom','timeFormat','followPebble','time24',
    'accentHelp','languageHelp','twoReadings','leftReading','rightReading','musicNotifications','notifications',
    'notificationSummary','notificationAppsMode','allApps','selectedApps','appFilterHelp','appFilterRequired',
    'helpConnection','snapshotHelp','permissionHelp','pluginHelp','connectionHelp','technicalDetails','musicSource','notificationsSource','phoneSource',
    'sourceEmpty','sourceLoading','sourceReady','sourceUnavailable','sourceDenied','sourceUnsupported',
    'sourceDisabled','sourcePlaying','sourcePaused','sourceIdle','sourceOff','sourceWaiting','sourcePermission',
    'saveSaved','savePending','saveFailed','saveNone','saveSending','contrastHelp','previewSettingsNote','previewCustomHelp','previewTimelineHelp','noExample',
    'activityPriority','activityPriorityHelp','activityUp','activityDown','activityVisible','activityShow','activityMove','activityMoved','activityUnavailableApp','activityUnavailable',
    'receivedAge','observedAge','readingTemperature','readingFeelsLike','readingHigh','readingLow','readingCondition',
    'readingHumidity','readingRain','readingUv','readingBattery','readingTitle','readingArtist','readingName'];
  for(const language of languages){
    const strings=localization.settingsStrings(language);
    for(const key of keys){
      assert.equal(typeof strings[key],'string',language+': '+key);
      assert.notEqual(strings[key],key,language+': '+key);
      assert.ok(strings[key].length>0,language+': '+key);
      const sharedWord=language==='fr'&&['previewNotification','notifications','notificationsSource'].includes(key)||
        ['cs','sk'].includes(language)&&key==='readingUv'||
        language==='de'&&key==='readingName'||
        ['sv','no','ro'].includes(language)&&key==='readingArtist';
      if(language!=='en'&&!sharedWord)assert.notEqual(strings[key],localization.t(key,'en'),language+': '+key);
      assert.equal(localization.t(localization.t(key,'en'),language),strings[key],language+': literal '+key);
    }
    assert.equal(strings.musicSource,strings.previewMusic);
    assert.equal(strings.notificationsSource,strings.notifications);
    assert.equal(strings.sourceOff,strings.stateOff);
    assert.equal(strings.sourcePermission,strings.sourceDenied);
    assert.match(strings.appFilterHelp,/Signal, org\.thoughtcrime\.securesms/);
    assert.match(strings.previewSettingsNote,/64/);
    assert.match(strings.previewTimelineHelp,/Pebble Timeline/);
    assert.equal(localization.t('Color for reading symbols. Rain gauges and notification symbols use yellow.',language),strings.accentHelp);
    assert.equal(localization.t('12-hour time',language),strings.time12);
    assert.equal(localization.t('Settings delivered to watch.',language),strings.saveSaved);
    assert.equal(localization.t('Waiting for watch.',language),strings.savePending);
    assert.equal(localization.t('Could not reach watch. Reconnect and save again.',language),strings.saveFailed);
    for(const key of ['receivedAge','observedAge']){
      assert.match(strings[key],/\{age\}/,language+': '+key);
      for(const age of [0,1,42]){
        const translated=localization.t(key,language,{age});
        assert.equal(translated,strings[key].replace('{age}',String(age)));
        assert.doesNotMatch(translated,/\{age\}/);
      }
    }
  }
  assert.equal(localization.t('accentHelp','en'),'Color for reading symbols and rain gauges.');
  assert.equal(localization.t('previewCustomHelp','en'),'Custom colors are approximate. The layout uses native watch rendering.');
  assert.equal(localization.t('previewTimelineHelp','en'),'The lower panel is reserved for Pebble Timeline.');
  assert.equal(localization.t('sourcePaused','en'),'Paused');
  assert.equal(localization.t('permissionHelp','en'),'Allow access in Pebble, then reopen settings.');
  assert.equal(localization.t('pluginHelp','en'),'Check that the matching plugin is enabled in Pebble.');
  assert.equal(localization.t('connectionHelp','en'),'Connect your phone and watch, then reopen settings.');
  assert.equal(localization.t('saveSaved','en'),'Last save delivered');
  assert.equal(localization.t('savePending','en'),'Saved on phone—will apply when the watch reconnects.');
  assert.equal(localization.t('saveFailed','en'),'Saved on phone—will apply when the watch reconnects.');
  assert.equal(localization.t('receivedAge','en'),'Received {age} min ago');
  assert.equal(localization.t('observedAge','en'),'Observed {age} min ago');
});
test('Timer preview is named in every supported language',()=>{
  for(const language of languages)assert.ok(localization.settingsStrings(language).previewTimer.length>0);
  assert.equal(localization.t('previewTimer','cs'),'Časovač');
  assert.equal(localization.t('previewTimer','pl'),'Minutnik');
});
test('borderless settings expose only applicable controls and preserve privacy defaults',()=>{
  const all=items(config);
  const find=key=>all.find(item=>item.messageKey===key);
  assert.equal(find('BACKGROUND_COLOR').defaultValue,'0xFF5500');
  assert.equal(find('TEXT_COLOR').defaultValue,'0xFFFFFF');
  assert.equal(find('ACCENT_COLOR').defaultValue,'0x55AAFF');
  assert.equal(find('ANIMATIONS').defaultValue,true);
  assert.equal(find('TEXT_SHADOW').defaultValue,false);
  assert.equal(find('SHOW_MUSIC').defaultValue,true);
  assert.equal(find('SHOW_NOTIFICATIONS').defaultValue,false);
  assert.equal(find('NOTIFICATION_PREVIEW').defaultValue,false);
  assert.equal(find('USE_12_HOUR'),undefined);
  assert.equal(find('CLOCK_FORMAT').defaultValue,0);
  assert.equal(find('CLOCK_FORMAT').serializeValueAs,'integer');
  assert.deepEqual(find('CLOCK_FORMAT').options.map(option=>option.value),[0,12,24]);
  for(const id of ['halftone-settings-data','halftone-settings-strings','halftone-preview-assets']){
    const transport=all.find(item=>item.id===id);
    assert.equal(transport.messageKey,undefined);
    assert.equal(transport.defaultValue,'{}');
  }
  for(const key of ['LAYOUT_STYLE','WEATHER_LOCATION','FOLLOW_PEBBLE_UNITS','USE_FAHRENHEIT']){
    assert.equal(find(key),undefined,key);
  }
  assert.ok(visible(config).some(value=>value.includes('slots 1 and 2')));
  assert.ok(visible(config).some(value=>value.includes('Timeline Peek')));
  assert.doesNotMatch(visible(config).join('\n'),/Dynamic|dynamic|dithered/);
});


test('chunky-motion appearance controls are translated without stale panel or shadow promises',()=>{
  for(const language of languages) {
    const all=items(localization.translateConfig(config,language));
    const accent=all.find(item=>item.messageKey==='ACCENT_COLOR');
    const motion=all.find(item=>item.messageKey==='ANIMATIONS');
    assert.equal(accent.label,localization.t('accentColor',language));
    assert.equal(accent.description,localization.t('accentHelp',language));
    assert.equal(all.find(item=>item.messageKey==='LARGE_TEXT').defaultValue,false);
    assert.equal(motion.label,localization.t('animations',language));
    assert.equal(motion.description,localization.t('animationsHelp',language));
    assert.equal(motion.defaultValue,true);
    assert.equal(all.find(item=>item.messageKey==='TEXT_SHADOW').defaultValue,false);
    assert.equal(localization.t('shadow',language),'shadow');
  }
  assert.doesNotMatch(visible(config).join('\n'),/information panel color|Panel text|bolder time digits/);
  assert.equal(localization.t('animationsHelp','en'),'Short transitions when activities change.');
});


test('the full UX pass has explicit translations and keeps privacy and save meanings separate',()=>{
  const keys=['content','layoutPreview','previewBanner','previewMessage','previewDisabled',
    'previewUnknownFormat','previewSafeHelp','sharedReadingsHelp','saveUnsaved','saveLastDelivered',
    'savePhoneWaiting','appAdd','appRemove','appEntryLabel','appEntryHelp','appDuplicate','appInvalid',
    'appLimit','sourceExpired','justObserved','justReceived','readingSetupHelp','sourceNoUpdateHelp',
    'accentContrastHelp','notificationSummaryHelp'];
  for(const language of languages){
    const strings=localization.settingsStrings(language);
    for(const key of keys){
      assert.equal(typeof strings[key],'string',language+': '+key);
      assert.ok(strings[key].trim(),language+': '+key);
      assert.notEqual(strings[key],key,language+': '+key);
      if(language!=='en')assert.notEqual(strings[key],localization.t(key,'en'),language+': '+key);
      assert.equal(localization.t(localization.t(key,'en'),language),strings[key],language+': literal '+key);
    }
    assert.match(strings.appRemove,/\{app\}/,language+': remove placeholder');
    assert.equal(localization.t('appRemove',language,{app:'Signal'}),strings.appRemove.replace('{app}','Signal'));
    assert.match(strings.appLimit,/160/,language+': app transport bound');
    assert.match(strings.previewUnknownFormat,/24/,language+': example clock format');
    assert.match(strings.sharedReadingsHelp,/Pebble/,language+': shared ownership');
    assert.equal(strings.saveSaved,strings.saveLastDelivered);
    assert.equal(strings.saveFailed,strings.savePhoneWaiting);
    assert.equal(strings.savePending,strings.savePhoneWaiting);
    assert.notEqual(strings.saveUnsaved,strings.saveLastDelivered);
    assert.notEqual(strings.previewBanner,strings.previewMessage);
    assert.notEqual(strings.justObserved,strings.justReceived);
    assert.notEqual(strings.sourceExpired,strings.sourceUnavailable);
    assert.equal(localization.t('Help & connection',language),strings.helpConnection);
  }
  assert.doesNotMatch(localization.t('saveFailed','en'),/save again/i);
  assert.match(localization.t('notificationSummaryHelp','en'),/sender.*not the message body/);
  assert.equal(localization.t('helpConnection','en'),'Connection & help');
});

test('app-only privacy, quiet alerts and colour sharing are explicit in every locale',()=>{
  const keys=['notificationAppOnly','notificationAppOnlyHelp','notificationVibration',
    'vibrationOff','vibrationShort','vibrationDouble','vibrationHelp','nightPalette',
    'nightPaletteHelp','nightBackground','nightText','nightAccent','paletteCode',
    'paletteCodeHelp','paletteCopy','paletteApply','paletteCopied','paletteSelectCopy',
    'paletteInvalid','paletteApplied','paletteInput'];
  for(const language of languages){
    const strings=localization.settingsStrings(language);
    for(const key of keys){
      assert.equal(typeof strings[key],'string',language+': '+key);
      assert.ok(strings[key].trim(),language+': '+key);
      assert.notEqual(strings[key],key,language+': '+key);
      if(language!=='en')assert.notEqual(strings[key],localization.t(key,'en'),language+': '+key);
      assert.equal(localization.t(localization.t(key,'en'),language),strings[key],language+': literal '+key);
    }
    assert.equal(strings.vibrationOff,strings.stateOff,language+': consistent off state');
    assert.match(strings.vibrationHelp,/Quiet Time/,language+': watch quiet mode');
    assert.match(strings.vibrationHelp,/Pebble/,language+': possible native vibration');
    assert.match(strings.nightPaletteHelp,/Pebble.*Quiet Time|Quiet Time.*Pebble/,language+': watch palette trigger');
    assert.match(strings.paletteInvalid,/HAL1-FFFFFF-000000-55AAFF/,language+': valid code example');
    assert.notEqual(strings.notificationAppOnly,strings.notificationSummary,language+': privacy modes');
    assert.notEqual(strings.paletteCopy,strings.paletteApply,language+': separate copy and import actions');
    assert.notEqual(strings.nightBackground,strings.background,language+': separate night and day colours');
  }
  assert.match(localization.t('notificationAppOnlyHelp','en'),/without sender or message text/);
  assert.match(localization.t('vibrationHelp','en'),/One additional vibration per new notification burst/);
  assert.match(localization.t('paletteCodeHelp','en'),/only background, text and accent colours/);
  assert.match(localization.t('paletteApplied','en'),/Save to send/);
});


test('notification activity copy shares roles and preserves system notification ownership',()=>{
  const keys=['watchfaceBanners','notificationsHelp','notificationVibration','vibrationHelp',
    'previewPalette','previewDay','previewQuietTime','previewPaletteHelp'];
  for(const language of languages){
    const strings=localization.settingsStrings(language);
    for(const key of keys){
      assert.equal(typeof strings[key],'string',language+': '+key);
      assert.ok(strings[key].trim(),language+': '+key);
      assert.notEqual(strings[key],key,language+': '+key);
      if(language!=='en'&&key!=='previewQuietTime')assert.notEqual(strings[key],localization.t(key,'en'),language+': '+key);
      assert.equal(localization.t(localization.t(key,'en'),language),strings[key],language+': literal '+key);
    }
    assert.equal(strings.notificationsSource,strings.notifications,language+': notification source label preserved');
    assert.notEqual(strings.watchfaceBanners,strings.notificationsSource,language+': source and presentation stay distinct');
    assert.match(strings.notificationsHelp,/Pebble/,language+': independent system alerts');
    assert.match(strings.vibrationHelp,/Pebble/,language+': additional vibration owner');
    assert.match(strings.vibrationHelp,/Quiet Time/,language+': quiet mode respected');
    assert.equal(strings.previewQuietTime,'Quiet Time',language+': Pebble feature name');
    assert.match(strings.previewPaletteHelp,/Pebble.*Quiet Time|Quiet Time.*Pebble/,language+': preview does not change OS mode');
    assert.notEqual(strings.previewDay,strings.previewQuietTime,language+': preview palette choices');
    assert.equal(localization.t('Notification vibration',language),strings.notificationVibration,language+': old configuration label');
    assert.equal(localization.t('Allow notification access in Pebble. Only new notifications appear.',language),strings.notificationsHelp,language+': old configuration help');
  }
  assert.equal(localization.t('watchfaceBanners','en'),'Notification activity');
  assert.equal(localization.t('previewBanner','en'),'Title only');
  assert.equal(localization.t('notificationVibration','en'),'Additional vibration');
  assert.match(localization.t('notificationsHelp','en'),/same activity priority and primary\/secondary layouts/);
  assert.match(localization.t('notificationsHelp','en'),/system notifications remain separate/);
  assert.doesNotMatch(visible(config).join('\n'),/banner/i);
  assert.match(localization.t('vibrationHelp','en'),/Turn this off if Pebble already vibrates/);
  assert.match(localization.t('previewPaletteHelp','en'),/^Preview only/);
  assert.doesNotMatch(localization.t('notificationsHelp','en'),/replaces|disables|turns off/i);
});

test('settings cleanup removes obsolete copy and translates the shared priority and privacy controls',()=>{
  const active=visible(config).join('\n');
  assert.doesNotMatch(active,/Clock mark|last-reported|Music & notifications|Both shrink above music/);
  assert.deepEqual(config.filter(item=>item.type==='section').map(item=>item.items[0].defaultValue),
    ['Appearance','Content & priority','Connection & help']);
  for(const language of languages) {
    const strings=localization.settingsStrings(language);
    for(const key of ['content','previewBanner','animationsHelp','activitiesHelp','notificationDetails','notificationDisabledHelp','activityPluginsOffHelp']) {
      assert.ok(strings[key].trim(),language+': '+key);
      if(language!=='en')assert.notEqual(strings[key],localization.t(key,'en'),language+': '+key);
      assert.equal(localization.t(localization.t(key,'en'),language),strings[key]);
    }
    assert.equal(strings.activityStateHelp,undefined);
    const translated=items(localization.translateConfig(config,language));
    assert.equal(translated.find(item=>item.id==='halftone-notification-mode').defaultValue,strings.notificationDetails);
    assert.equal(translated.find(item=>item.id==='halftone-notification-disabled').defaultValue,strings.notificationDisabledHelp);
  }
  assert.match(localization.t('activitiesHelp','en'),/Music and Notifications have their own switches/);
});

test('native optical sample limits are explicit in every locale',()=>{for(const language of languages)assert.ok(localization.settingsStrings(language).previewOpticalStyle.length>20);});
