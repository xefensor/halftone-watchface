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
  WatchLayoutRect context;
  int16_t divider_x, divider_top, divider_bottom;
} WatchLayoutGeometry;

static inline WatchLayoutStyle watch_layout_sanitize(int value) {
  (void)value;
  return WATCH_LAYOUT_CLASSIC;
}

static inline WatchLayoutStyle watch_layout_effective(int value, int height) {
  (void)height;
  return watch_layout_sanitize(value);
}

static inline int watch_layout_interpolate(int full, int peek, int height) {
  if (height >= 228) { return full; }
  if (height <= 171) { return peek; }
  return peek + ((full - peek) * (height - 171) + 28) / 57;
}

// Ink bounds of the bundled clock glyphs (digits and colon), measured from
// the compiled resources. Position visible glyphs, not the font's line box.
static inline int watch_layout_clock_y(int font_size, int height, bool contextual) {
  const struct { uint8_t size, top, bottom; } fonts[] = {
    {64,20,66}, {72,21,74}, {76,23,78}, {80,24,82}, {84,25,86},
    {88,27,90}, {92,27,94}, {96,29,98}, {100,30,102},
    {104,32,107}, {108,33,111}
  };
  int top = 23, bottom = 78;
  for (size_t i = 0; i < sizeof(fonts) / sizeof(fonts[0]); ++i) {
    if (fonts[i].size == font_size) { top = fonts[i].top; bottom = fonts[i].bottom; break; }
  }
  const int center = watch_layout_interpolate(contextual ? 88 : 96, 88, height);
  return center - (top + bottom) / 2;
}

// Some Latin capitals extend below the nominal date-font line (especially
// Romanian comma-below letters). Keep those tails clear of the clock too.
static inline int watch_layout_date_y(int font_size, const char *text, int base_y,
                                      int height, bool contextual, bool shadow) {
  const uint8_t sizes[] = {28,24,22,20,18};
  const struct { const char *text; uint8_t bottom[5]; } tails[] = {
    {"9",{29,25,23,21,18}}, {"J",{33,28,26,23,21}},
    {"Q",{32,27,25,23,20}}, {"Ç",{35,31,28,25,23}},
    {"Ø",{31,27,25,22,20}}, {"Ą",{35,30,27,24,22}},
    {"Ş",{35,31,28,26,23}}, {"Ț",{37,32,29,26,24}}
  };
  size_t index = 4;
  for (size_t i = 0; i < sizeof(sizes)/sizeof(sizes[0]); ++i) {
    if (sizes[i] == font_size) { index = i; break; }
  }
  int bottom = font_size;
  if (text != NULL) {
    for (size_t i = 0; i < sizeof(tails)/sizeof(tails[0]); ++i) {
      if (strstr(text, tails[i].text) != NULL && tails[i].bottom[index] > bottom) {
        bottom = tails[i].bottom[index];
      }
    }
  }
  const int limit = watch_layout_interpolate(contextual ? 49 : 50, 49, height);
  const int overflow = base_y + bottom + (shadow ? 1 : 0) - limit;
  return base_y - (overflow > 0 ? overflow : 0);
}

// Indices are global: a missing slot never moves another slot to its place.
static inline WatchLayoutGeometry watch_layout_geometry(int selected_style,
                                                         int height, bool large,
                                                         bool contextual) {
  WatchLayoutGeometry result = {0};
  (void)selected_style;
  // Timeline Peek owns the lower 57px, but both chosen readings still fit.
  // Interpolate their bottom clearance through the native Peek animation.
  const int inset = large ? 14 : 18;
  const int width = 96 - inset;
  const int full_y = contextual ? (large ? 116 : 122) : 118;
  const int full_height = contextual ? (large ? 38 : 40) : 76;
  const int full_font = contextual ? (large ? 38 : 32) : (large ? 44 : 38);
  const int y = watch_layout_interpolate(full_y, 110, height);
  const int row_height = watch_layout_interpolate(full_height, 44, height);
  const int font_size = watch_layout_interpolate(full_font, large ? 32 : 28, height);
  result.slots[0] = (WatchSlotGeometry){{inset, y, width, row_height}, font_size};
  result.slots[1] = (WatchSlotGeometry){{104, y, width, row_height}, font_size};
  // A moving Peek edge brings its bezel upward before the compact threshold.
  // Yield the footer immediately instead of letting text touch that edge.
  if (height >= 228) {
    result.context = (WatchLayoutRect){inset, large ? 156 : 164,
        200 - inset * 2, large ? 48 : 40};
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
