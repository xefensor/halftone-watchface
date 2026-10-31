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
  for (int rows = 0; rows <= 3; ++rows) {
    WatchLayoutGeometry cover = watch_layout_geometry(WATCH_LAYOUT_COMIC_COVER, rows, true);
    assert(cover.caption.x >= 23 && cover.caption.x + cover.caption.width <= 177);
    assert(cover.time.width == 200); // Detail toggles keep the clock anchored.
    assert(cover.time.y == 43);
    if (rows) {
      assert(cover.temperature.x + cover.temperature.width < cover.divider_x);
      assert(cover.divider_x < cover.details.x);
    } else {
      assert(cover.temperature.x + cover.temperature.width / 2 == 100);
      assert(cover.divider_x == 0);
    }
    WatchLayoutGeometry stacked = watch_layout_geometry(WATCH_LAYOUT_STACKED, rows, false);
    assert(stacked.time.x >= 0);
    assert(stacked.time.x + stacked.time.width < stacked.divider_x);
    assert(stacked.minutes.x + stacked.minutes.width < stacked.divider_x);
    assert(stacked.divider_x < stacked.temperature.x);
    assert(stacked.temperature.width >= 72);
    assert(stacked.temperature.x + stacked.temperature.width <= 185);
    assert(stacked.details.x == stacked.temperature.x);
    assert(stacked.details.width == stacked.temperature.width);
    assert(stacked.minutes.y == 111);
    assert(stacked.temperature.y == (rows ? 69 : 112));
  }
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
