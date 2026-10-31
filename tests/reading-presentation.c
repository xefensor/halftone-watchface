#include <assert.h>
#include <string.h>
#include "../src/c/reading_presentation.h"

int main(void) {
  const struct { const char *text, *number, *unit; } valid[] = {
    {"7°C", "7", "°C"}, {"-148 °F", "-148", "°F"}, {"40%", "40", "%"},
    {"12,5 km/h", "12,5", "km/h"}, {"+3.2 m/s", "+3.2", "m/s"},
    {"0", "0", ""}, {"4.8k", "4.8", "k"}, {"3 UV", "3", "UV"},
    {"150 Kč", "150", "Kč"}, {"100.00%", "100.00", "%"},
    {"−7,5\xc2\xa0°C", "−7,5", "°C"}, {"8\xe2\x80\xaf°C", "8", "°C"},
  };
  for (size_t i = 0; i < sizeof(valid) / sizeof(valid[0]); ++i) {
    ReadingParts p;
    assert(reading_parts(valid[i].text, &p));
    assert(strcmp(p.number, valid[i].number) == 0 && strcmp(p.unit, valid[i].unit) == 0);
  }
  const char *invalid[] = {NULL, "", "12:42", "19/5", "31.10.2026", "Room 7", "7 rain",
    "7 ° C", "7.", ".5%", "NaN%", "1,234,567", "-", "12 % extra"};
  for (size_t i = 0; i < sizeof(invalid) / sizeof(invalid[0]); ++i) {
    ReadingParts p = {{'X',0}, {'Y',0}};
    assert(!reading_parts(invalid[i], &p));
    assert(p.number[0] == 'X' && p.unit[0] == 'Y');
  }
  const char *probabilities[] = {"0%", "40%", "99,9%", "100%", "+100.00%"};
  for (size_t i = 0; i < sizeof(probabilities) / sizeof(probabilities[0]); ++i) {
    ReadingParts p; assert(reading_parts(probabilities[i], &p)); assert(reading_is_probability(&p));
  }
  const char *not_probabilities[] = {"-1%", "-0%", "101%", "100.1%", "100,01%", "999999999999999999%", "40°C"};
  for (size_t i = 0; i < sizeof(not_probabilities) / sizeof(not_probabilities[0]); ++i) {
    ReadingParts p; assert(reading_parts(not_probabilities[i], &p)); assert(!reading_is_probability(&p));
  }
  assert(reading_hide_artwork(150, 170, 30));
  assert(!reading_hide_artwork(130, 170, 30));
  assert(!reading_hide_artwork(180, 170, 30));
  assert(reading_dissolve_radius(0) == 3 && reading_dissolve_radius(1) == 2);
  assert(reading_dissolve_radius(2) == 1 && reading_dissolve_radius(3) == 0);
  assert(reading_dissolve_radius(1000) == 0);
  const uint32_t first = reading_hash_bytes(UINT32_C(2166136261), "Title", 5);
  assert(first == reading_hash_bytes(UINT32_C(2166136261), "Title", 5));
  assert(first != reading_hash_bytes(UINT32_C(2166136261), "Other", 5));
  return 0;
}
