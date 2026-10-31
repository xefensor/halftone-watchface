#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

#define WATCH_LAYOUT_SLOT_COUNT 5

typedef enum {
  WATCH_LAYOUT_CLASSIC = 0,
  WATCH_LAYOUT_COMIC_COVER = 1,
  WATCH_LAYOUT_STACKED = 2,
} WatchLayoutStyle;

typedef struct { int16_t x, y, width, height; } WatchLayoutRect;
typedef struct { WatchLayoutRect rect; uint8_t font_size; } WatchSlotGeometry;
typedef struct {
  WatchLayoutRect date, time, minutes;
  WatchSlotGeometry slots[WATCH_LAYOUT_SLOT_COUNT];
  int16_t divider_x, divider_top, divider_bottom;
} WatchLayoutGeometry;

static inline WatchLayoutStyle watch_layout_sanitize(int value) {
  return value >= WATCH_LAYOUT_CLASSIC && value <= WATCH_LAYOUT_STACKED
      ? (WatchLayoutStyle)value : WATCH_LAYOUT_CLASSIC;
}

static inline WatchLayoutStyle watch_layout_effective(int value, int height) {
  return height >= 215 ? watch_layout_sanitize(value) : WATCH_LAYOUT_CLASSIC;
}

static inline int watch_layout_interpolate(int full, int peek, int height) {
  if (height >= 228) { return full; }
  if (height <= 171) { return peek; }
  return peek + ((full - peek) * (height - 171) + 28) / 57;
}

// Indices are global: a missing slot never moves another slot to its place.
static inline WatchLayoutGeometry watch_layout_geometry(int selected_style,
                                                         int height, bool large) {
  WatchLayoutGeometry result = {0};
  const WatchLayoutStyle style = watch_layout_effective(selected_style, height);
  if (height < 215) {
    result.slots[0] = (WatchSlotGeometry){{14,
        watch_layout_interpolate(132, 118, height), 172, 38}, 28};
    return result;
  }
  result.slots[0] = (WatchSlotGeometry){{14, 132, 172, 38}, 28};
  result.slots[1] = (WatchSlotGeometry){{18, 166, 78, 25}, 20};
  result.slots[2] = (WatchSlotGeometry){{104, 166, 78, 25}, 20};
  result.slots[3] = (WatchSlotGeometry){{18, 187, 78, 25}, 20};
  result.slots[4] = (WatchSlotGeometry){{104, 187, 78, 25}, 20};
  if (style == WATCH_LAYOUT_COMIC_COVER) {
    result.date = (WatchLayoutRect){8, 24, 184, 32};
    result.time = (WatchLayoutRect){0, large ? 35 : 50, 200, 112};
    result.slots[0] = (WatchSlotGeometry){{20, 165, 84, 44}, 38};
    result.slots[1] = (WatchSlotGeometry){{113, 136, 72, 26}, 24};
    result.slots[2] = (WatchSlotGeometry){{113, 160, 72, 26}, 24};
    result.slots[3] = (WatchSlotGeometry){{113, 184, 72, 26}, 24};
    result.slots[4] = (WatchSlotGeometry){{20, 140, 84, 24}, 20};
    result.divider_x = 108;
    result.divider_top = 140;
    result.divider_bottom = 207;
  } else if (style == WATCH_LAYOUT_STACKED) {
    result.date = (WatchLayoutRect){8, 24, 184, 32};
    result.time = (WatchLayoutRect){7, 35, 96, 98};
    result.minutes = (WatchLayoutRect){7, 111, 96, 98};
    result.slots[0] = (WatchSlotGeometry){{113, 81, 72, 44}, 38};
    result.slots[1] = (WatchSlotGeometry){{113, 128, 72, 25}, 24};
    result.slots[2] = (WatchSlotGeometry){{113, 153, 72, 25}, 24};
    result.slots[3] = (WatchSlotGeometry){{113, 178, 72, 25}, 24};
    result.slots[4] = (WatchSlotGeometry){{113, 55, 72, 24}, 20};
    result.divider_x = 107;
    result.divider_top = 63;
    result.divider_bottom = 203;
  }
  return result;
}

// Used while fitting text to a pixel width, never as a fixed character limit.
static inline bool watch_layout_pop_utf8(char *text) {
  if (text == NULL) { return false; }
  size_t length = strlen(text);
  if (length == 0) { return false; }
  size_t at = length - 1;
  while (at > 0 && ((unsigned char)text[at] & 0xc0) == 0x80) { --at; }
  text[at] = '\0';
  return true;
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
