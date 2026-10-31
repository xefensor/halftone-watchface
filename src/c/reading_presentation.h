#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

#define READING_PART_BYTES 49

typedef struct {
  char number[READING_PART_BYTES];
  char unit[READING_PART_BYTES];
} ReadingParts;

// Only split complete numeric readings with known suffixes. Clock times,
// dates, ranges and arbitrary source text retain their original presentation.
static inline bool reading_parts(const char *text, ReadingParts *result) {
  if (text == NULL || result == NULL || !text[0]) { return false; }
  size_t at = text[0] == '-' || text[0] == '+' ? 1 :
      strncmp(text, "−", 3) == 0 ? 3 : 0;
  const size_t first_digit = at;
  while (text[at] >= '0' && text[at] <= '9') { ++at; }
  if (at == first_digit) { return false; }
  if (text[at] == '.' || text[at] == ',') {
    ++at;
    const size_t decimal = at;
    while (text[at] >= '0' && text[at] <= '9') { ++at; }
    if (at == decimal) { return false; }
  }
  const size_t number_length = at;
  for (;;) {
    if (text[at] == ' ') { ++at; }
    else if (strncmp(text + at, "\xc2\xa0", 2) == 0) { at += 2; }
    else if (strncmp(text + at, "\xe2\x80\xaf", 3) == 0) { at += 3; }
    else { break; }
  }
  const char *unit = text + at;
  const char *const units[] = {"", "°C", "°F", "°", "%", "km/h", "m/s", "mph",
    "knots", "hPa", "mm", "cm", "km", "mi", "m", "ft", "UV", "k", "s", "min", "h",
    "EUR", "USD", "CZK", "Kč", "€", "£"};
  bool known = false;
  for (size_t i = 0; i < sizeof(units) / sizeof(units[0]); ++i) {
    if (strcmp(unit, units[i]) == 0) { known = true; break; }
  }
  const size_t unit_length = strlen(unit);
  if (!known || number_length >= READING_PART_BYTES || unit_length >= READING_PART_BYTES) { return false; }
  ReadingParts value = {{0}, {0}};
  memcpy(value.number, text, number_length);
  memcpy(value.unit, unit, unit_length);
  *result = value;
  return true;
}

static inline bool reading_is_probability(const ReadingParts *value) {
  if (value == NULL || strcmp(value->unit, "%") != 0 || value->number[0] == '-') { return false; }
  size_t at = value->number[0] == '+' ? 1 : 0;
  if (value->number[at] < '0' || value->number[at] > '9') { return false; }
  unsigned whole = 0;
  while (value->number[at] >= '0' && value->number[at] <= '9') {
    if (whole > 100) { return false; }
    whole = whole * 10 + (unsigned)(value->number[at++] - '0');
  }
  if (whole > 100) { return false; }
  if (value->number[at] == '.' || value->number[at] == ',') {
    ++at;
    while (value->number[at] >= '0' && value->number[at] <= '9') {
      if (whole == 100 && value->number[at] != '0') { return false; }
      ++at;
    }
  }
  return value->number[at] == '\0';
}

static inline bool reading_hide_artwork(int title_width, int full_width, int artwork_inset) {
  return title_width > full_width - artwork_inset && title_width <= full_width;
}

static inline int reading_context_artwork_size(bool two_lines, int panel_height) {
  return two_lines ? panel_height - 8 : 28;
}

static inline int reading_context_artwork_y(int panel_height, int artwork_size) {
  return (panel_height - artwork_size) / 2 + 2;
}

typedef struct { int x, y, size; } ReadingCoverCrop;

static inline ReadingCoverCrop reading_cover_crop(int width, int height) {
  if (width <= 0 || height <= 0) { return (ReadingCoverCrop){0,0,0}; }
  const int size = width < height ? width : height;
  return (ReadingCoverCrop){(width - size) / 2, (height - size) / 2, size};
}

static inline unsigned reading_dissolve_radius(unsigned frame) {
  return frame < 3 ? 3 - frame : 0;
}

static inline uint32_t reading_hash_bytes(uint32_t hash, const void *data, size_t length) {
  const uint8_t *bytes = (const uint8_t *)data;
  for (size_t i = 0; i < length; ++i) { hash = (hash ^ bytes[i]) * UINT32_C(16777619); }
  return hash;
}
