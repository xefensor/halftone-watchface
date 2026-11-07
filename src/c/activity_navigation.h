#pragma once

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

enum { ACTIVITY_NAV_BYTES=24, ACTIVITY_NAV_ABSENT=255,
       ACTIVITY_NAV_REFRESH_SECONDS=30 };
typedef struct {
  uint32_t session,view,sequence,reported_at,expires_at;
  uint8_t primary,secondary,flags;
  bool pending;
} ActivityNavigation;

static inline bool activity_navigation_update(ActivityNavigation *state,uint32_t session,
    uint32_t view,uint8_t primary,uint8_t secondary,uint8_t flags,uint32_t expires_at,uint32_t now) {
  if(session<2||!view||!now||state->sequence==UINT32_MAX)return false;
  const bool changed=state->session!=session||state->view!=view||state->primary!=primary||
      state->secondary!=secondary||state->flags!=flags||state->expires_at!=expires_at;
  if(!changed&&now>=state->reported_at&&now-state->reported_at<ACTIVITY_NAV_REFRESH_SECONDS)return false;
  state->session=session;state->view=view;++state->sequence;
  state->primary=primary;state->secondary=secondary;state->flags=flags;state->expires_at=expires_at;
  state->reported_at=now;state->pending=true;return true;
}
static inline void activity_navigation_u32(uint8_t *bytes,uint32_t value) {
  for(unsigned i=0;i<4;++i)bytes[i]=(uint8_t)(value>>(i*8));
}
static inline void activity_navigation_encode(const ActivityNavigation *state,
                                               uint8_t bytes[ACTIVITY_NAV_BYTES]) {
  memset(bytes,0,ACTIVITY_NAV_BYTES);bytes[0]=1;
  bytes[1]=state->primary;bytes[2]=state->secondary;bytes[3]=state->flags;
  activity_navigation_u32(bytes+4,state->session);activity_navigation_u32(bytes+8,state->view);
  activity_navigation_u32(bytes+12,state->sequence);activity_navigation_u32(bytes+16,state->reported_at);
  activity_navigation_u32(bytes+20,state->expires_at);
}
