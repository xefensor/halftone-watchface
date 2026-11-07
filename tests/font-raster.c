#include <assert.h>
#include <string.h>
#include "../src/c/font_raster.h"
#include "../src/c/generated_clock_glyphs.h"

static uint8_t image[228][200], row[200];
static int32_t intersections[CLOCK_GLYPH_MAX_POINTS];
static unsigned row_count;

static void capture(void *context, int y, int first, int end, const uint8_t *coverage) {
  (void)context;
  assert(y >= 0 && y < 228 && first >= 0 && end <= 200 && first < end);
  ++row_count;
  for (int x = first; x < end; ++x) {
    assert(coverage[x] <= FONT_RASTER_COVERAGE);
    image[y][x] = coverage[x];
  }
}

static bool draw(const FontRasterPoint *p, size_t count,
                 const FontRasterContour *contours, size_t contour_count) {
  memset(image, 0, sizeof(image));
  row_count = 0;
  const FontRasterScratch scratch = {row, sizeof(row), intersections,
                                     CLOCK_GLYPH_MAX_POINTS};
  return font_raster_rows(p, count, contours, contour_count, 200, 228,
                          scratch, capture, NULL);
}

static unsigned coverage_sum(void) {
  unsigned sum = 0;
  for (int y = 0; y < 228; ++y)
    for (int x = 0; x < 200; ++x) sum += image[y][x];
  return sum;
}

static int32_t fixed(float value) {
  return (int32_t)(value * FONT_RASTER_ONE + (value < 0 ? -0.5f : 0.5f));
}

int main(void) {
  // A fractional rectangle has exact quarter-pixel horizontal/half-pixel
  // vertical coverage. Moving it must retain that area rather than snap it.
  const FontRasterPoint rectangle[] = {{64,128},{576,128},{576,640},{64,640}};
  const FontRasterContour one[] = {{0,4}};
  assert(draw(rectangle, 4, one, 1));
  assert(row_count == 3 && coverage_sum() == 64);
  assert(image[0][0] == 6 && image[0][1] == 8 && image[0][2] == 2);
  assert(image[1][0] == 12 && image[1][1] == 16 && image[1][2] == 4);
  assert(image[2][0] == 6 && image[2][1] == 8 && image[2][2] == 2);
  // Division cannot depend on edge direction near a subpixel sample center.
  const FontRasterPoint trapezoid[] = {{33,0},{256,0},{256,256},{31,256}};
  const FontRasterPoint reversed[] = {{31,256},{256,256},{256,0},{33,0}};
  assert(draw(trapezoid, 4, one, 1));
  const unsigned original_coverage = coverage_sum();
  const uint8_t original_pixel = image[0][0];
  assert(original_coverage == 14);
  assert(draw(reversed, 4, one, 1));
  assert(coverage_sum() == original_coverage && image[0][0] == original_pixel);
  // A positive fractional crossing just to the right of sample x=32 must
  // exclude that sample; truncating its intersection would include it.
  const FontRasterPoint positive_slope[] = {{31,0},{256,0},{256,256},{33,256}};
  assert(draw(positive_slope, 4, one, 1) && coverage_sum() == 14);

  // All contours share one even-odd fill: a reversed counter remains empty,
  // and a disconnected component remains visible.
  const FontRasterPoint counter[] = {
    {0,0},{1536,0},{1536,1536},{0,1536},
    {512,512},{512,1024},{1024,1024},{1024,512},
    {1792,256},{2048,256},{2048,512},{1792,512}
  };
  const FontRasterContour three[] = {{0,4},{4,4},{8,4}};
  assert(draw(counter, 12, three, 3));
  assert(coverage_sum() == 33 * 16);
  assert(image[2][2] == 0 && image[3][3] == 0);
  assert(image[0][0] == 16 && image[1][7] == 16);

  // Negative coordinates and the physical edge clip before indexing buffers.
  const FontRasterPoint clipped[] = {{-384,-256},{384,-256},{384,256},{-384,256}};
  assert(draw(clipped, 4, one, 1));
  assert(coverage_sum() == 24 && image[0][0] == 16 && image[0][1] == 8);
  const FontRasterPoint outside[] = {{-512,0},{-256,0},{-256,256},{-512,256}};
  assert(draw(outside, 4, one, 1) && row_count == 0);
  const FontRasterContour invalid[] = {{2,4}};
  assert(!draw(rectangle, 4, invalid, 1) && row_count == 0);
  const FontRasterScratch too_small = {row, 199, intersections, CLOCK_GLYPH_MAX_POINTS};
  assert(!font_raster_rows(rectangle, 4, one, 1, 200, 228, too_small, capture, NULL));
  // Repeated contour ranges can cross a scanline more often than there are
  // distinct input points. Reject before writing past intersection scratch.
  const FontRasterContour repeated[] = {{0,4},{0,4},{0,4}};
  const FontRasterScratch four_crossings = {row, sizeof(row), intersections, 4};
  assert(!font_raster_rows(rectangle, 4, repeated, 3, 200, 228,
                           four_crossings, capture, NULL));
  assert(row_count == 0);
  const FontRasterPoint enormous[] = {{INT32_MIN,0},{0,0},{0,256}};
  const FontRasterContour triangle[] = {{0,3}};
  assert(!draw(enormous, 3, triangle, 1) && row_count == 0);

  // Exercise every real glyph, including degree/% counters at tiny unit
  // sizes. Supersampled covered area must match the source polygon area.
  const unsigned sizes[] = {12,13,16,40,66,80};
  for (unsigned gi = 0; gi < CLOCK_GLYPH_COUNT; ++gi) {
    const ClockGlyph g = clock_glyphs[gi];
    for (unsigned si = 0; si < sizeof(sizes)/sizeof(sizes[0]); ++si) {
      FontRasterPoint points[CLOCK_GLYPH_MAX_POINTS];
      FontRasterContour contours[CLOCK_GLYPH_MAX_CONTOURS];
      unsigned at = 0;
      int64_t twice_area = 0;
      for (unsigned ci = 0; ci < g.contour_count; ++ci) {
        const ClockContour c = clock_contours[g.first_contour + ci];
        contours[ci] = (FontRasterContour){at,c.point_count};
        int64_t contour_area = 0;
        for (unsigned i = 0; i < c.point_count; ++i) {
          const ClockPoint a = clock_points[c.first_point+i];
          const ClockPoint b = clock_points[c.first_point+(i+1)%c.point_count];
          contour_area += (int64_t)a.x*b.y-(int64_t)b.x*a.y;
          points[at++] = (FontRasterPoint){fixed(10+(float)a.x*sizes[si]/1000.0f),
                                           fixed(100-(float)a.y*sizes[si]/1000.0f)};
        }
        if (contour_area < 0) contour_area = -contour_area;
        twice_area += c.hole ? -contour_area : contour_area;
      }
      assert(draw(points, at, contours, g.contour_count));
      const double expected = twice_area * sizes[si] * sizes[si] / 2000000.0;
      const double actual = coverage_sum() / 16.0;
      const double delta = actual > expected ? actual-expected : expected-actual;
      assert(expected > 0 && delta < 1.0 + expected * 0.02);
    }
  }
  return 0;
}
