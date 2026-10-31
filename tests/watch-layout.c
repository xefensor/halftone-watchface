#include <assert.h>
#include <limits.h>
#include <string.h>
#include "../src/c/watch_layout.h"

int main(void) {
  assert(watch_layout_sanitize(0) == WATCH_LAYOUT_CLASSIC);
  assert(watch_layout_sanitize(1) == WATCH_LAYOUT_COMIC_COVER);
  assert(watch_layout_sanitize(2) == WATCH_LAYOUT_STACKED);
  assert(watch_layout_sanitize(-1) == WATCH_LAYOUT_CLASSIC);
  assert(watch_layout_sanitize(3) == WATCH_LAYOUT_CLASSIC);
  assert(watch_layout_sanitize(INT_MIN) == WATCH_LAYOUT_CLASSIC);
  assert(watch_layout_sanitize(INT_MAX) == WATCH_LAYOUT_CLASSIC);
  for (int style = 0; style <= 2; ++style) {
    assert(watch_layout_effective(style, 171) == WATCH_LAYOUT_CLASSIC);
    assert(watch_layout_effective(style, 214) == WATCH_LAYOUT_CLASSIC);
    assert(watch_layout_effective(style, 215) == (WatchLayoutStyle)style);
    assert(watch_layout_effective(style, 228) == (WatchLayoutStyle)style);
  }
  const WatchLayoutRect expected[3][5] = {
    {{14,132,172,38},{18,166,78,25},{104,166,78,25},{18,187,78,25},{104,187,78,25}},
    {{20,165,84,44},{113,136,72,26},{113,160,72,26},{113,184,72,26},{20,140,84,24}},
    {{113,81,72,44},{113,128,72,25},{113,153,72,25},{113,178,72,25},{113,55,72,24}},
  };
  for (int style = 0; style <= 2; ++style) {
    for (int large = 0; large <= 1; ++large) {
      WatchLayoutGeometry full = watch_layout_geometry(style, 228, large);
      for (size_t i = 0; i < WATCH_LAYOUT_SLOT_COUNT; ++i) {
        WatchLayoutRect rect = full.slots[i].rect;
        assert(rect.x == expected[style][i].x && rect.y == expected[style][i].y);
        assert(rect.width == expected[style][i].width && rect.height == expected[style][i].height);
        assert(rect.x >= 0 && rect.x + rect.width <= 200);
        assert(rect.y >= 0 && rect.y + rect.height <= 228);
        assert(full.slots[i].font_size >= 18);
      }
      WatchLayoutGeometry peek = watch_layout_geometry(style, 171, large);
      assert(peek.slots[0].rect.x == 14 && peek.slots[0].rect.y == 118);
      assert(peek.slots[0].rect.width == 172 && peek.slots[0].rect.height == 38);
      for (size_t i = 1; i < WATCH_LAYOUT_SLOT_COUNT; ++i) {
        assert(peek.slots[i].rect.width == 0 && peek.slots[i].rect.height == 0);
      }
      WatchLayoutGeometry transition = watch_layout_geometry(style, 214, large);
      assert(transition.slots[0].rect.y >= 118 && transition.slots[0].rect.y <= 132);
      for (size_t i = 1; i < WATCH_LAYOUT_SLOT_COUNT; ++i) assert(!transition.slots[i].rect.width);
      if (style == WATCH_LAYOUT_COMIC_COVER) {
        assert(full.date.width == 184 && full.time.width == 200);
        assert(full.time.y == (large ? 35 : 50));
        assert(full.slots[0].rect.x + full.slots[0].rect.width < full.divider_x);
        assert(full.divider_x < full.slots[1].rect.x);
      } else if (style == WATCH_LAYOUT_STACKED) {
        assert(full.time.x + full.time.width < full.divider_x);
        assert(full.minutes.x + full.minutes.width < full.divider_x);
        assert(full.divider_x < full.slots[0].rect.x);
        assert(full.minutes.y == 111);
      }
    }
  }
  char unicode[32] = "Český";
  const char *shorter[] = {"Česk", "Čes", "Če", "Č", ""};
  for (size_t i = 0; i < sizeof(shorter) / sizeof(shorter[0]); ++i) {
    assert(watch_layout_pop_utf8(unicode));
    assert(strcmp(unicode, shorter[i]) == 0);
  }
  assert(!watch_layout_pop_utf8(unicode));
  assert(!watch_layout_pop_utf8(NULL));
  strcpy(unicode, "A😀");
  assert(watch_layout_pop_utf8(unicode) && strcmp(unicode, "A") == 0);
  strcpy(unicode, "units °F…");
  assert(watch_layout_pop_utf8(unicode) && strcmp(unicode, "units °F") == 0);
  char hours[3], minutes[3];
  const struct { const char *time, *hours, *minutes; } times[] = {
    {"00:00", "00", "00"}, {"23:59", "23", "59"},
    {"10:15", "10", "15"}, {"1:05", "1", "05"}, {"12:00", "12", "00"},
  };
  for (size_t i = 0; i < sizeof(times) / sizeof(times[0]); ++i) {
    assert(watch_layout_split_time(times[i].time, hours, minutes));
    assert(strcmp(hours, times[i].hours) == 0);
    assert(strcmp(minutes, times[i].minutes) == 0);
  }
  const char *invalid[] = {NULL, "", "1", "1:5", "24:00", "12:60", "12:0x",
                            "12-00", "x:00", "123:00", "12:000"};
  for (size_t i = 0; i < sizeof(invalid) / sizeof(invalid[0]); ++i) {
    assert(!watch_layout_split_time(invalid[i], hours, minutes));
    assert(hours[0] == '\0' && minutes[0] == '\0');
  }
  return 0;
}
