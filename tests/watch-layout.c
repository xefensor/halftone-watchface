#include <assert.h>
#include <limits.h>
#include <string.h>
#include "../src/c/watch_layout.h"

int main(void) {
  const int old_styles[] = {INT_MIN, -1, 0, 1, 2, 3, INT_MAX};
  for (size_t style = 0; style < sizeof(old_styles)/sizeof(old_styles[0]); ++style) {
    assert(watch_layout_sanitize(old_styles[style]) == WATCH_LAYOUT_CLASSIC);
    for (int large = 0; large <= 1; ++large) {
      for (int contextual = 0; contextual <= 1; ++contextual) {
        WatchLayoutGeometry full = watch_layout_geometry(old_styles[style], 228, large, contextual);
        const WatchLayoutRect expected[5] = {
          {18,contextual ? 128 : 126,78,contextual ? 36 : 76},
          {104,contextual ? 128 : 126,78,contextual ? 36 : 76},
          {0,0,0,0},{0,0,0,0},{0,0,0,0}
        };
        for (size_t i = 0; i < WATCH_LAYOUT_SLOT_COUNT; ++i) {
          WatchLayoutRect rect = full.slots[i].rect;
          assert(memcmp(&rect, &expected[i], sizeof(rect)) == 0);
          assert(rect.x >= 0 && rect.x + rect.width <= 200);
          assert(rect.y >= 0 && rect.y + rect.height <= 228);
          assert(i >= 2 || full.slots[i].font_size == (contextual ? 28 : 38));
        }
        assert(full.slots[0].rect.y == full.slots[1].rect.y);
        assert(full.slots[0].rect.height == full.slots[1].rect.height);
        assert(full.slots[1].rect.x - full.slots[0].rect.x - full.slots[0].rect.width == 8);
        // Both columns remain usable even with two compact low-battery icons
        // at the left and a lost-phone indicator at the right.
        assert(full.slots[0].rect.width - 24 >= 54);
        assert(full.slots[1].rect.width - 12 >= 66);
        assert(full.context.x == 18 && full.context.y == 164);
        assert(full.context.width == 164 && full.context.height == 43);
        assert(!full.divider_x && !full.minutes.width);
        if (contextual) {
          assert(full.slots[0].rect.y + full.slots[0].rect.height <= full.context.y);
        }
        // Timeline owns the bottom area. Its compact state preserves global
        // ID1 without pulling a missing value or the second ID into its place.
        for (int height = 171; height <= 228; ++height) {
          WatchLayoutGeometry g = watch_layout_geometry(old_styles[style], height, large, contextual);
          assert(watch_layout_effective(old_styles[style], height) == WATCH_LAYOUT_CLASSIC);
          if (height < 215) {
            assert(g.slots[0].rect.width == 172);
            assert(g.slots[0].rect.y >= 118 && g.slots[0].rect.y <= 126);
            assert(!g.context.width);
            for (size_t i = 1; i < WATCH_LAYOUT_SLOT_COUNT; ++i) assert(!g.slots[i].rect.width);
          } else {
            assert(g.context.width == (height >= 228 ? 164 : 0));
            if (g.context.width) { assert(g.context.y + g.context.height <= height - 18); }
            assert(g.slots[0].rect.width == 78 && g.slots[1].rect.width == 78);
            for (size_t i = 2; i < WATCH_LAYOUT_SLOT_COUNT; ++i) assert(!g.slots[i].rect.width);
          }
        }
        WatchLayoutGeometry peek = watch_layout_geometry(old_styles[style], 171, large, contextual);
        assert(peek.slots[0].rect.y == 118);
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
