#pragma once

#include <stdbool.h>
#include <time.h>

#define WEATHER_REFRESH_SECONDS (30 * 60)
#define WEATHER_RETRY_SECONDS (2 * 60)
#define WEATHER_MAX_AGE_SECONDS (2 * 60 * 60)

static bool weather_is_fresh(time_t now, time_t observation) {
  return observation > 0 && observation <= now + 300 &&
         now - observation <= WEATHER_MAX_AGE_SECONDS;
}

static bool weather_observation_is_current(time_t now, time_t observation,
                                           time_t received) {
  return weather_is_fresh(now, observation) && received > 0 && received <= now &&
         now - received < WEATHER_REFRESH_SECONDS;
}

static bool weather_refresh_due(time_t now, time_t received, time_t requested) {
  const bool needs_refresh = received == 0 || received > now ||
                            now - received >= WEATHER_REFRESH_SECONDS;
  const bool retry_allowed = requested == 0 || requested > now ||
                            now - requested >= WEATHER_RETRY_SECONDS;
  return needs_refresh && retry_allowed;
}
