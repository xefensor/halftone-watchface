#pragma once

#include <stddef.h>
#include <stdint.h>
#include <time.h>

#define FORECAST_SLOTS 7
#define FORECAST_MAX_BYTES (9 + FORECAST_SLOTS * 4)
#define FORECAST_MAX_AGE_SECONDS (6 * 60 * 60)

static uint32_t forecast_u32(const uint8_t *bytes) {
  return (uint32_t)bytes[0] | ((uint32_t)bytes[1] << 8) |
         ((uint32_t)bytes[2] << 16) | ((uint32_t)bytes[3] << 24);
}

static int forecast_i16(const uint8_t *bytes) {
  const unsigned value = bytes[0] | ((unsigned)bytes[1] << 8);
  return value >= 32768 ? (int)value - 65536 : (int)value;
}

static int forecast_hour_index(const uint8_t *bytes, size_t length, time_t now) {
  if (length < 9 || bytes[8] < 1 || bytes[8] > FORECAST_SLOTS ||
      length != (size_t)(9 + bytes[8] * 4)) { return -1; }
  const time_t start = forecast_u32(bytes);
  const time_t fetched = forecast_u32(bytes + 4);
  if (start <= 0 || fetched <= 0 || fetched > now + 300 ||
      now - fetched >= FORECAST_MAX_AGE_SECONDS || now < start ||
      now - start >= bytes[8] * 3600) { return -1; }
  for (int i = 0; i < bytes[8]; i++) {
    const int celsius = forecast_i16(bytes + 9 + i * 4);
    const int fahrenheit = forecast_i16(bytes + 11 + i * 4);
    if (celsius < -100 || celsius > 100 || fahrenheit < -148 || fahrenheit > 212) {
      return -1;
    }
  }
  return (now - start) / 3600;
}
