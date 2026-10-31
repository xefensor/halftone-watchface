#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef enum {
  WATCH_LAYOUT_CLASSIC = 0,
  WATCH_LAYOUT_COMIC_COVER = 1,
  WATCH_LAYOUT_STACKED = 2,
} WatchLayoutStyle;

typedef struct {
  int16_t x, y, width, height;
} WatchLayoutRect;

typedef struct {
  WatchLayoutRect date, time, minutes, temperature, details, caption;
  int16_t divider_x, divider_top, divider_bottom;
} WatchLayoutGeometry;

static inline WatchLayoutStyle watch_layout_sanitize(int value) {
  return value >= WATCH_LAYOUT_CLASSIC && value <= WATCH_LAYOUT_STACKED
      ? (WatchLayoutStyle)value : WATCH_LAYOUT_CLASSIC;
}

// Quick View always shares the existing compact clock instead of squeezing a
// second clock row or decorative panel into the unobstructed screen area.
static inline WatchLayoutStyle watch_layout_effective(int value, int height) {
  return height >= 215 ? watch_layout_sanitize(value) : WATCH_LAYOUT_CLASSIC;
}

static inline WatchLayoutGeometry watch_layout_geometry(WatchLayoutStyle style,
                                                        int rows, bool large) {
  WatchLayoutGeometry result = {0};
  if (rows < 0) { rows = 0; }
  if (rows > 3) { rows = 3; }
  if (style == WATCH_LAYOUT_COMIC_COVER) {
    result.date = (WatchLayoutRect){25, 24, 150, 30};
    result.caption = (WatchLayoutRect){23, 27, 154, 27};
    result.time = (WatchLayoutRect){0, large ? 43 : 50, 200, 112};
    result.temperature = rows ? (WatchLayoutRect){20, 151, 87, 57}
                              : (WatchLayoutRect){20, 151, 160, 57};
    result.details = (WatchLayoutRect){122, rows == 1 ? 166 : rows == 2 ? 158 : 150,
                                      58, 63};
    if (rows) {
      result.divider_x = 112;
      result.divider_top = 158;
      result.divider_bottom = 203;
    }
  } else if (style == WATCH_LAYOUT_STACKED) {
    result.date = (WatchLayoutRect){20, 24, 160, 30};
    result.time = (WatchLayoutRect){7, 35, 96, 98};
    result.minutes = (WatchLayoutRect){7, 111, 96, 98};
    result.temperature = (WatchLayoutRect){113, rows ? 69 : 112, 72, 50};
    result.details = (WatchLayoutRect){113, rows == 1 ? 145 : rows == 2 ? 136 : 128,
                                      72, 65};
    result.divider_x = 107;
    result.divider_top = 63;
    result.divider_bottom = 201;
  }
  return result;
}

// Split the already-formatted clock, preserving 12-hour leading-zero removal
// and the two-digit minute field. Reject malformed input without partial text.
static inline bool watch_layout_split_time(const char *text,
                                           char hours[3], char minutes[3]) {
  if (hours == NULL || minutes == NULL) { return false; }
  hours[0] = minutes[0] = '\0';
  if (text == NULL) { return false; }
  size_t length = 0;
  while (length < 6 && text[length]) { ++length; }
  if (length != 4 && length != 5) { return false; }
  const size_t colon = length - 3;
  if (text[colon] != ':' || text[colon + 1] < '0' || text[colon + 1] > '5' ||
      text[colon + 2] < '0' || text[colon + 2] > '9') { return false; }
  int hour = 0;
  for (size_t i = 0; i < colon; ++i) {
    if (text[i] < '0' || text[i] > '9') { return false; }
    hour = hour * 10 + text[i] - '0';
  }
  if (hour > 23) { return false; }
  for (size_t i = 0; i < colon; ++i) { hours[i] = text[i]; }
  hours[colon] = '\0';
  minutes[0] = text[colon + 1];
  minutes[1] = text[colon + 2];
  minutes[2] = '\0';
  return true;
}
