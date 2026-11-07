#include <assert.h>
#include <string.h>
#include "../src/c/context_effects.h"

int main(void) {
  ContextEffects value;
  uint8_t packet[]={0x78,0x56,0x34,0x12,0xef,0xcd,0xab,0x89,1,200,0,0,0};
  assert(context_effects_read(packet,sizeof(packet),&value));
  assert(value.session==0x12345678&&value.burst==0x89abcdef&&value.paused&&value.expires_at==200);
  assert(!context_effects_read(packet,8,&value));
  assert(!context_effects_read(packet,9,&value)); // Old sidecar cannot authorize an alert.
  assert(!context_effects_read(NULL,9,&value));
  assert(!context_effects_read(packet,sizeof(packet),NULL));
  packet[8]=2;assert(!context_effects_read(packet,sizeof(packet),&value));
  packet[8]=0;assert(context_effects_read(packet,sizeof(packet),&value)&&!value.paused);
  ContextEffects event={.session=7,.burst=1,.expires_at=200};
  uint32_t seen=0;
  assert(!context_effects_alert(&event,8,100,&seen,1,false)&&seen==0);
  assert(!context_effects_alert(&event,7,200,&seen,1,false)&&seen==0);
  assert(!context_effects_alert(&event,7,201,&seen,1,false)&&seen==0);
  assert(context_effects_alert(&event,7,100,&seen,1,false)&&seen==1);
  assert(!context_effects_alert(&event,7,101,&seen,2,false)); // retry / art change
  event.burst=2;
  assert(!context_effects_alert(&event,7,102,&seen,0,false)&&seen==2);
  assert(!context_effects_alert(&event,7,103,&seen,1,false)); // enable is not an event
  event.burst=3;
  assert(!context_effects_alert(&event,7,104,&seen,2,true)&&seen==3);
  assert(!context_effects_alert(&event,7,105,&seen,2,false)); // leaving Quiet Time
  event.burst=0;event.expires_at=0;
  assert(!context_effects_alert(&event,7,106,&seen,2,false)&&seen==3); // boundary
  event.burst=2;event.expires_at=200;
  assert(!context_effects_alert(&event,7,107,&seen,2,false)); // old queued snapshot
  event.burst=4;assert(context_effects_alert(&event,7,108,&seen,2,false));
  // Empty events and original expiry must agree; reserved flag bits fail closed.
  memset(packet+4,0,4);assert(!context_effects_read(packet,sizeof(packet),&value));
  memset(packet+9,0,4);assert(context_effects_read(packet,sizeof(packet),&value));
  packet[8]=2;assert(!context_effects_read(packet,sizeof(packet),&value));
  return 0;
}
