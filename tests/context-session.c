#include <assert.h>
#include "../src/c/context_session.h"

static void u32(uint8_t *out,uint32_t value) {
  for(unsigned i=0;i<4;++i)out[i]=(uint8_t)(value>>(8*i));
}
static size_t legacy_context(uint8_t *bytes) {
  memset(bytes,0,256);bytes[0]=2;
  const char *values[]={"Old track","Old artist","Private sender","Private body","5%"};
  size_t at=COMPLICATION_HEADER_BYTES;
  for(unsigned i=0;i<COMPLICATION_SLOT_COUNT;++i) {
    const size_t length=strlen(values[i]);uint8_t *slot=bytes+at;
    slot[0]=COMPLICATION_FLAG_TEXT;slot[1]=COMPLICATION_STATUS_READY;slot[2]=(uint8_t)length;
    u32(slot+6,100);u32(slot+10,108);
    memcpy(slot+COMPLICATION_LEGACY_RECORD_HEADER_BYTES,values[i],length);
    at+=COMPLICATION_LEGACY_RECORD_HEADER_BYTES+length;
  }
  bytes[2]=(uint8_t)at;bytes[3]=(uint8_t)(at>>8);
  const uint16_t crc=complications_crc16(bytes,at);bytes[4]=(uint8_t)crc;bytes[5]=(uint8_t)(crc>>8);
  return at;
}

int main(void) {
  HalftoneContextSession state;WfcPhoneStatus content;
  memset(&content,0xff,sizeof(content));
  halftone_context_session_init(&state,40);
  assert(state.token==41&&state.rebaseline&&state.awaiting_baseline);
  assert(halftone_context_request_marker(&state)==41&&state.baseline_in_flight);
  const uint32_t old_generation=state.generation;
  halftone_context_session_reset(&state,&content,true);
  assert(state.token==42&&state.generation!=old_generation);
  halftone_context_request_acknowledged(&state);
  assert(state.rebaseline); // ACK from before rotation cannot open the new gate.
  assert(complications_zero((const uint8_t *)&content,sizeof(content)));
  assert(halftone_context_request_marker(&state)==42);
  halftone_context_request_failed(&state);halftone_context_request_acknowledged(&state);
  assert(state.rebaseline);
  assert(halftone_context_request_marker(&state)==42);
  halftone_context_request_acknowledged(&state);
  assert(!state.rebaseline&&state.awaiting_baseline);
  state.awaiting_baseline=false;
  assert(halftone_context_request_marker(&state)==1);
  memset(&content,0xff,sizeof(content));
  assert(!halftone_context_receive(&state,&content,false,NULL,0,42));
  assert(complications_zero((const uint8_t *)&content,sizeof(content)));
  halftone_context_session_init(&state,CONTEXT_MAX_SESSION_TOKEN);
  assert(state.token==2);
  uint8_t packet[256];const size_t length=legacy_context(packet);
  ComplicationSet legacy;
  assert(context_read(packet,length,&legacy)&&!strcmp(legacy.slots[2].text,"Private sender"));
  // Both old and current baseline replies preserve status but never retain a
  // parallel music/notification UI payload, including before the gate opens.
  assert(halftone_context_receive(&state,&content,true,packet,length,3));
  assert(state.awaiting_baseline);
  assert(sizeof(content)<=12);
  assert(wfc_phone_status_fresh(&content,101)&&content.percent==5);
  assert(halftone_context_receive(&state,&content,true,packet,length,2));
  assert(!state.awaiting_baseline);
  assert(wfc_phone_status_fresh(&content,101)&&content.percent==5);
  assert(halftone_context_prune(&content,101)==108);
  assert(halftone_context_prune(&content,108)==0);
  assert(complications_zero((const uint8_t *)&content,sizeof(content)));
  packet[length-1]^=1;
  assert(!halftone_context_receive(&state,&content,true,packet,length,2));
  assert(complications_zero((const uint8_t *)&content,sizeof(content)));
  return 0;
}
