#include <pebble.h>
#include "complication_data.h"
#include "context_data.h"
#include "watch_layout.h"
#include "reading_presentation.h"
#include "context_text_metrics.h"

#define PERSIST_KEY_BACKGROUND_COLOR 2
#define PERSIST_KEY_TEXT_COLOR 3
#define PERSIST_KEY_DEPTH_EFFECT 4
#define PERSIST_KEY_TEXT_SHADOW 5
#define PERSIST_KEY_LARGE_TEXT 6
#define PERSIST_KEY_USE_12_HOUR 7
#define PERSIST_KEY_LAYOUT_STYLE 16
#define PERSIST_KEY_SHOW_STATUS 19
#define PERSIST_KEY_COMPLICATION_FIRST 20
#define PERSIST_KEY_CONTEXT_SESSION 61
#define PERSIST_KEY_PANEL_TRANSITIONS 62
#define COMPLICATION_CACHE_CHUNKS 8
#define COMPLICATION_CACHE_CHUNK_BYTES 256

#define DOT_OUTER_CORNER_RADIUS 30
#define DOT_SPACING 10
#define CLASSIC_DOT_TRANSITION_STEPS 3
#define DEPTH_DOT_TRANSITION_STEPS 4
#define FULL_LAYOUT_HEIGHT 228
#define TIMELINE_LAYOUT_HEIGHT 171
#define COMPACT_FONT_ENTER_HEIGHT 205
#define COMPACT_FONT_EXIT_HEIGHT 215
#define TIMELINE_DATE_Y 25
#define TIMELINE_TIME_Y 45
#define LARGE_TIME_FONT_COUNT 8
#define COMPLICATION_FONT_COUNT 7

static Window *s_window;
static Layer *s_window_layer;
static Layer *s_background_layer;
static Layer *s_complication_layers[COMPLICATION_SLOT_COUNT];
static Layer *s_context_layer;
static Layer *s_transition_layer;
static Layer *s_status_layer;
static TextLayer *s_date_layer;
static TextLayer *s_time_layer;
static TextLayer *s_date_shadow_layer;
static TextLayer *s_time_shadow_layer;
static GFont s_date_font;
static GFont s_time_font;
static GFont s_compact_date_font;
static GFont s_small_date_font;
static GFont s_compact_time_font;
static GFont s_large_date_font;
static GFont s_large_time_fonts[LARGE_TIME_FONT_COUNT];
static const uint8_t s_large_time_font_sizes[LARGE_TIME_FONT_COUNT] = {80,84,88,92,96,100,104,108};
static GFont s_large_compact_time_font;
static GFont s_complication_fonts[COMPLICATION_FONT_COUNT];
static const uint8_t s_complication_font_sizes[COMPLICATION_FONT_COUNT] = {44, 38, 32, 28, 24, 20, 18};
static GColor s_background_color;
static GColor s_text_color;
static bool s_compact_layout;
static bool s_depth_effect_enabled;
static bool s_text_shadow_enabled;
static bool s_large_text_enabled;
static bool s_use_12_hour;
static bool s_show_status;
static bool s_panel_transitions;
static bool s_phone_connected;
static BatteryChargeState s_battery;
static ComplicationSet s_context;
static AppTimer *s_context_timer;
static AppTimer *s_transition_timer;
static uint8_t s_transition_frame = 3;
static bool s_panel_signature_known;
static bool s_panel_content_seen;
static uint32_t s_panel_signature;
static ContextMode s_panel_mode;
static GPath *s_drop_path;
static GPath *s_small_drop_path;
static GPoint s_drop_points[] = {{0, -10}, {-7, 2}, {7, 2}};
static const GPathInfo s_drop_info = {.num_points = 3, .points = s_drop_points};
static GPoint s_small_drop_points[] = {{0, -8}, {-5, 1}, {5, 1}};
static const GPathInfo s_small_drop_info = {.num_points = 3, .points = s_small_drop_points};
static bool s_context_rebaseline = true;
static bool s_context_awaiting_baseline = true;
static bool s_context_rebaseline_in_flight;
static uint32_t s_context_session_token;
static uint32_t s_connection_generation;
static uint32_t s_request_generation;
static time_t s_last_request_at;
static ComplicationSet s_complications;
static bool s_has_complications;
static bool s_was_fresh[COMPLICATION_SLOT_COUNT];
static uint8_t s_complication_packet[COMPLICATION_MAX_BYTES];
static size_t s_complication_packet_length;
static AppTimer *s_startup_timer;
static char s_date_buffer[40];
static char s_time_buffer[6];

static const char *const s_english_days[] = {
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
};

static const char *const s_czech_days[] = {
  "NEDĚLE", "PONDĚLÍ", "ÚTERÝ", "STŘEDA", "ČTVRTEK", "PÁTEK", "SOBOTA"
};
static const char *const s_slovak_days[] = {
  "NEDEĽA", "PONDELOK", "UTOROK", "STREDA", "ŠTVRTOK", "PIATOK", "SOBOTA"
};
static const char *const s_german_days[] = {
  "SONNTAG", "MONTAG", "DIENSTAG", "MITTWOCH", "DONNERSTAG", "FREITAG", "SAMSTAG"
};
static const char *const s_french_days[] = {
  "DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"
};
static const char *const s_spanish_days[] = {
  "DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"
};
static const char *const s_italian_days[] = {
  "DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"
};
static const char *const s_portuguese_days[] = {
  "DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"
};
static const char *const s_dutch_days[] = {
  "ZONDAG", "MAANDAG", "DINSDAG", "WOENSDAG", "DONDERDAG", "VRIJDAG", "ZATERDAG"
};
static const char *const s_polish_days[] = {
  "NIEDZIELA", "PONIEDZIAŁEK", "WTOREK", "ŚRODA", "CZWARTEK", "PIĄTEK", "SOBOTA"
};
static const char *const s_danish_days[] = {
  "SØNDAG", "MANDAG", "TIRSDAG", "ONSDAG", "TORSDAG", "FREDAG", "LØRDAG"
};
static const char *const s_swedish_days[] = {
  "SÖNDAG", "MÅNDAG", "TISDAG", "ONSDAG", "TORSDAG", "FREDAG", "LÖRDAG"
};
static const char *const s_norwegian_days[] = {
  "SØNDAG", "MANDAG", "TIRSDAG", "ONSDAG", "TORSDAG", "FREDAG", "LØRDAG"
};
static const char *const s_finnish_days[] = {
  "SUNNUNTAI", "MAANANTAI", "TIISTAI", "KESKIVIIKKO", "TORSTAI", "PERJANTAI", "LAUANTAI"
};
static const char *const s_hungarian_days[] = {
  "VASÁRNAP", "HÉTFŐ", "KEDD", "SZERDA", "CSÜTÖRTÖK", "PÉNTEK", "SZOMBAT"
};
static const char *const s_romanian_days[] = {
  "DUMINICĂ", "LUNI", "MARȚI", "MIERCURI", "JOI", "VINERI", "SÂMBĂTĂ"
};
static const char *const s_turkish_days[] = {
  "PAZAR", "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ"
};

static bool prv_locale_is(const char *locale, const char *language) {
  return locale != NULL && locale[0] == language[0] &&
         locale[1] == language[1] &&
         (locale[2] == '\0' || locale[2] == '_' || locale[2] == '-');
}

static const char *const *prv_get_localized_days(void) {
  const char *locale = i18n_get_system_locale();

  if (prv_locale_is(locale, "cs")) return s_czech_days;
  if (prv_locale_is(locale, "sk")) return s_slovak_days;
  if (prv_locale_is(locale, "de")) return s_german_days;
  if (prv_locale_is(locale, "fr")) return s_french_days;
  if (prv_locale_is(locale, "es")) return s_spanish_days;
  if (prv_locale_is(locale, "it")) return s_italian_days;
  if (prv_locale_is(locale, "pt")) return s_portuguese_days;
  if (prv_locale_is(locale, "nl")) return s_dutch_days;
  if (prv_locale_is(locale, "pl")) return s_polish_days;
  if (prv_locale_is(locale, "da")) return s_danish_days;
  if (prv_locale_is(locale, "sv")) return s_swedish_days;
  if (prv_locale_is(locale, "no") || prv_locale_is(locale, "nb") ||
      prv_locale_is(locale, "nn")) return s_norwegian_days;
  if (prv_locale_is(locale, "fi")) return s_finnish_days;
  if (prv_locale_is(locale, "hu")) return s_hungarian_days;
  if (prv_locale_is(locale, "ro")) return s_romanian_days;
  if (prv_locale_is(locale, "tr")) return s_turkish_days;

  return s_english_days;
}

static const int s_classic_dot_depths[CLASSIC_DOT_TRANSITION_STEPS] = {
  0, 7, 14
};
static const int s_classic_dot_radii[CLASSIC_DOT_TRANSITION_STEPS] = {
  4, 2, 1
};
static const int s_depth_dot_depths[DEPTH_DOT_TRANSITION_STEPS] = {
  0, 7, 14, 21
};
static const int s_depth_dot_radii[DEPTH_DOT_TRANSITION_STEPS] = {
  4, 3, 2, 1
};

static int prv_first_grid_point(int start, int origin) {
  int point = origin;
  while (point - DOT_SPACING >= start) {
    point -= DOT_SPACING;
  }
  while (point < start) {
    point += DOT_SPACING;
  }
  return point;
}

static void prv_draw_horizontal_dot_run(GContext *ctx, int y, int start,
                                        int end, int radius, int phase,
                                        int screen_width) {
  const int origin = screen_width / 2 + phase;
  const int first = prv_first_grid_point(start, origin);
  const int center = screen_width / 2;

  // Build the second half by exact pixel reflection. Even-sized displays have
  // no single center pixel, so the unavoidable one-pixel remainder is kept at
  // the side center instead of accumulating as a visibly wrong corner.
  for (int x = first; x < center; x += DOT_SPACING) {
    graphics_fill_circle(ctx, GPoint(x, y), radius);
    graphics_fill_circle(ctx, GPoint(screen_width - 1 - x, y), radius);
  }

  if (phase == 0 && center >= start && center <= end) {
    graphics_fill_circle(ctx, GPoint(center, y), radius);
  }
}

static void prv_draw_vertical_dot_run(GContext *ctx, int x, int start,
                                      int end, int radius, int phase,
                                      int screen_height) {
  const int origin = screen_height / 2 + phase;
  const int first = prv_first_grid_point(start, origin);
  const int center = screen_height / 2;

  for (int y = first; y < center; y += DOT_SPACING) {
    graphics_fill_circle(ctx, GPoint(x, y), radius);
    graphics_fill_circle(ctx, GPoint(x, screen_height - 1 - y), radius);
  }

  if (phase == 0 && center >= start && center <= end) {
    graphics_fill_circle(ctx, GPoint(x, center), radius);
  }
}

static void prv_draw_corner_connector(GContext *ctx, int left, int top,
                                      int right, int bottom,
                                      int horizontal_point,
                                      int vertical_point, int corner_radius,
                                      int dot_radius,
                                      bool mirror_x, bool mirror_y) {
  int horizontal_gap = mirror_x
      ? right - corner_radius - horizontal_point
      : horizontal_point - (left + corner_radius);
  int vertical_gap = mirror_y
      ? bottom - corner_radius - vertical_point
      : vertical_point - (top + corner_radius);

  if (horizontal_gap < 0) {
    horizontal_gap = 0;
  }
  if (vertical_gap < 0) {
    vertical_gap = 0;
  }

  // 1.57 approximates one quarter of a circle's circumference.
  const int corner_arc_length = (corner_radius * 157 + 50) / 100;
  const int total_length =
      horizontal_gap + corner_arc_length + vertical_gap;
  // Round to the nearest number of 10 px intervals. The display-edge geometry
  // is symmetric, so every mirrored corner receives the same interval count.
  int interval_count = (total_length + DOT_SPACING / 2) / DOT_SPACING;
  if (interval_count < 2) {
    interval_count = 2;
  }

  for (int i = 1; i < interval_count; i++) {
    const int distance =
        (i * total_length + interval_count / 2) / interval_count;
    int x;
    int y;

    if (distance <= horizontal_gap) {
      x = corner_radius + horizontal_gap - distance;
      y = 0;
    } else if (distance < horizontal_gap + corner_arc_length) {
      const int arc_distance = distance - horizontal_gap;
      const int32_t angle =
          (int32_t)arc_distance * (TRIG_MAX_ANGLE / 4) /
          corner_arc_length;
      x = corner_radius -
          (corner_radius * sin_lookup(angle) + TRIG_MAX_RATIO / 2) /
              TRIG_MAX_RATIO;
      y = corner_radius -
          (corner_radius * cos_lookup(angle) + TRIG_MAX_RATIO / 2) /
              TRIG_MAX_RATIO;
    } else {
      x = 0;
      y = corner_radius +
          distance - horizontal_gap - corner_arc_length;
    }

    const int screen_x = mirror_x ? right - x : left + x;
    const int screen_y = mirror_y ? bottom - y : top + y;
    graphics_fill_circle(ctx, GPoint(screen_x, screen_y), dot_radius);
  }
}

static void prv_draw_rounded_dot_ring(GContext *ctx, GRect bounds, int depth,
                                      int dot_radius, int ring_index) {
  const int left = depth;
  const int top = depth;
  const int right = bounds.size.w - 1 - depth;
  const int bottom = bounds.size.h - 1 - depth;
  int corner_radius = DOT_OUTER_CORNER_RADIUS - depth;
  if (corner_radius < 4) {
    corner_radius = 4;
  }
  const int phase = ring_index % 2 == 0 ? 0 : DOT_SPACING / 2;
  const int horizontal_start = left + corner_radius;
  const int horizontal_end = right - corner_radius;
  const int vertical_start = top + corner_radius;
  const int vertical_end = bottom - corner_radius;
  const int horizontal_origin = bounds.size.w / 2 + phase;
  const int vertical_origin = bounds.size.h / 2 + phase;
  const int first_horizontal =
      prv_first_grid_point(horizontal_start, horizontal_origin);
  const int last_horizontal = bounds.size.w - 1 - first_horizontal;
  const int first_vertical =
      prv_first_grid_point(vertical_start, vertical_origin);
  const int last_vertical = bounds.size.h - 1 - first_vertical;
  // Every side uses the same fixed grid. The middle ring is always exactly a
  // half-step out of phase, so the zig-zag cannot drift or stretch.
  prv_draw_horizontal_dot_run(ctx, top, horizontal_start, horizontal_end,
                              dot_radius, phase, bounds.size.w);
  prv_draw_horizontal_dot_run(ctx, bottom, horizontal_start, horizontal_end,
                              dot_radius, phase, bounds.size.w);
  prv_draw_vertical_dot_run(ctx, left, vertical_start, vertical_end,
                            dot_radius, phase, bounds.size.h);
  prv_draw_vertical_dot_run(ctx, right, vertical_start, vertical_end,
                            dot_radius, phase, bounds.size.h);

  // Each connector is fitted between the actual nearest side dots. This is
  // essential on the 200 x 228 display, where a mirrored hand-made pattern
  // otherwise overlaps at one end and leaves a gap at the other.
  prv_draw_corner_connector(ctx, left, top, right, bottom, first_horizontal,
                            first_vertical, corner_radius, dot_radius,
                            false, false);
  prv_draw_corner_connector(ctx, left, top, right, bottom, last_horizontal,
                            first_vertical, corner_radius, dot_radius,
                            true, false);
  prv_draw_corner_connector(ctx, left, top, right, bottom, last_horizontal,
                            last_vertical, corner_radius, dot_radius,
                            true, true);
  prv_draw_corner_connector(ctx, left, top, right, bottom, first_horizontal,
                            last_vertical, corner_radius, dot_radius,
                            false, true);
}

static int prv_layout_value(int full_value, int timeline_value,
                            int visible_height) {
  if (visible_height >= FULL_LAYOUT_HEIGHT) {
    return full_value;
  }
  if (visible_height <= TIMELINE_LAYOUT_HEIGHT) {
    return timeline_value;
  }

  const int range = FULL_LAYOUT_HEIGHT - TIMELINE_LAYOUT_HEIGHT;
  const int progress = visible_height - TIMELINE_LAYOUT_HEIGHT;
  return timeline_value +
         ((full_value - timeline_value) * progress + range / 2) / range;
}

static void prv_set_text_pair_layout(TextLayer *shadow_layer,
                                     TextLayer *text_layer, GRect frame,
                                     GFont font, int shadow_offset) {
  text_layer_set_font(shadow_layer, font);
  text_layer_set_font(text_layer, font);

  GRect shadow_frame = frame;
  shadow_frame.origin.x += shadow_offset;
  shadow_frame.origin.y += shadow_offset;
  layer_set_frame(text_layer_get_layer(shadow_layer), shadow_frame);
  layer_set_frame(text_layer_get_layer(text_layer), frame);
}

static GFont prv_get_large_time_font(int available_width, int maximum_size) {
  // Use the largest prepared bitmap font that fits the current digits. This
  // keeps both a wide time such as 00:00 and a narrow one such as 11:11 close
  // to the PT2 display edges without ever cropping a glyph.
  const GRect measurement_box = GRect(0, 0, 320, 130);

  for (int i = LARGE_TIME_FONT_COUNT - 1; i >= 0; i--) {
    if (s_large_time_font_sizes[i] > maximum_size) { continue; }
    const GSize size = graphics_text_layout_get_content_size(
        s_time_buffer, s_large_time_fonts[i], measurement_box,
        GTextOverflowModeFill, GTextAlignmentCenter);
    if (size.w <= available_width) {
      return s_large_time_fonts[i];
    }
  }

  // Wide digits can exceed the safe width even at 80px. The prepared 72px
  // time font keeps the complete clock visible rather than ellipsizing it.
  return s_large_compact_time_font;
}

static int prv_time_font_size(GFont font) {
  for (unsigned i = 0; i < LARGE_TIME_FONT_COUNT; ++i) {
    if (font == s_large_time_fonts[i]) { return s_large_time_font_sizes[i]; }
  }
  if (font == s_large_compact_time_font) { return 72; }
  return font == s_compact_time_font ? 64 : 76;
}

static GFont prv_get_standard_time_font(int available_width) {
  const GSize size = graphics_text_layout_get_content_size(
      s_time_buffer, s_time_font, GRect(0, 0, 320, 130),
      GTextOverflowModeFill, GTextAlignmentCenter);
  return size.w <= available_width ? s_time_font : s_compact_time_font;
}

static bool prv_date_fits(GFont font, int available_width) {
  const GSize size = graphics_text_layout_get_content_size(
      s_date_buffer, font, GRect(0, 0, 320, 60),
      GTextOverflowModeFill, GTextAlignmentCenter);
  return size.w <= available_width;
}

static GFont prv_get_date_font(GFont preferred, int available_width) {
  if (prv_date_fits(preferred, available_width)) {
    return preferred;
  }
  if (preferred == s_large_date_font &&
      prv_date_fits(s_date_font, available_width)) {
    return s_date_font;
  }
  if (preferred != s_compact_date_font &&
      prv_date_fits(s_compact_date_font, available_width)) {
    return s_compact_date_font;
  }
  if (prv_date_fits(s_small_date_font, available_width)) { return s_small_date_font; }
  return s_complication_fonts[COMPLICATION_FONT_COUNT - 1];
}

static int prv_date_font_size(GFont font) {
  if (font == s_large_date_font) { return 28; }
  if (font == s_date_font) { return 24; }
  if (font == s_compact_date_font) { return 22; }
  return font == s_small_date_font ? 20 : 18;
}


static bool prv_text_fits(const char *text, GFont font, int width, int height) {
  const GSize size = graphics_text_layout_get_content_size(
      text, font, GRect(0, 0, 2048, 150), GTextOverflowModeFill, GTextAlignmentCenter);
  return size.w <= width && size.h <= height;
}

static GRect prv_layout_rect(WatchLayoutRect rect) {
  return GRect(rect.x, rect.y, rect.width, rect.height);
}

static WatchLayoutGeometry prv_current_geometry(void) {
  return watch_layout_geometry(WATCH_LAYOUT_CLASSIC,
      layer_get_unobstructed_bounds(s_window_layer).size.h, s_large_text_enabled,
      context_mode(&s_context, time(NULL)) != CONTEXT_NONE);
}

static void prv_clear_complication_cache(void) {
  for (unsigned i = 0; i < COMPLICATION_CACHE_CHUNKS; ++i) {
    persist_delete(PERSIST_KEY_COMPLICATION_FIRST + i);
  }
}

static void prv_record_freshness(void) {
  const time_t now = time(NULL);
  for (unsigned i = 0; i < COMPLICATION_SLOT_COUNT; ++i) {
    s_was_fresh[i] = s_has_complications && complication_is_fresh(&s_complications.slots[i], now);
  }
}

static void prv_save_complications(void) {
  const size_t count = (s_complication_packet_length + COMPLICATION_CACHE_CHUNK_BYTES - 1) /
      COMPLICATION_CACHE_CHUNK_BYTES;
  // Commit the header chunk last. Any interrupted write is rejected by the
  // packet length and CRC on relaunch instead of displaying a mixed snapshot.
  for (size_t pass = 1; pass <= count; ++pass) {
    const size_t index = pass == count ? 0 : pass;
    const size_t offset = index * COMPLICATION_CACHE_CHUNK_BYTES;
    const size_t remaining = s_complication_packet_length - offset;
    const size_t length = remaining < COMPLICATION_CACHE_CHUNK_BYTES
        ? remaining : COMPLICATION_CACHE_CHUNK_BYTES;
    if (persist_write_data(PERSIST_KEY_COMPLICATION_FIRST + index,
                           s_complication_packet + offset, length) != (int)length) {
      prv_clear_complication_cache();
      return;
    }
  }
  for (size_t i = count; i < COMPLICATION_CACHE_CHUNKS; ++i) {
    persist_delete(PERSIST_KEY_COMPLICATION_FIRST + i);
  }
}

static void prv_load_complications(void) {
  const int first_length = persist_get_size(PERSIST_KEY_COMPLICATION_FIRST);
  if (first_length < COMPLICATION_HEADER_BYTES || first_length > COMPLICATION_CACHE_CHUNK_BYTES ||
      persist_read_data(PERSIST_KEY_COMPLICATION_FIRST, s_complication_packet,
                        COMPLICATION_CACHE_CHUNK_BYTES) != first_length) { return; }
  const size_t length = complications_u16(s_complication_packet + 2);
  if (length < COMPLICATION_HEADER_BYTES || length > COMPLICATION_MAX_BYTES ||
      first_length != (int)(length < COMPLICATION_CACHE_CHUNK_BYTES
          ? length : COMPLICATION_CACHE_CHUNK_BYTES)) { return; }
  const size_t count = (length + COMPLICATION_CACHE_CHUNK_BYTES - 1) / COMPLICATION_CACHE_CHUNK_BYTES;
  for (size_t i = 1; i < count; ++i) {
    const size_t offset = i * COMPLICATION_CACHE_CHUNK_BYTES;
    const size_t remaining = length - offset;
    const size_t chunk = remaining < COMPLICATION_CACHE_CHUNK_BYTES
        ? remaining : COMPLICATION_CACHE_CHUNK_BYTES;
    if (persist_get_size(PERSIST_KEY_COMPLICATION_FIRST + i) != (int)chunk ||
        persist_read_data(PERSIST_KEY_COMPLICATION_FIRST + i, s_complication_packet + offset,
                          chunk) != (int)chunk) { return; }
  }
  if (complications_read(s_complication_packet, length, &s_complications)) {
    s_has_complications = true;
    s_complication_packet_length = length;
    prv_record_freshness();
  }
}

static void prv_remove_legacy_data(void) {
  // Keys2..7 remain theme/clock settings. Ignore the old layout choice and
  // never reinterpret obsolete provider-specific values as generic slot data.
  static const uint8_t keys[] = {1, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18};
  for (size_t i = 0; i < sizeof(keys) / sizeof(keys[0]); ++i) { persist_delete(keys[i]); }
}

static bool prv_slot_text(const ComplicationSlot *slot, char *text, size_t capacity) {
  text[0] = '\0';
  if (!complication_is_fresh(slot, time(NULL))) {
    snprintf(text, capacity, "--");
    return true;
  }
  if (slot->flags & COMPLICATION_FLAG_TIMESTAMP) {
    const time_t value = (time_t)slot->timestamp;
    struct tm *local = value >= 0 && (uint64_t)value == slot->timestamp ? localtime(&value) : NULL;
    if (local != NULL && strftime(text, capacity, s_use_12_hour ? "%I:%M" : "%H:%M", local)) {
      if (s_use_12_hour && text[0] == '0') { memmove(text, text + 1, strlen(text)); }
      return true;
    }
    snprintf(text, capacity, "--");
    return true;
  }
  if ((slot->flags & COMPLICATION_FLAG_TEXT) && slot->text_length) {
    snprintf(text, capacity, "%s", slot->text);
    return true;
  }
  return false;
}

static GFont prv_fit_complication(char *text, size_t capacity, int width, int height, int preferred) {
  for (unsigned i = 0; i < COMPLICATION_FONT_COUNT; ++i) {
    if (s_complication_font_sizes[i] <= preferred &&
        prv_text_fits(text, s_complication_fonts[i], width, height)) { return s_complication_fonts[i]; }
  }
  const GFont smallest = s_complication_fonts[COMPLICATION_FONT_COUNT - 1];
  if (!prv_text_fits(text, smallest, width, height)) {
    char prefix[COMPLICATION_MAX_TEXT_BYTES + 1];
    snprintf(prefix, sizeof(prefix), "%s", text);
    do {
      watch_layout_pop_utf8(prefix);
      snprintf(text, capacity, "%s…", prefix);
    } while (prefix[0] && !prv_text_fits(text, smallest, width, height));
  }
  return smallest;
}

typedef struct {
  int width, height, x, y, source_x, source_y, source_width, source_height;
} BitmapLayout;

static BitmapLayout prv_bitmap_layout(const ComplicationSlot *slot, int size, bool cover) {
  const int longest = slot->width > slot->height ? slot->width : slot->height;
  if (longest <= 0 || size <= 0) { return (BitmapLayout){0}; }
  const ReadingCoverCrop crop = reading_cover_crop(slot->width, slot->height);
  const int width = cover ? size : (slot->width * size + longest / 2) / longest;
  const int height = cover ? size : (slot->height * size + longest / 2) / longest;
  return (BitmapLayout){width, height, (size - width) / 2, (size - height) / 2,
      cover ? crop.x : 0, cover ? crop.y : 0,
      cover ? crop.size : slot->width, cover ? crop.size : slot->height};
}

static uint8_t prv_bitmap_pixel(const ComplicationSlot *slot, const BitmapLayout *layout,
                                int column, int row) {
  const int sx = layout->source_x + column * layout->source_width / layout->width;
  const int sy = layout->source_y + row * layout->source_height / layout->height;
  const uint8_t pair = slot->bitmap[sy * slot->stride + sx / 2];
  return slot->palette[sx % 2 ? pair & 15 : pair >> 4];
}

// Include contain-fit letterboxing and source transparency when aligning an
// icon. The same sampling path is used for drawing and visible-bound lookup.
static int prv_bitmap_visible_bottom(const ComplicationSlot *slot, int size, bool cover) {
  const BitmapLayout layout = prv_bitmap_layout(slot, size, cover);
  for (int row = layout.height - 1; row >= 0; --row) {
    for (int column = 0; column < layout.width; ++column) {
      if (prv_bitmap_pixel(slot, &layout, column, row) & 0xc0) {
        return layout.y + row + 1;
      }
    }
  }
  return 0;
}

static void prv_draw_bitmap(GContext *ctx, const ComplicationSlot *slot,
                            int x, int y, int size, bool shadow, bool cover) {
  const BitmapLayout layout = prv_bitmap_layout(slot, size, cover);
  x += layout.x;
  y += layout.y;
  for (int row = 0; row < layout.height; ++row) {
    for (int column = 0; column < layout.width; ++column) {
      const uint8_t source = prv_bitmap_pixel(slot, &layout, column, row);
      if (!(source & 0xc0)) { continue; }
      GColor8 color = {.argb = source};
      if (shadow) { color = GColorBlack; }
      else if (!(slot->flags & COMPLICATION_FLAG_IMAGE)) {
        color.argb = (s_text_color.argb & 0x3f) | (source & 0xc0);
      }
      graphics_context_set_fill_color(ctx, color);
      graphics_fill_rect(ctx, GRect(x + column, y + row, 1, 1), 0, GCornerNone);
    }
  }
}

static void prv_draw_droplet(GContext *ctx, int x, int y, GColor color, bool small) {
  graphics_context_set_fill_color(ctx, color);
  graphics_context_set_antialiased(ctx, true);
  graphics_fill_circle(ctx, GPoint(x + (small ? 7 : 8), y + (small ? 11 : 13)), small ? 6 : 8);
  GPath *path = small ? s_small_drop_path : s_drop_path;
  if (path != NULL) {
    gpath_move_to(path, GPoint(x + (small ? 7 : 8), y + (small ? 8 : 10)));
    gpath_draw_filled(ctx, path);
  }
}

static void prv_draw_number_text(GContext *ctx, const char *text, GFont font,
                                 GRect rect, GColor color) {
  graphics_context_set_text_color(ctx, color);
  graphics_draw_text(ctx, text, font, rect, GTextOverflowModeFill, GTextAlignmentLeft, NULL);
}

static GFont prv_complication_font_at_most(int size) {
  for (unsigned i = 0; i < COMPLICATION_FONT_COUNT; ++i) {
    if (s_complication_font_sizes[i] <= size) { return s_complication_fonts[i]; }
  }
  return s_complication_fonts[COMPLICATION_FONT_COUNT - 1];
}

static bool prv_draw_number_reading(GContext *ctx, const ComplicationSlot *slot,
                                    const ReadingParts *parts, GRect bounds,
                                    int preferred, bool bitmap) {
  const bool droplet = slot->display_kind == COMPLICATION_DISPLAY_PRECIPITATION &&
      reading_is_probability(parts);
  for (unsigned i = 0; i < COMPLICATION_FONT_COUNT; ++i) {
    if (s_complication_font_sizes[i] > preferred) { continue; }
    const bool small_droplet = droplet && s_complication_font_sizes[i] < 32;
    const int icon_width = droplet ? (small_droplet ? 14 : 18) : bitmap ? 16 : 0;
    const int icon_gap = icon_width ? 5 : 0;
    const int droplet_height = small_droplet ? 18 : 22;
    const GFont font = s_complication_fonts[i];
    const int unit_size = s_complication_font_sizes[i] >= 44 ? 24
        : s_complication_font_sizes[i] >= 32 ? 20 : 18;
    const GFont unit_font = prv_complication_font_at_most(unit_size);
    const GSize unit = parts->unit[0] ? graphics_text_layout_get_content_size(parts->unit,
        unit_font, GRect(0, 0, 2048, 100), GTextOverflowModeFill, GTextAlignmentLeft) : GSize(0, 0);
    const GSize number = graphics_text_layout_get_content_size(parts->number, font,
        GRect(0, 0, 2048, 100), GTextOverflowModeFill, GTextAlignmentLeft);
    const int unit_gap = unit.w ? 2 : 0;
    const int width = icon_width + icon_gap + number.w + unit_gap + unit.w + 2;
    if (width > bounds.size.w || number.h > bounds.size.h || unit.h > bounds.size.h) { continue; }
    const int x = (bounds.size.w - width) / 2;
    const int y = (bounds.size.h - number.h) / 2;
    for (unsigned shadow = s_text_shadow_enabled ? 1 : 0; ; --shadow) {
      const int offset = shadow ? 1 : 0;
      const GColor color = shadow ? GColorBlack : s_text_color;
      if (droplet) {
        prv_draw_droplet(ctx, x + offset, (bounds.size.h - droplet_height) / 2 + offset,
                         color, small_droplet);
      } else if (bitmap && (!shadow || !(slot->flags & COMPLICATION_FLAG_IMAGE))) {
        prv_draw_bitmap(ctx, slot, x + offset, (bounds.size.h - 16) / 2 + offset, 16, shadow, false);
      }
      const int text_x = x + icon_width + icon_gap + offset;
      prv_draw_number_text(ctx, parts->number, font, GRect(text_x, y + offset,
          number.w + 2, bounds.size.h), color);
      if (unit.w) {
        const int unit_y = y + number.h - unit.h - (number.h > unit.h ? 2 : 0) + offset;
        prv_draw_number_text(ctx, parts->unit, unit_font,
            GRect(text_x + number.w + unit_gap, unit_y, unit.w + 2, bounds.size.h), color);
      }
      if (!shadow) { break; }
    }
    return true;
  }
  return false;
}

static void prv_draw_complication(Layer *layer, GContext *ctx) {
  const unsigned index = *(uint8_t *)layer_get_data(layer);
  if (!s_has_complications || index >= COMPLICATION_SLOT_COUNT) { return; }
  const ComplicationSlot *slot = &s_complications.slots[index];
  if (!complication_is_selected(slot)) { return; }
  const GRect bounds = layer_get_bounds(layer);
  const bool fresh = complication_is_fresh(slot, time(NULL));
  bool bitmap = fresh && (slot->flags & COMPLICATION_FLAG_BITMAP);
  char text[COMPLICATION_MAX_TEXT_BYTES + 5];
  bool has_text = prv_slot_text(slot, text, sizeof(text));
  if (!has_text && !bitmap) { snprintf(text, sizeof(text), "--"); has_text = true; }
  const int bitmap_size = bitmap ? (has_text ? 16 : 24) : 0;
  const int gap = bitmap && has_text ? 4 : 0;
  const WatchLayoutGeometry geometry = prv_current_geometry();
  const int preferred = geometry.slots[index].font_size;
  ReadingParts parts;
  if (fresh && has_text && !(slot->flags & COMPLICATION_FLAG_TIMESTAMP) &&
      reading_parts(text, &parts) &&
      prv_draw_number_reading(ctx, slot, &parts, bounds, preferred, bitmap)) { return; }
  GFont font = s_complication_fonts[COMPLICATION_FONT_COUNT - 1];
  GSize text_size = GSize(0, 0);
  if (has_text) {
    font = prv_fit_complication(text, sizeof(text), bounds.size.w - bitmap_size - gap - 2,
                                bounds.size.h, preferred);
    text_size = graphics_text_layout_get_content_size(text, font, GRect(0, 0, 2048, 100),
        GTextOverflowModeFill, GTextAlignmentCenter);
  }
  const int text_width = has_text ? text_size.w + 2 : 0;
  const int group_width = bitmap_size + gap + text_width;
  const int x = (bounds.size.w - group_width) / 2;
  if (bitmap) {
    const int y = (bounds.size.h - bitmap_size) / 2;
    if (s_text_shadow_enabled && !(slot->flags & COMPLICATION_FLAG_IMAGE)) {
      prv_draw_bitmap(ctx, slot, x + 1, y + 1, bitmap_size, true, false);
    }
    prv_draw_bitmap(ctx, slot, x, y, bitmap_size, false, false);
  }
  if (has_text) {
    const GRect frame = GRect(x + bitmap_size + gap, (bounds.size.h - text_size.h) / 2,
                              text_width, bounds.size.h);
    if (s_text_shadow_enabled) {
      graphics_context_set_text_color(ctx, GColorBlack);
      graphics_draw_text(ctx, text, font, GRect(frame.origin.x + 1, frame.origin.y + 1,
          frame.size.w, frame.size.h), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
    }
    graphics_context_set_text_color(ctx, s_text_color);
    graphics_draw_text(ctx, text, font, frame, GTextOverflowModeFill, GTextAlignmentCenter, NULL);
  }
}

static int prv_status_left_reserve(void) {
  if (!s_show_status) { return 0; }
  unsigned left = s_battery.charge_percent <= 10 && !s_battery.is_charging ? 1 : 0;
  if (context_phone_battery(&s_context.slots[4], time(NULL), NULL)) { ++left; }
  return (int)left * 12;
}

static int prv_status_right_reserve(void) {
  return s_show_status && !s_phone_connected ? 12 : 0;
}

typedef struct {
  char text[COMPLICATION_MAX_TEXT_BYTES + 5];
  GFont font;
  GRect frame;
  int ink_bottom;
} PreparedContextText;

static PreparedContextText prv_prepare_context_text(const ComplicationSlot *slot,
                                                     GRect rect, int preferred) {
  PreparedContextText result = {.frame = rect};
  if (!context_slot_fresh(slot, time(NULL)) || !(slot->flags & COMPLICATION_FLAG_TEXT)) {
    return result;
  }
  snprintf(result.text, sizeof(result.text), "%s", slot->text);
  result.font = prv_fit_complication(result.text, sizeof(result.text),
      rect.size.w - 2, rect.size.h, preferred);
  const GSize size = graphics_text_layout_get_content_size(result.text, result.font,
      GRect(0, 0, 2048, 100), GTextOverflowModeFill, GTextAlignmentLeft);
  result.frame.origin.y += (rect.size.h - size.h) / 2;
  int font_size = 18;
  for (unsigned i = 0; i < COMPLICATION_FONT_COUNT; ++i) {
    if (result.font == s_complication_fonts[i]) { font_size = s_complication_font_sizes[i]; break; }
  }
  const int bottom = context_text_ink_bottom(result.text, font_size);
  result.ink_bottom = bottom ? result.frame.origin.y + bottom : 0;
  return result;
}

static void prv_draw_context_text(GContext *ctx, const PreparedContextText *text) {
  if (text->font == NULL || !text->text[0]) { return; }
  const GRect rect = text->frame;
  if (s_text_shadow_enabled) {
    graphics_context_set_text_color(ctx, GColorBlack);
    graphics_draw_text(ctx, text->text, text->font, GRect(rect.origin.x + 1, rect.origin.y + 1,
        rect.size.w, rect.size.h), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
  }
  graphics_context_set_text_color(ctx, s_text_color);
  graphics_draw_text(ctx, text->text, text->font, rect,
      GTextOverflowModeFill, GTextAlignmentLeft, NULL);
}

static bool prv_context_bitmap_visible(const ComplicationSlot *title, ContextMode mode,
                                       GRect bounds, bool has_subtitle) {
  const int line_height = has_subtitle ? bounds.size.h / 2 : bounds.size.h;
  const int preferred = has_subtitle ? (s_large_text_enabled ? 24 : 20)
      : (s_large_text_enabled ? 28 : 24);
  bool bitmap = title->flags & COMPLICATION_FLAG_BITMAP;
  if (bitmap && mode == CONTEXT_MUSIC) {
    GFont title_font = s_complication_fonts[COMPLICATION_FONT_COUNT - 1];
    for (unsigned i = 0; i < COMPLICATION_FONT_COUNT; ++i) {
      if (s_complication_font_sizes[i] <= preferred &&
          prv_text_fits(title->text, s_complication_fonts[i], 2046, line_height)) {
        title_font = s_complication_fonts[i]; break;
      }
    }
    const GSize full_title = graphics_text_layout_get_content_size(title->text, title_font,
        GRect(0, 0, 2048, 100), GTextOverflowModeFill, GTextAlignmentLeft);
    const int artwork = reading_context_artwork_size(has_subtitle, bounds.size.h);
    if (reading_hide_artwork(full_title.w, bounds.size.w - 2, artwork + 6)) { bitmap = false; }
  }
  return bitmap;
}

static void prv_draw_context(Layer *layer, GContext *ctx) {
  const ContextMode mode = context_mode(&s_context, time(NULL));
  if (mode == CONTEXT_NONE) { return; }
  const unsigned first = mode == CONTEXT_NOTIFICATION ? 2 : 0;
  const ComplicationSlot *title = &s_context.slots[first];
  const ComplicationSlot *subtitle = &s_context.slots[first + 1];
  const GRect bounds = layer_get_bounds(layer);
  const bool has_subtitle = context_slot_fresh(subtitle, time(NULL)) &&
      (subtitle->flags & COMPLICATION_FLAG_TEXT);
  const int line_height = has_subtitle ? bounds.size.h / 2 : bounds.size.h;
  const int preferred = has_subtitle ? (s_large_text_enabled ? 24 : 20)
      : (s_large_text_enabled ? 28 : 24);
  const bool bitmap = prv_context_bitmap_visible(title, mode, bounds, has_subtitle);
  int artwork = reading_context_artwork_size(has_subtitle, bounds.size.h);
  const int text_x = bitmap ? artwork + 6 : 0;
  const PreparedContextText primary = prv_prepare_context_text(title,
      GRect(text_x, 0, bounds.size.w - text_x, line_height), preferred);
  const PreparedContextText secondary = has_subtitle
      ? prv_prepare_context_text(subtitle, GRect(text_x, line_height,
          bounds.size.w - text_x, bounds.size.h - line_height), preferred)
      : (PreparedContextText){0};
  int text_bottom = primary.ink_bottom > secondary.ink_bottom
      ? primary.ink_bottom : secondary.ink_bottom;
  if (text_bottom <= 0 || text_bottom > bounds.size.h) { text_bottom = bounds.size.h; }
  if (bitmap) {
    // Very short punctuation-only text can end above a normal-sized image.
    // Keep the whole image inside the layer while preserving its lower edge.
    if (artwork > text_bottom) { artwork = text_bottom; }
    const bool cover = mode == CONTEXT_MUSIC && (title->flags & COMPLICATION_FLAG_IMAGE) != 0;
    const int visible_bottom = prv_bitmap_visible_bottom(title, artwork, cover);
    if (visible_bottom > 0) {
      prv_draw_bitmap(ctx, title, 0, reading_context_artwork_y(text_bottom, visible_bottom),
          artwork, false, cover);
    }
  }
  prv_draw_context_text(ctx, &primary);
  if (has_subtitle) { prv_draw_context_text(ctx, &secondary); }
}

static void prv_apply_unobstructed_layout(void);

static void prv_cancel_panel_transition(void) {
  if (s_transition_timer != NULL) { app_timer_cancel(s_transition_timer); s_transition_timer = NULL; }
  s_transition_frame = 3;
  if (s_transition_layer != NULL) { layer_set_hidden(s_transition_layer, true); }
}

static void prv_transition_next(void *context) {
  s_transition_timer = NULL;
  if (s_transition_frame < 3) { ++s_transition_frame; }
  if (s_transition_layer != NULL) {
    layer_set_hidden(s_transition_layer, s_transition_frame >= 3);
    layer_mark_dirty(s_transition_layer);
  }
  if (s_transition_frame < 3) {
    s_transition_timer = app_timer_register(60, prv_transition_next, NULL);
    if (s_transition_timer == NULL) { prv_cancel_panel_transition(); }
  }
}

static void prv_draw_transition(Layer *layer, GContext *ctx) {
  const unsigned radius = reading_dissolve_radius(s_transition_frame);
  if (!radius) { return; }
  const GRect bounds = layer_get_bounds(layer);
  graphics_context_set_fill_color(ctx, s_background_color);
  graphics_context_set_antialiased(ctx, false);
  // Keep every temporary reveal dot inside the lower content interior. These
  // never overlap the clock, pinned reading or the established bezel rings.
  for (int y = 8; y < bounds.size.h - 6; y += 8) {
    for (int x = 8; x < bounds.size.w - 8; x += 8) {
      graphics_fill_circle(ctx, GPoint(x, y), radius);
    }
  }
}

static uint32_t prv_hash_visible_slot(uint32_t hash, const ComplicationSlot *slot,
                                      bool selected, bool bitmap_visible) {
  const uint8_t fresh = selected && complication_is_fresh(slot, time(NULL));
  hash = reading_hash_bytes(hash, &selected, sizeof(selected));
  hash = reading_hash_bytes(hash, &fresh, sizeof(fresh));
  if (!fresh) { return hash; }
  const uint8_t visible_flags = bitmap_visible ? slot->flags :
      slot->flags & ~(COMPLICATION_FLAG_BITMAP | COMPLICATION_FLAG_IMAGE);
  hash = reading_hash_bytes(hash, &visible_flags, sizeof(visible_flags));
  hash = reading_hash_bytes(hash, &slot->display_kind, sizeof(slot->display_kind));
  hash = reading_hash_bytes(hash, slot->text, slot->text_length);
  if (slot->flags & COMPLICATION_FLAG_TIMESTAMP) {
    hash = reading_hash_bytes(hash, &slot->timestamp, sizeof(slot->timestamp));
  }
  if (bitmap_visible && (slot->flags & COMPLICATION_FLAG_BITMAP)) {
    hash = reading_hash_bytes(hash, &slot->width, sizeof(slot->width));
    hash = reading_hash_bytes(hash, &slot->height, sizeof(slot->height));
    hash = reading_hash_bytes(hash, slot->palette, sizeof(slot->palette));
    hash = reading_hash_bytes(hash, slot->bitmap, slot->pixel_bytes);
  }
  return hash;
}

static void prv_refresh_panel_transition(const WatchLayoutGeometry *geometry) {
  if (s_transition_layer == NULL) { return; }
  const ContextMode mode = context_mode(&s_context, time(NULL));
  uint32_t signature = reading_hash_bytes(UINT32_C(2166136261), &mode, sizeof(mode));
  bool incoming;
  if (mode == CONTEXT_NONE) {
    const ComplicationSlot *slot = &s_complications.slots[1];
    const bool selected = s_has_complications && complication_is_selected(slot);
    ReadingParts parts;
    const bool droplet = slot->display_kind == COMPLICATION_DISPLAY_PRECIPITATION &&
        reading_parts(slot->text, &parts) && reading_is_probability(&parts);
    signature = prv_hash_visible_slot(signature, slot, selected, !droplet);
    incoming = selected && complication_is_fresh(slot, time(NULL));
  } else {
    const unsigned first = mode == CONTEXT_NOTIFICATION ? 2 : 0;
    const WatchLayoutRect rect = geometry->context.width ? geometry->context :
        watch_layout_geometry(WATCH_LAYOUT_CLASSIC, FULL_LAYOUT_HEIGHT, s_large_text_enabled, true).context;
    const bool has_subtitle = context_slot_fresh(&s_context.slots[first + 1], time(NULL)) &&
        (s_context.slots[first + 1].flags & COMPLICATION_FLAG_TEXT);
    const bool bitmap = prv_context_bitmap_visible(&s_context.slots[first], mode,
        prv_layout_rect(rect), has_subtitle);
    signature = prv_hash_visible_slot(signature, &s_context.slots[first], true, bitmap);
    signature = prv_hash_visible_slot(signature, &s_context.slots[first + 1], true, false);
    incoming = true;
  }
  const bool changed = s_panel_signature_known && signature != s_panel_signature;
  const bool private_clear = s_panel_mode != CONTEXT_NONE &&
      (mode == CONTEXT_NONE || (s_panel_mode == CONTEXT_NOTIFICATION && mode != CONTEXT_NOTIFICATION));
  if (mode == CONTEXT_NONE || !geometry->context.width || !s_panel_transitions ||
      !s_phone_connected || !incoming || private_clear) {
    prv_cancel_panel_transition();
  } else if (changed && s_panel_content_seen) {
    prv_cancel_panel_transition();
    s_transition_frame = 0;
    layer_set_hidden(s_transition_layer, false);
    layer_mark_dirty(s_transition_layer);
    s_transition_timer = app_timer_register(60, prv_transition_next, NULL);
    if (s_transition_timer == NULL) { prv_cancel_panel_transition(); }
  }
  s_panel_signature = signature;
  s_panel_signature_known = true;
  if (incoming) { s_panel_content_seen = true; }
  s_panel_mode = mode;
}

static void prv_draw_status(Layer *layer, GContext *ctx) {
  if (!s_show_status) { return; }
  const WatchLayoutGeometry geometry = prv_current_geometry();
  const int y = geometry.slots[0].rect.y + (geometry.slots[0].rect.height - 10) / 2;
  int x = geometry.slots[0].rect.x;
  graphics_context_set_stroke_color(ctx, s_text_color);
  graphics_context_set_fill_color(ctx, s_text_color);
  graphics_context_set_stroke_width(ctx, 1);
  if (s_battery.charge_percent <= 10 && !s_battery.is_charging) {
    graphics_draw_rect(ctx, GRect(x, y + 2, 9, 6));
    graphics_fill_rect(ctx, GRect(x + 9, y + 4, 1, 2), 0, GCornerNone);
    graphics_fill_rect(ctx, GRect(x + 2, y + 4, 1, 2), 0, GCornerNone);
    x += 12;
  }
  if (context_phone_battery(&s_context.slots[4], time(NULL), NULL)) {
    graphics_draw_round_rect(ctx, GRect(x + 1, y, 6, 10), 1);
    graphics_fill_rect(ctx, GRect(x + 3, y + 7, 2, 1), 0, GCornerNone);
  }
  if (!s_phone_connected) {
    const int bx = geometry.slots[1].rect.x + geometry.slots[1].rect.width - 9;
    graphics_draw_line(ctx, GPoint(bx + 3, y), GPoint(bx + 3, y + 10));
    graphics_draw_line(ctx, GPoint(bx + 3, y), GPoint(bx + 7, y + 3));
    graphics_draw_line(ctx, GPoint(bx + 7, y + 3), GPoint(bx, y + 8));
    graphics_draw_line(ctx, GPoint(bx + 3, y + 10), GPoint(bx + 7, y + 7));
    graphics_draw_line(ctx, GPoint(bx + 7, y + 7), GPoint(bx, y + 2));
    graphics_draw_line(ctx, GPoint(bx - 1, y + 10), GPoint(bx + 8, y));
  }
}

static void prv_apply_unobstructed_layout(void);
static void prv_context_expired(void *context);

static void prv_schedule_context_expiry(void) {
  if (s_context_timer != NULL) { app_timer_cancel(s_context_timer); s_context_timer = NULL; }
  const time_t now = time(NULL);
  for (unsigned i = 0; i < COMPLICATION_SLOT_COUNT; ++i) {
    if (!context_slot_fresh(&s_context.slots[i], now)) {
      memset(&s_context.slots[i], 0, sizeof(s_context.slots[i]));
    }
  }
  const uint32_t next = context_next_expiry(&s_context, now);
  if (next > (uint32_t)now) {
    s_context_timer = app_timer_register((next - (uint32_t)now) * 1000,
        prv_context_expired, NULL);
  }
}

static void prv_context_expired(void *context) {
  s_context_timer = NULL;
  prv_schedule_context_expiry();
  prv_apply_unobstructed_layout();
}

static void prv_draw_background(Layer *layer, GContext *ctx) {
  const GRect layer_bounds = layer_get_bounds(layer);
  const GRect bounds = layer_get_unobstructed_bounds(s_window_layer != NULL ? s_window_layer : layer);
  graphics_context_set_antialiased(ctx, true);
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, layer_bounds, 0, GCornerNone);
  graphics_context_set_fill_color(ctx, s_background_color);
  graphics_fill_rect(ctx, bounds, DOT_OUTER_CORNER_RADIUS, GCornersAll);
  graphics_context_set_fill_color(ctx, GColorBlack);
  const int *dot_depths = s_depth_effect_enabled ? s_depth_dot_depths : s_classic_dot_depths;
  const int *dot_radii = s_depth_effect_enabled ? s_depth_dot_radii : s_classic_dot_radii;
  const int transition_steps = s_depth_effect_enabled ? DEPTH_DOT_TRANSITION_STEPS
                                                     : CLASSIC_DOT_TRANSITION_STEPS;
  for (int step = 0; step < transition_steps; ++step) {
    prv_draw_rounded_dot_ring(ctx, bounds, dot_depths[step], dot_radii[step], step);
  }
}

static void prv_apply_unobstructed_layout(void) {
  if (s_window_layer == NULL || s_date_layer == NULL || s_time_layer == NULL) { return; }
  const GRect root_bounds = layer_get_bounds(s_window_layer);
  const int visible_height = layer_get_unobstructed_bounds(s_window_layer).size.h;
  const bool has_context = context_mode(&s_context, time(NULL)) != CONTEXT_NONE;
  if (!s_compact_layout && visible_height <= COMPACT_FONT_ENTER_HEIGHT) { s_compact_layout = true; }
  else if (s_compact_layout && visible_height >= COMPACT_FONT_EXIT_HEIGHT) { s_compact_layout = false; }
  const int date_x = s_large_text_enabled ? 12 : 16;
  const int date_width = root_bounds.size.w - date_x * 2;
  const int time_x = s_large_text_enabled ? 4 : 16;
  const int time_width = root_bounds.size.w - time_x * 2;
  const GFont preferred_date = s_compact_layout
      ? (s_large_text_enabled ? s_large_date_font : s_date_font)
      : (s_large_text_enabled ? s_large_date_font : s_date_font);
  const GFont date_font = prv_get_date_font(preferred_date, date_width - (s_text_shadow_enabled ? 2 : 0));
  const GFont time_font = s_compact_layout
      ? (s_large_text_enabled ? s_large_compact_time_font : s_compact_time_font)
      : (s_large_text_enabled ? prv_get_large_time_font(time_width -
          (s_text_shadow_enabled ? 10 : 8), has_context ? 88 : 108) :
          prv_get_standard_time_font(time_width - (s_text_shadow_enabled ? 4 : 2)));
  const int date_y = watch_layout_date_y(prv_date_font_size(date_font), s_date_buffer,
      prv_layout_value(s_large_text_enabled ? 22 : 26,
          s_large_text_enabled ? 20 : 22, visible_height),
      visible_height, has_context, s_text_shadow_enabled);
  prv_set_text_pair_layout(s_date_shadow_layer, s_date_layer,
      GRect(date_x, date_y, date_width,
          prv_layout_value(s_large_text_enabled ? 44 : 38,
          s_large_text_enabled ? 34 : 30, visible_height)), date_font, 1);
  prv_set_text_pair_layout(s_time_shadow_layer, s_time_layer,
      GRect(time_x, watch_layout_clock_y(prv_time_font_size(time_font),
          visible_height, has_context), time_width,
          prv_layout_value(s_large_text_enabled ? 120 : 102,
          s_large_text_enabled ? 86 : 78, visible_height)), time_font, 2);
  text_layer_set_text(s_date_layer, s_date_buffer);
  text_layer_set_text(s_date_shadow_layer, s_date_buffer);
  text_layer_set_text(s_time_layer, s_time_buffer);
  text_layer_set_text(s_time_shadow_layer, s_time_buffer);
  const WatchLayoutGeometry geometry = prv_current_geometry();
  const bool contextual = geometry.context.width > 0 && context_mode(&s_context, time(NULL)) != CONTEXT_NONE;
  for (unsigned i = 0; i < COMPLICATION_SLOT_COUNT; ++i) {
    const bool visible = s_has_complications && complication_is_selected(&s_complications.slots[i]) &&
        geometry.slots[i].rect.width > 0;
    WatchLayoutRect rect = geometry.slots[i].rect;
    if (rect.width > 0 && i == 0 && s_show_status) {
      const int reserve = prv_status_left_reserve();
      rect.x += reserve;
      rect.width -= reserve;
      if (geometry.slots[1].rect.width == 0) { rect.width -= prv_status_right_reserve(); }
    } else if (rect.width > 0 && i == 1 && s_show_status) {
      rect.width -= prv_status_right_reserve();
    }
    layer_set_frame(s_complication_layers[i], prv_layout_rect(rect));
    layer_set_hidden(s_complication_layers[i], !visible);
    layer_mark_dirty(s_complication_layers[i]);
  }
  if (s_context_layer != NULL) {
    layer_set_frame(s_context_layer, prv_layout_rect(geometry.context));
    layer_set_hidden(s_context_layer, !contextual);
    layer_mark_dirty(s_context_layer);
  }
  if (s_transition_layer != NULL) {
    layer_set_frame(s_transition_layer, prv_layout_rect(geometry.context));
    prv_refresh_panel_transition(&geometry);
  }
  if (s_status_layer != NULL) { layer_mark_dirty(s_status_layer); }
  layer_mark_dirty(s_background_layer);
}

static void prv_update_clock(void) {
  const time_t now = time(NULL);
  struct tm *current_time = localtime(&now);
  const char *const *localized_days = prv_get_localized_days();

  strftime(s_time_buffer, sizeof(s_time_buffer),
           s_use_12_hour ? "%I:%M" : "%H:%M", current_time);
  if (s_use_12_hour && s_time_buffer[0] == '0') {
    memmove(s_time_buffer, s_time_buffer + 1, strlen(s_time_buffer));
  }
  snprintf(s_date_buffer, sizeof(s_date_buffer), "%s · %d.%d.",
           localized_days[current_time->tm_wday], current_time->tm_mday,
           current_time->tm_mon + 1);

  text_layer_set_text(s_time_layer, s_time_buffer);
  text_layer_set_text(s_date_layer, s_date_buffer);
  text_layer_set_text(s_time_shadow_layer, s_time_buffer);
  text_layer_set_text(s_date_shadow_layer, s_date_buffer);

  // Re-evaluate every minute: extra-large time follows the current digits and
  // long localized weekday names can select the compact date font.
  prv_apply_unobstructed_layout();
}


static void prv_request_complications(void) {
  DictionaryIterator *iterator;
  const AppMessageResult result = app_message_outbox_begin(&iterator);
  if (result != APP_MSG_OK || iterator == NULL) {
    APP_LOG(APP_LOG_LEVEL_WARNING, "Could not begin complication request: %d", result);
    return;
  }
  dict_write_uint8(iterator, MESSAGE_KEY_REQUEST_COMPLICATIONS, 1);
  dict_write_uint32(iterator, MESSAGE_KEY_REQUEST_CONTEXT,
      s_context_rebaseline || s_context_awaiting_baseline ? s_context_session_token : 1);
  s_context_rebaseline_in_flight = s_context_rebaseline;
  s_request_generation = s_connection_generation;
  const AppMessageResult sent = app_message_outbox_send();
  if (sent != APP_MSG_OK) {
    s_context_rebaseline_in_flight = false;
    APP_LOG(APP_LOG_LEVEL_WARNING, "Complication request failed: %d", sent);
  } else { s_last_request_at = time(NULL); }
}

static void prv_startup_request(void *context) {
  s_startup_timer = NULL;
  prv_request_complications();
}

static void prv_phone_connection_changed(bool connected) {
  if (connected == s_phone_connected) { return; }
  s_phone_connected = connected;
  ++s_connection_generation;
  s_context_rebaseline = true;
  s_context_awaiting_baseline = true;
  memset(&s_context, 0, sizeof(s_context));
  prv_schedule_context_expiry();
  prv_apply_unobstructed_layout();
  if (connected) {
    s_context_session_token = context_next_session_token(s_context_session_token);
    persist_write_int(PERSIST_KEY_CONTEXT_SESSION, (int32_t)s_context_session_token);
    if (s_startup_timer != NULL) { app_timer_cancel(s_startup_timer); }
    s_startup_timer = app_timer_register(1000, prv_startup_request, NULL);
  }
}

static void prv_battery_changed(BatteryChargeState charge) {
  s_battery = charge;
  prv_apply_unobstructed_layout();
}

static void prv_tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  bool expired = false;
  const time_t now = time(NULL);
  for (unsigned i = 0; i < COMPLICATION_SLOT_COUNT; ++i) {
    const bool fresh = s_has_complications && complication_is_fresh(&s_complications.slots[i], now);
    if (s_was_fresh[i] && !fresh && s_complications.slots[i].status == COMPLICATION_STATUS_READY) {
      expired = true;
    }
    s_was_fresh[i] = fresh;
  }
  prv_update_clock();
  // One request on the freshness transition; denied/unavailable slots do not
  // cause a polling loop. Provider refresh policies belong to the phone host.
  if (expired || (s_phone_connected && now >= s_last_request_at + 30 * 60)) {
    prv_request_complications();
  }
  prv_schedule_context_expiry();
}

static void prv_unobstructed_area_will_change(GRect final_area, void *context) {
  prv_cancel_panel_transition();
  s_panel_signature_known = false;
  prv_apply_unobstructed_layout();
}
static void prv_unobstructed_area_change(AnimationProgress progress, void *context) {
  prv_apply_unobstructed_layout();
}
static void prv_unobstructed_area_did_change(void *context) { prv_apply_unobstructed_layout(); }

static void prv_apply_colors(void) {
  if (s_window != NULL) { window_set_background_color(s_window, s_background_color); }
  if (s_date_layer != NULL) { text_layer_set_text_color(s_date_layer, s_text_color); }
  if (s_time_layer != NULL) { text_layer_set_text_color(s_time_layer, s_text_color); }
  prv_apply_unobstructed_layout();
}

static void prv_apply_effects(void) {
  if (s_date_shadow_layer != NULL) {
    layer_set_hidden(text_layer_get_layer(s_date_shadow_layer), !s_text_shadow_enabled);
  }
  if (s_time_shadow_layer != NULL) {
    layer_set_hidden(text_layer_get_layer(s_time_shadow_layer), !s_text_shadow_enabled);
  }
  prv_apply_unobstructed_layout();
}

static uint32_t prv_context_request_value(const Tuple *marker) {
  if (marker == NULL || (marker->type != TUPLE_INT && marker->type != TUPLE_UINT)) { return 0; }
  uint32_t value = 0;
  if (marker->length == 1) {
    if (marker->type == TUPLE_INT && marker->value->int8 < 0) { return 0; }
    value = marker->value->uint8;
  } else if (marker->length == 2) {
    if (marker->type == TUPLE_INT && marker->value->int16 < 0) { return 0; }
    value = marker->value->uint16;
  } else if (marker->length == 4) {
    if (marker->type == TUPLE_INT && marker->value->int32 < 0) { return 0; }
    value = marker->value->uint32;
  }
  return value <= CONTEXT_MAX_SESSION_TOKEN ? value : 0;
}

static void prv_inbox_received(DictionaryIterator *iterator, void *context) {
  Tuple *context_data = dict_find(iterator, MESSAGE_KEY_CONTEXT_DATA);
  const uint32_t marker_value = prv_context_request_value(dict_find(iterator, MESSAGE_KEY_REQUEST_CONTEXT));
  if (context_data == NULL && marker_value == 1) {
    // PKJS may become ready after the first native request was acknowledged.
    // Answer its query with the current epoch; querying never advances it.
    s_context_rebaseline = true;
    if (s_startup_timer != NULL) { app_timer_cancel(s_startup_timer); }
    s_startup_timer = app_timer_register(100, prv_startup_request, NULL);
  }
  if (context_data != NULL) {
    const bool baseline = context_session_token_matches(marker_value, s_context_session_token);
    if (!s_phone_connected || context_data->type != TUPLE_BYTE_ARRAY || context_data->length > COMPLICATION_MAX_BYTES ||
        !context_receive(context_data->value->data, context_data->length, &s_context,
            &s_context_awaiting_baseline, baseline)) {
      // A malformed update must not leave an earlier private preview visible.
      memset(&s_context, 0, sizeof(s_context));
    }
    prv_schedule_context_expiry();
  }
  Tuple *data = dict_find(iterator, MESSAGE_KEY_COMPLICATION_DATA);
  if (data != NULL) {
    if (data->type == TUPLE_BYTE_ARRAY && data->length <= COMPLICATION_MAX_BYTES &&
        complications_read(data->value->data, data->length, &s_complications)) {
      s_has_complications = true;
      s_complication_packet_length = data->length;
      memcpy(s_complication_packet, data->value->data, s_complication_packet_length);
      prv_record_freshness();
      prv_save_complications();
      prv_remove_legacy_data();
    } else {
      s_has_complications = false;
      s_complication_packet_length = 0;
      memset(&s_complications, 0, sizeof(s_complications));
      memset(s_was_fresh, 0, sizeof(s_was_fresh));
      prv_clear_complication_cache();
    }
  }
  Tuple *background = dict_find(iterator, MESSAGE_KEY_BACKGROUND_COLOR);
  Tuple *text = dict_find(iterator, MESSAGE_KEY_TEXT_COLOR);
  Tuple *depth = dict_find(iterator, MESSAGE_KEY_DEPTH_EFFECT);
  Tuple *shadow = dict_find(iterator, MESSAGE_KEY_TEXT_SHADOW);
  Tuple *large = dict_find(iterator, MESSAGE_KEY_LARGE_TEXT);
  Tuple *twelve = dict_find(iterator, MESSAGE_KEY_USE_12_HOUR);
  Tuple *show_status = dict_find(iterator, MESSAGE_KEY_SHOW_STATUS);
  Tuple *transitions = dict_find(iterator, MESSAGE_KEY_PANEL_TRANSITIONS);
  if (background != NULL) {
    s_background_color = GColorFromHEX(background->value->int32);
    persist_write_int(PERSIST_KEY_BACKGROUND_COLOR, background->value->int32);
  }
  if (text != NULL) {
    s_text_color = GColorFromHEX(text->value->int32);
    persist_write_int(PERSIST_KEY_TEXT_COLOR, text->value->int32);
  }
  if (depth != NULL) {
    s_depth_effect_enabled = depth->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_DEPTH_EFFECT, s_depth_effect_enabled);
  }
  if (shadow != NULL) {
    s_text_shadow_enabled = shadow->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_TEXT_SHADOW, s_text_shadow_enabled);
  }
  if (large != NULL) {
    s_large_text_enabled = large->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_LARGE_TEXT, s_large_text_enabled);
  }
  if (twelve != NULL) {
    s_use_12_hour = twelve->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_USE_12_HOUR, s_use_12_hour);
  }
  if (show_status != NULL && (show_status->type == TUPLE_INT || show_status->type == TUPLE_UINT)) {
    s_show_status = show_status->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_SHOW_STATUS, s_show_status);
  }
  if (transitions != NULL && (transitions->type == TUPLE_INT || transitions->type == TUPLE_UINT)) {
    s_panel_transitions = transitions->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_PANEL_TRANSITIONS, s_panel_transitions);
    if (!s_panel_transitions) { prv_cancel_panel_transition(); }
  }
  prv_update_clock();
  prv_apply_colors();
  prv_apply_effects();
}

static void prv_inbox_dropped(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_WARNING, "Complication message dropped: %d", reason);
}
static void prv_outbox_failed(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
  s_context_rebaseline_in_flight = false;
  APP_LOG(APP_LOG_LEVEL_WARNING, "Complication request failed: %d", reason);
}
static void prv_outbox_sent(DictionaryIterator *iterator, void *context) {
  if (s_context_rebaseline_in_flight && s_request_generation == s_connection_generation) {
    s_context_rebaseline = false;
  }
  s_context_rebaseline_in_flight = false;
}

static void prv_configure_text_layer(TextLayer *layer, GFont font) {
  text_layer_set_background_color(layer, GColorClear);
  text_layer_set_text_color(layer, s_text_color);
  text_layer_set_text_alignment(layer, GTextAlignmentCenter);
  text_layer_set_overflow_mode(layer, GTextOverflowModeFill);
  text_layer_set_font(layer, font);
}

static void prv_configure_shadow_layer(TextLayer *layer, GFont font) {
  text_layer_set_background_color(layer, GColorClear);
  text_layer_set_text_color(layer, GColorBlack);
  text_layer_set_text_alignment(layer, GTextAlignmentCenter);
  text_layer_set_overflow_mode(layer, GTextOverflowModeFill);
  text_layer_set_font(layer, font);
}


static void prv_window_load(Window *window) {
  s_window_layer = window_get_root_layer(window);
  const GRect bounds = layer_get_bounds(s_window_layer);
  s_background_layer = layer_create(bounds);
  layer_set_update_proc(s_background_layer, prv_draw_background);
  layer_add_child(s_window_layer, s_background_layer);
  s_date_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_24));
  s_time_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_76));
  s_compact_date_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_22));
  s_small_date_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_20));
  s_compact_time_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_64));
  s_large_date_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_28));
  s_large_time_fonts[0] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_80));
  s_large_time_fonts[1] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_84));
  s_large_time_fonts[2] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_88));
  s_large_time_fonts[3] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_92));
  s_large_time_fonts[4] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_96));
  s_large_time_fonts[5] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_100));
  s_large_time_fonts[6] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_104));
  s_large_time_fonts[7] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_108));
  s_large_compact_time_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_72));
  s_complication_fonts[0] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_COMPLICATION_44));
  s_complication_fonts[1] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_COMPLICATION_38));
  s_complication_fonts[2] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_COMPLICATION_32));
  s_complication_fonts[3] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_COMPLICATION_28));
  s_complication_fonts[4] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_COMPLICATION_24));
  s_complication_fonts[5] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_COMPLICATION_20));
  s_complication_fonts[6] = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_COMPLICATION_18));
  s_drop_path = gpath_create(&s_drop_info);
  s_small_drop_path = gpath_create(&s_small_drop_info);
  s_date_shadow_layer = text_layer_create(GRect(9, 29, bounds.size.w - 16, 38));
  prv_configure_shadow_layer(s_date_shadow_layer, s_date_font);
  layer_add_child(s_window_layer, text_layer_get_layer(s_date_shadow_layer));
  s_time_shadow_layer = text_layer_create(GRect(2, 54, bounds.size.w, 102));
  prv_configure_shadow_layer(s_time_shadow_layer, s_time_font);
  layer_add_child(s_window_layer, text_layer_get_layer(s_time_shadow_layer));
  s_date_layer = text_layer_create(GRect(8, 28, bounds.size.w - 16, 38));
  prv_configure_text_layer(s_date_layer, s_date_font);
  layer_add_child(s_window_layer, text_layer_get_layer(s_date_layer));
  s_time_layer = text_layer_create(GRect(0, 52, bounds.size.w, 102));
  prv_configure_text_layer(s_time_layer, s_time_font);
  layer_add_child(s_window_layer, text_layer_get_layer(s_time_layer));
  for (unsigned i = 0; i < COMPLICATION_SLOT_COUNT; ++i) {
    s_complication_layers[i] = layer_create_with_data(GRect(0, 0, 0, 0), sizeof(uint8_t));
    *(uint8_t *)layer_get_data(s_complication_layers[i]) = i;
    layer_set_update_proc(s_complication_layers[i], prv_draw_complication);
    layer_add_child(s_window_layer, s_complication_layers[i]);
  }
  s_context_layer = layer_create(GRect(18, 164, 164, 43));
  layer_set_update_proc(s_context_layer, prv_draw_context);
  layer_add_child(s_window_layer, s_context_layer);
  s_transition_layer = layer_create(GRect(18, 164, 164, 43));
  layer_set_update_proc(s_transition_layer, prv_draw_transition);
  layer_set_hidden(s_transition_layer, true);
  layer_add_child(s_window_layer, s_transition_layer);
  s_status_layer = layer_create(bounds);
  layer_set_update_proc(s_status_layer, prv_draw_status);
  layer_add_child(s_window_layer, s_status_layer);
  prv_update_clock();
  prv_apply_effects();
  UnobstructedAreaHandlers handlers = {
    .will_change = prv_unobstructed_area_will_change,
    .change = prv_unobstructed_area_change,
    .did_change = prv_unobstructed_area_did_change,
  };
  unobstructed_area_service_subscribe(handlers, NULL);
}

static void prv_window_unload(Window *window) {
  unobstructed_area_service_unsubscribe();
  prv_cancel_panel_transition();
  layer_destroy(s_transition_layer);
  s_transition_layer = NULL;
  layer_destroy(s_status_layer);
  layer_destroy(s_context_layer);
  for (unsigned i = 0; i < COMPLICATION_SLOT_COUNT; ++i) { layer_destroy(s_complication_layers[i]); }
  text_layer_destroy(s_date_layer);
  text_layer_destroy(s_time_layer);
  text_layer_destroy(s_date_shadow_layer);
  text_layer_destroy(s_time_shadow_layer);
  fonts_unload_custom_font(s_date_font);
  fonts_unload_custom_font(s_time_font);
  fonts_unload_custom_font(s_compact_date_font);
  fonts_unload_custom_font(s_small_date_font);
  fonts_unload_custom_font(s_compact_time_font);
  fonts_unload_custom_font(s_large_date_font);
  fonts_unload_custom_font(s_large_compact_time_font);
  if (s_drop_path != NULL) { gpath_destroy(s_drop_path); s_drop_path = NULL; }
  if (s_small_drop_path != NULL) { gpath_destroy(s_small_drop_path); s_small_drop_path = NULL; }
  for (unsigned i = 0; i < LARGE_TIME_FONT_COUNT; ++i) { fonts_unload_custom_font(s_large_time_fonts[i]); }
  for (unsigned i = 0; i < COMPLICATION_FONT_COUNT; ++i) { fonts_unload_custom_font(s_complication_fonts[i]); }
  layer_destroy(s_background_layer);
  s_window_layer = NULL;
}

static void prv_init(void) {
  s_background_color = GColorOrange;
  s_text_color = GColorWhite;
  s_depth_effect_enabled = false;
  s_text_shadow_enabled = false;
  s_large_text_enabled = false;
  s_use_12_hour = false;
  s_show_status = true;
  s_panel_transitions = true;
  s_context_session_token = context_next_session_token(
      persist_exists(PERSIST_KEY_CONTEXT_SESSION)
          ? (uint32_t)persist_read_int(PERSIST_KEY_CONTEXT_SESSION) : 0);
  persist_write_int(PERSIST_KEY_CONTEXT_SESSION, (int32_t)s_context_session_token);
  s_phone_connected = connection_service_peek_pebble_app_connection();
  s_battery = battery_state_service_peek();
  if (persist_exists(PERSIST_KEY_BACKGROUND_COLOR)) {
    s_background_color = GColorFromHEX(persist_read_int(PERSIST_KEY_BACKGROUND_COLOR));
  }
  if (persist_exists(PERSIST_KEY_TEXT_COLOR)) { s_text_color = GColorFromHEX(persist_read_int(PERSIST_KEY_TEXT_COLOR)); }
  if (persist_exists(PERSIST_KEY_DEPTH_EFFECT)) { s_depth_effect_enabled = persist_read_bool(PERSIST_KEY_DEPTH_EFFECT); }
  if (persist_exists(PERSIST_KEY_TEXT_SHADOW)) { s_text_shadow_enabled = persist_read_bool(PERSIST_KEY_TEXT_SHADOW); }
  if (persist_exists(PERSIST_KEY_LARGE_TEXT)) { s_large_text_enabled = persist_read_bool(PERSIST_KEY_LARGE_TEXT); }
  if (persist_exists(PERSIST_KEY_USE_12_HOUR)) { s_use_12_hour = persist_read_bool(PERSIST_KEY_USE_12_HOUR); }
  if (persist_exists(PERSIST_KEY_SHOW_STATUS)) { s_show_status = persist_read_bool(PERSIST_KEY_SHOW_STATUS); }
  if (persist_exists(PERSIST_KEY_PANEL_TRANSITIONS)) { s_panel_transitions = persist_read_bool(PERSIST_KEY_PANEL_TRANSITIONS); }
  persist_delete(PERSIST_KEY_LAYOUT_STYLE);
  prv_load_complications();
  s_window = window_create();
  window_set_background_color(s_window, s_background_color);
  window_set_window_handlers(s_window, (WindowHandlers){.load = prv_window_load, .unload = prv_window_unload});
  app_message_register_inbox_received(prv_inbox_received);
  app_message_register_inbox_dropped(prv_inbox_dropped);
  app_message_register_outbox_failed(prv_outbox_failed);
  app_message_register_outbox_sent(prv_outbox_sent);
  app_message_open(2048, 32);
  tick_timer_service_subscribe(MINUTE_UNIT, prv_tick_handler);
  window_stack_push(s_window, false);
  connection_service_subscribe((ConnectionHandlers){.pebble_app_connection_handler = prv_phone_connection_changed});
  battery_state_service_subscribe(prv_battery_changed);
  s_startup_timer = app_timer_register(1000, prv_startup_request, NULL);
}

static void prv_deinit(void) {
  if (s_startup_timer != NULL) { app_timer_cancel(s_startup_timer); }
  if (s_context_timer != NULL) { app_timer_cancel(s_context_timer); }
  prv_cancel_panel_transition();
  memset(&s_context, 0, sizeof(s_context));
  battery_state_service_unsubscribe();
  connection_service_unsubscribe();
  tick_timer_service_unsubscribe();
  app_message_deregister_callbacks();
  window_destroy(s_window);
}

int main(void) {
  prv_init();
  app_event_loop();
  prv_deinit();
}
