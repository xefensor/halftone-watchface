#pragma once
#include <stdint.h>
#include <stdbool.h>

typedef struct {
  const void *card, *language;
  uint32_t prepared_at, valid_until;
  bool valid, connected, ticking, drawn;
} ActivityPlanCache;

static inline bool activity_plan_current(const ActivityPlanCache *cache,
    const void *card,const void *language,uint32_t now,bool connected) {
  return cache->valid&&cache->card==card&&cache->language==language&&
      cache->connected==connected&&now>=cache->prepared_at&&now<cache->valid_until&&
      (!cache->ticking||now==cache->prepared_at);
}
