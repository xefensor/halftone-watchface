#include <assert.h>
#include <limits.h>
#include <string.h>
#include "../src/c/watch_layout.h"

int main(void) {
  const struct { int size, top, bottom; } clock_fonts[] = {
    {64,20,66},{72,21,74},{76,23,78},{80,24,82},{84,25,86},
    {88,27,90},{92,27,94},{96,29,98},{100,30,102},{104,32,107},{108,33,111}
  };
  for (size_t i = 0; i < sizeof(clock_fonts)/sizeof(clock_fonts[0]); ++i) {
    const int y = watch_layout_clock_y(clock_fonts[i].size, 228, false);
    // Date ink ends at46; full-view readings start at148. Even the tallest
    // narrow12-hour font must retain breathing room on both sides.
    assert(y + clock_fonts[i].top >= 56);
    assert(y + clock_fonts[i].bottom <= 136);
    if (clock_fonts[i].size <= 88) {
      const int compact = watch_layout_clock_y(clock_fonts[i].size, 228, true);
      assert(compact + clock_fonts[i].top >= 56);
      assert(compact + clock_fonts[i].bottom <= 121);
    }
    for (int height = 171; height < 228; ++height) {
      int change = watch_layout_clock_y(clock_fonts[i].size, height + 1, false) -
          watch_layout_clock_y(clock_fonts[i].size, height, false);
      assert(change >= 0 && change <= 1);
    }
  }
  assert(watch_layout_clock_y(72,171,false)==41);
  assert(watch_layout_clock_y(64,171,false)==45);
  assert(watch_layout_date_y(24,"SATURDAY · 31.10.",26,228,false,false)==26);
  assert(watch_layout_date_y(28,"MARȚI · 1.1.",22,228,false,true)==12);
  assert(watch_layout_date_y(28,"MARȚI · 1.1.",22,228,true,true)==11);
  assert(watch_layout_date_y(28,"MARȚI · 1.1.",20,171,false,true)==11);
  const int old_styles[] = {INT_MIN, -1, 0, 1, 2, 3, INT_MAX};
  for (size_t style = 0; style < sizeof(old_styles)/sizeof(old_styles[0]); ++style) {
    assert(watch_layout_sanitize(old_styles[style]) == WATCH_LAYOUT_CLASSIC);
    for (int large = 0; large <= 1; ++large) {
      for (int contextual = 0; contextual <= 1; ++contextual) {
        WatchLayoutGeometry full = watch_layout_geometry(old_styles[style], 228, large, contextual);
        for (size_t i = 0; i < WATCH_LAYOUT_SLOT_COUNT; ++i) {
          WatchLayoutRect rect = full.slots[i].rect;
          assert(rect.x >= 0 && rect.x + rect.width <= 200);
          assert(rect.y >= 0 && rect.y + rect.height <= 228);
          if (i < 2) {
            assert(rect.width >= 78 && rect.height >= 38);
            assert(full.slots[i].font_size >= (contextual ? 32 : 38));
          } else { assert(!rect.width && !rect.height); }
        }
        assert(full.slots[0].rect.y == full.slots[1].rect.y);
        assert(full.slots[0].rect.height == full.slots[1].rect.height);
        assert(full.slots[1].rect.x - full.slots[0].rect.x - full.slots[0].rect.width == 8);
        // Both columns remain usable even with two compact low-battery icons
        // at the left and a lost-phone indicator at the right.
        assert(full.slots[0].rect.width - 24 >= 54);
        assert(full.slots[1].rect.width - 12 >= 66);
        assert(full.slots[0].rect.x == 200 - full.slots[1].rect.x - full.slots[1].rect.width);
        assert(full.context.width >= 164 && full.context.height >= 40);
        assert(full.context.y + full.context.height <= 210);
        assert(!full.divider_x && !full.minutes.width);
        if (contextual) {
          assert(full.slots[0].rect.y + full.slots[0].rect.height <= full.context.y);
        }
        // Timeline owns the bottom area, while both global IDs retain equal
        // horizontal columns. Check every animation height, not only endpoints.
        for (int height = 171; height <= 228; ++height) {
          WatchLayoutGeometry g = watch_layout_geometry(old_styles[style], height, large, contextual);
          assert(watch_layout_effective(old_styles[style], height) == WATCH_LAYOUT_CLASSIC);
          assert(g.slots[0].rect.width >= 78);
          assert(g.slots[0].rect.width == g.slots[1].rect.width);
          assert(g.slots[0].rect.y == g.slots[1].rect.y);
          assert(g.slots[0].rect.height == g.slots[1].rect.height);
          assert(g.slots[1].rect.x - g.slots[0].rect.x - g.slots[0].rect.width == 8);
          for (size_t i = 0; i < 2; ++i) {
            const WatchLayoutRect r = g.slots[i].rect;
            assert(r.y >= 110);
            assert(r.y + r.height <= height - 17);
            WatchLayoutGeometry bigger = watch_layout_geometry(old_styles[style], height, true, contextual);
            assert(bigger.slots[i].font_size >= g.slots[i].font_size);
            if (height < 228) {
              WatchLayoutGeometry next = watch_layout_geometry(old_styles[style], height + 1, large, contextual);
              // Returning from Peek must arrive at the full layout without
              // a final-frame position/size jump, including contextual rows.
              int dy = next.slots[i].rect.y - r.y;
              int dh = next.slots[i].rect.height - r.height;
              int df = next.slots[i].font_size - g.slots[i].font_size;
              assert(dy >= -1 && dy <= 1);
              assert(dh >= -1 && dh <= 1);
              assert(df >= -1 && df <= 1);
            }
          }
          if (height < 228) { assert(!g.context.width); }
          else {
            assert(g.context.width >= 164);
            assert(g.context.y + g.context.height <= height - 18);
          }
          for (size_t i = 2; i < WATCH_LAYOUT_SLOT_COUNT; ++i) assert(!g.slots[i].rect.width);
        }
        WatchLayoutGeometry peek = watch_layout_geometry(old_styles[style], 171, large, contextual);
        assert(peek.slots[0].rect.width && peek.slots[1].rect.width);
        assert(peek.slots[0].font_size >= 28);
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
