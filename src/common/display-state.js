'use strict';

var settings=require('./settings-state');
var KEY='halftone-settings-delivery-v1';
var fields=['BACKGROUND_COLOR','TEXT_COLOR','ACCENT_COLOR','NIGHT_BACKGROUND_COLOR','NIGHT_TEXT_COLOR','NIGHT_ACCENT_COLOR','CLOCK_FORMAT','SHOW_STATUS','ANIMATIONS','NOTIFICATION_VIBRATION','TEXT_SIZE','APPEARANCE_MODE','MANUAL_APPEARANCE','LARGE_TEXT','DEPTH_EFFECT','TEXT_SHADOW','PANEL_TRANSITIONS'];
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function values(value){return fields.map(function(key){return Number(value[key]);});}
function valid(v){return Array.isArray(v)&&v.length===17&&v.every(function(n,i){return Number.isInteger(n)&&n>=0&&(i<6?n<=0xffffff:i===6?[0,12,24].indexOf(n)>=0:i===9||i===11?n<=2:i===10?n<=3:n<=1);});}
function put(b,at,n){for(var i=0;i<4;i++)b[at+i]=(n>>>(8*i))&255;}
function get(b,at){return (b[at]|b[at+1]<<8|b[at+2]<<16|b[at+3]<<24)>>>0;}
function encode(v,revision,status,hello){var b=[1,17,status||0,hello?1:0];put(b,4,revision);v.forEach(function(n,i){put(b,8+4*i,n);});return b;}
function decode(input){
  if(!input||input.length!==76)return null;
  var b=Array.prototype.slice.call(input);
  if(!b.every(function(n){return Number.isInteger(n)&&n>=0&&n<=255;})||b[0]!==1||b[1]!==17||b[2]>1||b[3]>1)return null;
  var v=fields.map(function(_,i){return get(b,8+4*i);});
  return valid(v)?{values:v,revision:get(b,4),status:b[2],hello:b[3]===1}:null;
}
function next(n){return ((n+1)>>>0)||1;}
function matches(receipt,record){var r=decode(receipt);return !!r&&!r.status&&r.revision===record.revision&&equal(r.values,record.values);}
function read(storage){
  var desired=settings.read(storage);if(!desired)return null;
  var v=values(desired),record;
  try{record=JSON.parse(storage.getItem(KEY));}catch(ignored){}
  var healthy=!!record&&record.version===2&&Number.isInteger(record.revision)&&record.revision>0&&record.revision<=0xffffffff&&valid(record.values)&&
    (record.applied===null||!!decode(record.applied))&&(record.error===null||typeof record.error==='string');
  if(!healthy)record={version:2,revision:1,values:v,applied:null,error:null};
  var stored=healthy&&equal(record.values,v);
  if(!equal(record.values,v))record={version:2,revision:next(record.revision),values:v,applied:null,error:null};
  return {settings:desired,record:record,stored:stored};
}
function commit(storage,record){try{var text=JSON.stringify(record);storage.setItem(KEY,text);return storage.getItem(KEY)===text;}catch(ignored){return false;}}
function status(storage){
  try{var state=read(storage);if(!state)return {ok:false};
    var applied=state.stored&&matches(state.record.applied,state.record);
    return {ok:true,settings:state.settings,delivery:{applied:applied,pending:!applied,error:state.record.error,state:applied?'saved':!hasNative(storage)?'none':state.record.error?'failed':'pending'}};
  }catch(ignored){return {ok:false};}
}
function hasNative(storage){
  var raw=JSON.parse(storage.getItem('clay-settings')||'{}');
  return fields.concat(['NIGHT_PALETTE','USE_12_HOUR']).some(function(key){return raw[key]!==undefined||raw[10000+settings.names.indexOf(key)]!==undefined||raw[settings.names.indexOf(key)]!==undefined;});
}
function adopt(storage,v){
  var current=settings.read(storage);if(!current)return false;
  fields.forEach(function(key,i){current[key]=typeof settings.defaults[key]==='boolean'?!!v[i]:v[i];});
  current.NIGHT_PALETTE=current.APPEARANCE_MODE===1;
  return settings.save(storage,current).ok;
}
module.exports={key:KEY,fields:fields,values:values,valid:valid,equal:equal,encode:encode,decode:decode,next:next,matches:matches,read:read,commit:commit,status:status,hasNative:hasNative,adopt:adopt};
