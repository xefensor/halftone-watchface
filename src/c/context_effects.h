#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

// This ephemeral sidecar belongs to the exact context snapshot and native
// session. It contains no source identity or notification text.
typedef struct { uint32_t session, burst, expires_at; bool paused; } ContextEffects;
static inline bool context_effects_read(const uint8_t *bytes,size_t length,
                                        ContextEffects *out) {
  if(!bytes||!out||length!=13||(bytes[8]&~1u))return false;
  out->session=out->burst=out->expires_at=0;
  for(unsigned i=0;i<4;++i) {
    out->session|=(uint32_t)bytes[i]<<(i*8);
    out->burst|=(uint32_t)bytes[i+4]<<(i*8);
    out->expires_at|=(uint32_t)bytes[i+9]<<(i*8);
  }
  out->paused=(bytes[8]&1)!=0;
  return (out->burst==0)==(out->expires_at==0);
}
// Consume the event even when disabled or quiet: enabling alerts or leaving
// Quiet Time must never play a historical pulse. Zero is a non-event boundary.
static inline bool context_effects_alert(const ContextEffects *event,uint32_t session,
                                         uint32_t now,uint32_t *seen,
                                         unsigned preference,bool quiet) {
  if(!event||session<2||event->session!=session||now>=event->expires_at||
      !event->burst||event->burst<=*seen)return false;
  *seen=event->burst;
  return preference>0&&preference<=2&&!quiet;
}
