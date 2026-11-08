'use strict';

// Node-only capture fixture producer. Use the installed production encoders;
// this module is never imported by the phone or watch application.
const core=require('pebble-watchface-core').wire;
const library=require('pebble-activities');
const activity=library.summaryView;
const simple=library.activity;
const presentation=require('../src/pkjs/activity-presentation');
if(!activity||!simple)throw Error('Native fixtures require the pinned Activities 0.3.0 package');
const states=['idle','music','timer','notification-summary','notification','timeline'];
function cover() {
  const palette=[0xc0,0xff,0xc3,0xcf,0xfc,0xf3,0xf0,0xcc],pixels=[];
  function color(x,y) {
    const stripe=Math.floor(x/10);
    if(x>=13&&x<28&&y>=9&&y<32)return (x-20)*(x-20)+(y-20)*(y-20)<95?4:stripe+2;
    return stripe+2;
  }
  for(let y=0;y<40;y++)for(let x=0;x<40;x+=2)pixels.push((color(x,y)<<4)|color(x+1,y));
  return {width:40,height:40,palette,pixels,image:true};
}
// Exercise the actual production Music adapter, including its optional-field
// rules. Handwritten clean cards would miss real Track/Artist regressions.
function musicFromSource(now,session,title,artist,artwork) {
  let request;
  const provider='7f635d12-7288-4d10-885d-41ea49f4d5a4';
  const client=library.createContext({musicAsActivity:true,
    pebble:{subscribeToSource:value=>{if(value.category==='music')request=value;return {unsubscribe(){}};}},
    keys:{CONTEXT_DATA:'CONTEXT_DATA',REQUEST_CONTEXT:'REQUEST_CONTEXT'},now:()=>now*1000,
    later:()=>1,cancelLater(){},send:(_payload,ok)=>ok(),
    getSettings:()=>({showMusic:true,showStatus:false,showNotifications:false})});
  client.refresh(true,session);
  const properties={title:{shortText:{text:title}},artist:{shortText:{text:artist}},playing:{boolean:{value:true}}};
  if(artwork)properties.artwork={image:{width:artwork.width,height:artwork.height,
    palette:Buffer.from(artwork.palette).toString('base64'),pixels:Buffer.from(artwork.pixels).toString('base64')}};
  request.onData({pluginUuid:provider,validUntilMs:(now+120)*1000,instances:[{instanceId:'track',properties}]});
  const card=client.musicActivity();client.stop();
  if(!card)throw Error('Production Music adapter rejected native fixture');
  return card;
}
function notificationFromSource(now,session,options={}) {
  let request,sidecar;
  const client=library.createContext({notificationAsActivity:true,musicAsActivity:true,
    pebble:{subscribeToSource:value=>{if(value.category==='notifications')request=value;return {unsubscribe(){}};}},
    keys:{CONTEXT_DATA:'CONTEXT_DATA',CONTEXT_STATE:'CONTEXT_STATE',REQUEST_CONTEXT:'REQUEST_CONTEXT'},
    now:()=>now*1000,later:()=>1,cancelLater(){},
    send:(payload,ok)=>{sidecar=payload.CONTEXT_STATE;ok();},
    getSettings:()=>({showNotifications:true,showMusic:false,showStatus:false,
      notificationPreview:options.body!==false,notificationAppOnly:options.appOnly===true})});
  client.refresh(true,session);
  const envelope={pluginUuid:'9ac26690-204f-46b2-aef2-54d61f57c2d7',
    validUntilMs:(now+(options.life||120))*1000};
  request.onData({...envelope,instances:[]});
  const properties={name:{shortText:{text:options.title||'Xef'}},
    body:{longText:{text:options.text||'See you at the station!'}},
    app:{shortText:{text:'Signal'}}};
  if(options.icon!==false){
    const pixels=[];
    for(let y=0;y<24;y++)for(let x=0;x<24;x+=2){
      const dot=xx=>xx>=4&&xx<20&&y>=4&&y<19?2:1;
      pixels.push(dot(x)<<4|dot(x+1));
    }
    properties.app_icon={image:{width:24,height:24,palette:Buffer.from([0,0xc3,0xff]).toString('base64'),pixels:Buffer.from(pixels).toString('base64')}};
  }
  request.onData({...envelope,instances:[{instanceId:'fixture-notification',properties}]});
  const card=client.notificationActivity();client.stop();
  if(!card)throw Error('Production notification adapter rejected native fixture');
  return {card:presentation.project(card),sidecar};
}
function fixtures(options) {
  const now=options.now,session=options.session;
  if(!Number.isInteger(now)||now<1||!Number.isInteger(session)||session<2)throw Error('Expected UTC seconds and native session >=2');
  const ready=(text,seconds=120)=>({status:2,text,confirmedAt:now,validUntil:now+seconds});
  const temperature=Object.assign(ready('5°C',7200),{semantic:{kind:core.SEMANTIC_KIND.TEMPERATURE,
    source:core.SOURCE_KIND.WEATHER,value:5,unit:'°C',label:'TEMP',detail:core.DETAIL_KIND.TEMPERATURE,observedAt:now}});
  const rain=Object.assign(ready('40%',7200),{displayKind:1,semantic:{kind:core.SEMANTIC_KIND.PRECIPITATION,
    source:core.SOURCE_KIND.WEATHER,value:40,min:0,max:100,unit:'%',label:'RAIN',detail:core.DETAIL_KIND.PRECIPITATION,observedAt:now}});
  const presets=[];
  let sequence=options.sequence||0;
  for(const theme of ['light','dark'])for(const format of [24,12])for(const state of states) {
    const slots=[];
    let music=null,notice=null;
    if(state==='music'||state==='timer'||state==='notification-summary') {
      if(options.legacyMusic) {
        slots[0]=Object.assign(ready('Flower In A Hurricane [from the soundtrack]'),{bitmap:cover()});
        slots[1]=ready('Justice, Tame Impala');
      } else {
        music=presentation.project(musicFromSource(now,session,
          'Flower In A Hurricane [from the soundtrack]','Justice, Tame Impala',cover()));
      }
    }
    if(state==='notification'||state==='notification-summary')notice=notificationFromSource(now,session,{body:state==='notification'});
    if(music)music.revision=sequence+1;
    if(notice){notice.card.revision=sequence+1;notice.card.id+='-'+state;}
    const timer=state==='timer'?presentation.project(library.summary.toView({
      provider:'50e9ef12-a5ab-4369-a3b5-3447bfba5151',displayName:'Timer',revision:sequence+1,
      observedAt:now,validUntil:now+660,record:{id:'preview-tea',type:'standard',name:'Tea',icon:'timer',
        headline:{type:'clock',mode:'countdown',deadline:now+151}}})):null;
    const cards=notice?[notice.card].concat(music?[music]:[]):timer?[timer,music]:music?[music]:[];
    const dark=theme==='dark';
    presets.push({name:`${state}-${format}-${theme}`,state,format,theme,fixtureNow:now,
      preserve:['music','notification','notification-summary'].includes(state)?
        [{x:24,y:180,width:28,height:28}]:
        state==='timeline'?[{x:0,y:171,width:200,height:57}]:[],
      integers:{BACKGROUND_COLOR:dark?0:0xffffff,TEXT_COLOR:dark?0xffffff:0,
        ACCENT_COLOR:0x55aaff,ANIMATIONS:0,CLOCK_FORMAT:format,SHOW_STATUS:1,
        NOTIFICATION_VIBRATION:0,NIGHT_PALETTE:0,REQUEST_CONTEXT:session},
      bytes:{COMPLICATION_DATA:core.packComplications([temperature,rain],now),
        CONTEXT_DATA:core.packComplications(slots,now),
        CONTEXT_STATE:notice?notice.sidecar:[session&255,(session>>>8)&255,(session>>>16)&255,(session>>>24)&255,0,0,0,0,0,0,0,0,0],
        ACTIVITY_DATA:activity.encode(cards,{session,revision:++sequence,sentAt:now})}});
  }
  return {coreVersion:require('pebble-watchface-core/package.json').version,
    activitiesVersion:require('pebble-activities/package.json').version,
    activityWireVersion:activity.VERSION,session,now,presets};
}
function summaryPresets(options){
  const now=options.now,session=options.session;
  const base=fixtures(options),summary=library.summary;
  const T='50e9ef12-a5ab-4369-a3b5-3447bfba5151',P='46f0a5c9-48ce-4ecb-87b7-c1510088a3d2';
  const timer=(seconds=151,name='Tea',id='tea')=>({id,type:'standard',name,icon:'timer',headline:{type:'clock',mode:'countdown',deadline:now+seconds},openApp:{watchAppUuid:T}});
  const music={id:'music-session',type:'media',title:'Better Than The Cyberpunk Soundtrack',artist:'The Midnight',artwork:cover(),itemId:'track-1',playback:'playing',openApp:{watchAppUuid:'1f03293d-47af-4f28-b960-f2b02a6dd757'}};
  const recording={id:'recording',type:'standard',name:'Voice recording',icon:'recording',headline:{type:'clock',mode:'elapsed',since:now-728}};
  const delivery={id:'delivery',type:'standard',name:'Food delivery',icon:'delivery',headline:{type:'value',value:8,unit:'min',label:'Arriving in'}};
  const specs=[
    {name:'timer-media',records:[timer(),music],verifyClockTick:true},
    {name:'media-timer',records:[music,timer()],verifyClockTick:true},
    {name:'workout-timer',records:[{id:'run',type:'standard',name:'Outdoor run',icon:'workout',headline:{type:'value',value:5.24,unit:'km'},detail:{type:'value',value:'5:12',unit:'/km'}},timer(45,'Rest','rest')],verifyClockTick:true},
    {name:'navigation-media',records:[{id:'route',type:'standard',name:'Maps · Home',icon:'navigation',headline:{type:'value',value:200,unit:'m',symbol:'turn-right'},detail:{type:'text',text:'Oak Street'}},music]},
    {name:'recording-delivery',records:[recording,delivery],verifyClockTick:true},
    {name:'download-recording',records:[{id:'download',type:'standard',name:'Offline map',icon:'download',headline:{type:'value',value:68,unit:'%',range:{max:100}}},recording],verifyClockTick:true},
    {name:'message-timer',records:[{id:'message',type:'standard',name:'Messages',icon:'message',headline:{type:'text',text:'Petr'},detail:{type:'text',text:'I’m downstairs. Ready when you are?'}},timer()],verifyClockTick:true},
    {name:'media-alone',records:[music]},
    {name:'timer-alone',records:[timer(204)],verifyClockTick:true},
    {name:'paused-timer-media',records:[{...timer(),state:'paused',headline:{type:'clock',mode:'countdown',seconds:151}},music]},
    {name:'media-paused-timer',records:[music,{...timer(),state:'paused',headline:{type:'clock',mode:'countdown',seconds:151}}]},
    {name:'paused-long-clock',records:[music,{...timer(),state:'paused',headline:{type:'clock',mode:'elapsed',seconds:4294967295}}]},
    {name:'paused-long-label',records:[music,{...timer(),state:'paused',headline:{type:'clock',mode:'countdown',seconds:151,label:'A very long optional timer label'}}]},
    {name:'paused-long-primary',records:[{...timer(),state:'paused',headline:{type:'clock',mode:'countdown',seconds:151,label:'A very long optional timer label'}},music]},
    {name:'long-timer',records:[timer(45296,'Slow cook'),music],verifyClockTick:true},
    {name:'long-artist',records:[{...music,title:'Flower In A Hurricane [from the soundtrack]',artist:'Justice, Tame Impala'},timer(85,'Pasta')],verifyClockTick:true},
    {name:'delivery-text',records:[delivery,{id:'garage',type:'standard',name:'Garage',headline:{type:'text',text:'Door open'}}]},
    {name:'local-promotion',records:[timer(2),music],captureDelaySeconds:3,expireFirst:true},
    {name:'compact-detail-clock',records:[music,{id:'match',type:'standard',name:'Match',icon:'workout',headline:{type:'value',value:'2–1'},detail:{type:'clock',mode:'elapsed',since:now-2800},summary:'detail'}],verifyClockTick:true},
    {name:'primary-detail-clock',records:[{id:'match',type:'standard',name:'Match',icon:'workout',headline:{type:'value',value:'2–1'},detail:{type:'clock',mode:'elapsed',since:now-2800}},music],verifyClockTick:true},
    {name:'required-detail-long-label',records:[{...timer(),state:'paused',headline:{type:'clock',mode:'countdown',seconds:151},detail:{type:'value',value:'5:12',unit:'/km',label:'A very long optional timer label'}},music]},
    {name:'media-paused-artist',records:[{...music,playback:'paused',artist:'A very long optional artist identity'}]},
    {name:'paused-primary-wide-detail',records:[{...timer(),state:'paused',headline:{type:'clock',mode:'countdown',seconds:151},detail:{type:'value',value:'1111111111111',unit:'km'}},music]},
    {name:'secondary-long-clock',records:[music,{id:'long',type:'standard',name:'Session',headline:{type:'clock',mode:'elapsed',seconds:4294967295}}]},
    {name:'secondary-unfit-value',records:[music,{id:'unfit',type:'standard',name:'Counter',headline:{type:'value',value:'9'.repeat(64),unit:'km'}}]},
    {name:'direction-long-value',records:[{id:'long-route',type:'standard',name:'Maps',icon:'navigation',headline:{type:'value',value:'1234567890123',unit:'mi',symbol:'turn-left'}}]},
    {name:'direction-formatted-value',records:[{id:'fraction-route',type:'standard',name:'Maps',icon:'navigation',headline:{type:'value',value:'¼',unit:'mi',symbol:'turn-right'}}]}
  ];
  specs.push({name:'paused-value-state-unfit',records:[music,{id:'counter',type:'standard',name:'Counter',icon:'workout',state:'paused',headline:{type:'value',value:'123456789012345678'}}]});
  let sequence=options.sequence||100;
  const presets=[];
  for(const theme of ['light','dark'])for(const spec of specs){
    const template=base.presets.find(p=>p.name==='idle-24-'+theme);
    const cards=spec.records.map((record,index)=>{
      const source={provider:record.icon==='timer'?T:P,record,revision:sequence+1,observedAt:now,
        validUntil:spec.expireFirst&&index===0?now+2:now+Math.max(3600,record.headline&&record.headline.deadline-now+60||0),
        private:record.type==='media',displayName:record.type==='media'?'Music':'Activity'};
      const result=summary.toView(source);
      if(!result)throw Error('Invalid summary fixture '+spec.name+' '+index);
      return presentation.project(result);
    });
    const seq=++sequence;
    presets.push({...template,name:spec.name+'-'+theme,state:spec.name,theme,
      activity:cards[0],activities:cards,verifyClockTick:spec.verifyClockTick===true,
      captureDelaySeconds:spec.captureDelaySeconds||0,viewSequence:seq,preserve:[],
      bytes:{...template.bytes,ACTIVITY_DATA:activity.encode(cards,{session,revision:seq,sentAt:now})}});
  }
  const notifications=[
    {name:'notification-media',options:{},before:true,other:'music'},
    {name:'timer-notification',options:{},before:false,other:'timer',verifyClockTick:true},
    {name:'notification-summary-media',options:{body:false},before:true,other:'music'},
    {name:'notification-app-only',options:{appOnly:true}},
    {name:'notification-no-icon',options:{icon:false}},
    {name:'notification-long-message',options:{title:'Family weekend plans and train tickets',text:'We have arrived downstairs. Bring your jacket and the tickets; the next train leaves in ten minutes.'}},
    {name:'notification-promotes-timer',options:{life:2},before:true,other:'timer',captureDelaySeconds:3,verifyClockTick:true},
    {name:'media-notification',options:{body:false},before:false,other:'music'}
  ];
  for(const theme of ['light','dark'])for(const spec of notifications){
    const template=base.presets.find(p=>p.name==='idle-24-'+theme);
    const notice=notificationFromSource(now,session,spec.options);
    notice.card.revision=sequence+1;
    notice.card.id+='-'+spec.name;
    const other=spec.other==='music'?presentation.project(summary.toView({provider:P,record:music,revision:sequence+1,
      observedAt:now,validUntil:now+3600,private:true,displayName:'Music'})):
      spec.other==='timer'?presentation.project(summary.toView({provider:T,record:timer(151),revision:sequence+1,
        observedAt:now,validUntil:now+3600,private:false,displayName:'Timer'})):null;
    const cards=other?(spec.before?[notice.card,other]:[other,notice.card]):[notice.card];
    const seq=++sequence;
    presets.push({...template,name:spec.name+'-'+theme,state:spec.name,theme,
      activity:cards[0],activities:cards,viewSequence:seq,preserve:[],verifyClockTick:spec.verifyClockTick===true,
      captureDelaySeconds:spec.captureDelaySeconds||0,
      bytes:{...template.bytes,CONTEXT_STATE:notice.sidecar,
        ACTIVITY_DATA:activity.encode(cards,{session,revision:seq,sentAt:now})}});
  }
  return {coreVersion:base.coreVersion,activitiesVersion:base.activitiesVersion,activityWireVersion:3,session,now,presets};
}
function activityPresets(options){return summaryPresets(options);}
function complicationReading(options) {
  const make=require('pebble-watchface-core/readings').createComplications;
  const labelForReading=require('../src/pkjs/reading-label');
  const localization=require('../src/pkjs/localization');
  let clock=options.now,bytes=null;
  const requests=[];
  const host=make({pebble:{subscribeToSource:request=>{requests.push(request);return {unsubscribe(){}};}},
    keys:{COMPLICATION_DATA:'COMPLICATION_DATA',REQUEST_COMPLICATIONS:'REQUEST_COMPLICATIONS'},
    now:()=>clock*1000,later:()=>1,cancelLater(){},labelForReading,
    getSettings:()=>({clockFormat:24,language:options.language||'en'}),
    localizeBoolean:value=>localization.t(value?'stateOn':'stateOff',options.language||'en'),
    send:(payload,ok)=>{if(payload.COMPLICATION_DATA)bytes=payload.COMPLICATION_DATA;if(ok)ok();}});
  host.refresh(true,options.session);
  const short=value=>({shortText:{text:value}});
  const preferences=requests.find(request=>request.category==='preferences');
  preferences.onData({validUntilMs:(clock+7200)*1000,instances:options.slots.map((slot,index)=>slot?({instanceId:String(index),properties:{
    category:short(slot.category),item:short(slot.item),property:short(slot.property),index:{numericValue:{value:slot.index}},
    ...(slot.label?{label:short(slot.label)}:{})}}):null).filter(Boolean)});
  for(const request of requests.filter(request=>request.category!=='preferences')) {
    if(options.state==='loading')continue;
    if(options.state==='unavailable'){request.onError({code:'SOURCE_UNAVAILABLE'});continue;}
    const instances=options.sources[request.category+'/'+request.item];
    if(!instances)throw Error('Missing production reading fixture '+request.category+'/'+request.item);
    request.onData({pluginUuid:'46f0a5c9-48ce-4ecb-87b7-c1510088a3d2',
      validUntilMs:(clock+(options.state==='expired'?1:7200))*1000,instances});
  }
  if(options.state==='expired'){clock+=2;host.configure();}
  if(!bytes)throw Error('Production complication host did not publish');
  return {bytes,now:clock,status:host.status()};
}
function complicationPresets(options) {
  const now=options.now,session=options.session;
  if(!Number.isInteger(now)||now<1||!Number.isInteger(session)||session<2)throw Error('Expected UTC seconds and native session >=2');
  const short=text=>({shortText:{text}}),numeric=(value,unit)=>({numericValue:{value,unit}});
  const weather=(property,index=0,label)=>({category:'weather',item:'location',property,index,...(label?{label}:{})});
  const named=(instanceId,name,properties)=>({instanceId,name,properties:{name:short(name),...properties}});
  const temperature=(value=5)=>({...short(value+'°C'),...numeric(value,'°C')});
  const rain=value=>({...short(value+'%'),numericValue:{value,unit:'%',min:0,max:100}});
  const prague=properties=>named('prague','Praha',properties),brno=properties=>named('brno','Brno',properties);
  const observed={observed_at:{timestamp:{value:now-90}}};
  const ordinary={slots:[weather('temperature'),weather('precipitation')],sources:{'weather/location':[prague({temperature:temperature(),precipitation:rain(40),...observed})]}};
  const image={width:8,height:4,palette:Buffer.from([0xc0,0xff]).toString('base64'),pixels:Buffer.from(Array.from({length:16},(_,i)=>i%2?0x01:0x10)).toString('base64')};
  const specs=[
    {name:'temperature-rain',...ordinary},
    {name:'custom-accent',...ordinary,accent:0xff5500},
    {name:'rain-100',slots:ordinary.slots,sources:{'weather/location':[prague({temperature:temperature(),precipitation:rain(100),...observed})]}},
    {name:'aged-weather',slots:ordinary.slots,sources:{'weather/location':[prague({temperature:temperature(),precipitation:rain(40),observed_at:{timestamp:{value:now-4000}}})]}},
    {name:'long-temperature-value',slots:ordinary.slots,sources:{'weather/location':[prague({temperature:temperature(123.4),precipitation:rain(40),...observed})]}},
    {name:'temperature-too-long',slots:ordinary.slots,sources:{'weather/location':[prague({temperature:temperature(1234567890),precipitation:rain(40),...observed})]}},
    {name:'first-slot-only',slots:[weather('temperature')],sources:ordinary.sources},
    {name:'second-slot-only',slots:[null,weather('temperature')],sources:ordinary.sources},
    {name:'negative-feels',slots:[weather('feels_like'),weather('precipitation')],sources:{'weather/location':[prague({feels_like:temperature(-12.4),precipitation:rain(40)})]}},
    {name:'forecast-high-low',slots:[weather('high'),weather('low')],sources:{'weather/location':[prague({high:temperature(13),low:temperature(-2),is_forecast:{boolean:{value:true}}})]}},
    {name:'humidity-phone',slots:[weather('humidity'),{category:'phone',item:'phone_state',property:'battery_level',index:0}],sources:{'weather/location':[prague({humidity:{...short('74%'),...numeric(74,'%')},humidity_observed_at:{timestamp:{value:now-120}}})],'phone/phone_state':[named('phone','Phone',{battery_level:{...short('87%'),...numeric(87,'%')}})]}},
    {name:'wind-long-unit',slots:[weather('wind_speed'),weather('wind_direction')],sources:{'weather/location':[prague({wind_speed:{...short('23 kilometres/hour'),...numeric(23,'kilometres/hour')},wind_direction:{...short('270° W'),...numeric(270,'°')},wind_observed_at:{timestamp:{value:now-45}}})]}},
    {name:'timestamp-boolean',slots:[{category:'calendar',item:'event',property:'start',index:0},{category:'home',item:'light',property:'on',index:0}],sources:{'calendar/event':[named('event','Team review',{start:{timestamp:{value:now+3600}}})],'home/light':[named('kitchen','Kitchen',{on:{boolean:{value:true}}})]}},
    {name:'accented-text-units',language:'cs',slots:[weather('temperature',0,'ČHMÚ'),weather('feels_like',0,'Žluťoučký')],sources:{'weather/location':[prague({temperature:temperature(5),feels_like:temperature(-7)})]}},
    {name:'generic-text-image',slots:[{category:'device',item:'router',property:'status',index:0},{category:'camera',item:'view',property:'image',index:0}],sources:{'device/router':[named('office','Office',{status:short('Connected')})],'camera/view':[named('front-door','Front door',{image:{image}})]}},
    {name:'finance-public-tickers',slots:[{category:'finance',item:'stock',property:'price',index:0},{category:'finance',item:'stock',property:'price',index:1}],sources:{'finance/stock':[named('AAPL','Apple Inc.',{price:{...short('$225.50'),...numeric(225.5,'USD')}}),named('BRK.B','Berkshire Hathaway',{price:{...short('$478.21'),...numeric(478.21,'USD')}})]}},
    {name:'two-weather-locations',slots:[weather('temperature',0),weather('temperature',1)],sources:{'weather/location':[prague({temperature:temperature(),...observed}),brno({temperature:temperature(-2),...observed})]}},
    {name:'two-weather-locations-expired',state:'expired',slots:[weather('temperature',0),weather('temperature',1)],sources:{'weather/location':[prague({temperature:temperature(),...observed}),brno({temperature:temperature(-2),...observed})]}},
    {name:'two-locations-qualifiers',slots:[weather('feels_like',0),weather('high',1)],sources:{'weather/location':[prague({feels_like:temperature(-12)}),brno({high:temperature(14),is_forecast:{boolean:{value:true}}})]}},
    {name:'czech-custom-labels',language:'cs',slots:[weather('feels_like',0,'Doma'),{category:'home',item:'light',property:'on',index:0,label:'Obývák'}],sources:{'weather/location':[prague({feels_like:temperature(-7)})],'home/light':[named('living','Obývák',{on:{boolean:{value:true}}})]}},
    {name:'loading',state:'loading',...ordinary},
    {name:'unavailable',state:'unavailable',...ordinary},
    {name:'expired',state:'expired',...ordinary}
  ];
  let sequence=options.sequence||500;
  const presets=[];
  for(const theme of ['light','dark'])for(const spec of specs)for(const pose of ['idle','active','timeline']) {
    if(options.names&&!options.names.includes(spec.name))continue;
    const result=complicationReading({...spec,now,session,language:spec.language||options.language||'en'});
    const dark=theme==='dark';
    const revision=++sequence;
    const cards=pose==='active'?[presentation.project(library.summary.toView({
      provider:'50e9ef12-a5ab-4369-a3b5-3447bfba5151',displayName:'Timer',revision,
      observedAt:result.now,validUntil:result.now+7200,record:{id:'complication-tea',type:'standard',
        name:'Tea',icon:'timer',headline:{type:'clock',mode:'countdown',deadline:result.now+151}}}))]:[];
    presets.push({name:spec.name+'-'+(pose==='timeline'?'peek-':pose==='active'?'active-':'')+theme,state:pose,scenario:spec.name,
      theme,format:24,fixtureNow:result.now,language:spec.language||options.language||'en',
      nativeLocaleFollowsEmulator:true,readingStatus:result.status.slots,selectedReadings:spec.slots,
      integers:{BACKGROUND_COLOR:dark?0:0xffffff,TEXT_COLOR:dark?0xffffff:0,ACCENT_COLOR:spec.accent||0x55aaff,
        ANIMATIONS:0,CLOCK_FORMAT:24,SHOW_STATUS:1,NOTIFICATION_VIBRATION:0,NIGHT_PALETTE:0,REQUEST_CONTEXT:session},
      bytes:{COMPLICATION_DATA:result.bytes,CONTEXT_DATA:core.packComplications([],result.now),
        CONTEXT_STATE:[session&255,(session>>>8)&255,(session>>>16)&255,(session>>>24)&255,0,0,0,0,0,0,0,0,0],
        ACTIVITY_DATA:activity.encode(cards,{session,revision,sentAt:result.now})}});
  }
  return {coreVersion:require('pebble-watchface-core/package.json').version,
    activitiesVersion:require('pebble-activities/package.json').version,activityWireVersion:3,
    coreWireVersion:4,session,now,presets,productionReadingHost:true,halftoneLabelAdapter:true};
}
module.exports={fixtures,activityPresets,summaryPresets,musicFromSource,notificationFromSource,complicationReading,complicationPresets};
if(require.main===module) {
  let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',value=>input+=value);
  process.stdin.on('end',()=>{
    const options=JSON.parse(input);
    process.stdout.write(JSON.stringify(options.mode==='complications'?complicationPresets(options):options.mode==='activities'||options.mode==='summary'?summaryPresets(options):fixtures(options)));
  });
}
