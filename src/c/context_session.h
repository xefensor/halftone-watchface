#pragma once

#include "context_data.h"
#include <pebble-watchface-core/readings.h>

// Compatibility session for the transient music/notification adapter. Reading
// caches belong to Core; this host-owned state never persists private content.
typedef struct {
  uint32_t token, generation, request_generation;
  bool rebaseline, awaiting_baseline, baseline_in_flight;
} HalftoneContextSession;

static inline void halftone_context_session_init(HalftoneContextSession *session,
                                                uint32_t previous) {
  memset(session,0,sizeof(*session));
  session->token=context_next_session_token(previous);
  session->rebaseline=session->awaiting_baseline=true;
}
static inline void halftone_context_session_reset(HalftoneContextSession *session,
                                                 WfcPhoneStatus *context,bool advance) {
  if(advance)session->token=context_next_session_token(session->token);
  ++session->generation;
  session->rebaseline=session->awaiting_baseline=true;
  session->baseline_in_flight=false;
  memset(context,0,sizeof(*context));
}
static inline uint32_t halftone_context_request_marker(HalftoneContextSession *session) {
  session->baseline_in_flight=session->rebaseline;
  session->request_generation=session->generation;
  return session->rebaseline||session->awaiting_baseline?session->token:1;
}
static inline void halftone_context_request_failed(HalftoneContextSession *session) {
  session->baseline_in_flight=false;
}
static inline void halftone_context_request_acknowledged(HalftoneContextSession *session) {
  if(session->baseline_in_flight&&session->request_generation==session->generation)
    session->rebaseline=false;
  session->baseline_in_flight=false;
}
static inline bool halftone_context_receive(HalftoneContextSession *session,
                                            WfcPhoneStatus *context,bool connected,
                                            const uint8_t *bytes,size_t length,uint32_t marker) {
  const bool valid=connected&&length<=COMPLICATION_MAX_BYTES&&
      wfc_context_phone_status_read(bytes,length,context);
  if(!valid)memset(context,0,sizeof(*context));
  else if(context_session_token_matches(marker,session->token))
    session->awaiting_baseline=false;
  return valid;
}
static inline uint32_t halftone_context_prune(WfcPhoneStatus *context,time_t now) {
  if(!wfc_phone_status_fresh(context,now))memset(context,0,sizeof(*context));
  return context->ready?context->valid_until:0;
}
