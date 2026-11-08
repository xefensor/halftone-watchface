'use strict';
var state=require('../common/display-state');
function create(options){
  var storage=options.storage,send=options.send,later=options.later||setTimeout,cancel=options.cancel||clearTimeout;
  var generation=0,timer=null,attempts=0,activeRevision=null,mismatch=false,revisionPending=false,invalidated=null;
  function stop(){if(timer!==null)cancel(timer);timer=null;}
  function status(){var result=state.status(storage);if(result.ok&&(mismatch||revisionPending)){result.delivery.applied=false;result.delivery.pending=true;result.delivery.state='pending';}return result;}
  function retry(g){if(g!==generation||attempts>=3)return;stop();timer=later(function(){timer=null;deliver(g);},500*attempts);}
  function deliver(g){
    if(g!==generation||attempts>=3||!send||revisionPending)return;
    var value;try{value=state.read(storage);}catch(ignored){return;}
    if(!value||!value.stored||!mismatch&&state.matches(value.record.applied,value.record))return;
    ++attempts;
    send({DISPLAY_PREFERENCES:state.encode(value.record.values,value.record.revision)},function(){retry(g);},function(){retry(g);});
  }
  function reconcile(force){
    if(force){mismatch=true;revisionPending=true;++generation;stop();activeRevision=null;}
    var value;try{
      var old=JSON.parse(storage.getItem(state.key)||'null');
      if(old&&old.version!==2&&(old.state==='pending'||old.state==='failed')&&old.payload){
        var selected={};state.fields.concat(['NIGHT_PALETTE','USE_12_HOUR']).forEach(function(key){var n=options.keys&&options.keys[key];var input=old.payload[key]!==undefined?old.payload[key]:old.payload[n===undefined?require('../common/settings-state').names.indexOf(key):n];if(input!==undefined)selected[key]=input;});
        var migrated=require('../common/settings-state').patch(storage,selected);if(!migrated.ok)return false;
        if(options.changed)options.changed();
      }
      if(!state.hasNative(storage))return false;value=state.read(storage);
    }catch(ignored){return false;}
    if(!value)return false;
    if(force||revisionPending||value.record.revision===invalidated){
      mismatch=true;invalidated=value.record.revision;value.record.revision=state.next(value.record.revision);value.record.applied=null;value.record.error=null;
      if(!state.commit(storage,value.record)){revisionPending=true;return false;}revisionPending=false;
    }else if(!value.stored&&!state.commit(storage,value.record))return false;
    // Source traffic and duplicate ready probes must not renew the retry budget.
    if(activeRevision===value.record.revision)return true;
    ++generation;stop();attempts=0;activeRevision=value.record.revision;deliver(generation);return true;
  }
  function receive(input){
    var received=state.decode(input);if(!received)return false;
    try{
      if(received.hello&&!received.status&&!state.hasNative(storage)){
        if(!state.adopt(storage,received.values))return false;
        if(options.changed)options.changed();
      }
      var value=state.read(storage);if(!value)return false;
      if(!revisionPending&&value.stored&&value.record.revision!==invalidated&&received.revision===value.record.revision&&state.equal(received.values,value.record.values)){
        if(!received.status){value.record.applied=state.encode(received.values,received.revision);value.record.error=null;
          if(!state.commit(storage,value.record)){mismatch=true;return false;}
          mismatch=false;invalidated=null;stop();return true;
        }
        mismatch=true;value.record.applied=null;value.record.error='watch_save_unconfirmed';state.commit(storage,value.record);return false;
      }
      if(received.hello){mismatch=true;revisionPending=true;invalidated=value.record.revision;++generation;stop();activeRevision=null;reconcile(false);}
    }catch(ignored){}
    return false;
  }
  return {reconcile:reconcile,receive:receive,status:status};
}
module.exports={create:create};
