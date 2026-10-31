#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <time.h>

#define WEATHER_DETAILS_BYTES 23
#define WEATHER_DETAILS_RANGE 1
#define WEATHER_DETAILS_RAIN 2
#define WEATHER_DETAILS_MAX_AGE_SECONDS (6 * 60 * 60)

typedef struct {
  uint8_t flags;
  uint32_t valid_from;
  uint32_t valid_until;
  uint32_t confirmed_at;
  int low_celsius;
  int low_fahrenheit;
  int high_celsius;
  int high_fahrenheit;
  unsigned rain_percent;
} WeatherDetails;

static inline uint32_t weather_details_u32(const uint8_t *bytes) {
  return (uint32_t)bytes[0] | ((uint32_t)bytes[1] << 8) |
         ((uint32_t)bytes[2] << 16) | ((uint32_t)bytes[3] << 24);
}

static inline int weather_details_i16(const uint8_t *bytes) {
  const unsigned value = bytes[0] | ((unsigned)bytes[1] << 8);
  return value >= 32768 ? (int)value - 65536 : (int)value;
}

// The phone supplies the selected location's calendar-day boundary. Keep the
// original confirmation time: receiving or reopening this packet cannot renew it.
static inline bool weather_details_read(const uint8_t *bytes, size_t length,
                                        time_t now, WeatherDetails *result) {
  if (bytes == NULL || length != WEATHER_DETAILS_BYTES || bytes[0] != 1 ||
      bytes[1] == 0 || (bytes[1] & ~(WEATHER_DETAILS_RANGE | WEATHER_DETAILS_RAIN))) {
    return false;
  }
  WeatherDetails value = {
    .flags = bytes[1],
    .valid_from = weather_details_u32(bytes + 2),
    .valid_until = weather_details_u32(bytes + 6),
    .confirmed_at = weather_details_u32(bytes + 10),
    .low_celsius = weather_details_i16(bytes + 14),
    .low_fahrenheit = weather_details_i16(bytes + 16),
    .high_celsius = weather_details_i16(bytes + 18),
    .high_fahrenheit = weather_details_i16(bytes + 20),
    .rain_percent = bytes[22],
  };
  const int64_t current = (int64_t)now;
  const int64_t confirmed = value.confirmed_at;
  if (value.valid_from == 0 || value.valid_until <= value.valid_from ||
      confirmed == 0 || confirmed > current + 300 ||
      (int64_t)value.valid_until > confirmed + WEATHER_DETAILS_MAX_AGE_SECONDS ||
      current < value.valid_from || current >= value.valid_until) {
    return false;
  }
  if ((value.flags & WEATHER_DETAILS_RANGE) &&
      (value.low_celsius < -100 || value.high_celsius > 100 ||
       value.low_celsius > value.high_celsius ||
       value.low_fahrenheit < -148 || value.high_fahrenheit > 212 ||
       value.low_fahrenheit > value.high_fahrenheit)) {
    return false;
  }
  if ((value.flags & WEATHER_DETAILS_RAIN) && value.rain_percent > 100) {
    return false;
  }
  if (result != NULL) { *result = value; }
  return true;
}

static inline bool weather_details_format(const uint8_t *bytes, size_t length,
                                          time_t now, bool show_range,
                                          bool show_rain, bool fahrenheit,
                                          char *buffer, size_t capacity) {
  if (buffer == NULL || capacity == 0) { return false; }
  buffer[0] = '\0';
  WeatherDetails value;
  if (!weather_details_read(bytes, length, now, &value)) { return false; }
  show_range = show_range && (value.flags & WEATHER_DETAILS_RANGE);
  show_rain = show_rain && (value.flags & WEATHER_DETAILS_RAIN);
  const int low = fahrenheit ? value.low_fahrenheit : value.low_celsius;
  const int high = fahrenheit ? value.high_fahrenheit : value.high_celsius;
  int written = 0;
  if (show_range && show_rain) {
    written = snprintf(buffer, capacity, "L%d° H%d° · P%u%%", low, high,
                       value.rain_percent);
  } else if (show_range) {
    written = snprintf(buffer, capacity, "L%d° H%d°", low, high);
  } else if (show_rain) {
    written = snprintf(buffer, capacity, "P%u%%", value.rain_percent);
  }
  if (written <= 0 || (size_t)written >= capacity) {
    buffer[0] = '\0';
    return false;
  }
  return true;
}
