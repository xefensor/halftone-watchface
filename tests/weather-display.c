#include <assert.h>
#include "../src/c/weather_schedule.h"
#include "../src/c/weather_display.h"

int main(void) {
  const time_t observed = 1791849000;
  const time_t received = observed;
  const int forecast_index = 1;

  // The hourly prediction can differ from current conditions. Reaching the
  // refresh deadline must keep displaying the valid current observation.
  const time_t before_refresh = received + WEATHER_REFRESH_SECONDS - 1;
  const time_t refresh_due = received + WEATHER_REFRESH_SECONDS;
  const time_t after_refresh = received + 35 * 60;
  assert(!weather_refresh_due(before_refresh, received, received));
  assert(weather_refresh_due(refresh_due, received, received));
  assert(weather_display_select(weather_is_fresh(before_refresh, observed), forecast_index)
         == WEATHER_DISPLAY_CURRENT);
  assert(weather_display_select(weather_is_fresh(refresh_due, observed), forecast_index)
         == WEATHER_DISPLAY_CURRENT);
  assert(weather_display_select(weather_is_fresh(after_refresh, observed), forecast_index)
         == WEATHER_DISPLAY_CURRENT);

  // A usable current observation wins even if no forecast was downloaded.
  assert(weather_display_select(true, -1) == WEATHER_DISPLAY_CURRENT);

  // Use forecast only after the observation actually expires, never merely
  // because the next scheduled refresh was missed.
  const time_t last_valid = observed + WEATHER_MAX_AGE_SECONDS;
  assert(weather_display_select(weather_is_fresh(last_valid, observed), 2)
         == WEATHER_DISPLAY_CURRENT);
  assert(weather_display_select(weather_is_fresh(last_valid + 1, observed), 2)
         == WEATHER_DISPLAY_FORECAST);
  assert(weather_display_select(weather_is_fresh(last_valid + 1, observed), -1)
         == WEATHER_DISPLAY_NONE);

  // Startup with no current observation can show a usable saved forecast.
  assert(weather_display_select(weather_is_fresh(observed, 0), 0)
         == WEATHER_DISPLAY_FORECAST);
  assert(weather_display_select(false, -1) == WEATHER_DISPLAY_NONE);
  assert(weather_display_select(false, -2) == WEATHER_DISPLAY_NONE);

  // A timestamp too far in the future is not a usable current observation.
  assert(weather_display_select(weather_is_fresh(observed, observed + 301), 0)
         == WEATHER_DISPLAY_FORECAST);
  return 0;
}
