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
  WatchLayoutRect date, time, minutes, temperature, details, rain, icon;
  int16_t droplet_x, droplet_y;
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

// Groups use bit1 for a range and bit0 for precipitation. Keeping each metric
// in its own box lets normal values use large fonts without forcing the other
// metric to shrink, and an absent group leaves no empty row.
static inline WatchLayoutGeometry watch_layout_geometry(WatchLayoutStyle style,
    int groups, bool large, bool icon) {
  WatchLayoutGeometry result = {0};
  groups &= 3;
  const bool range = (groups & 2) != 0;
  const bool rain = (groups & 1) != 0;
  result.details = range ? (WatchLayoutRect){18, 180, rain ? 90 : 164, 32}
                         : (WatchLayoutRect){0};
  result.rain = rain ? (WatchLayoutRect){range ? 128 : 77, 180, range ? 57 : 60, 32}
                     : (WatchLayoutRect){0};
  result.droplet_x = range ? 115 : 63;
  result.droplet_y = 190;
  if (style == WATCH_LAYOUT_COMIC_COVER) {
    result.date = (WatchLayoutRect){8, 24, 184, 32};
    // Narrow times can use the tallest font; leave room for its bottom ink
    // above the optional condition icon without shrinking the clock.
    result.time = (WatchLayoutRect){0, large ? 35 : 50, 200, 112};
    result.temperature = (WatchLayoutRect){20, icon ? 159 : 151,
                                          groups ? 84 : 160, icon ? 49 : 57};
    if (icon) { result.icon = (WatchLayoutRect){groups ? 50 : 88, 140, 24, 24}; }
    result.details = range ? (WatchLayoutRect){113, rain ? 148 : 164, 72, 32}
                           : (WatchLayoutRect){0};
    result.rain = rain ? (WatchLayoutRect){128, range ? 180 : 164, 57, 30}
                       : (WatchLayoutRect){0};
    result.droplet_x = 114;
    result.droplet_y = range ? 190 : 176;
    if (groups) {
      result.divider_x = 108;
      result.divider_top = 157;
      result.divider_bottom = 204;
    }
  } else if (style == WATCH_LAYOUT_STACKED) {
    result.date = (WatchLayoutRect){8, 24, 184, 32};
    result.time = (WatchLayoutRect){7, 35, 96, 98};
    result.minutes = (WatchLayoutRect){7, 111, 96, 98};
    result.temperature = (WatchLayoutRect){113, groups ? (icon ? 82 : 69) :
                                          (icon ? 125 : 112), 72, 50};
    if (icon) { result.icon = (WatchLayoutRect){137, groups ? 55 : 97, 24, 24}; }
    result.details = range ? (WatchLayoutRect){113, rain ? 135 : 152, 72, 32}
                           : (WatchLayoutRect){0};
    result.rain = rain ? (WatchLayoutRect){128, range ? 169 : 150, 57, 32}
                       : (WatchLayoutRect){0};
    result.droplet_x = 114;
    result.droplet_y = range ? 180 : 161;
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
