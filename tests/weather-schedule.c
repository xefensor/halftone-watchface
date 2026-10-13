#include <assert.h>
#include "../src/c/weather_schedule.h"

int main(void) {
  const time_t now = 1791849000;
  assert(weather_refresh_due(now, 0, 0)); // Startup / old-version migration.
  assert(!weather_refresh_due(now, now - 1799, now - 1799));
  assert(weather_refresh_due(now, now - 1800, now - 1800));
  assert(!weather_refresh_due(now, 0, now - 119));
  assert(weather_refresh_due(now, 0, now - 120));
  assert(weather_refresh_due(now, now + 3600, now + 3600)); // Clock correction.
  assert(weather_is_fresh(now, now - 7200));
  assert(!weather_is_fresh(now, now - 7201));
  assert(!weather_is_fresh(now, 0));
  assert(!weather_is_fresh(now, now + 301));
  assert(weather_observation_is_current(now, now - 1800, now - 1799));
  assert(!weather_observation_is_current(now, now - 1800, now - 1800));
  assert(!weather_observation_is_current(now, now, 0));
  assert(!weather_observation_is_current(now, now, now + 1));
  return 0;
}
