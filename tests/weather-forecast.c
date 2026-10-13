#include <assert.h>
#include "../src/c/weather_forecast.h"

static void write_u32(uint8_t *b, uint32_t value) {
  for (int i = 0; i < 4; i++) { b[i] = value >> (i * 8); }
}

int main(void) {
  const time_t start = 1791849600;
  const time_t fetched = start + 900;
  uint8_t bytes[FORECAST_MAX_BYTES] = {0};
  write_u32(bytes, start);
  write_u32(bytes + 4, fetched);
  bytes[8] = 7;
  for (int i = 0; i < 7; i++) {
    bytes[9 + i * 4] = 5 + i;
    bytes[11 + i * 4] = 41 + i;
  }
  assert(forecast_hour_index(bytes, sizeof(bytes), fetched) == 0);
  assert(forecast_hour_index(bytes, sizeof(bytes), start + 3600) == 1);
  assert(forecast_hour_index(bytes, sizeof(bytes), fetched + 6 * 3600 - 1) == 6);
  assert(forecast_hour_index(bytes, sizeof(bytes), fetched + 6 * 3600) == -1);
  assert(forecast_hour_index(bytes, sizeof(bytes), start - 1) == -1);
  assert(forecast_hour_index(bytes, 8, fetched) == -1);
  assert(forecast_hour_index(bytes, sizeof(bytes) - 1, fetched) == -1);
  bytes[8] = 8;
  assert(forecast_hour_index(bytes, sizeof(bytes), fetched) == -1);
  bytes[8] = 7;
  bytes[9] = 0xfb; bytes[10] = 0xff;
  assert(forecast_i16(bytes + 9) == -5);
  assert(forecast_hour_index(bytes, sizeof(bytes), fetched) == 0);
  bytes[9] = 101; bytes[10] = 0;
  assert(forecast_hour_index(bytes, sizeof(bytes), fetched) == -1);
  return 0;
}
