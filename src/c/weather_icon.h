#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <time.h>

#define WEATHER_ICON_BYTES 10
#define WEATHER_ICON_MAX_AGE_SECONDS (2 * 60 * 60)

// Stable packet vocabulary shared with PKJS. Light/heavy variants intentionally
// use one symbol; unsupported conditions do not masquerade as a known one.
enum {
  WEATHER_ICON_SUN = 1,
  WEATHER_ICON_PARTLY_CLOUDY = 2,
  WEATHER_ICON_CLOUDY = 3,
  WEATHER_ICON_RAIN = 4,
  WEATHER_ICON_SNOW = 5,
  WEATHER_ICON_RAIN_AND_SNOW = 6,
};

typedef struct {
  uint8_t code;
  uint32_t confirmed_at;
  uint32_t valid_until;
} WeatherIcon;

static inline uint32_t weather_icon_u32(const uint8_t *bytes) {
  return (uint32_t)bytes[0] | ((uint32_t)bytes[1] << 8) |
         ((uint32_t)bytes[2] << 16) | ((uint32_t)bytes[3] << 24);
}

// Reopening or receiving the packet does not renew the original source read.
// Like weather-details, tolerate five minutes of phone/watch clock skew.
static inline bool weather_icon_read(const uint8_t *bytes, size_t length,
                                     time_t now, WeatherIcon *result) {
  if (bytes == NULL || length != WEATHER_ICON_BYTES || bytes[0] != 1 ||
      bytes[1] < WEATHER_ICON_SUN || bytes[1] > WEATHER_ICON_RAIN_AND_SNOW) {
    return false;
  }
  const WeatherIcon value = {
    .code = bytes[1],
    .confirmed_at = weather_icon_u32(bytes + 2),
    .valid_until = weather_icon_u32(bytes + 6),
  };
  const int64_t current = (int64_t)now;
  const int64_t confirmed = value.confirmed_at;
  if (current <= 0 || current > UINT32_MAX || confirmed == 0 || confirmed > current + 300 ||
      value.valid_until <= value.confirmed_at || current >= value.valid_until ||
      (int64_t)value.valid_until > confirmed + WEATHER_ICON_MAX_AGE_SECONDS) {
    return false;
  }
  if (result != NULL) { *result = value; }
  return true;
}
