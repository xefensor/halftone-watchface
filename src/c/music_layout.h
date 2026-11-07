#pragma once

#include "watch_layout.h"
#include "complication_data.h"
#include <pebble-xoce-ui/metrics.h>

// Leave room for a whole UTF-8 ellipsis beyond the core's bounded source text.
#define MUSIC_TEXT_BYTES (COMPLICATION_MAX_TEXT_BYTES + 5)
#define MUSIC_MAX_LINES 3
#define MUSIC_BOTTOM 216
#define MUSIC_TOP 86
#define MUSIC_TITLE_POINT XOCE_UI_BODY_POINT
#define MUSIC_ARTIST_POINT XOCE_UI_SECONDARY_POINT

typedef struct { int width, ascent, descent; } MusicTextMetrics;
typedef MusicTextMetrics (*MusicMeasure)(void *context, const char *text, int point);
typedef struct {
  char text[MUSIC_MAX_LINES][MUSIC_TEXT_BYTES];
  int count;
  bool complete;
  size_t consumed;
} MusicLines;
typedef struct {
  MusicLines title, artist;
  int title_point, artist_point;
  int title_baseline[MUSIC_MAX_LINES], artist_baseline[MUSIC_MAX_LINES];
  int title_top, title_bottom, metadata_top, cover_top;
} MusicLayout;

static bool music_space(char c) { return c == ' ' || c == '\t' || c == '\r' || c == '\n'; }
static size_t music_character_bytes(const char *text) {
  size_t bytes = 1;
  while (text[bytes] && ((unsigned char)text[bytes] & 0xc0) == 0x80) ++bytes;
  return bytes;
}
static void music_trim(char *text) {
  size_t length = strlen(text);
  while (length && music_space(text[length - 1])) text[--length] = '\0';
}
static void music_ellipsis(char *text, int point, int width,
                            MusicMeasure measure, void *context) {
  char prefix[MUSIC_TEXT_BYTES];
  watch_layout_copy_utf8(text, prefix, sizeof(prefix) - 3);
  music_trim(prefix);
  for (;;) {
    const size_t length = strlen(prefix);
    memcpy(text, prefix, length);
    memcpy(text + length, "…", 4);
    if (measure(context, text, point).width <= width || !watch_layout_pop_utf8(prefix)) break;
    music_trim(prefix);
  }
}

// A comma can be a useful break in the supplied scalar artist string. Keep
// its punctuation: a band name containing a comma is not an artist array.
static bool music_comma_lines(const char *source, int point, int width,
                                MusicMeasure measure, void *context, MusicLines *out) {
  for (size_t at = 0; source[at]; ++at) {
    if (source[at] != ',' || at + 1 >= MUSIC_TEXT_BYTES) continue;
    char first[MUSIC_TEXT_BYTES], second[MUSIC_TEXT_BYTES];
    memcpy(first, source, at + 1); first[at + 1] = '\0'; music_trim(first);
    const char *tail = source + at + 1;
    while (music_space(*tail)) ++tail;
    watch_layout_copy_utf8(tail, second, sizeof(second)); music_trim(second);
    if (first[0] && second[0] && measure(context, first, point).width <= width &&
        measure(context, second, point).width <= width) {
      memcpy(out->text[0], first, strlen(first) + 1);
      memcpy(out->text[1], second, strlen(second) + 1);
      out->count = 2; out->complete = true; return true;
    }
  }
  return false;
}

// Wrap whole UTF-8 characters, preferring spaces but making progress through
// a long unbroken title too. Ellipsize only the final available line.
static void music_wrap(const char *source, int point, int width, int max_lines,
                         bool comma, MusicMeasure measure, void *context, MusicLines *out) {
  memset(out, 0, sizeof(*out)); out->complete = true;
  if (!source || !measure || max_lines < 1 || width < 1) return;
  const char *start=source;
  if (max_lines > MUSIC_MAX_LINES) max_lines = MUSIC_MAX_LINES;
  while (music_space(*source)) ++source;
  if (!*source) return;
  if (comma && max_lines == 2 && measure(context, source, point).width > width &&
      music_comma_lines(source, point, width, measure, context, out)) {
    out->consumed=strlen(start);return;
  }
  while (*source && out->count < max_lines) {
    char *line = out->text[out->count++];
    if (measure(context, source, point).width <= width && !strchr(source, '\n')) {
      watch_layout_copy_utf8(source, line, MUSIC_TEXT_BYTES); music_trim(line);
      out->consumed=strlen(start);return;
    }
    if (out->count == max_lines) {
      watch_layout_copy_utf8(source, line, MUSIC_TEXT_BYTES);
      for (size_t i = 0; line[i]; ++i) if (line[i] == '\n' || line[i] == '\r') line[i] = ' ';
      music_ellipsis(line, point, width, measure, context);
      out->consumed=(size_t)(source-start)+strlen(line)-3;
      out->complete = false; return;
    }
    size_t at = 0, fit = 0, space = 0;
    char prefix[MUSIC_TEXT_BYTES] = {0};
    while (source[at] && source[at] != '\n' && source[at] != '\r') {
      const size_t bytes = music_character_bytes(source + at);
      if (at + bytes >= sizeof(prefix)) break;
      memcpy(prefix + at, source + at, bytes); prefix[at + bytes] = '\0';
      if (measure(context, prefix, point).width > width) break;
      if (music_space(source[at])) space = at;
      at += bytes; fit = at;
    }
    const bool hard_break = source[fit] == '\n' || source[fit] == '\r';
    size_t take = !hard_break && space ? space : fit;
    if (!take) {
      // Even one source glyph cannot fit. Keep a visible bounded result and
      // advance the source, rather than repeat an empty line forever.
      take = music_character_bytes(source);
      watch_layout_copy_utf8("…", line, MUSIC_TEXT_BYTES);
      out->complete = false;
    } else {
      memcpy(line, source, take); line[take] = '\0'; music_trim(line);
    }
    source += take;
    while (music_space(*source)) ++source;
    out->consumed=(size_t)(source-start);
  }
}

// Baseline spacing normally follows point+2. Accents/descenders can increase
// it so adjacent visible ink never overlaps. Offsets start at the first ink.
static int music_line_offsets(const MusicLines *lines, int point, MusicMeasure measure,
                                void *context, int offsets[MUSIC_MAX_LINES]) {
  if (!lines->count) return 0;
  MusicTextMetrics previous = measure(context, lines->text[0], point);
  offsets[0] = previous.ascent;
  for (int i = 1; i < lines->count; ++i) {
    const MusicTextMetrics next = measure(context, lines->text[i], point);
    int advance = previous.descent + next.ascent + 3;
    offsets[i] = offsets[i - 1] + advance;
    previous = next;
  }
  return offsets[lines->count - 1] + previous.descent;
}

static void music_position(MusicLayout *out, bool art, MusicMeasure measure, void *context) {
  const int artist_height = music_line_offsets(&out->artist, out->artist_point, measure,
                                                context, out->artist_baseline);
  const int title_height = music_line_offsets(&out->title, out->title_point, measure,
                                               context, out->title_baseline);
  int metadata_height = artist_height;
  if ((art || out->artist.count) && metadata_height < 40) metadata_height = 40;
  out->metadata_top = MUSIC_BOTTOM - metadata_height;
  out->cover_top = MUSIC_BOTTOM - 40;
  out->title_bottom = out->metadata_top - (metadata_height ? 8 : 0);
  out->title_top = out->title_bottom - title_height;
  for (int i = 0; i < out->title.count; ++i) out->title_baseline[i] += out->title_top;
  for (int i = 0; i < out->artist.count; ++i)
    out->artist_baseline[i] += MUSIC_BOTTOM - artist_height;
}

// A continuation page starts with the whole unfinished word when the current
// last line offers a break. Long unbroken words still advance by UTF-8 glyphs.
static void music_title_boundary(const char *source,MusicLines *lines) {
  if(lines->complete||!lines->count||!source[lines->consumed]||
      music_space(source[lines->consumed]))return;
  char *line=lines->text[lines->count-1];
  const size_t length=strlen(line);
  if(length<3)return;
  const size_t end=length-3;
  size_t at=end;
  while(at&&!music_space(line[at-1]))--at;
  if(!at)return;
  lines->consumed-=end-at;
  while(at&&music_space(line[at-1]))--at;
  memcpy(line+at,"…",4);
}

static void music_layout_build_at(const char *title, const char *artist, bool art,
                                    int top, MusicMeasure measure, void *context, MusicLayout *out) {
  memset(out, 0, sizeof(*out));
  out->artist_point = MUSIC_ARTIST_POINT;
  out->title_point = MUSIC_TITLE_POINT;
  const int artist_width = art ? 130 : 180;
  music_wrap(artist, out->artist_point, artist_width, 2, true, measure, context, &out->artist);
  // Track length changes wrapping, never the type size or footer anchor.
  // A notification banner reduces the available line count at the same size.
  for (int lines = MUSIC_MAX_LINES; lines >= 1; --lines) {
    music_wrap(title, out->title_point, 180, lines, false, measure, context, &out->title);
    music_title_boundary(title,&out->title);
    music_position(out, art, measure, context);
    if (out->title_top >= top) return;
  }
}

static inline void music_layout_build(const char *title, const char *artist, bool art,
                                        MusicMeasure measure, void *context, MusicLayout *out) {
  music_layout_build_at(title,artist,art,MUSIC_TOP,measure,context,out);
}
