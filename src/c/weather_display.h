#pragma once

#include <stdbool.h>

typedef enum {
  WEATHER_DISPLAY_NONE,
  WEATHER_DISPLAY_CURRENT,
  WEATHER_DISPLAY_FORECAST
} WeatherDisplay;

// Refresh scheduling and display selection have different jobs. A missed
// refresh must not replace usable current conditions with an hourly prediction.
static inline WeatherDisplay weather_display_select(bool current_valid,
                                                    int forecast_index) {
  if (current_valid) { return WEATHER_DISPLAY_CURRENT; }
  if (forecast_index >= 0) { return WEATHER_DISPLAY_FORECAST; }
  return WEATHER_DISPLAY_NONE;
}
