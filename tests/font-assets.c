#include <assert.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include "../src/c/generated_clock_glyphs.h"
#include "../src/c/generated_body_metrics.h"

static const ClockGlyph *glyph(uint32_t code) {
  for (size_t i = 0; i < CLOCK_GLYPH_COUNT; ++i) {
    if (clock_glyphs[i].code == code) { return &clock_glyphs[i]; }
  }
  return NULL;
}

static unsigned holes(uint32_t code) {
  const ClockGlyph *g = glyph(code);
  assert(g != NULL);
  unsigned result = 0;
  for (size_t i = g->first_contour; i < g->first_contour + g->contour_count; ++i) {
    result += clock_contours[i].hole;
  }
  return result;
}

int main(void) {
  assert(CLOCK_FONT_UNITS_PER_EM > 0);
  for (size_t i = 0; i < CLOCK_GLYPH_COUNT; ++i) {
    const ClockGlyph *g = &clock_glyphs[i];
    assert(g->advance > 0 && g->contour_count > 0);
    assert(g->first_contour + g->contour_count <= CLOCK_CONTOUR_COUNT);
    assert(g->x_min < g->x_max && g->y_min < g->y_max);
    assert(g->contour_count <= CLOCK_GLYPH_MAX_CONTOURS);
    unsigned glyph_points = 0;
    bool found_hole = false;
    for (size_t j = g->first_contour; j < g->first_contour + g->contour_count; ++j) {
      const ClockContour *c = &clock_contours[j];
      assert(c->point_count >= 3 && c->point_count <= CLOCK_CONTOUR_MAX_POINTS);
      assert(c->first_point + c->point_count <= CLOCK_POINT_COUNT);
      glyph_points += c->point_count;
      if (c->hole) { found_hole = true; }
      else { assert(!found_hole); } // Fill outers before clearing their holes.
      int64_t twice_area = 0;
      for (size_t k = 0; k < c->point_count; ++k) {
        const ClockPoint a = clock_points[c->first_point + k];
        const ClockPoint b = clock_points[c->first_point + (k + 1) % c->point_count];
        twice_area += (int64_t)a.x * b.y - (int64_t)b.x * a.y;
      }
      assert(twice_area != 0);
    }
    assert(glyph_points <= CLOCK_GLYPH_MAX_POINTS);
  }
  // These counters are essential to the approved numeric shapes.
  assert(holes('0') == 1 && holes('6') == 1 && holes('8') == 2 && holes('9') == 1);
  assert(holes('%') == 2 && holes(':') == 0);
  assert(holes(0xb0) == 1 && glyph('C') != NULL && glyph('F') != NULL);
  assert(glyph('A') == NULL);

  assert(body_text_descent(NULL, 20) == 0);
  assert(body_text_descent("", 20) == 0);
  assert(body_text_descent("Justice", 18) == 0); // Unsupported resource size.
  assert(body_text_descent("Tame Impala", 20) > body_text_descent("Justice", 20));
  assert(body_text_descent("gypq", 22) > 0);
  assert(body_text_ascent(NULL, 20) == 0);
  assert(body_text_ascent("", 20) == 0);
  assert(body_text_ascent(" ", 26) == 0);
  assert(body_text_ascent("Justice", 18) == 0); // Unsupported resource size.
  assert(body_text_ascent("Justice", 20) > 0);
  assert(body_text_ascent("Č", 20) > body_text_ascent("C", 20));
  assert(body_text_ascent("ČC", 20) == body_text_ascent("Č", 20));
  const unsigned char *cursor = (const unsigned char *)"ČčŘřŐőŰűȘșȚțİıĞğŞş°…−КолесомΑθήναTiếngViệt";
  while (*cursor) {
    const uint32_t cp = body_metric_next_codepoint(&cursor);
    const size_t index = body_metric_index(cp);
    assert(index < BODY_METRIC_COUNT && body_metric_codepoints[index] == cp);
  }
  assert(body_metric_codepoints[body_metric_index(0x1f30d)] == 0x25af);
  assert(body_metric_codepoints[BODY_METRIC_WILDCARD_INDEX] == 0x25af);
  assert(body_metric_codepoints[body_metric_index(0xfffd)] == 0xfffd);
  const char *invalid[] = {"\xc2", "\xe2\x80", "\xf0\x9f\x8c", "\xff"};
  for (size_t i = 0; i < sizeof(invalid) / sizeof(*invalid); ++i) {
    assert(body_text_descent(invalid[i], 20) >= 0);
    assert(body_text_ascent(invalid[i], 20) >= 0);
  }
  return 0;
}
