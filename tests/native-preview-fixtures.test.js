'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const library=require('pebble-activities');
const fixtures=require('../scripts/native-preview-fixtures');
const readingWire=require('pebble-watchface-core').wire;
const N=1793700000,S=7;
function records(value){
  const bytes=Buffer.from(value);assert.equal(bytes.toString('ascii',0,4),'ACT3');assert.equal(bytes[4],3);
  assert.equal(bytes.length,bytes.readUInt16LE(6));assert.ok(bytes.length<=2672);
  assert.equal(library.wire.crc16(Array.from(bytes)),bytes.readUInt16LE(8));
  let at=24,result=[];
  for(let i=0;i<bytes[5];i++){
    const length=bytes.readUInt16LE(at),idLength=bytes[at+16],pool=at+104+36+idLength;
    const text=(offset,len)=>bytes.toString('utf8',pool+offset,pool+offset+len);
    assert.ok(length>=104&&at+length<=bytes.length);assert.ok(bytes.readUInt16LE(at+22)<=304);
    result.push({presentation:bytes[at+88],identity:bytes[at+89],compact:bytes[at+90],directions:bytes[at+91],
      mainType:bytes[at+32],supportType:bytes[at+60],state:bytes[at+2],validUntil:bytes.readUInt32LE(at+12),
      main:text(bytes.readUInt16LE(at+52),bytes.readUInt16LE(at+54)),
      support:text(bytes.readUInt16LE(at+80),bytes.readUInt16LE(at+82)),
      caption:text(bytes.readUInt16LE(at+24),bytes.readUInt16LE(at+26))});
    at+=length;
  }
  assert.equal(at,bytes.length);return result;
}
test('twenty-four native settings states use production ACT3 encoders and retain header controls',()=>{
  const plan=fixtures.fixtures({now:N,session:S});assert.equal(plan.presets.length,24);assert.equal(plan.activityWireVersion,3);
  for(const preset of plan.presets){assert.equal(preset.integers.ANIMATIONS,0);assert.equal(preset.integers.REQUEST_CONTEXT,S);const cards=records(preset.bytes.ACTIVITY_DATA);
    if(preset.state==='music'){assert.equal(cards[0].presentation,2);assert.equal(cards[0].support,'Justice, Tame Impala');}
    if(preset.state==='timer'){assert.equal(cards[0].presentation,3);assert.equal(cards[0].caption,'Tea');assert.equal(cards[1].presentation,2);}
    if(preset.state==='notification-summary'){assert.equal(cards[0].presentation,1);assert.equal(cards[0].main,'Xef');assert.equal(cards[0].supportType,0);assert.equal(cards[1].presentation,2);}
    if(preset.state==='notification'){assert.equal(cards[0].presentation,1);assert.equal(cards[0].support,'See you at the station!');}
  }
});
test('approved normal and compact activity combinations have light and dark native fixtures',()=>{
  const plan=fixtures.summaryPresets({now:N,session:S});assert.equal(plan.presets.length,68);
  const names=['timer-media','media-timer','workout-timer','navigation-media','recording-delivery','download-recording','message-timer','media-alone','timer-alone','long-timer','long-artist','delivery-text'];
  for(const name of names)for(const theme of ['light','dark'])assert.ok(plan.presets.some(x=>x.name===name+'-'+theme));
  for(const preset of plan.presets){assert.equal(records(preset.bytes.ACTIVITY_DATA).length,preset.activities.length);assert.ok(preset.activities.length<=2);}
  const find=name=>records(plan.presets.find(x=>x.name===name+'-light').bytes.ACTIVITY_DATA);
  assert.deepEqual(find('timer-media').map(x=>x.presentation),[3,2]);assert.deepEqual(find('media-timer').map(x=>x.presentation),[2,3]);
  assert.equal(find('navigation-media')[0].directions&7,2);assert.equal(find('download-recording')[0].presentation,5);
  assert.equal(find('compact-detail-clock')[1].compact,1);assert.equal(find('compact-detail-clock')[1].supportType,3);
  assert.equal(find('primary-detail-clock')[0].supportType,3);
  assert.equal(find('paused-primary-wide-detail')[0].support,'1111111111111 km');
  assert.equal(find('paused-timer-media')[0].state,2);assert.equal(find('media-paused-timer')[1].state,2);
  assert.equal(find('local-promotion')[0].validUntil,N+2);assert.equal(find('secondary-unfit-value')[1].mainType,2);assert.equal(find('media-alone')[0].caption,'The Midnight');
  assert.deepEqual(find('notification-media').map(x=>x.presentation),[1,2]);
  assert.deepEqual(find('timer-notification').map(x=>x.presentation),[3,1]);
  assert.equal(find('notification-app-only')[0].main,'Signal');assert.equal(find('notification-app-only')[0].caption,'Notifications');
  assert.equal(find('notification-promotes-timer')[0].validUntil,N+2);
  for(const options of [{body:false},{body:true},{appOnly:true}]) {
    const value=fixtures.notificationFromSource(N,S,options);
    assert.equal(value.card.validUntil,N+8);assert.equal(value.card.openApp.watchAppUuid,'b2cae818-10f8-46df-ad2b-98ad2254a3c1');
    assert.equal(value.sidecar.length,13);assert.equal(Buffer.from(value.sidecar).readUInt32LE(9),N+8);
  }
});

function readings(value) {
  const bytes=Buffer.from(value),checked=Array.from(bytes);
  assert.equal(bytes[0],4);assert.equal(bytes.length,bytes.readUInt16LE(2));
  checked[4]=checked[5]=0;assert.equal(readingWire.crc16Xmodem(checked),bytes.readUInt16LE(4));
  let at=6;const result=[];
  for(let i=0;i<5;i++) {
    const flags=bytes[at],textLength=bytes[at+2],unitLength=bytes[at+22],labelLength=bytes[at+23];
    const pool=at+56;
    result.push({status:bytes[at+1],flags,width:bytes[at+3],height:bytes[at+4],displayKind:bytes[at+5],kind:bytes[at+20],semanticFlags:bytes[at+21],
      detail:bytes[at+25],qualifiers:bytes[at+26],value:bytes.readDoubleLE(at+28),observedAt:bytes.readUInt32LE(at+52),
      timestamp:bytes.readUInt32LE(at+16),text:bytes.toString('utf8',pool,pool+textLength),
      unit:bytes.toString('utf8',pool+textLength,pool+textLength+unitLength),
      label:bytes.toString('utf8',pool+textLength+unitLength,pool+textLength+unitLength+labelLength)});
    at+=56+textLength+unitLength+labelLength+(flags&2?16+bytes.readUInt16LE(at+14):0);
  }
  assert.equal(at,bytes.length);return result;
}
test('focused complications cover real host values, identity, failures and active/Peek boundaries',()=>{
  const plan=fixtures.complicationPresets({now:N,session:S});assert.equal(plan.presets.length,132);
  assert.equal(plan.productionReadingHost,true);assert.equal(plan.halftoneLabelAdapter,true);
  for(const preset of plan.presets) {
    const slots=readings(preset.bytes.COMPLICATION_DATA);
    assert.equal(slots.slice(2).every(slot=>slot.status===0),true);
    assert.equal(records(preset.bytes.ACTIVITY_DATA).length,preset.state==='active'?1:0);
  }
  const find=name=>readings(plan.presets.find(preset=>preset.name===name+'-light').bytes.COMPLICATION_DATA);
  let slots=find('temperature-rain');
  assert.deepEqual(slots.slice(0,2).map(slot=>slot.kind),[readingWire.SEMANTIC_KIND.TEMPERATURE,readingWire.SEMANTIC_KIND.PRECIPITATION]);
  assert.deepEqual(slots.slice(0,2).map(slot=>slot.value),[5,40]);assert.equal(slots[0].observedAt,N-90);
  assert.ok(slots.slice(0,2).every(slot=>slot.label!=='Praha'),'one city is not repeated twice');
  assert.equal(plan.presets.find(preset=>preset.name==='custom-accent-light').integers.ACCENT_COLOR,0xff5500);
  assert.equal(find('rain-100')[1].value,100);assert.equal(find('rain-100')[1].displayKind,1);
  assert.ok(find('aged-weather').slice(0,2).every(slot=>slot.status===2));
  assert.equal(find('aged-weather')[0].observedAt,N-4000);
  assert.equal(find('aged-weather')[1].observedAt,0); // No invented rain observation.
  assert.equal(find('long-temperature-value')[0].text,'123.4°C');
  assert.equal(find('temperature-too-long')[0].text,'1234567890°C');
  assert.deepEqual(find('first-slot-only').slice(0,2).map(slot=>slot.status),[2,0]);
  assert.deepEqual(find('second-slot-only').slice(0,2).map(slot=>slot.status),[0,2]);
  assert.equal(find('second-slot-only')[1].value,5);
  assert.equal(find('negative-feels')[0].value,-12.4);assert.equal(find('negative-feels')[0].detail,readingWire.DETAIL_KIND.FEELS_LIKE);
  assert.deepEqual(find('forecast-high-low').slice(0,2).map(slot=>slot.detail),[readingWire.DETAIL_KIND.HIGH,readingWire.DETAIL_KIND.LOW]);
  assert.ok(find('forecast-high-low').slice(0,2).every(slot=>slot.qualifiers&readingWire.QUALIFIERS.FORECAST));
  assert.deepEqual(find('humidity-phone').slice(0,2).map(slot=>slot.kind),[readingWire.SEMANTIC_KIND.HUMIDITY,readingWire.SEMANTIC_KIND.BATTERY]);
  assert.ok(find('humidity-phone').slice(0,2).every(slot=>slot.displayKind===0));
  assert.equal(find('wind-long-unit')[0].unit,'kilometres/hour');
  assert.equal(find('timestamp-boolean')[0].timestamp,N+3600);
  assert.equal(find('timestamp-boolean')[1].label,'Kitchen');
  assert.equal(find('generic-text-image')[0].text,'Connected');assert.ok(find('generic-text-image')[1].flags&4);
  assert.equal(find('generic-text-image')[1].width,8);assert.equal(find('generic-text-image')[1].height,4);
  assert.deepEqual(find('finance-public-tickers').slice(0,2).map(slot=>slot.label),['AAPL','BRK.B']);
  assert.deepEqual(find('two-weather-locations').slice(0,2).map(slot=>slot.label),['Praha','Brno']);
  assert.deepEqual(find('two-weather-locations-expired').slice(0,2).map(slot=>slot.label),['Praha','Brno']);
  assert.deepEqual(find('two-weather-locations-expired').slice(0,2).map(slot=>slot.status),[7,7]);
  assert.deepEqual(find('two-locations-qualifiers').slice(0,2).map(slot=>slot.label),['Praha','Brno']);
  assert.equal(find('czech-custom-labels')[0].label,'Doma');assert.equal(find('czech-custom-labels')[1].label,'Obývák');
  assert.equal(find('czech-custom-labels')[1].text,'Zapnuto');
  for(const[name,status]of [['loading',1],['unavailable',3],['expired',7]]) {
    slots=find(name);assert.deepEqual(slots.slice(0,2).map(slot=>slot.status),[status,status]);
    assert.ok(slots.slice(0,2).every(slot=>slot.text===''&&slot.observedAt===0&&slot.semanticFlags===0));
  }
});
