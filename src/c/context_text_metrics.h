#pragma once

// Generated from the compiled context PFO bitmaps; do not edit the tables.
// Regenerate after building with:
// python3 scripts/check-clock-fonts.py --pbw dist/<release>.pbw --write-context-metrics
// Bottoms are foreground ink bounds, exclusive, relative to the text origin.
// Bundled glyphs are exact. Firmware emoji fonts align to the nominal baseline;
// other missing glyphs use the bundled wildcard. Firmware-provided glyph ink
// can vary, so the emoji policy is baseline alignment rather than exact bounds.
#include <stdint.h>

static const uint16_t s_context_text_codepoints[] = {
  0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027, 0x0028, 0x0029,
  0x002a, 0x002b, 0x002c, 0x002d, 0x002e, 0x002f, 0x0030, 0x0031, 0x0032, 0x0033,
  0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x003a, 0x003b, 0x003c, 0x003d,
  0x003e, 0x003f, 0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047,
  0x0048, 0x0049, 0x004a, 0x004b, 0x004c, 0x004d, 0x004e, 0x004f, 0x0050, 0x0051,
  0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005a, 0x005b,
  0x005c, 0x005d, 0x005e, 0x005f, 0x0060, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065,
  0x0066, 0x0067, 0x0068, 0x0069, 0x006a, 0x006b, 0x006c, 0x006d, 0x006e, 0x006f,
  0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079,
  0x007a, 0x007b, 0x007c, 0x007d, 0x007e, 0x00a3, 0x00b0, 0x00b2, 0x00b3, 0x00b5,
  0x00b7, 0x00c0, 0x00c1, 0x00c2, 0x00c3, 0x00c4, 0x00c5, 0x00c6, 0x00c7, 0x00c9,
  0x00cc, 0x00cd, 0x00ce, 0x00d1, 0x00d3, 0x00d4, 0x00d5, 0x00d6, 0x00d8, 0x00da,
  0x00dc, 0x00dd, 0x00df, 0x00e0, 0x00e1, 0x00e2, 0x00e3, 0x00e4, 0x00e5, 0x00e6,
  0x00e7, 0x00e9, 0x00ec, 0x00ed, 0x00ee, 0x00f1, 0x00f3, 0x00f4, 0x00f5, 0x00f6,
  0x00f8, 0x00fa, 0x00fc, 0x00fd, 0x0102, 0x0103, 0x0104, 0x0105, 0x0106, 0x0107,
  0x010c, 0x010d, 0x010e, 0x010f, 0x0118, 0x0119, 0x011a, 0x011b, 0x0130, 0x0131,
  0x0139, 0x013a, 0x013d, 0x013e, 0x0141, 0x0142, 0x0147, 0x0148, 0x0150, 0x0151,
  0x0154, 0x0155, 0x0158, 0x0159, 0x015a, 0x015b, 0x015e, 0x015f, 0x0160, 0x0161,
  0x0164, 0x0165, 0x016e, 0x016f, 0x0170, 0x0171, 0x0179, 0x017a, 0x017b, 0x017c,
  0x017d, 0x017e, 0x0218, 0x0219, 0x021a, 0x021b, 0x1e9e, 0x2018, 0x2019, 0x201c,
  0x201d, 0x2026, 0x20ac, 0x2212, 0x25af,
};

// Font order: 28, 24, 20, 18. Space is blank; wildcard uses the first PFO entry.
static const uint8_t s_context_text_bottoms[4][205] = {
  { // 28px
  0, 28, 17, 28, 32, 29, 28, 17, 32, 32, 19, 25, 33, 21, 28, 31, 28, 28, 28, 28,
  28, 28, 28, 28, 28, 29, 28, 33, 25, 24, 25, 28, 34, 28, 28, 28, 28, 28, 28, 28,
  28, 28, 33, 28, 28, 28, 28, 28, 28, 32, 28, 28, 28, 28, 28, 28, 28, 28, 28, 31,
  31, 31, 14, 33, 11, 28, 28, 28, 28, 28, 28, 34, 28, 28, 34, 28, 28, 28, 28, 28,
  34, 34, 28, 28, 28, 28, 28, 28, 28, 34, 28, 32, 31, 32, 22, 28, 18, 19, 19, 34,
  22, 28, 28, 28, 28, 28, 28, 28, 35, 28, 28, 28, 28, 28, 28, 28, 28, 28, 31, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 35, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  31, 28, 28, 34, 28, 28, 35, 35, 28, 28, 28, 28, 28, 28, 35, 34, 28, 28, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 35, 35, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 37, 37, 37, 37, 28, 15, 14, 15,
  14, 28, 28, 21, 38,
  },
  { // 24px
  0, 24, 15, 24, 28, 25, 24, 15, 28, 28, 16, 21, 28, 18, 24, 27, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 25, 24, 28, 22, 21, 22, 24, 29, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 28, 24, 24, 24, 24, 24, 24, 27, 24, 24, 24, 24, 24, 24, 24, 24, 24, 27,
  27, 27, 11, 28, 9, 24, 24, 24, 24, 24, 24, 29, 24, 24, 29, 24, 24, 24, 24, 24,
  29, 29, 24, 24, 24, 24, 24, 24, 24, 29, 24, 27, 26, 27, 18, 24, 15, 16, 16, 29,
  19, 24, 24, 24, 24, 24, 24, 24, 31, 24, 24, 24, 24, 24, 24, 24, 24, 24, 27, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 30, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  27, 24, 24, 29, 24, 24, 30, 30, 24, 24, 24, 24, 24, 24, 30, 29, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 31, 30, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 32, 32, 32, 32, 24, 13, 13, 13,
  13, 24, 24, 18, 33,
  },
  { // 20px
  0, 20, 12, 20, 23, 20, 20, 12, 23, 23, 13, 18, 23, 15, 20, 22, 20, 20, 20, 20,
  20, 20, 20, 20, 20, 21, 20, 23, 18, 17, 18, 20, 24, 20, 20, 20, 20, 20, 20, 20,
  20, 20, 23, 20, 20, 20, 20, 20, 20, 23, 20, 20, 20, 20, 20, 20, 20, 20, 20, 22,
  22, 22, 9, 23, 8, 20, 20, 20, 20, 20, 20, 24, 20, 20, 24, 20, 20, 20, 20, 20,
  24, 24, 20, 20, 20, 20, 20, 20, 20, 24, 20, 23, 22, 23, 15, 20, 13, 14, 14, 24,
  16, 20, 20, 20, 20, 20, 20, 20, 25, 20, 20, 20, 20, 20, 20, 20, 20, 20, 22, 20,
  20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 25, 20, 20, 20, 20, 20, 20, 20, 20, 20,
  22, 20, 20, 24, 20, 20, 24, 25, 20, 20, 20, 20, 20, 20, 24, 24, 20, 20, 20, 20,
  20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 26, 25, 20, 20,
  20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 26, 26, 26, 26, 20, 11, 10, 11,
  10, 20, 20, 15, 27,
  },
  { // 18px
  0, 18, 10, 18, 21, 18, 18, 10, 21, 21, 11, 16, 21, 13, 18, 20, 18, 18, 18, 18,
  18, 18, 18, 18, 18, 18, 18, 21, 16, 15, 16, 18, 22, 18, 18, 18, 18, 18, 18, 18,
  18, 18, 21, 18, 18, 18, 18, 18, 18, 20, 18, 18, 18, 18, 18, 18, 18, 18, 18, 20,
  20, 20, 8, 21, 7, 18, 18, 18, 18, 18, 18, 22, 18, 18, 22, 18, 18, 18, 18, 18,
  22, 22, 18, 18, 18, 18, 18, 18, 18, 22, 18, 21, 20, 21, 14, 18, 11, 12, 12, 22,
  14, 18, 18, 18, 18, 18, 18, 18, 23, 18, 18, 18, 18, 18, 18, 18, 18, 18, 20, 18,
  18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 23, 18, 18, 18, 18, 18, 18, 18, 18, 18,
  20, 18, 18, 22, 18, 18, 22, 23, 18, 18, 18, 18, 18, 18, 22, 22, 18, 18, 18, 18,
  18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 23, 23, 18, 18,
  18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 24, 24, 24, 24, 18, 10, 10, 10,
  10, 18, 18, 13, 24,
  }
};

// Invalid UTF-8 consumes one byte and uses the bundled missing-glyph metric.
// Reading continuations sequentially avoids crossing a truncated NUL string.
static inline uint32_t context_text_next_codepoint(const unsigned char **cursor) {
  const unsigned char *start = *cursor;
  const unsigned char lead = *start;
  *cursor = start + 1;
  if (lead < 0x80) return lead;
  int count;
  uint32_t value, minimum;
  if (lead >= 0xc2 && lead <= 0xdf) {
    count = 2; value = lead & 0x1f; minimum = 0x80;
  } else if (lead >= 0xe0 && lead <= 0xef) {
    count = 3; value = lead & 0x0f; minimum = 0x800;
  } else if (lead >= 0xf0 && lead <= 0xf4) {
    count = 4; value = lead & 0x07; minimum = 0x10000;
  } else {
    return 0x25af;
  }
  for (int index = 1; index < count; ++index) {
    const unsigned char next = start[index];
    if ((next & 0xc0) != 0x80) return 0x25af;
    value = (value << 6) | (next & 0x3f);
  }
  if (value < minimum || value > 0x10ffff ||
      (value >= 0xd800 && value <= 0xdfff)) return 0x25af;
  *cursor = start + count;
  return value;
}

// Match PebbleOS v4.33.1 codepoint_is_emoji(), including BMP emoji.
static inline int context_text_is_emoji(uint32_t value) {
  return (value >= 0x1f300 && value <= 0x1faff) ||
      (value >= 0x2300 && value <= 0x23ff) ||
      (value >= 0x2600 && value <= 0x27bf) ||
      (value >= 0x2b00 && value <= 0x2bff) ||
      (value >= 0x1f100 && value <= 0x1f2ff) ||
      value == 0x2192 || value == 0x25aa || value == 0x25ab ||
      value == 0x25b6 || value == 0x25ba || value == 0x25c0 ||
      (value >= 0x25fb && value <= 0x25fe);
}

// These Unicode spaces, formatting marks and modifiers have no drawn ink.
// In particular, emoji variation selectors/ZWJ must not introduce a wildcard.
static inline int context_text_has_no_ink(uint32_t value) {
  return value <= 0x20 || (value >= 0x7f && value <= 0x9f) || value == 0xa0 ||
      (value >= 0x2000 && value <= 0x200f) ||
      (value >= 0x202a && value <= 0x202f) ||
      (value >= 0x2060 && value <= 0x206f) || value == 0x205f ||
      value == 0x20e3 || value == 0x3000 || value == 0xfe0e || value == 0xfe0f ||
      value == 0xfeff || (value >= 0xfff9 && value <= 0xfffc) ||
      (value >= 0x1f3fb && value <= 0x1f3ff) ||
      (value >= 0xe0000 && value <= 0xe007f) ||
      (value >= 0xf0000 && value <= 0x10fffd);
}

// Use the final fitted/ellipsized single-line text and its selected font size.
// Add the text origin afterwards, then clamp to the actual drawing layer.
static inline int context_text_ink_bottom(const char *text, int font_size) {
  const int baseline = font_size == 28 || font_size == 24 || font_size == 20 ? font_size : 18;
  const int font = font_size == 28 ? 0 : font_size == 24 ? 1 : font_size == 20 ? 2 : 3;
  const int count = sizeof(s_context_text_codepoints) / sizeof(s_context_text_codepoints[0]);
  const int wildcard = 204;
  int bottom = 0;
  if (!text) return bottom;
  const unsigned char *cursor = (const unsigned char *)text;
  while (*cursor) {
    const uint32_t codepoint = context_text_next_codepoint(&cursor);
    if (context_text_has_no_ink(codepoint)) continue;
    int left = 0, right = count;
    while (left < right) {
      const int middle = left + (right - left) / 2;
      if (s_context_text_codepoints[middle] < codepoint) left = middle + 1;
      else right = middle;
    }
    const int glyph_bottom = left < count && s_context_text_codepoints[left] == codepoint
        ? s_context_text_bottoms[font][left] : context_text_is_emoji(codepoint)
        ? baseline : s_context_text_bottoms[font][wildcard];
    if (glyph_bottom > bottom) bottom = glyph_bottom;
  }
  return bottom;
}
