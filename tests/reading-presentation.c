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
  // Music covers and notification icons share an inset box, lowered two
  // pixels from center. Both two-line sizes end at screen y202.
  assert(reading_context_artwork_size(true,48)==40);
  assert(reading_context_artwork_size(true,40)==32);
  assert(reading_context_artwork_size(false,48)==28);
  assert(reading_context_artwork_size(false,40)==28);
  assert(reading_context_artwork_y(48,40)==6);
  assert(reading_context_artwork_y(40,32)==6);
  assert(reading_context_artwork_y(48,28)==12);
  assert(reading_context_artwork_y(40,28)==8);
  // The inset cover keeps short titles, while a title that fits only in the
  // full row can still reclaim its width instead of shrinking unnecessarily.
  assert(!reading_hide_artwork(80,170,46));
  assert(reading_hide_artwork(130,170,46));
  const ReadingCoverCrop landscape = reading_cover_crop(24,12);
  assert(landscape.x==6 && landscape.y==0 && landscape.size==12);
  const ReadingCoverCrop portrait = reading_cover_crop(12,24);
  assert(portrait.x==0 && portrait.y==6 && portrait.size==12);
  const ReadingCoverCrop square = reading_cover_crop(24,24);
  assert(square.x==0 && square.y==0 && square.size==24);
  assert(reading_cover_crop(0,24).size==0);
  for (int width=1;width<=24;++width) for (int height=1;height<=24;++height) {
    const ReadingCoverCrop crop = reading_cover_crop(width,height);
    assert(crop.x>=0 && crop.y>=0 && crop.size>0);
    assert(crop.x+crop.size<=width && crop.y+crop.size<=height);
  }
  assert(reading_dissolve_radius(0) == 3 && reading_dissolve_radius(1) == 2);
  assert(reading_dissolve_radius(2) == 1 && reading_dissolve_radius(3) == 0);
  assert(reading_dissolve_radius(1000) == 0);
  const uint32_t first = reading_hash_bytes(UINT32_C(2166136261), "Title", 5);
  assert(first == reading_hash_bytes(UINT32_C(2166136261), "Title", 5));
  assert(first != reading_hash_bytes(UINT32_C(2166136261), "Other", 5));
  return 0;
}
