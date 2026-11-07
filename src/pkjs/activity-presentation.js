'use strict';

var library=require('pebble-activities/host');
var selection=library.selection,wire=library.wire;
var TIMER='50e9ef12-a5ab-4369-a3b5-3447bfba5151';
var MUSIC_SOURCE='00000000-0000-0000-0001-000000000003';
var MUSIC_APP='1f03293d-47af-4f28-b960-f2b02a6dd757';
function symbolBitmap(kind){
  var pixels=[],size=40;
  for(var i=0;i<800;i++)pixels.push(0);
  function dot(x,y){x=Math.round(x);y=Math.round(y);if(x<0||x>=40||y<0||y>=40)return;var at=y*20+(x>>1);pixels[at]|=x&1?1:16;}
  function line(x1,y1,x2,y2,w){var n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1);for(var p=0;p<=n;p++)for(var yy=-w;yy<=w;yy++)for(var xx=-w;xx<=w;xx++)if(xx*xx+yy*yy<=w*w)dot(x1+(x2-x1)*p/n+xx,y1+(y2-y1)*p/n+yy);}
  function circle(cx,cy,r,fill){for(var y=cy-r;y<=cy+r;y++)for(var x=cx-r;x<=cx+r;x++){var d=(x-cx)*(x-cx)+(y-cy)*(y-cy);if(d<=r*r&&(fill||d>=(r-2)*(r-2)))dot(x,y);}}
  function rect(l,t,r,b){line(l,t,r,t,1);line(r,t,r,b,1);line(r,b,l,b,1);line(l,b,l,t,1);}
  if(kind===2){circle(20,22,12);line(20,5,20,9,1);line(16,4,24,4,1);line(20,22,20,14,1);}
  else if(kind===4){rect(6,8,33,29);line(15,29,10,35,1);line(10,35,23,29,1);}
  else if(kind===5){
    line(9,7,6,13,2);line(6,13,10,23,2);line(10,23,20,33,2);
    line(20,33,30,35,2);line(30,35,35,28,2);line(35,28,27,23,2);
    line(27,23,22,28,2);line(22,28,12,18,2);line(12,18,17,13,2);line(17,13,9,7,2);
  }
  else if(kind===7){circle(20,7,4);line(20,13,20,25,1);line(8,18,32,18,1);line(20,25,10,35,1);line(20,25,30,35,1);}
  else if(kind===8){
    circle(20,9,5,true);circle(20,21,5,true);
    for(var my=9;my<=21;my++)line(15,my,25,my,1);
    line(9,15,9,23,1);line(9,23,15,30,1);line(15,30,25,30,1);
    line(25,30,31,23,1);line(31,23,31,15,1);line(20,30,20,36,1);line(14,36,26,36,1);
  }
  else if(kind===9){line(20,5,20,29,1);line(9,20,20,30,1);line(31,20,20,30,1);line(7,35,33,35,1);}
  else if(kind===10){rect(6,9,34,34);line(20,9,20,21,1);line(6,14,34,14,1);}
  return {width:size,height:size,palette:[0,192],pixels:pixels};
}
function media(card){return card.type==='media'||card.kind==='music'||card.presentation===2;}
function project(input){
  if(!input||!library.summaryView)return null;
  var candidate=input;
  if(input.content!==undefined&&library.activity)candidate=library.activity.toView(input);
  var card;
  if(input.type==='standard'||input.type==='media')card=library.summary.toView(input);
  else if(input.presentation!==undefined)card=library.summaryView.normalize(candidate);
  else {
    if(candidate&&candidate.kind==='music'&&candidate.support&&candidate.support.type==='text'&&candidate.support.text.trim()==='?'){
      candidate=JSON.parse(JSON.stringify(candidate));candidate.support=null;
    }
    card=library.summaryView.fromLegacy(candidate);
  }
  if(!card)return null;
  // Timer's native-owner adapter explicitly permits bounded public countdown
  // predictions. Other saved/uncertain sources need a provenance-aware host.
  if(card.unconfirmed&&card.provider!==TIMER)return null;
  if(!card.image&&[2,4,5,7,8,9,10].indexOf(card.identitySymbol)>=0){
    card.image=symbolBitmap(card.identitySymbol);card=library.summaryView.normalize(card);
    if(!card)return null;
  }
  if(!card.openApp&&input.openApp)card.openApp=input.openApp;
  if(!card.openApp&&card.provider===TIMER)card.openApp={watchAppUuid:TIMER};
  if(!card.openApp&&card.provider===MUSIC_SOURCE&&media(card))card.openApp={watchAppUuid:MUSIC_APP};
  if(input.selectionKey)card.selectionKey=input.selectionKey;
  if(input.providerName)card.providerName=input.providerName;
  return card;
}
function select(cards,prefs,extraMusic,extraNotifications){
  var all=(Array.isArray(cards)?cards:[]).slice();
  if(extraMusic){
    var duplicate=all.some(function(card){return card.provider===extraMusic.provider&&media(card);});
    if(!duplicate&&selection.normalizePreferences(prefs).hidden.indexOf(extraMusic.provider)<0)all.push(extraMusic);
  }
  if(extraNotifications){
    var notificationDuplicate=all.some(function(card){return card.selectionKey==='builtin:notifications';});
    if(!notificationDuplicate&&selection.normalizePreferences(prefs).hidden.indexOf(extraNotifications.provider)<0)all.push(extraNotifications);
  }
  all=all.map(function(card,index){return {card:card,index:index};}).sort(function(a,b){
    // This is only the stable default. The shared selector applies explicit
    // Halftone priorities afterwards, so Notifications can take either role.
    function rank(card){return card.selectionKey==='builtin:notifications'?0:media(card)?2:1;}
    return rank(a.card)-rank(b.card)||a.index-b.index;
  }).map(function(entry){return entry.card;});
  return selection.select(all.map(project).filter(Boolean),prefs);
}
module.exports={project:project,select:select};
