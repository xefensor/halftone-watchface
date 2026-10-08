#include <pebble.h>

#define PERSIST_KEY_TEMPERATURE 1
#define PERSIST_KEY_BACKGROUND_COLOR 2
#define PERSIST_KEY_TEXT_COLOR 3
#define PERSIST_KEY_DEPTH_EFFECT 4
#define PERSIST_KEY_TEXT_SHADOW 5
#define PERSIST_KEY_LARGE_TEXT 6
#define PERSIST_KEY_USE_12_HOUR 7
#define PERSIST_KEY_USE_FAHRENHEIT 8

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
#define TIMELINE_TEMPERATURE_Y 106
#define LARGE_TIME_FONT_COUNT 8

static Window *s_window;
static Layer *s_window_layer;
static Layer *s_background_layer;
static TextLayer *s_date_layer;
static TextLayer *s_time_layer;
static TextLayer *s_temperature_layer;
static TextLayer *s_date_shadow_layer;
static TextLayer *s_time_shadow_layer;
static TextLayer *s_temperature_shadow_layer;
static GFont s_date_font;
static GFont s_time_font;
static GFont s_temperature_font;
static GFont s_compact_date_font;
static GFont s_small_date_font;
static GFont s_compact_time_font;
static GFont s_compact_temperature_font;
static GFont s_large_date_font;
static GFont s_large_time_fonts[LARGE_TIME_FONT_COUNT];
static GFont s_large_temperature_font;
static GFont s_large_compact_time_font;
static GFont s_large_compact_temperature_font;
static GColor s_background_color;
static GColor s_text_color;
static bool s_compact_layout;
static bool s_depth_effect_enabled;
static bool s_text_shadow_enabled;
static bool s_large_text_enabled;
static bool s_use_12_hour;
static bool s_use_fahrenheit;

static char s_date_buffer[40];
static char s_time_buffer[6];
static char s_temperature_buffer[12];

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

static void prv_draw_background(Layer *layer, GContext *ctx) {
  const GRect layer_bounds = layer_get_bounds(layer);
  const GRect bounds = layer_get_unobstructed_bounds(
      s_window_layer != NULL ? s_window_layer : layer);

  graphics_context_set_antialiased(ctx, true);
  // Start with the real bezel color, then place the colored display surface
  // inside it as one large rounded rectangle. Its 30 px corners follow the
  // PT2 metal frame rather than the panel's much tighter physical clipping.
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, layer_bounds, 0, GCornerNone);
  graphics_context_set_fill_color(ctx, s_background_color);
  graphics_fill_rect(ctx, bounds, DOT_OUTER_CORNER_RADIUS, GCornersAll);

  graphics_context_set_fill_color(ctx, GColorBlack);

  const int *dot_depths = s_depth_effect_enabled
      ? s_depth_dot_depths : s_classic_dot_depths;
  const int *dot_radii = s_depth_effect_enabled
      ? s_depth_dot_radii : s_classic_dot_radii;
  const int transition_steps = s_depth_effect_enabled
      ? DEPTH_DOT_TRANSITION_STEPS : CLASSIC_DOT_TRANSITION_STEPS;

  // Classic is the original 4 -> 2 -> 1 dither. Depth mode adds a fourth
  // regularly stepped plane, 4 -> 3 -> 2 -> 1, to suggest a recessed well.
  for (int step = 0; step < transition_steps; step++) {
    prv_draw_rounded_dot_ring(ctx, bounds, dot_depths[step],
                              dot_radii[step], step);
  }

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

static GFont prv_get_large_time_font(int available_width) {
  // Use the largest prepared bitmap font that fits the current digits. This
  // keeps both a wide time such as 00:00 and a narrow one such as 11:11 close
  // to the PT2 display edges without ever cropping a glyph.
  const GRect measurement_box = GRect(0, 0, 320, 130);

  for (int i = LARGE_TIME_FONT_COUNT - 1; i >= 0; i--) {
    const GSize size = graphics_text_layout_get_content_size(
        s_time_buffer, s_large_time_fonts[i], measurement_box,
        GTextOverflowModeFill, GTextAlignmentCenter);
    if (size.w <= available_width) {
      return s_large_time_fonts[i];
    }
  }

  return s_large_time_fonts[0];
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
  return s_small_date_font;
}

static void prv_apply_unobstructed_layout(void) {
  if (s_window == NULL || s_date_layer == NULL || s_time_layer == NULL ||
      s_temperature_layer == NULL) {
    return;
  }

  const GRect root_bounds = layer_get_bounds(s_window_layer);
  const GRect unobstructed_bounds =
      layer_get_unobstructed_bounds(s_window_layer);
  const int visible_height = unobstructed_bounds.size.h;

  if (!s_compact_layout && visible_height <= COMPACT_FONT_ENTER_HEIGHT) {
    s_compact_layout = true;
  } else if (s_compact_layout &&
             visible_height >= COMPACT_FONT_EXIT_HEIGHT) {
    s_compact_layout = false;
  }

  const int date_x = s_large_text_enabled ? 2 : 8;
  const int date_width = root_bounds.size.w - date_x * 2;
  const GFont preferred_date_font = s_compact_layout
      ? (s_large_text_enabled ? s_date_font : s_compact_date_font)
      : (s_large_text_enabled ? s_large_date_font : s_date_font);
  const GFont date_font = prv_get_date_font(
      preferred_date_font,
      date_width - (s_text_shadow_enabled ? 2 : 0));
  const GFont time_font = s_compact_layout
      ? (s_large_text_enabled ? s_large_compact_time_font
                              : s_compact_time_font)
      : (s_large_text_enabled
             ? prv_get_large_time_font(root_bounds.size.w -
                                       (s_text_shadow_enabled ? 4 : 2))
             : s_time_font);
  const GFont temperature_font = s_compact_layout
      ? (s_large_text_enabled ? s_large_compact_temperature_font
                              : s_compact_temperature_font)
      : (s_large_text_enabled ? s_large_temperature_font
                              : s_temperature_font);

  const int temperature_x = s_large_text_enabled ? 8 : 14;
  const int temperature_width = root_bounds.size.w - temperature_x * 2;

  prv_set_text_pair_layout(
      s_date_shadow_layer, s_date_layer,
      GRect(date_x,
            prv_layout_value(s_large_text_enabled ? 24 : 28,
                             s_large_text_enabled ? 24 : TIMELINE_DATE_Y,
                             visible_height),
            date_width,
            prv_layout_value(s_large_text_enabled ? 44 : 38,
                             s_large_text_enabled ? 34 : 30,
                             visible_height)),
      date_font, 1);
  prv_set_text_pair_layout(
      s_time_shadow_layer, s_time_layer,
      GRect(0,
            prv_layout_value(s_large_text_enabled ? 34 : 52,
                             s_large_text_enabled ? 41 : TIMELINE_TIME_Y,
                             visible_height),
            root_bounds.size.w,
            prv_layout_value(s_large_text_enabled ? 120 : 102,
                             s_large_text_enabled ? 86 : 78,
                             visible_height)),
      time_font, 2);
  prv_set_text_pair_layout(
      s_temperature_shadow_layer, s_temperature_layer,
      GRect(temperature_x,
            prv_layout_value(s_large_text_enabled ? 137 : 145,
                             s_large_text_enabled ? 112
                                                  : TIMELINE_TEMPERATURE_Y,
                             visible_height),
            temperature_width,
            prv_layout_value(s_large_text_enabled ? 60 : 54,
                             s_large_text_enabled ? 44 : 38,
                             visible_height)),
      temperature_font, 1);

  layer_mark_dirty(s_background_layer);
}

static void prv_unobstructed_area_will_change(
    GRect final_unobstructed_screen_area, void *context) {
  // Synchronize once before the system overlay starts moving. The following
  // change callbacks will then update the layout on every animation frame.
  prv_apply_unobstructed_layout();
}

static void prv_unobstructed_area_change(AnimationProgress progress,
                                         void *context) {
  prv_apply_unobstructed_layout();
}

static void prv_unobstructed_area_did_change(void *context) {
  prv_apply_unobstructed_layout();
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
  snprintf(s_date_buffer, sizeof(s_date_buffer), "%s · %d. %d.",
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

static void prv_show_temperature(int temperature_celsius) {
  int display_temperature = temperature_celsius;
  char unit = 'C';

  if (s_use_fahrenheit) {
    const int scaled = temperature_celsius * 9;
    display_temperature =
        (scaled >= 0 ? scaled + 2 : scaled - 2) / 5 + 32;
    unit = 'F';
  }

  snprintf(s_temperature_buffer, sizeof(s_temperature_buffer), "%d°%c",
           display_temperature, unit);
  text_layer_set_text(s_temperature_layer, s_temperature_buffer);
  text_layer_set_text(s_temperature_shadow_layer, s_temperature_buffer);
}

static void prv_show_temperature_placeholder(void) {
  snprintf(s_temperature_buffer, sizeof(s_temperature_buffer), "--°%c",
           s_use_fahrenheit ? 'F' : 'C');
  text_layer_set_text(s_temperature_layer, s_temperature_buffer);
  text_layer_set_text(s_temperature_shadow_layer, s_temperature_buffer);
}

static void prv_request_weather(void) {
  DictionaryIterator *iterator;
  const AppMessageResult result = app_message_outbox_begin(&iterator);

  if (result != APP_MSG_OK || iterator == NULL) {
    APP_LOG(APP_LOG_LEVEL_WARNING,
            "Could not begin weather request: %d", result);
    return;
  }

  dict_write_uint8(iterator, MESSAGE_KEY_REQUEST_WEATHER, 1);
  app_message_outbox_send();
}

static void prv_tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  prv_update_clock();

  if (tick_time->tm_min % 30 == 0) {
    prv_request_weather();
  }
}

static void prv_apply_colors(void) {
  if (s_window != NULL) {
    window_set_background_color(s_window, s_background_color);
  }
  if (s_date_layer != NULL) {
    text_layer_set_text_color(s_date_layer, s_text_color);
  }
  if (s_time_layer != NULL) {
    text_layer_set_text_color(s_time_layer, s_text_color);
  }
  if (s_temperature_layer != NULL) {
    text_layer_set_text_color(s_temperature_layer, s_text_color);
  }
  if (s_background_layer != NULL) {
    layer_mark_dirty(s_background_layer);
  }
}

static void prv_apply_effects(void) {
  if (s_date_shadow_layer != NULL) {
    layer_set_hidden(text_layer_get_layer(s_date_shadow_layer),
                     !s_text_shadow_enabled);
  }
  if (s_time_shadow_layer != NULL) {
    layer_set_hidden(text_layer_get_layer(s_time_shadow_layer),
                     !s_text_shadow_enabled);
  }
  if (s_temperature_shadow_layer != NULL) {
    layer_set_hidden(text_layer_get_layer(s_temperature_shadow_layer),
                     !s_text_shadow_enabled);
  }
  if (s_background_layer != NULL) {
    layer_mark_dirty(s_background_layer);
  }
  prv_apply_unobstructed_layout();
}

static void prv_inbox_received(DictionaryIterator *iterator, void *context) {
  Tuple *temperature_tuple = dict_find(iterator, MESSAGE_KEY_TEMPERATURE);
  Tuple *background_color_tuple =
      dict_find(iterator, MESSAGE_KEY_BACKGROUND_COLOR);
  Tuple *text_color_tuple = dict_find(iterator, MESSAGE_KEY_TEXT_COLOR);
  Tuple *depth_effect_tuple = dict_find(iterator, MESSAGE_KEY_DEPTH_EFFECT);
  Tuple *text_shadow_tuple = dict_find(iterator, MESSAGE_KEY_TEXT_SHADOW);
  Tuple *large_text_tuple = dict_find(iterator, MESSAGE_KEY_LARGE_TEXT);
  Tuple *use_12_hour_tuple =
      dict_find(iterator, MESSAGE_KEY_USE_12_HOUR);
  Tuple *use_fahrenheit_tuple =
      dict_find(iterator, MESSAGE_KEY_USE_FAHRENHEIT);

  bool clock_format_changed = false;
  bool temperature_unit_changed = false;

  if (use_12_hour_tuple != NULL) {
    s_use_12_hour = use_12_hour_tuple->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_USE_12_HOUR, s_use_12_hour);
    clock_format_changed = true;
  }

  if (use_fahrenheit_tuple != NULL) {
    s_use_fahrenheit = use_fahrenheit_tuple->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_USE_FAHRENHEIT, s_use_fahrenheit);
    temperature_unit_changed = true;
  }

  if (temperature_tuple != NULL) {
    const int temperature = (int)temperature_tuple->value->int32;
    persist_write_int(PERSIST_KEY_TEMPERATURE, temperature);
    prv_show_temperature(temperature);
  } else if (temperature_unit_changed) {
    if (persist_exists(PERSIST_KEY_TEMPERATURE)) {
      prv_show_temperature(persist_read_int(PERSIST_KEY_TEMPERATURE));
    } else {
      prv_show_temperature_placeholder();
    }
  }

  if (clock_format_changed) {
    prv_update_clock();
  }

  bool colors_changed = false;

  if (background_color_tuple != NULL) {
    const int background_hex = background_color_tuple->value->int32;
    s_background_color = GColorFromHEX(background_hex);
    persist_write_int(PERSIST_KEY_BACKGROUND_COLOR, background_hex);
    colors_changed = true;
  }

  if (text_color_tuple != NULL) {
    const int text_hex = text_color_tuple->value->int32;
    s_text_color = GColorFromHEX(text_hex);
    persist_write_int(PERSIST_KEY_TEXT_COLOR, text_hex);
    colors_changed = true;
  }

  if (colors_changed) {
    prv_apply_colors();
  }

  bool effects_changed = false;

  if (depth_effect_tuple != NULL) {
    s_depth_effect_enabled = depth_effect_tuple->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_DEPTH_EFFECT, s_depth_effect_enabled);
    effects_changed = true;
  }

  if (text_shadow_tuple != NULL) {
    s_text_shadow_enabled = text_shadow_tuple->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_TEXT_SHADOW, s_text_shadow_enabled);
    effects_changed = true;
  }

  if (large_text_tuple != NULL) {
    s_large_text_enabled = large_text_tuple->value->int32 != 0;
    persist_write_bool(PERSIST_KEY_LARGE_TEXT, s_large_text_enabled);
    effects_changed = true;
  }

  if (effects_changed) {
    prv_apply_effects();
  }
}

static void prv_inbox_dropped(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_WARNING, "Weather message dropped: %d", reason);
}

static void prv_outbox_failed(DictionaryIterator *iterator,
                              AppMessageResult reason,
                              void *context) {
  APP_LOG(APP_LOG_LEVEL_WARNING, "Weather request failed: %d", reason);
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

  s_date_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_24));
  s_time_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_76));
  s_temperature_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_38));
  s_compact_date_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_22));
  s_small_date_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_20));
  s_compact_time_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_64));
  s_compact_temperature_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_30));
  s_large_date_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_28));
  s_large_time_fonts[0] = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_80));
  s_large_time_fonts[1] = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_84));
  s_large_time_fonts[2] = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_88));
  s_large_time_fonts[3] = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_92));
  s_large_time_fonts[4] = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_96));
  s_large_time_fonts[5] = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_100));
  s_large_time_fonts[6] = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_104));
  s_large_time_fonts[7] = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_108));
  s_large_temperature_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_44));
  s_large_compact_time_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_72));
  s_large_compact_temperature_font = fonts_load_custom_font(
      resource_get_handle(RESOURCE_ID_FIRA_SANS_CONDENSED_BOLD_34));

  s_date_shadow_layer =
      text_layer_create(GRect(9, 29, bounds.size.w - 16, 38));
  prv_configure_shadow_layer(s_date_shadow_layer, s_date_font);
  layer_add_child(s_window_layer, text_layer_get_layer(s_date_shadow_layer));

  s_time_shadow_layer = text_layer_create(GRect(2, 54, bounds.size.w, 102));
  prv_configure_shadow_layer(s_time_shadow_layer, s_time_font);
  layer_add_child(s_window_layer, text_layer_get_layer(s_time_shadow_layer));

  s_temperature_shadow_layer =
      text_layer_create(GRect(15, 146, bounds.size.w - 28, 54));
  prv_configure_shadow_layer(s_temperature_shadow_layer, s_temperature_font);
  layer_add_child(s_window_layer,
                  text_layer_get_layer(s_temperature_shadow_layer));

  s_date_layer = text_layer_create(GRect(8, 28, bounds.size.w - 16, 38));
  prv_configure_text_layer(s_date_layer, s_date_font);
  layer_add_child(s_window_layer, text_layer_get_layer(s_date_layer));

  s_time_layer = text_layer_create(GRect(0, 52, bounds.size.w, 102));
  prv_configure_text_layer(s_time_layer, s_time_font);
  layer_add_child(s_window_layer, text_layer_get_layer(s_time_layer));

  s_temperature_layer =
      text_layer_create(GRect(14, 145, bounds.size.w - 28, 54));
  prv_configure_text_layer(s_temperature_layer, s_temperature_font);
  layer_add_child(s_window_layer, text_layer_get_layer(s_temperature_layer));

  if (persist_exists(PERSIST_KEY_TEMPERATURE)) {
    prv_show_temperature(persist_read_int(PERSIST_KEY_TEMPERATURE));
  } else {
    prv_show_temperature_placeholder();
  }

  prv_update_clock();
  prv_apply_effects();

  // Timeline Quick View may already be visible when the watchface starts.
  // Apply that state before subscribing, then subscribe only after every layer
  // exists. Real hardware is stricter about this lifecycle than the emulator.
  prv_unobstructed_area_change(ANIMATION_NORMALIZED_MIN, NULL);
  prv_unobstructed_area_did_change(NULL);

  UnobstructedAreaHandlers handlers = {
    .will_change = prv_unobstructed_area_will_change,
    .change = prv_unobstructed_area_change,
    .did_change = prv_unobstructed_area_did_change,
  };
  unobstructed_area_service_subscribe(handlers, NULL);
}

static void prv_window_unload(Window *window) {
  unobstructed_area_service_unsubscribe();
  text_layer_destroy(s_temperature_layer);
  text_layer_destroy(s_time_layer);
  text_layer_destroy(s_date_layer);
  text_layer_destroy(s_temperature_shadow_layer);
  text_layer_destroy(s_time_shadow_layer);
  text_layer_destroy(s_date_shadow_layer);
  fonts_unload_custom_font(s_temperature_font);
  fonts_unload_custom_font(s_time_font);
  fonts_unload_custom_font(s_date_font);
  fonts_unload_custom_font(s_compact_temperature_font);
  fonts_unload_custom_font(s_compact_time_font);
  fonts_unload_custom_font(s_compact_date_font);
  fonts_unload_custom_font(s_small_date_font);
  fonts_unload_custom_font(s_large_compact_temperature_font);
  fonts_unload_custom_font(s_large_compact_time_font);
  fonts_unload_custom_font(s_large_temperature_font);
  for (int i = 0; i < LARGE_TIME_FONT_COUNT; i++) {
    fonts_unload_custom_font(s_large_time_fonts[i]);
  }
  fonts_unload_custom_font(s_large_date_font);
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
  s_use_fahrenheit = false;

  if (persist_exists(PERSIST_KEY_BACKGROUND_COLOR)) {
    s_background_color = GColorFromHEX(
        persist_read_int(PERSIST_KEY_BACKGROUND_COLOR));
  }
  if (persist_exists(PERSIST_KEY_TEXT_COLOR)) {
    s_text_color = GColorFromHEX(persist_read_int(PERSIST_KEY_TEXT_COLOR));
  }
  if (persist_exists(PERSIST_KEY_DEPTH_EFFECT)) {
    s_depth_effect_enabled = persist_read_bool(PERSIST_KEY_DEPTH_EFFECT);
  }
  if (persist_exists(PERSIST_KEY_TEXT_SHADOW)) {
    s_text_shadow_enabled = persist_read_bool(PERSIST_KEY_TEXT_SHADOW);
  }
  if (persist_exists(PERSIST_KEY_LARGE_TEXT)) {
    s_large_text_enabled = persist_read_bool(PERSIST_KEY_LARGE_TEXT);
  }
  if (persist_exists(PERSIST_KEY_USE_12_HOUR)) {
    s_use_12_hour = persist_read_bool(PERSIST_KEY_USE_12_HOUR);
  }
  if (persist_exists(PERSIST_KEY_USE_FAHRENHEIT)) {
    s_use_fahrenheit = persist_read_bool(PERSIST_KEY_USE_FAHRENHEIT);
  }

  s_window = window_create();
  s_compact_layout = false;
  window_set_background_color(s_window, s_background_color);
  window_set_window_handlers(s_window, (WindowHandlers) {
    .load = prv_window_load,
    .unload = prv_window_unload,
  });

  app_message_register_inbox_received(prv_inbox_received);
  app_message_register_inbox_dropped(prv_inbox_dropped);
  app_message_register_outbox_failed(prv_outbox_failed);
  app_message_open(128, 32);

  tick_timer_service_subscribe(MINUTE_UNIT, prv_tick_handler);
  window_stack_push(s_window, false);
}

static void prv_deinit(void) {
  tick_timer_service_unsubscribe();
  app_message_deregister_callbacks();
  window_destroy(s_window);
}

int main(void) {
  prv_init();
  app_event_loop();
  prv_deinit();
}
