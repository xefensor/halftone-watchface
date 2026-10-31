#include <assert.h>
#include <limits.h>
#include <string.h>
#include "../src/c/weather_icon.h"

static const time_t NOW = 1793433600;

static void put_u32(uint8_t *bytes, uint32_t value) {
  for (unsigned i = 0; i < 4; ++i) { bytes[i] = (uint8_t)(value >> (8 * i)); }
}

static void sample(uint8_t *bytes) {
  memset(bytes, 0, WEATHER_ICON_BYTES);
  bytes[0] = 1;
  bytes[1] = WEATHER_ICON_SUN;
  put_u32(bytes + 2, NOW - 3600);
  put_u32(bytes + 6, NOW + 3600);
}

int main(void) {
  uint8_t bytes[WEATHER_ICON_BYTES];
  WeatherIcon icon;
  sample(bytes);
  assert(weather_icon_read(bytes, sizeof(bytes), NOW, &icon));
  assert(icon.code == WEATHER_ICON_SUN);
  assert(icon.confirmed_at == NOW - 3600 && icon.valid_until == NOW + 3600);
  assert(weather_icon_read(bytes, sizeof(bytes), NOW, NULL));

  // Test the wire vocabulary independently of the named enum declarations.
  assert(WEATHER_ICON_SUN == 1 && WEATHER_ICON_PARTLY_CLOUDY == 2 &&
         WEATHER_ICON_CLOUDY == 3 && WEATHER_ICON_RAIN == 4 &&
         WEATHER_ICON_SNOW == 5 && WEATHER_ICON_RAIN_AND_SNOW == 6);
  for (uint8_t code = 1; code <= 6; ++code) {
    bytes[1] = code;
    assert(weather_icon_read(bytes, sizeof(bytes), NOW, &icon) && icon.code == code);
  }
  const uint8_t unknown[] = {0, 7, 50, 255};
  for (size_t i = 0; i < sizeof(unknown); ++i) {
    bytes[1] = unknown[i];
    icon.code = 17;
    assert(!weather_icon_read(bytes, sizeof(bytes), NOW, &icon));
    assert(icon.code == 17); // Invalid replacements cannot partially copy.
  }
  sample(bytes);
  assert(!weather_icon_read(NULL, sizeof(bytes), NOW, NULL));
  assert(!weather_icon_read(bytes, 0, NOW, NULL));
  assert(!weather_icon_read(bytes, sizeof(bytes) - 1, NOW, NULL));
  assert(!weather_icon_read(bytes, sizeof(bytes) + 1, NOW, NULL));
  bytes[0] = 0;
  assert(!weather_icon_read(bytes, sizeof(bytes), NOW, NULL));
  bytes[0] = 2;
  assert(!weather_icon_read(bytes, sizeof(bytes), NOW, NULL));

  // Original confirmation is retained across reads; the two-hour maximum and
  // earlier source expiry are exclusive, even at exactly the boundary.
  sample(bytes);
  assert(weather_icon_read(bytes, sizeof(bytes), NOW + 3599, &icon));
  assert(icon.confirmed_at == NOW - 3600);
  assert(!weather_icon_read(bytes, sizeof(bytes), NOW + 3600, NULL));
  put_u32(bytes + 6, NOW + 60);
  assert(weather_icon_read(bytes, sizeof(bytes), NOW + 59, NULL));
  assert(!weather_icon_read(bytes, sizeof(bytes), NOW + 60, NULL));
  sample(bytes);
  put_u32(bytes + 6, NOW + 3601);
  assert(!weather_icon_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_u32(bytes + 2, 0);
  assert(!weather_icon_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_u32(bytes + 6, 0);
  assert(!weather_icon_read(bytes, sizeof(bytes), NOW, NULL));
  put_u32(bytes + 6, NOW - 3600);
  assert(!weather_icon_read(bytes, sizeof(bytes), NOW, NULL));

  // The phone/watch skew allowance is bounded and does not extend expiry.
  sample(bytes);
  put_u32(bytes + 2, NOW + 300);
  assert(weather_icon_read(bytes, sizeof(bytes), NOW, NULL));
  put_u32(bytes + 2, NOW + 301);
  assert(!weather_icon_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  assert(!weather_icon_read(bytes, sizeof(bytes), 0, NULL));
  assert(!weather_icon_read(bytes, sizeof(bytes), (time_t)-1, NULL));

  // Wire times are unsigned 32-bit; widen duration arithmetic before adding.
  put_u32(bytes + 2, UINT32_MAX - 7200);
  put_u32(bytes + 6, UINT32_MAX);
  assert(weather_icon_read(bytes, sizeof(bytes), (time_t)(UINT32_MAX - 3600), &icon));
  assert(icon.confirmed_at == UINT32_MAX - 7200 && icon.valid_until == UINT32_MAX);
  assert(!weather_icon_read(bytes, sizeof(bytes), (time_t)UINT32_MAX, NULL));
  put_u32(bytes + 2, UINT32_MAX - 7201);
  assert(!weather_icon_read(bytes, sizeof(bytes), (time_t)(UINT32_MAX - 3600), NULL));
  if (sizeof(time_t) > 4) {
    assert(!weather_icon_read(bytes, sizeof(bytes), (time_t)INT64_MAX, NULL));
  }
  return 0;
}
