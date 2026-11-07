'use strict';

// Only destination app identities and freshness/session metadata cross an app
// switch. Source records, occurrence IDs and private display contents do not.
var KEY='halftone-navigation-v1';
var UUID='d4dd5046-53be-4624-99e8-46e0b377fe66';
var LEASE=45000,MAX=4294967295;
function object(value){return value&&typeof value==='object'&&!Array.isArray(value);}
function integer(value,min,max){return typeof value==='number'&&isFinite(value)&&Math.floor(value)===value&&value>=min&&value<=max;}
function uuid(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)&&value!=='00000000-0000-0000-0000-000000000000';}
function keys(value,allowed){return object(value)&&Object.keys(value).every(function(key){return allowed.indexOf(key)>=0;});}
function destination(value){return value===null?null:keys(value,['watchAppUuid'])&&uuid(value.watchAppUuid)?{watchAppUuid:value.watchAppUuid}:undefined;}
function remove(storage){try{if(typeof storage.removeItem==='function')storage.removeItem(KEY);else storage.setItem(KEY,'');}catch(ignored){}}
function read(storage,now){
  var hint,text;
  try{text=storage.getItem(KEY);if(text===null||text===undefined)return null;if(typeof text!=='string'||!text||text.length>512){remove(storage);return null;}hint=JSON.parse(text);}catch(ignored){remove(storage);return null;}
  var primary=object(hint)?destination(hint.primary):undefined;
  var secondary=object(hint)?destination(hint.secondary):undefined;
  if(!keys(hint,['schema','watchfaceUuid','nativeSession','viewSequence','presentationSequence','presentedAtMs','expiresAtMs','primary','secondary'])||
      hint.schema!==1||hint.watchfaceUuid!==UUID||!integer(hint.nativeSession,2,MAX)||
      !integer(hint.viewSequence,1,MAX)||!integer(hint.presentationSequence,1,MAX)||
      !integer(hint.presentedAtMs,1,9007199254740991)||!integer(hint.expiresAtMs,1,9007199254740991)||
      hint.presentedAtMs>now||hint.expiresAtMs<=now||hint.expiresAtMs<=hint.presentedAtMs||
      hint.expiresAtMs-hint.presentedAtMs>LEASE||primary===undefined||secondary===undefined||(!primary&&!secondary)){
    remove(storage);return null;
  }
  return {schema:1,watchfaceUuid:UUID,nativeSession:hint.nativeSession,
    viewSequence:hint.viewSequence,presentationSequence:hint.presentationSequence,
    presentedAtMs:hint.presentedAtMs,expiresAtMs:hint.expiresAtMs,primary:primary,secondary:secondary};
}
function source(storage,now){
  var hint=read(storage,now);
  return {validUntilMs:hint?hint.expiresAtMs:now+30000,instances:hint?[{instanceId:'current',properties:{hint:{longText:{text:JSON.stringify(hint)}}}}]:[]};
}
function create(options){
  var storage=options.storage,now=options.now||Date.now;
  var mapping=null,lastPresentation=0;
  remove(storage);
  function view(snapshot){
    if(!snapshot||!integer(snapshot.session,2,MAX)||!integer(snapshot.sequence,1,MAX)||!Array.isArray(snapshot.cards)||snapshot.cards.length>2){mapping=null;remove(storage);return;}
    if(mapping&&mapping.session===snapshot.session&&snapshot.sequence<=mapping.sequence)return;
    if(!mapping||mapping.session!==snapshot.session)lastPresentation=0;
    mapping={session:snapshot.session,sequence:snapshot.sequence,cards:snapshot.cards.map(function(card){
      var target=destination(card.openApp===undefined?null:card.openApp);
      return {destination:target===undefined?null:target,until:integer(card.validUntil,1,MAX)?card.validUntil*1000:0};
    })};
    remove(storage);
  }
  function u32(bytes,at){return (bytes[at]+bytes[at+1]*256+bytes[at+2]*65536+bytes[at+3]*16777216)>>>0;}
  function receive(bytes){
    if(!mapping||!bytes||bytes.length!==24||bytes[0]!==1||bytes[3]!==0)return false;
    for(var i=0;i<bytes.length;i++)if(!integer(bytes[i],0,255))return false;
    var session=u32(bytes,4),sequence=u32(bytes,8),presentation=u32(bytes,12),reported=u32(bytes,16)*1000,until=u32(bytes,20)*1000;
    if(session!==mapping.session||sequence!==mapping.sequence||!presentation||presentation<=lastPresentation)return false;
    var primary=bytes[1],secondary=bytes[2],current=now();
    if((primary!==255&&primary>=mapping.cards.length)||(secondary!==255&&secondary>=mapping.cards.length)||
        (secondary!==255&&(primary===255||primary===secondary)))return false;
    lastPresentation=presentation;
    if(primary===255){remove(storage);return true;}
    if(!reported||reported>current+5000||current-reported>=LEASE){remove(storage);return false;}
    var first=mapping.cards[primary];
    var second=secondary===255?null:mapping.cards[secondary];
    var expires=Math.min(current+LEASE,reported+LEASE,until,first.until,second?second.until:Infinity);
    if(expires<=current||(!first.destination&&(!second||!second.destination))){remove(storage);return true;}
    var hint={schema:1,watchfaceUuid:UUID,nativeSession:session,viewSequence:sequence,presentationSequence:presentation,
      presentedAtMs:current,expiresAtMs:expires,primary:first.destination,secondary:second?second.destination:null};
    var text=JSON.stringify(hint);if(text.length>512){remove(storage);return false;}
    try{storage.setItem(KEY,text);return storage.getItem(KEY)===text;}catch(ignored){remove(storage);return false;}
  }
  return {view:view,receive:receive,clear:function(){mapping=null;remove(storage);}};
}
module.exports={KEY:KEY,UUID:UUID,LEASE:LEASE,create:create,read:read,source:source};
