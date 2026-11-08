#include <pebble.h>
#include <pebble-xoce-ui/pebble-xoce-ui.h>
#include "complication_data.h"
#include "context_data.h"
#include <pebble-watchface-core/readings.h>
#include <pebble-activities/pebble-activity-view.h>
#include "context_session.h"
#include "activity_presentation.h"
#include "activity_navigation.h"
#include "watch_layout.h"
#include "supporting_type.h"
#include "reading_presentation.h"
#include "reading_layout.h"
#include "generated_clock_glyphs.h"
#include "generated_body_metrics.h"
#include "font_raster.h"
#include "music_layout.h"
#include "native_reading.h"
#include "context_effects.h"
#include "native_settings.h"
#include "display_preferences.h"
#include "activity_plan_cache.h"

#define PERSIST_KEY_BACKGROUND_COLOR 2
#define PERSIST_KEY_TEXT_COLOR 3
#define PERSIST_KEY_TEXT_SHADOW 5
#define PERSIST_KEY_LARGE_TEXT 6
#define PERSIST_KEY_USE_12_HOUR 7
#define PERSIST_KEY_LAYOUT_STYLE 16
#define PERSIST_KEY_SHOW_STATUS 19
#define PERSIST_KEY_COMPLICATION_FIRST 20
#define PERSIST_KEY_CONTEXT_SESSION 61
#define PERSIST_KEY_ACCENT_COLOR 70
#define PERSIST_KEY_ANIMATIONS 71
#define PERSIST_KEY_CLOCK_FORMAT 72
#define PERSIST_KEY_VIBRATION 73
#define PERSIST_KEY_NIGHT_ENABLED 74
#define PERSIST_KEY_NIGHT_BACKGROUND 75
#define PERSIST_KEY_NIGHT_TEXT 76
#define PERSIST_KEY_NIGHT_ACCENT 77
#define NATIVE_INBOX_BYTES 6144
#define FULL_LAYOUT_HEIGHT 228
#define PERSIST_KEY_DEPTH_EFFECT 4
#define PERSIST_KEY_PANEL_TRANSITIONS 62
#define DOT_OUTER_CORNER_RADIUS 30
#define DOT_SPACING 10
#define CLASSIC_DOT_TRANSITION_STEPS 3
#define DEPTH_DOT_TRANSITION_STEPS 4
#define MOTION_FRAME_MS XOCE_UI_PRESS_FRAME_MS
#define LAYOUT_DURATION_MS 250
#define INCOMING_DURATION_MS 180

enum { ACTIVITY_LINE_BYTES=PAV_TEXT_BYTES+PAV_LABEL_BYTES+8 };
typedef struct {
  const PavCard *card,*alternate;
  ActivityLayout layout;
  ReadingParts number;
  char main[ACTIVITY_LINE_BYTES],role[PAV_LABEL_BYTES+5];
  char support[ACTIVITY_LINE_BYTES],secondary[ACTIVITY_LINE_BYTES];
  bool numeric,needs_tick;
  ActivityPlanCache cache;
} ActivityPlan;

static const int8_t s_classic_dot_depths[CLASSIC_DOT_TRANSITION_STEPS] = {
  0, 7, 14
};
static const int8_t s_classic_dot_radii[CLASSIC_DOT_TRANSITION_STEPS] = {
  4, 2, 1
};
static const int8_t s_depth_dot_depths[DEPTH_DOT_TRANSITION_STEPS] = {
  0, 7, 14, 21
};
static const int8_t s_depth_dot_radii[DEPTH_DOT_TRANSITION_STEPS] = {
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


static Window *s_window;
static Layer *s_window_layer, *s_background_layer, *s_context_layer;
static GColor s_background_color, s_text_color, s_accent_color;
static GColor s_day_colors[3],s_night_colors[3];
static bool s_large_text_enabled,s_depth_effect_enabled,s_text_shadow_enabled,s_panel_transitions=true;
static uint8_t s_vibration;
static uint32_t s_seen_burst;
static bool s_use_12_hour,s_app_focused=true;
static uint8_t s_clock_format;
static bool s_show_status, s_animations_enabled;
static BatteryChargeState s_battery;
// Allocate this bounded block once. Keeping the shared engine, transient
// snapshots and raster scratch off BSS leaves the app's load image below the
// SDK's16-bit virtual-size limit without adding any per-frame allocation.
typedef struct {
  WfcReadings core;
  WfcPhoneStatus legacy_context;
  HalftoneContextSession session;
  PavState activities;
  GPoint clock_path_points[CLOCK_CONTOUR_MAX_POINTS];
  GPath clock_path;
  FontRasterPoint clock_raster_points[CLOCK_GLYPH_MAX_POINTS];
  FontRasterContour clock_raster_contours[CLOCK_GLYPH_MAX_CONTOURS];
  int32_t clock_intersections[CLOCK_GLYPH_MAX_POINTS];
  uint8_t clock_coverage[200];
  char activity_identity[PAV_PROVIDER_BYTES+PAV_ID_BYTES+2];
  uint8_t activity_visual[8];
  ActivityPlan activity_plan;
  ActivityNavigation navigation;
  WatchPose pose,pose_from,pose_target;
  DisplayPreferences display;
  uint8_t display_reply[DISPLAY_BYTES];
  uint32_t display_generation,display_flight;
  uint8_t display_attempts;
  bool display_pending,outbox_display;
} NativeState;
static NativeState *s_native;
#define s_core (s_native->core)
#define s_pose (s_native->pose)
#define s_pose_from (s_native->pose_from)
#define s_pose_target (s_native->pose_target)
#define s_clock_path_points (s_native->clock_path_points)
#define s_clock_path (s_native->clock_path)
#define s_clock_raster_points (s_native->clock_raster_points)
#define s_clock_raster_contours (s_native->clock_raster_contours)
#define s_clock_intersections (s_native->clock_intersections)
#define s_clock_coverage (s_native->clock_coverage)
#define s_context (s_native->legacy_context)
#define s_session (s_native->session)
#define s_activities (s_native->activities)
#define s_complications s_core.complications
#define s_has_complications s_core.has_complications
#define s_phone_connected s_core.phone_connected
static AppTimer *s_context_timer, *s_startup_timer, *s_motion_timer,*s_activity_timer,*s_presentation_timer;
// Three UTF-8 weekday scalars + separator + DD.MM. + NUL fit in24 bytes.
static char s_compact_date_buffer[24], s_time_buffer[6];
static char s_weekday_buffer[13], s_numeric_date_buffer[8];
static const uint8_t s_body_points[] = {14,16,20,22,24,26,28,32};
#define BODY_FONT_COUNT (sizeof(s_body_points)/sizeof(s_body_points[0]))
static GFont s_body_fonts[BODY_FONT_COUNT];
static HalftoneType s_type;
static unsigned s_system_text_size;
static bool s_body_loaded[BODY_FONT_COUNT];
static const uint8_t s_body_resources[BODY_FONT_COUNT] = {RESOURCE_ID_FONT_BODY_14,
  RESOURCE_ID_FONT_BODY_16,RESOURCE_ID_FONT_BODY_20,RESOURCE_ID_FONT_BODY_22,
  RESOURCE_ID_FONT_BODY_24,RESOURCE_ID_FONT_BODY_26,RESOURCE_ID_FONT_BODY_28,RESOURCE_ID_FONT_BODY_32};
static bool s_pose_ready, s_layout_active, s_slide_active, s_peek_transition;
static uint32_t s_layout_started, s_slide_started;
static float s_slide_amount=1;
static bool s_private_rebaseline;
static bool s_format_reply_pending,s_outbox_format_only,s_outbox_presentation,s_transport_ready;

static void prv_apply_unobstructed_layout(void);
static HalftoneView prv_view(WatchPose pose,int height);
static int prv_activity_reserve(const PavCard *card,uint32_t now);
static int prv_footer_point(const char *text);
static void prv_sync_layers(void);
static void prv_send_clock_format(void);
static void prv_schedule_context_expiry(void);
static void prv_context_expired(void *context);
static MusicTextMetrics prv_music_measure(void *context,const char *text,int point);
static MusicTextMetrics prv_activity_clock_measure(void *context,const char *text,int point);
static void prv_activity_reset(void);
static int prv_activity_top(void);
static void prv_apply_colors(void);
static void prv_send_display(void);
static void prv_display_reply(const DisplayPreferences *value,uint8_t status,uint8_t flags);
static void prv_activity_clock_schedule(void);
static void prv_cancel_motion(void);
static void prv_schedule_motion(void);
static void prv_send_presentation(void);
static void prv_note_presentation(const PavCard *card,bool stable);

// Keep source validation/expiry running under system windows, but defer our
// own paint invalidations until the face is visible again. The OS can still
// request a background paint; the draw callbacks remain available for that.
static void prv_dirty(Layer *layer) {
  if(s_app_focused&&layer)layer_mark_dirty(layer);
}


// Fixed-width UTF-8 prefixes avoid one relocated pointer per weekday while
// preserving every supported abbreviation and Norwegian locale alias.
static const struct {char language[2];char days[7][5];} s_weekdays[]={
  {"en",{"SUN","MON","TUE","WED","THU","FRI","SAT"}},
  {"cs",{"NED","PON","ÚTE","STŘ","ČTV","PÁT","SOB"}},
  {"sk",{"NED","PON","UTO","STR","ŠTV","PIA","SOB"}},
  {"de",{"SON","MON","DIE","MIT","DON","FRE","SAM"}},
  {"fr",{"DIM","LUN","MAR","MER","JEU","VEN","SAM"}},
  {"es",{"DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"}},
  {"it",{"DOM","LUN","MAR","MER","GIO","VEN","SAB"}},
  {"pt",{"DOM","SEG","TER","QUA","QUI","SEX","SÁB"}},
  {"nl",{"ZON","MAA","DIN","WOE","DON","VRI","ZAT"}},
  {"pl",{"NIE","PON","WTO","ŚRO","CZW","PIĄ","SOB"}},
  {"da",{"SØN","MAN","TIR","ONS","TOR","FRE","LØR"}},
  {"sv",{"SÖN","MÅN","TIS","ONS","TOR","FRE","LÖR"}},
  {"fi",{"SUN","MAA","TII","KES","TOR","PER","LAU"}},
  {"hu",{"VAS","HÉT","KED","SZE","CSÜ","PÉN","SZO"}},
  {"ro",{"DUM","LUN","MAR","MIE","JOI","VIN","SÂM"}},
  {"tr",{"PAZ","PAZ","SAL","ÇAR","PER","CUM","CUM"}}
};
static const char *prv_get_localized_day(const char *locale,unsigned day) {
  unsigned row=0;
  if(day>6)day=0;
  if(locale&&locale[0]&&locale[1]&&
      (!locale[2]||locale[2]=='_'||locale[2]=='-')) {
    char a=locale[0],b=locale[1];
    if(a=='n'&&(b=='o'||b=='b'||b=='n')){a='d';b='a';}
    for(unsigned i=1;i<sizeof(s_weekdays)/sizeof(s_weekdays[0]);++i)
      if(s_weekdays[i].language[0]==a&&s_weekdays[i].language[1]==b){row=i;break;}
  }
  return s_weekdays[row].days[day];
}

static int prv_storage_size(void *context, uint32_t key) {
  (void)context;
  return persist_get_size(key);
}
static int prv_storage_read(void *context, uint32_t key, void *buffer, size_t length) {
  (void)context;
  return persist_read_data(key, buffer, length);
}
static int prv_storage_write(void *context, uint32_t key, const void *buffer, size_t length) {
  (void)context;
  return persist_write_data(key, buffer, length);
}
static void prv_storage_remove(void *context, uint32_t key) {
  (void)context;
  persist_delete(key);
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

typedef struct {
  int width, height, x, y, source_x, source_y, source_width, source_height;
} BitmapLayout;

static BitmapLayout prv_bitmap_layout(const ComplicationSlot *slot, int size, bool cover) {
  if (!slot->width || !slot->height || size <= 0) { return (BitmapLayout){0}; }
  const ReadingCoverCrop crop = reading_cover_crop(slot->width, slot->height);
  const GRect fitted=cover?GRect(0,0,size,size):
      xoce_ui_fit_image(GRect(0,0,size,size),slot->width,slot->height);
  return (BitmapLayout){fitted.size.w, fitted.size.h, fitted.origin.x, fitted.origin.y,
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
static void prv_draw_bitmap(GContext *ctx, const ComplicationSlot *slot,
                            int x, int y, int size, GColor foreground, bool cover) {
  const BitmapLayout layout = prv_bitmap_layout(slot,size,cover);
  x += layout.x;
  y += layout.y;
  for (int row=0;row<layout.height;++row) {
    int start=0;uint8_t previous=0;
    for (int column=0;column<=layout.width;++column) {
      uint8_t color=column<layout.width?prv_bitmap_pixel(slot,&layout,column,row):0;
      if (!(slot->flags & COMPLICATION_FLAG_IMAGE))
        color=(foreground.argb&0x3f)|(color&0xc0);
      if(!(color&0xc0))color=0;
      if(color!=previous) {
        if(previous&0xc0) {
          graphics_context_set_fill_color(ctx,(GColor){.argb=previous});
          graphics_fill_rect(ctx,GRect(x+start,y+row,column-start,1),0,GCornerNone);
        }
        previous=color;start=column;
      }
    }
  }
}


static int prv_round(float number) { return (int)(number < 0 ? number-0.5f : number+0.5f); }
static int prv_point(int preferred) {
  for(size_t i=BODY_FONT_COUNT;i>0;--i) if(s_body_points[i-1]<=preferred) return s_body_points[i-1];
  return s_body_points[0];
}
static GFont prv_body(int point) {
  point=prv_point(point);
  for(size_t i=0;i<BODY_FONT_COUNT;++i) if(s_body_points[i]==point) return s_body_fonts[i];
  return s_body_fonts[0];
}
static GSize prv_measure(const char *text,int point) {
  return graphics_text_layout_get_content_size(text,prv_body(point),GRect(0,0,2048,512),
      GTextOverflowModeFill,GTextAlignmentLeft);
}
static void prv_text(GContext *ctx,const char *text,int point,int x,int baseline,
                     int width,GColor color,GTextAlignment alignment) {
  point=prv_point(point);
  if(s_text_shadow_enabled) {
    graphics_context_set_text_color(ctx,GColorBlack);
    graphics_draw_text(ctx,text,prv_body(point),GRect(x+1,baseline-point+1,width,point+12),
        GTextOverflowModeFill,alignment,NULL);
  }
  graphics_context_set_text_color(ctx,color);
  graphics_draw_text(ctx,text,prv_body(point),GRect(x,baseline-point,width,point+12),
      GTextOverflowModeFill,alignment,NULL);
}
static void prv_ellipsize(char *text,size_t capacity,int point,int width) {
  if(prv_measure(text,point).w<=width) return;
  if(capacity<4){if(capacity)text[0]='\0';return;}
  char prefix[COMPLICATION_MAX_TEXT_BYTES+5];
  const size_t prefix_capacity=capacity-3<sizeof(prefix)?capacity-3:sizeof(prefix);
  watch_layout_copy_utf8(text,prefix,prefix_capacity);
  while(watch_layout_pop_utf8(prefix)) {
    const size_t length=strlen(prefix);
    if(length+4>capacity)continue;
    memcpy(text,prefix,length);memcpy(text+length,"…",4);
    if(prv_measure(text,point).w<=width) return;
  }
  memcpy(text,"…",4);
}
static GColor prv_accent_color(void) {
  return (GColor){.argb=reading_accent_ink(s_accent_color.argb,s_background_color.argb,s_text_color.argb)};
}
static GColor prv_warning_color(void) {
  return (GColor){.argb=reading_warning_ink(s_background_color.argb)};
}
static GColor prv_muted_text(float alpha) {
  const uint8_t ink=reading_secondary_ink(s_text_color.argb,s_background_color.argb);
  alpha=watch_clamp(alpha);
  const unsigned r=prv_round(watch_lerp((s_background_color.argb>>4)&3,(ink>>4)&3,alpha));
  const unsigned g=prv_round(watch_lerp((s_background_color.argb>>2)&3,(ink>>2)&3,alpha));
  const unsigned b=prv_round(watch_lerp(s_background_color.argb&3,ink&3,alpha));
  return (GColor){.argb=0xc0|(r<<4)|(g<<2)|b};
}
static GColor prv_faded_text(float alpha) {
  alpha=watch_clamp(alpha);
  const unsigned r=prv_round(watch_lerp((s_background_color.argb>>4)&3,(s_text_color.argb>>4)&3,alpha));
  const unsigned g=prv_round(watch_lerp((s_background_color.argb>>2)&3,(s_text_color.argb>>2)&3,alpha));
  const unsigned b=prv_round(watch_lerp(s_background_color.argb&3,s_text_color.argb&3,alpha));
  return (GColor){.argb=0xc0|(r<<4)|(g<<2)|b};
}
static const ClockGlyph *prv_clock_glyph(uint32_t code) {
  for(unsigned i=0;i<CLOCK_GLYPH_COUNT;++i) if(clock_glyphs[i].code==code) return &clock_glyphs[i];
  return NULL;
}
static float prv_vector_width(const char *text,float point) {
  unsigned advance=0;
  const unsigned char *cursor=(const unsigned char *)text;
  while(*cursor) {
    const ClockGlyph *glyph=prv_clock_glyph(body_metric_next_codepoint(&cursor));
    if(glyph==NULL) return -1;
    advance+=glyph->advance;
  }
  return advance*point/CLOCK_FONT_UNITS_PER_EM;
}
static bool prv_same_point(GPoint a,GPoint b) { return a.x==b.x&&a.y==b.y; }
static bool prv_collinear(GPoint a,GPoint b,GPoint c) {
  const int32_t ax=b.x-a.x,ay=b.y-a.y,bx=c.x-b.x,by=c.y-b.y;
  return ax*by-ay*bx==0 && ax*bx+ay*by>=0;
}
// A dense font outline can collapse several vertices onto one physical
// pixel. Feed GPath a clean polygon rather than zero-length/repeated edges.
static unsigned prv_pixel_polygon(unsigned count) {
  unsigned out=0;
  for(unsigned i=0;i<count;++i) {
    const GPoint point=s_clock_path_points[i];
    if(out&&prv_same_point(s_clock_path_points[out-1],point))continue;
    while(out>=2&&prv_collinear(s_clock_path_points[out-2],s_clock_path_points[out-1],point))--out;
    s_clock_path_points[out++]=point;
  }
  if(out>1&&prv_same_point(s_clock_path_points[0],s_clock_path_points[out-1]))--out;
  bool changed=true;
  while(changed&&out>3) {
    changed=false;
    if(prv_collinear(s_clock_path_points[out-1],s_clock_path_points[0],s_clock_path_points[1])) {
      memmove(s_clock_path_points,s_clock_path_points+1,(--out)*sizeof(GPoint));changed=true;
    }
    if(out>3&&prv_collinear(s_clock_path_points[out-2],s_clock_path_points[out-1],s_clock_path_points[0])) {
      --out;changed=true;
    }
  }
  return out;
}
static void prv_gpath_glyph(GContext *ctx,const ClockGlyph *glyph,float x,float baseline,
                            float scale,GColor color) {
    for(unsigned i=0;i<glyph->contour_count;++i) {
      const ClockContour *contour=&clock_contours[glyph->first_contour+i];
      for(unsigned j=0;j<contour->point_count;++j) {
        const ClockPoint p=clock_points[contour->first_point+j];
        s_clock_path_points[j]=GPoint(prv_round(x+p.x*scale),prv_round(baseline-p.y*scale));
      }
      s_clock_path.num_points=prv_pixel_polygon(contour->point_count);
      if(s_clock_path.num_points<3)continue;
      graphics_context_set_fill_color(ctx,contour->hole ? s_background_color : color);
      gpath_draw_filled(ctx,&s_clock_path);
    }
}
typedef struct { GContext *ctx; GColor colors[FONT_RASTER_COVERAGE+1]; } ClockPaint;
static void prv_clock_row(void *context,int y,int first,int end,const uint8_t *coverage) {
  ClockPaint *paint=context;
  for(int x=first;x<end;) {
    const GColor color=paint->colors[coverage[x]];
    const int begin=x++;
    while(x<end&&paint->colors[coverage[x]].argb==color.argb)++x;
    if(color.argb==s_background_color.argb)continue;
    graphics_context_set_fill_color(paint->ctx,color);
    graphics_fill_rect(paint->ctx,GRect(begin,y,x-begin,1),0,GCornerNone);
  }
}
static bool prv_raster_glyph(ClockPaint *paint,const ClockGlyph *glyph,
                             float x,float baseline,float scale) {
  if(glyph->contour_count>CLOCK_GLYPH_MAX_CONTOURS)return false;
  unsigned at=0;
  for(unsigned i=0;i<glyph->contour_count;++i) {
    const ClockContour *contour=&clock_contours[glyph->first_contour+i];
    if(at+contour->point_count>CLOCK_GLYPH_MAX_POINTS)return false;
    s_clock_raster_contours[i]=(FontRasterContour){at,contour->point_count};
    for(unsigned j=0;j<contour->point_count;++j) {
      const ClockPoint p=clock_points[contour->first_point+j];
      s_clock_raster_points[at++]=(FontRasterPoint){
        prv_round((x+p.x*scale)*FONT_RASTER_ONE),
        prv_round((baseline-p.y*scale)*FONT_RASTER_ONE)};
    }
  }
  const FontRasterScratch scratch={s_clock_coverage,sizeof(s_clock_coverage),
      s_clock_intersections,CLOCK_GLYPH_MAX_POINTS};
  return font_raster_rows(s_clock_raster_points,at,s_clock_raster_contours,
      glyph->contour_count,200,FULL_LAYOUT_HEIGHT,scratch,prv_clock_row,paint);
}
static void prv_vector_ink(GContext *ctx,const char *text,float x,float baseline,float point,GColor color) {
  ClockPaint paint={.ctx=ctx};
  const unsigned fr=(color.argb>>4)&3,fg=(color.argb>>2)&3,fb=color.argb&3;
  const unsigned br=(s_background_color.argb>>4)&3,bg=(s_background_color.argb>>2)&3,bb=s_background_color.argb&3;
  for(unsigned i=0;i<=FONT_RASTER_COVERAGE;++i) {
    const unsigned back=FONT_RASTER_COVERAGE-i,half=FONT_RASTER_COVERAGE/2;
    paint.colors[i]=(GColor){.argb=0xc0|
      (((fr*i+br*back+half)/FONT_RASTER_COVERAGE)<<4)|
      (((fg*i+bg*back+half)/FONT_RASTER_COVERAGE)<<2)|
       ((fb*i+bb*back+half)/FONT_RASTER_COVERAGE)};
  }
  const float scale=point/CLOCK_FONT_UNITS_PER_EM;
  const unsigned char *cursor=(const unsigned char *)text;
  while(*cursor) {
    const ClockGlyph *glyph=prv_clock_glyph(body_metric_next_codepoint(&cursor));
    if(glyph==NULL)return;
    // A bounded static scanline preserves subpixel outlines; GPath remains a
    // safe fallback if a future asset exceeds the reviewed scratch capacity.
    if(!prv_raster_glyph(&paint,glyph,x,baseline,scale))
      prv_gpath_glyph(ctx,glyph,x,baseline,scale,color);
    x+=glyph->advance*scale;
  }
}
static void prv_vector(GContext *ctx,const char *text,float x,float baseline,float point,GColor color) {
  if(s_text_shadow_enabled)prv_vector_ink(ctx,text,x+1,baseline+1,point,GColorBlack);
  prv_vector_ink(ctx,text,x,baseline,point,color);
}
static uint32_t prv_millis(void) {
  time_t seconds; uint16_t millis;
  time_ms(&seconds,&millis);
  return (uint32_t)seconds*1000u+millis;
}
static const PavCard *prv_primary_activity(void) {
  return pav_state_select(&s_activities,(uint32_t)time(NULL),0);
}
static WatchPose prv_full_pose(void) {
  return halftone_pose(prv_primary_activity()!=NULL,s_large_text_enabled);
}
static WatchPose prv_current_pose(void) {
  const int height=s_window_layer ? layer_get_unobstructed_bounds(s_window_layer).size.h : 228;
  return prv_view(halftone_pose_at_height(s_pose,height,s_large_text_enabled),height).pose;
}
static void prv_private_clear(void) {
  prv_cancel_motion();
  prv_activity_reset();memset(&s_native->activity_plan,0,sizeof(s_native->activity_plan));
}
static void prv_motion_frame(void *context) {
  (void)context;s_motion_timer=NULL;
  if(!s_app_focused){prv_cancel_motion();s_pose=s_pose_target;return;}
  if(!s_layout_active&&!s_slide_active)return;
  const uint32_t now=prv_millis();
  if(s_layout_active) {
    const float t=watch_clamp((now-s_layout_started)/(float)LAYOUT_DURATION_MS);
    s_pose=watch_pose_between(s_pose_from,s_pose_target,watch_ease_in_out(t));
    if(t>=1) { s_pose=s_pose_target;s_layout_active=false; }
  }
  if(s_slide_active) {
    const float progress=(now-s_slide_started)/(float)INCOMING_DURATION_MS;
    s_slide_amount=watch_incoming(progress);
    if(progress>=1){s_slide_active=false;s_slide_amount=1;}
  }
  if(s_slide_active&&!s_layout_active&&s_context_layer)prv_dirty(s_context_layer);
  else prv_sync_layers();
  if(s_layout_active || s_slide_active) prv_schedule_motion();
  else prv_activity_clock_schedule();
}
static void prv_cancel_motion(void) {
  if(s_motion_timer) { app_timer_cancel(s_motion_timer);s_motion_timer=NULL; }
  s_layout_active=false;s_slide_active=false;s_slide_amount=1;
}
static void prv_schedule_motion(void) {
  if((!s_layout_active&&!s_slide_active)||s_motion_timer||!s_app_focused)return;
  s_motion_timer=app_timer_register(MOTION_FRAME_MS,prv_motion_frame,NULL);
  if(!s_motion_timer) {
    // A decorative allocation failure must settle the visible composition,
    // rather than leave a partial incoming paint waiting for the next minute.
    prv_cancel_motion();s_pose=s_pose_target;
    prv_sync_layers();prv_activity_clock_schedule();
  }
}
static void prv_apply_unobstructed_layout(void) {
  if(s_window_layer==NULL) return;
  const bool motion=s_app_focused && s_animations_enabled && !s_peek_transition &&
      layer_get_unobstructed_bounds(s_window_layer).size.h>=228;
  const PavCard *activity=prv_primary_activity();
  char identity[PAV_PROVIDER_BYTES+PAV_ID_BYTES+2]={0};
  if(activity)snprintf(identity,sizeof(identity),"%s|%s",activity->provider,activity->id);
  const bool replaced=s_native->activity_identity[0]&&activity&&
      (strcmp(identity,s_native->activity_identity)||
       (activity->presentation==PAV_PRESENTATION_MEDIA&&
        memcmp(activity->visual_token,s_native->activity_visual,8)));
  if(replaced&&motion&&s_panel_transitions) {
    s_native->activity_plan.cache.drawn=false;
    s_slide_active=true;s_slide_amount=0;s_slide_started=prv_millis();
  }
  if(!activity){s_slide_active=false;s_native->activity_identity[0]=0;}
  else {
    memcpy(s_native->activity_identity,identity,sizeof(identity));
    memcpy(s_native->activity_visual,activity->visual_token,8);
  }
  const WatchPose target=prv_full_pose();
  const bool layout_changed=!s_pose_ready||s_layout_active||
      memcmp(&target,&s_pose_target,sizeof(target))!=0;
  if(layout_changed)s_native->activity_plan.cache.drawn=false;
  if(!s_pose_ready) {s_pose=s_pose_from=s_pose_target=target;s_pose_ready=true;}
  else if(memcmp(&target,&s_pose_target,sizeof(target))!=0) {
    s_pose_from=s_pose;s_pose_target=target;s_layout_started=prv_millis();s_layout_active=motion;
    if(!motion)s_pose=target;
  }
  if(!motion) {prv_cancel_motion();s_pose=s_pose_target;}
  if(layout_changed||s_peek_transition)prv_sync_layers();
  else if(s_context_layer)prv_dirty(s_context_layer);
  prv_activity_clock_schedule();
  prv_schedule_motion();
}
static void prv_sync_layers(void) {
  if(!s_app_focused || !s_background_layer || !s_context_layer) return;
  const WatchPose p=prv_current_pose();
  const float reveal=watch_smooth((watch_context_visibility(p)-0.72f)/0.28f);
  int top=ACTIVITY_EXPANDED_TOP;
  if(s_layout_active||p.peek>0) {
    // Keep incoming activity ink below the moving reading group. Offset the
    // bounds by the same amount so clipping does not move its final geometry.
    const float bottom=p.row_y+(prv_activity_top()>ACTIVITY_EXPANDED_TOP?p.label_y+8:p.number_size*0.5f+6);
    const int clear=prv_round(bottom+0.499f);
    if(clear>top)top=clear;
  }
  const int bottom=ACTIVITY_EXPANDED_TOP+prv_round((208-ACTIVITY_EXPANDED_TOP)*reveal);
  const int height=bottom>top?bottom-top:0;
  layer_set_frame(s_context_layer,GRect(0,top,200,height));
  layer_set_bounds(s_context_layer,GRect(0,top-ACTIVITY_EXPANDED_TOP,200,height));
  layer_set_hidden(s_context_layer,height<=0);
  prv_dirty(s_context_layer);
  if(!(s_slide_active&&!s_layout_active))prv_dirty(s_background_layer);
}
static void prv_schedule_context_expiry(void) {
  if(s_context_timer) {app_timer_cancel(s_context_timer);s_context_timer=NULL;}
  const time_t now=time(NULL);
  if(s_native->activity_plan.cache.valid&&
      (int64_t)now>=(int64_t)s_native->activity_plan.cache.valid_until)
    memset(&s_native->activity_plan,0,sizeof(s_native->activity_plan));
  uint32_t next=halftone_context_prune(&s_context,now);
  const uint32_t activity_next=pav_state_prune(&s_activities,(uint32_t)now);
  if(activity_next&&(!next||activity_next<next))next=activity_next;
  if(next>(uint32_t)now) {
    const uint32_t seconds=next-(uint32_t)now;
    s_context_timer=app_timer_register((seconds>3600?3600:seconds)*1000,prv_context_expired,NULL);
  }
}
static void prv_activity_clock_tick(void *context) {
  (void)context;s_activity_timer=NULL;
  if(!s_app_focused)return;
  pav_state_prune(&s_activities,(uint32_t)time(NULL));
  if(s_context_layer)prv_dirty(s_context_layer);
  prv_activity_clock_schedule();
}
static void prv_context_expired(void *context) {
  (void)context;s_context_timer=NULL;
  if(s_background_layer)prv_dirty(s_background_layer);
  prv_schedule_context_expiry();prv_apply_unobstructed_layout();
}

static void prv_draw_drop(GContext *ctx,int cx,int cy,int radius,GColor color) {
  const int r=radius<4?4:radius,belly=r*2/3;
  GPoint points[]={GPoint(cx,cy-r),GPoint(cx-belly,cy+r/3),GPoint(cx+belly,cy+r/3)};
  GPath path={.num_points=3,.points=points};
  graphics_context_set_fill_color(ctx,color);gpath_draw_filled(ctx,&path);
  graphics_fill_circle(ctx,GPoint(cx,cy+r/3),belly);
}
static void prv_draw_symbol(GContext *ctx,const ComplicationSlot *slot,int cx,int cy,
                            int size,unsigned kind) {
  const GColor ink=prv_accent_color();
  graphics_context_set_stroke_color(ctx,ink);graphics_context_set_fill_color(ctx,ink);
  graphics_context_set_stroke_width(ctx,2);
  if(slot->flags&COMPLICATION_FLAG_BITMAP)prv_draw_bitmap(ctx,slot,cx-size/2,cy-size/2,size,ink,false);
  else if(kind==COMPLICATION_SEMANTIC_HUMIDITY)prv_draw_drop(ctx,cx,cy,size/2,ink);
  else if(kind==COMPLICATION_SEMANTIC_PRECIPITATION) {
    // Rain is a cloud with falling strokes; humidity is a single droplet.
    graphics_fill_circle(ctx,GPoint(cx-3,cy-3),4);
    graphics_fill_circle(ctx,GPoint(cx+2,cy-4),4);
    graphics_fill_rect(ctx,GRect(cx-7,cy-3,14,5),3,GCornersAll);
    for(int x=-4;x<=4;x+=4)graphics_draw_line(ctx,GPoint(cx+x,cy+5),GPoint(cx+x-1,cy+8));
  } else if(kind==COMPLICATION_SEMANTIC_TEMPERATURE) {
    graphics_draw_round_rect(ctx,GRect(cx-2,cy-8,4,13),2);
    graphics_fill_circle(ctx,GPoint(cx,cy+5),4);
    graphics_draw_line(ctx,GPoint(cx,cy-5),GPoint(cx,cy+5));
  } else if(kind==COMPLICATION_SEMANTIC_BATTERY) {
    const bool phone=slot->source_kind==COMPLICATION_SOURCE_PHONE||slot->detail==COMPLICATION_DETAIL_PHONE_BATTERY;
    xoce_ui_draw_content_icon(ctx,phone?XOCE_ICON_PHONE:XOCE_ICON_BATTERY,GPoint(cx,cy),size,ink);
  } else if(kind==COMPLICATION_SEMANTIC_WIND) {
    for(int y=-5;y<=5;y+=5)graphics_draw_line(ctx,GPoint(cx-7,cy+y),GPoint(cx+6-(y?2:0),cy+y));
  } else if(kind==COMPLICATION_SEMANTIC_UV) {
    graphics_draw_circle(ctx,GPoint(cx,cy),3);
    for(int d=-1;d<=1;d+=2) {
      graphics_draw_line(ctx,GPoint(cx+d*6,cy),GPoint(cx+d*8,cy));
      graphics_draw_line(ctx,GPoint(cx,cy+d*6),GPoint(cx,cy+d*8));
    }
  } else if(kind==COMPLICATION_SEMANTIC_CONDITION)
    xoce_ui_draw_content_icon(ctx,XOCE_ICON_WEATHER,GPoint(cx,cy),size,ink);
  graphics_context_set_stroke_width(ctx,1);
}
static bool prv_draw_number(GContext *ctx,const ReadingParts *parts,float center,float baseline,
                            float point,float unit_point,float width,bool preserve_format) {
  char number[READING_PART_BYTES];
  if(preserve_format)watch_layout_copy_utf8(parts->number,number,sizeof(number));
  else reading_native_number(parts->number,number,sizeof(number));
  const float vector_unit_width=parts->unit[0]?prv_vector_width(parts->unit,unit_point):0;
  const bool vector_unit=vector_unit_width>=0;
  const int body_unit_point=prv_point(prv_round(point)<s_type.secondary?
      prv_round(point):s_type.secondary);
  const float unit_width=vector_unit?vector_unit_width:prv_measure(parts->unit,body_unit_point).w;
  float number_width=prv_vector_width(number,point);
  if(number_width<0)return false;
  if(number_width+unit_width>width) {
    point*=((width-unit_width)/number_width);
    if(point<16)return false;
    number_width=prv_vector_width(number,point);
  }
  const float x=center-(number_width+unit_width)/2;
  prv_vector(ctx,number,x,baseline,point,s_text_color);
  if(unit_width) {
    if(vector_unit)prv_vector(ctx,parts->unit,x+number_width,baseline,unit_point,s_text_color);
    else prv_text(ctx,parts->unit,body_unit_point,prv_round(x+number_width),
        prv_round(baseline),prv_round(unit_width)+3,s_text_color,GTextAlignmentLeft);
  }
  return true;
}
static int prv_reading_height(void) {
  return (s_window_layer?layer_get_unobstructed_bounds(s_window_layer).size.h:FULL_LAYOUT_HEIGHT)-(s_depth_effect_enabled?23:16);
}
static ReadingNumberLayout s_reading_numbers[2];
static void prv_fit_reading_numbers(WatchPose pose) {
  ReadingNumberInput input[2]={0};
  const time_t now=time(NULL);
  if(s_has_complications)for(unsigned i=0;i<2;++i){
    const ComplicationSlot *slot=&s_complications.slots[i];
    char text[COMPLICATION_MAX_TEXT_BYTES+5],caption[COMPLICATION_MAX_LABEL_BYTES+16];
    if(!complication_is_selected(slot)||reading_state(slot,now)!=READING_VALUE||
        !prv_slot_text(slot,text,sizeof(text)))continue;
    ReadingParts parts;const bool numeric=reading_parts(text,&parts);
    const unsigned kind=reading_semantic(slot,&parts,numeric);
    reading_caption(slot,kind,i,i18n_get_system_locale(),caption,sizeof(caption));
    if(numeric){
      char number[READING_PART_BYTES];reading_native_number(parts.number,number,sizeof(number));
      const bool symbol=(slot->flags&COMPLICATION_FLAG_BITMAP)||
          (kind>=COMPLICATION_SEMANTIC_TEMPERATURE&&kind<=COMPLICATION_SEMANTIC_CONDITION);
      input[i]=(ReadingNumberInput){prv_vector_width(number,100),
          parts.unit[0]?prv_measure(parts.unit,s_type.secondary).w:0,18,symbol,
          symbol&&!strcmp(parts.unit,"%"),caption[0]||watch_context_visibility(pose)>.5f};
    }else{
      const float width=prv_vector_width(text,100);
      if(width>0)input[i]=(ReadingNumberInput){width,0,0,false,false,true};
    }
  }
  reading_number_pair(input,prv_round(pose.number_size),s_reading_numbers);
}
static HalftoneView prv_view(WatchPose pose,int height) {
  prv_fit_reading_numbers(pose);
  int first_height=0,second_ascent=0,second_descent=0;
  bool second_line=false;
  if(s_has_complications)for(unsigned i=0;i<2;++i) {
    const ComplicationSlot *slot=&s_complications.slots[i];
    if(!complication_is_selected(slot))continue;
    char text[COMPLICATION_MAX_TEXT_BYTES+5],caption[COMPLICATION_MAX_LABEL_BYTES+16];
    ReadingParts parts;
    const ReadingState state=reading_state(slot,time(NULL));
    const bool value=state==READING_VALUE&&prv_slot_text(slot,text,sizeof(text));
    if(!value)snprintf(text,sizeof(text),"%s",reading_state_label(state,i18n_get_system_locale()));
    const bool numeric=value&&reading_parts(text,&parts);
    const unsigned kind=reading_semantic(slot,&parts,numeric);
    reading_caption(slot,kind,i,i18n_get_system_locale(),caption,sizeof(caption));
    MusicTextMetrics first=prv_music_measure(NULL,text,s_type.secondary);
    const char *second=caption;
    bool has_second=caption[0]!=0,overflow=false;
    if(state==READING_VALUE&&(slot->flags&COMPLICATION_FLAG_BITMAP)&&!value) {
      first=(MusicTextMetrics){0,prv_round(pose.number_size)/2,(prv_round(pose.number_size)+1)/2};
    } else if(numeric) {
      char number[READING_PART_BYTES];reading_native_number(parts.number,number,sizeof(number));
      const ReadingNumberLayout fit=s_reading_numbers[i];overflow=fit.overflow;
      first=fit.overflow?prv_music_measure(NULL,reading_overflow_label(i18n_get_system_locale()),s_type.secondary):
          prv_activity_clock_measure(NULL,number,fit.point);
      if(!fit.overflow&&!fit.unit_below&&parts.unit[0]) {
        const MusicTextMetrics unit=prv_music_measure(NULL,parts.unit,s_type.secondary);
        if(unit.ascent>first.ascent)first.ascent=unit.ascent;
        if(unit.descent>first.descent)first.descent=unit.descent;
      }
      if(!has_second&&fit.unit_below){second=parts.unit;has_second=true;}

    } else if(value&&prv_vector_width(text,100)>0) {
      const ReadingNumberLayout fit=s_reading_numbers[i];overflow=fit.overflow;
      first=fit.overflow?prv_music_measure(NULL,reading_overflow_label(i18n_get_system_locale()),s_type.secondary):
          prv_activity_clock_measure(NULL,text,fit.point);
    } else if(first.width>READING_CONTENT_WIDTH&&!has_second) {
      second=text;has_second=true;
    }
    /* Overflow can wrap just like a text-only value. Reserve its second
     * line before placing the clock/activity, using the same fit as paint. */
    if(overflow&&!has_second&&first.width>READING_CONTENT_WIDTH){
      second=reading_overflow_label(i18n_get_system_locale());has_second=true;
    }
    if(first.ascent+first.descent>first_height)first_height=first.ascent+first.descent;
    if(has_second||reading_is_aged(slot,time(NULL))) {
      MusicTextMetrics ink=prv_music_measure(NULL,second,s_type.secondary);
      if(reading_is_aged(slot,time(NULL))&&ink.ascent<5)ink.ascent=5;
      if(ink.ascent>second_ascent)second_ascent=ink.ascent;
      if(ink.descent>second_descent)second_descent=ink.descent;
      second_line=true;
    }
  }
  const int inset=s_depth_effect_enabled?23:16;
  float point=pose.clock_size;
  const float width=prv_vector_width(s_time_buffer,point);
  if(width>152)point*=152/width;
  const MusicTextMetrics clock=prv_activity_clock_measure(NULL,s_time_buffer,prv_round(point));
  MusicTextMetrics dates[4];
  for(unsigned i=0;i<4;++i)dates[i]=prv_music_measure(NULL,
      i>=2?s_numeric_date_buffer:s_compact_date_buffer,
      s_type.date+((i%2==0&&s_large_text_enabled)?2:0));
  int reserve=0;
  const PavCard *card=prv_primary_activity();
  if(card) {
    reserve=prv_activity_reserve(card,time(NULL));
    reserve=prv_round(reserve*watch_context_visibility(pose)*(1-watch_clamp(pose.peek)));
  }
  return halftone_supporting_view(pose,height,inset+2,s_text_shadow_enabled?1:0,
      reserve,clock,dates,first_height,second_ascent,second_descent,second_line);
}
static void prv_reading_caption(GContext *ctx,const char *caption,const char *qualifier,
                                 int center,const WatchPose *p) {
  const int width=READING_CONTENT_WIDTH-6;
  int point=s_type.secondary;
  while(point>14&&prv_measure(qualifier,point).w>width)point-=2;
  point=prv_point(point);
  const int baseline=prv_round(p->row_y+p->label_y);
  if(!caption[0]||
      baseline+body_text_descent(caption,point)>prv_reading_height()-2)return;
  char fitted[COMPLICATION_MAX_LABEL_BYTES+16];
  watch_layout_copy_utf8(caption,fitted,sizeof(fitted));
  prv_ellipsize(fitted,sizeof(fitted),point,width);
  // Keep the full qualifier. A separator plus an ellipsis adds no identity.
  const size_t qualifier_length=strlen(qualifier);
  if(qualifier[0]&&(strncmp(fitted,qualifier,qualifier_length)||
      (strcmp(fitted,caption)&&strlen(fitted)<=qualifier_length+7)))
    watch_layout_copy_utf8(qualifier,fitted,sizeof(fitted));
  prv_text(ctx,fitted,point,center-READING_CONTENT_WIDTH/2,baseline,
      width,prv_muted_text(1),GTextAlignmentCenter);
}
static void prv_age_mark(GContext *ctx,int center,const WatchPose *p) {
  const GPoint at=GPoint(center+READING_CONTENT_WIDTH/2-3,prv_round(p->row_y+p->label_y)-3);
  if(at.y+2>prv_reading_height()-2)return;
  // The outer column margin keeps this marker clear of a full-width qualifier.
  graphics_context_set_stroke_width(ctx,1);graphics_context_set_stroke_color(ctx,prv_muted_text(1));
  graphics_draw_circle(ctx,at,2);
  graphics_draw_line(ctx,at,GPoint(at.x,at.y-1));
  graphics_draw_line(ctx,at,GPoint(at.x+1,at.y+1));
}
static int prv_reading_text(GContext *ctx,const char *text,int center,const WatchPose *p,
                            bool second_line,GColor color,bool complete) {
  const int second=prv_round(p->row_y+p->label_y);
  second_line=second_line&&second+body_text_descent(text,s_type.secondary)<=prv_reading_height()-2;
  MusicLines lines;
  music_wrap(text,s_type.secondary,READING_CONTENT_WIDTH,second_line?2:1,false,
      prv_music_measure,NULL,&lines);
  if(complete&&!lines.complete)return 0;
  for(int i=0;i<lines.count;++i) {
    const char *line=lines.text[i];
    const int ascent=body_text_ascent(line,s_type.secondary);
    const int descent=body_text_descent(line,s_type.secondary);
    const int baseline=i?second:prv_round(p->row_y+(ascent-descent)/2.0f);
    if(baseline+descent>prv_reading_height()-2)return 0;
    prv_text(ctx,line,s_type.secondary,center-READING_CONTENT_WIDTH/2,baseline,
        READING_CONTENT_WIDTH,color,GTextAlignmentCenter);
  }
  return lines.count;
}
static void prv_draw_reading(GContext *ctx,unsigned index,const WatchPose *p) {
  if(!s_has_complications||!complication_is_selected(&s_complications.slots[index]))return;
  const ComplicationSlot *slot=&s_complications.slots[index];
  const int center=index?140:60,icon_size=18;
  const char *locale=i18n_get_system_locale();
  const ReadingState state=reading_state(slot,time(NULL));
  char text[COMPLICATION_MAX_TEXT_BYTES+5],caption[COMPLICATION_MAX_LABEL_BYTES+16];
  const bool has_text=state==READING_VALUE&&prv_slot_text(slot,text,sizeof(text));
  ReadingParts parts;const bool numeric=has_text&&reading_parts(text,&parts);
  const unsigned kind=reading_semantic(slot,&parts,numeric);
  reading_caption(slot,kind,index,locale,caption,sizeof(caption));
  if(state!=READING_VALUE) {
    // Unavailable/expired sources retain public identity, never old values.
    prv_reading_text(ctx,reading_state_label(state,locale),center,p,false,prv_muted_text(1),false);
    prv_reading_caption(ctx,caption[0]?caption:reading_label(slot,kind,index,locale),
        reading_qualifier(slot,kind,locale),center,p);
    return;
  }
  const bool bitmap=(slot->flags&COMPLICATION_FLAG_BITMAP)!=0;
  const bool aged=reading_is_aged(slot,time(NULL));
  bool second_line=false;
  if(bitmap&&!has_text) {
    const int size=prv_round(p->number_size);
    if(p->row_y+size/2.0f<=prv_reading_height()-2) {
      prv_draw_bitmap(ctx,slot,center-size/2,prv_round(p->row_y-size/2),size,prv_accent_color(),false);
    }
  } else if(numeric) {
    char number[READING_PART_BYTES];reading_native_number(parts.number,number,sizeof(number));
    const int unit_width=parts.unit[0]?prv_measure(parts.unit,s_type.secondary).w:0;
    const ReadingNumberLayout layout=s_reading_numbers[index];
    if(layout.overflow)goto overflow;
    {
      float x=center-layout.width/2.0f;
      if(layout.icon) {prv_draw_symbol(ctx,slot,prv_round(x+icon_size/2.0f),prv_round(p->row_y),icon_size,kind);x+=icon_size+READING_ICON_GAP;}
      MusicTextMetrics ink=prv_activity_clock_measure(NULL,number,layout.point);
      if(!layout.unit_below&&parts.unit[0]) {
        const int ascent=body_text_ascent(parts.unit,s_type.secondary),descent=body_text_descent(parts.unit,s_type.secondary);
        if(ascent>ink.ascent)ink.ascent=ascent;
        if(descent>ink.descent)ink.descent=descent;
      }
      const float baseline=p->row_y+(ink.ascent-ink.descent)/2.0f;
      prv_vector(ctx,number,x,baseline,layout.point,s_text_color);
      if(parts.unit[0]) {
        const int left=layout.unit_below?center-unit_width/2:prv_round(x+layout.number_width+READING_UNIT_GAP);
        prv_text(ctx,parts.unit,s_type.secondary,left,
            layout.unit_below?prv_round(p->row_y+p->label_y):prv_round(baseline),unit_width+2,s_text_color,GTextAlignmentLeft);
      }
      second_line=layout.unit_below;
    }
  } else if(has_text) {
    // Clock-like scalars keep every glyph; arbitrary numeric shapes must not
    // become an ellipsis merely because their unit is not in our formatter.
    const float at100=prv_vector_width(text,100);
    if(at100>0) {
      const ReadingNumberLayout layout=s_reading_numbers[index];
      if(!layout.overflow) {
        const MusicTextMetrics ink=prv_activity_clock_measure(NULL,text,layout.point);
        prv_vector(ctx,text,center-layout.width/2.0f,p->row_y+(ink.ascent-ink.descent)/2.0f,layout.point,s_text_color);
      } else goto overflow;
    } else {
      const bool number=(slot->semantic_flags&COMPLICATION_SEMANTIC_VALUE)!=0;
      const int lines=prv_reading_text(ctx,text,center,p,!caption[0],s_text_color,number);
      second_line=lines>1;
      if(number&&!lines)goto overflow;
    }
  } else goto overflow;
  goto finish;
 overflow:
  second_line=prv_reading_text(ctx,reading_overflow_label(locale),center,p,!caption[0],s_text_color,false)>1;
 finish:
  if(!second_line&&caption[0])prv_reading_caption(ctx,caption,reading_qualifier(slot,kind,locale),center,p);
  if(aged)prv_age_mark(ctx,center,p);
}
static void prv_draw_status(GContext *ctx,WatchPose p) {
  if(!s_show_status)return;
  const int y=prv_round(watch_lerp(watch_lerp(115,45,watch_clamp(p.context)),104,p.peek));
  int x=25;graphics_context_set_stroke_color(ctx,prv_warning_color());
  graphics_context_set_fill_color(ctx,prv_warning_color());graphics_context_set_stroke_width(ctx,1);
  if(s_battery.charge_percent<=10&&!s_battery.is_charging) {
    xoce_ui_draw_content_icon(ctx,XOCE_ICON_BATTERY,GPoint(x+5,y+5),12,prv_warning_color());x+=12;
  }
  if(wfc_phone_status_fresh(&s_context,time(NULL))) {
    xoce_ui_draw_content_icon(ctx,XOCE_ICON_PHONE,GPoint(x+4,y+5),12,prv_warning_color());
  }
  if(!s_phone_connected) {
    const int bx=163;
    graphics_draw_line(ctx,GPoint(bx+3,y),GPoint(bx+3,y+10));
    graphics_draw_line(ctx,GPoint(bx+3,y),GPoint(bx+7,y+3));
    graphics_draw_line(ctx,GPoint(bx+7,y+3),GPoint(bx,y+8));
    graphics_draw_line(ctx,GPoint(bx+3,y+10),GPoint(bx+7,y+7));
    graphics_draw_line(ctx,GPoint(bx+7,y+7),GPoint(bx,y+2));
    graphics_draw_line(ctx,GPoint(bx-1,y+10),GPoint(bx+8,y));
  }
}
static void prv_draw_date(GContext *ctx,HalftoneView view) {
  const WatchPose p=view.pose;
  const char *text;
  const float alpha=s_layout_active?watch_clamp(1-4*watch_context_visibility(p)*(1-watch_context_visibility(p))):1;
  char fitted[sizeof(s_compact_date_buffer)];
  if(!view.date_visible)return;
  text=view.date_variant>=2?s_numeric_date_buffer:s_compact_date_buffer;
  const int point=s_type.date+((view.date_variant%2==0&&s_large_text_enabled)?2:0);
  watch_layout_copy_utf8(text,fitted,sizeof(fitted));
  prv_ellipsize(fitted,sizeof(fitted),point,152);

  prv_text(ctx,fitted,point,24,prv_round(p.date_y),152,prv_faded_text(alpha),GTextAlignmentCenter);
}
static void prv_draw_background(Layer *layer,GContext *ctx) {
  const GRect bounds=layer_get_unobstructed_bounds(s_window_layer);
  graphics_context_set_fill_color(ctx,GColorBlack);
  graphics_fill_rect(ctx,layer_get_bounds(layer),0,GCornerNone);
  graphics_context_set_fill_color(ctx,s_background_color);
  graphics_fill_rect(ctx,bounds,DOT_OUTER_CORNER_RADIUS,GCornersAll);
  graphics_context_set_antialiased(ctx,true);
  graphics_context_set_fill_color(ctx,GColorBlack);
  const int8_t *depths=s_depth_effect_enabled?s_depth_dot_depths:s_classic_dot_depths;
  const int8_t *radii=s_depth_effect_enabled?s_depth_dot_radii:s_classic_dot_radii;
  const int steps=s_depth_effect_enabled?DEPTH_DOT_TRANSITION_STEPS:CLASSIC_DOT_TRANSITION_STEPS;
  for(int i=0;i<steps;++i)prv_draw_rounded_dot_ring(ctx,bounds,depths[i],radii[i],i);
  const HalftoneView view=prv_view(halftone_pose_at_height(s_pose,bounds.size.h,s_large_text_enabled),bounds.size.h);
  const WatchPose p=view.pose;
  float point=p.clock_size,width=prv_vector_width(s_time_buffer,point);
  const float available=152;
  if(width>available){point*=available/width;width=available;}
  prv_vector(ctx,s_time_buffer,p.clock_x-width/2,p.clock_y,point,s_text_color);
  prv_draw_date(ctx,view);
  prv_draw_reading(ctx,0,&p);prv_draw_reading(ctx,1,&p);prv_draw_status(ctx,p);
}
static MusicTextMetrics prv_music_measure(void *context,const char *text,int point) {
  (void)context;point=prv_point(point);
  return (MusicTextMetrics){prv_measure(text,point).w,body_text_ascent(text,point),
      body_text_descent(text,point)};
}
static void prv_activity_reset(void) {
  s_native->activity_identity[0]=0;
  memset(s_native->activity_visual,0,sizeof(s_native->activity_visual));
  memset(&s_native->activity_plan,0,sizeof(s_native->activity_plan));
}
static MusicTextMetrics prv_activity_clock_measure(void *context,const char *text,int point) {
  (void)context;int ascent=0,descent=0;
  const unsigned char *cursor=(const unsigned char *)text;
  while(*cursor) {
    const ClockGlyph *glyph=prv_clock_glyph(body_metric_next_codepoint(&cursor));
    if(!glyph)return (MusicTextMetrics){0};
    if(glyph->y_max>ascent)ascent=glyph->y_max;
    if(-glyph->y_min>descent)descent=-glyph->y_min;
  }
  return (MusicTextMetrics){prv_round(prv_vector_width(text,point)),
      (ascent*point+CLOCK_FONT_UNITS_PER_EM-1)/CLOCK_FONT_UNITS_PER_EM,
      (descent*point+CLOCK_FONT_UNITS_PER_EM-1)/CLOCK_FONT_UNITS_PER_EM};
}
static MusicTextMetrics prv_activity_value_measure(void *context,const char *text,int point) {
  ActivityPlan *plan=context;ReadingParts parts;
  MusicTextMetrics result=prv_music_measure(NULL,text,point);
  if(reading_parts(text,&parts)&&activity_simple_unit(parts.unit)) {
    const char *number=parts.number;
    const MusicTextMetrics numeric=prv_activity_clock_measure(NULL,number,point);
    if(numeric.width) {
      const int unit_point=halftone_unit_point(s_type,point);
      MusicTextMetrics unit=prv_activity_clock_measure(NULL,parts.unit,unit_point);
      const float numeric_width=prv_vector_width(number,point);
      float unit_width=parts.unit[0]?prv_vector_width(parts.unit,unit_point):0;
      if(unit_width<0){unit=prv_music_measure(NULL,parts.unit,point<s_type.secondary?point:s_type.secondary);unit_width=unit.width;}
      result=numeric;result.width=(int)(numeric_width+unit_width+0.999f);
      if(unit.ascent>result.ascent)result.ascent=unit.ascent;
      if(unit.descent>result.descent)result.descent=unit.descent;
    }
  }
  if(plan&&plan->card->directions[0]) {
    result.width+=40;
    if(result.ascent<24)result.ascent=24;
    if(result.descent<8)result.descent=8;
  }
  return result;
}
static void prv_activity_append(char *text,size_t capacity,const char *tail) {
  if(!tail||!tail[0])return;
  const size_t length=strlen(text);
  if(length+4>=capacity)return;
  if(length)watch_layout_copy_utf8(" · ",text+length,capacity-length);
  watch_layout_copy_utf8(tail,text+strlen(text),capacity-strlen(text));
}
static bool prv_activity_line(const PavCard *card,const PavDatum *datum,uint32_t now,
    int width,bool wrap_essential,const char *state,const char *qualifier,char *text,size_t capacity) {
  text[0]=0;
  if(!pav_format_item(card,datum,now,s_phone_connected,text,capacity))return false;
  const bool essential=datum->type!=PAV_TEXT;
  if(essential&&state&&state[0])prv_activity_append(text,capacity,state);
  if(essential&&prv_measure(text,s_type.secondary).w>width)return wrap_essential;
  const char *label=activity_role(card,datum);
  if(label[0]) {
    if(datum->type==PAV_TEXT) {
      char value[ACTIVITY_LINE_BYTES];watch_layout_copy_utf8(text,value,sizeof(value));
      watch_layout_copy_utf8(label,text,capacity);
      watch_layout_copy_utf8(": ",text+strlen(text),capacity-strlen(text));
      watch_layout_copy_utf8(value,text+strlen(text),capacity-strlen(text));
    } else prv_activity_append(text,capacity,label);
  }
  if(!essential&&state&&state[0]) {
    char value[ACTIVITY_LINE_BYTES];watch_layout_copy_utf8(text,value,sizeof(value));
    watch_layout_copy_utf8(state,text,capacity);prv_activity_append(text,capacity,value);
  }
  if(qualifier&&qualifier[0])prv_activity_append(text,capacity,qualifier);
  if(essential) {
    char value[ACTIVITY_LINE_BYTES];
    if(!pav_format_item(card,datum,now,s_phone_connected,value,sizeof(value)))return false;
    if(state&&state[0])prv_activity_append(value,sizeof(value),state);
    const int value_width=prv_measure(value,s_type.secondary).w;
    if(prv_measure(text,s_type.secondary).w>width) {
      const size_t n=strlen(value);char suffix[ACTIVITY_LINE_BYTES];
      watch_layout_copy_utf8(text+n,suffix,sizeof(suffix));
      if(width-value_width<prv_measure(" · …",s_type.secondary).w)suffix[0]=0;
      else prv_ellipsize(suffix,sizeof(suffix),s_type.secondary,width-value_width);
      watch_layout_copy_utf8(value,text,capacity);
      watch_layout_copy_utf8(suffix,text+strlen(text),capacity-strlen(text));
    }
  } else prv_ellipsize(text,capacity,s_type.secondary,width);
  return prv_measure(text,s_type.secondary).w<=width;
}
// Ordinary inline weather frees the old indicator/caption band for activities.
// Be conservative for other shapes: their second line must remain readable.
static int prv_footer_point(const char *text) {
  int point=s_type.footer;
  while(point>14&&prv_measure(text,point).w>152)point-=2;
  return prv_point(point);
}
/* Reserve complete paused state and a required detail at the same fitted font
 * used below. Optional labels are already bounded by the formatter. */
static int prv_activity_reserve(const PavCard *card,uint32_t now) {
  char text[ACTIVITY_LINE_BYTES];
  pav_format_item(card,&card->main,now,s_phone_connected,text,sizeof(text));
  MusicTextMetrics ink=prv_music_measure(NULL,text,s_type.body);
  int reserve=(card->main.type==PAV_VALUE||card->main.type==PAV_CLOCK)?26:ink.ascent+ink.descent;
  ink=prv_music_measure(NULL,"ÁgjČ",s_type.footer);
  int footer=ink.ascent+ink.descent+4;if(footer<28)footer=28;
  if(card->source_state==PAV_PAUSED&&card->presentation!=PAV_PRESENTATION_MEDIA&&
      card->main.type!=PAV_TEXT&&pav_datum_visible(card,&card->support,now,s_phone_connected)&&
      prv_activity_line(card,&card->support,now,card->support.type==PAV_TEXT?2048:152,
          true,NULL,NULL,text,sizeof(text))) {
    const int point=card->support.type==PAV_TEXT?s_type.footer:prv_footer_point(text);
    const char *paused=reading_language(i18n_get_system_locale())->paused;
    const MusicTextMetrics state=prv_music_measure(NULL,paused,point);
    const MusicTextMetrics detail=prv_music_measure(NULL,text,point);
    if(state.width+prv_measure(" · ",point).w+detail.width>152)
      footer=state.ascent+state.descent+detail.ascent+detail.descent+9;
  }
  reserve+=footer+16;
  if(card->presentation!=PAV_PRESENTATION_MEDIA&&card->main.type==PAV_TEXT&&
      pav_datum_visible(card,&card->support,now,s_phone_connected))
    reserve+=body_text_ascent("ÁgjČ",s_type.secondary)+body_text_descent("ÁgjČ",s_type.secondary)+4;
  return reserve;
}
static int prv_activity_top(void) {
  const HalftoneView view=prv_view(halftone_pose(true,s_large_text_enabled),FULL_LAYOUT_HEIGHT);
  /* Use the measured free band for required context. This is at most18px
   * above the former start, with both reading homes still above the panel. */
  const int minimum=ACTIVITY_EXPANDED_TOP-18;
  return view.reading_bottom+3>minimum?view.reading_bottom+3:minimum;
}
static void prv_prepare_activity(const PavCard *card,uint32_t now,ActivityPlan *out) {
  const ReadingLanguage *language=reading_language(i18n_get_system_locale());
  const int top=prv_activity_top();
  if(out->layout.top==top&&activity_plan_current(&out->cache,card,language,now,s_phone_connected))return;
  memset(out,0,sizeof(*out));out->card=card;
  pav_format_item(card,&card->main,now,s_phone_connected,out->main,sizeof(out->main));
  const bool media=card->presentation==PAV_PRESENTATION_MEDIA;
  if(!media) {
    if(card->source_state==PAV_PAUSED) {
      watch_layout_copy_utf8(reading_language(i18n_get_system_locale())->paused,out->role,sizeof(out->role));
      prv_activity_append(out->role,sizeof(out->role),activity_role(card,&card->main));
    } else watch_layout_copy_utf8(activity_role(card,&card->main),out->role,sizeof(out->role));
    prv_ellipsize(out->role,sizeof(out->role),s_type.secondary,152);
    if(pav_datum_visible(card,&card->support,now,s_phone_connected)&&
        !prv_activity_line(card,&card->support,now,card->support.type==PAV_TEXT?2048:152,true,
            NULL,NULL,out->support,sizeof(out->support)))out->support[0]=0;
  }
  out->alternate=pav_state_select(&s_activities,now,1);
  if(out->alternate) {
    const PavDatum *datum=activity_compact_datum(out->alternate);
    const unsigned selected=out->alternate->compact_item?1:0;
    const bool glyph=out->alternate->directions[selected]||out->alternate->identity_symbol||
        ((out->alternate->flags&PAV_HAS_IMAGE)&&out->alternate->presentation!=PAV_PRESENTATION_MEDIA);
    if(!pav_datum_visible(out->alternate,datum,now,s_phone_connected)||
        !prv_activity_line(out->alternate,datum,now,glyph?120:152,false,
            out->alternate->source_state==PAV_PAUSED?reading_language(i18n_get_system_locale())->paused:NULL,
            pav_qualifier(out->alternate),out->secondary,sizeof(out->secondary)))out->alternate=NULL;
  }
  const bool scalar=card->main.type==PAV_VALUE;
  out->numeric=scalar&&reading_parts(out->main,&out->number)&&activity_simple_unit(out->number.unit)&&
      prv_activity_clock_measure(NULL,out->number.number,26).width>0;
  const bool vector=card->main.type==PAV_CLOCK;
  const char *footer=media?activity_media_footer(card,now,s_phone_connected,
      language->paused,out->support,sizeof(out->support)):activity_identity(card);
  const char *layout_role=out->role,*layout_support=out->support;
  bool footer_symbol=true;int footer_point=s_type.footer;
  const bool fold_support=!media&&out->support[0]&&card->main.type!=PAV_TEXT;
  if(media&&card->source_state==PAV_PAUSED) {
    int width=116;
    if(prv_measure(language->paused,footer_point).w>width){footer_symbol=false;width=152;}
    footer_point=prv_footer_point(language->paused);
    if(prv_measure(footer,footer_point).w>width&&
        prv_measure(language->paused,footer_point).w+prv_measure(" · …",footer_point).w>width)
      watch_layout_copy_utf8(language->paused,out->support,sizeof(out->support));
  }
  if(!media&&(out->role[0]||fold_support)) {
    char caption[sizeof(out->support)];caption[0]=0;
    const char *paused=card->source_state==PAV_PAUSED?language->paused:"";
    if(fold_support&&card->support.type!=PAV_TEXT) {
      footer_point=prv_footer_point(out->support);
      if(prv_measure(out->support,footer_point).w>152)
        watch_layout_copy_utf8(reading_overflow_label(i18n_get_system_locale()),out->support,sizeof(out->support));
    }
    if(paused[0])watch_layout_copy_utf8(paused,caption,sizeof(caption));
    if(fold_support) {
      if(caption[0])prv_activity_append(caption,sizeof(caption),out->support);
      else watch_layout_copy_utf8(out->support,caption,sizeof(caption));
    }
    /* Required state/datum goes first. Optional identity is what ellipsizes. */
    if(prv_measure(caption,footer_point).w>116)footer_symbol=false;
    if(prv_measure(caption,footer_point).w>152&&paused[0]&&fold_support) {
      /* Preserve the fitted detail when paused state needs a separate
       * line, rather than ellipsizing the datum or its final unit. */
      if(footer_point>s_type.secondary&&prv_measure(out->support,s_type.body).w>152)footer_point=s_type.secondary;
      watch_layout_copy_utf8(paused,caption,sizeof(caption));
      const size_t at=strlen(caption);
      if(at+1<sizeof(caption)){caption[at]='\n';caption[at+1]=0;watch_layout_copy_utf8(out->support,caption+at+1,sizeof(caption)-at-1);}
      footer_symbol=false;
    } else if(prv_measure(caption,footer_point).w>152&&prv_measure(caption,s_type.secondary).w<=152) {
      footer_point=s_type.secondary;footer_symbol=false;
    }
    const char *label=activity_role(card,&card->main);
    activity_footer_optional(caption,sizeof(caption),label,footer_point,footer_symbol?116:152,prv_music_measure,NULL);
    activity_footer_optional(caption,sizeof(caption),activity_identity(card),footer_point,footer_symbol?116:152,prv_music_measure,NULL);
    if(fold_support||!out->support[0]) {
      watch_layout_copy_utf8(caption,out->support,sizeof(out->support));footer=out->support;layout_support="";
    } else {
      watch_layout_copy_utf8(caption,out->role,sizeof(out->role));footer=out->role;
    }
    layout_role="";
  }
  const int secondary_height=prv_music_measure(NULL,out->secondary,s_type.secondary).ascent+
      prv_music_measure(NULL,out->secondary,s_type.secondary).descent+4;
  activity_layout_build_type(out->main,layout_role,layout_support,footer,media,vector,scalar,
      out->alternate!=NULL,(card->flags&PAV_HAS_IMAGE)!=0,
      pav_meter_visible(card,now,s_phone_connected),footer_symbol,footer_point,
      s_type.secondary,top,prv_music_measure,
      vector?prv_activity_clock_measure:scalar?prv_activity_value_measure:prv_music_measure,out,&out->layout,s_type.body,s_type.secondary,
      secondary_height>26?secondary_height:26,s_depth_effect_enabled?203:208,
      card->source_state==PAV_PAUSED||fold_support);
  out->layout.secondary_baseline=activity_centered_baseline(top,
      out->layout.secondary_height,prv_music_measure(NULL,out->secondary,s_type.secondary));
  if(scalar&&card->directions[0]){out->layout.left=50;out->layout.width=112;}
  out->needs_tick=out->layout.main.count&&activity_view_needs_tick(card,
      out->layout.support.count>0||(fold_support&&out->layout.footer.count>0),out->alternate,out->layout.secondary,now,s_phone_connected);
  // Preserve a single plan; a clock changes once per displayed second, while
  // static layouts survive animation frames and route heartbeats. Even hidden
  // datums participate in the expiry key so promotion/compact fit is rechecked.
  uint32_t expiry=UINT32_MAX;bool time_sensitive=false;
  for(unsigned i=0;i<s_activities.snapshot.count;++i) {
    const PavCard *item=&s_activities.snapshot.items[i];
    time_sensitive|=activity_datum_changes(item,&item->main,now,s_phone_connected)||
        activity_datum_changes(item,&item->support,now,s_phone_connected);
    const uint32_t ends[]={item->source_valid_until,item->main.valid_until,item->support.valid_until};
    for(unsigned j=0;j<3;++j)if(ends[j]>now&&ends[j]<expiry)expiry=ends[j];
  }
  out->cache=(ActivityPlanCache){card,language,now,expiry,true,s_phone_connected,time_sensitive,false};
}
static void prv_activity_clock_schedule(void) {
  const PavCard *card=prv_primary_activity();bool needed=false;
  if(card&&s_app_focused&&s_window_layer&&!s_peek_transition&&!s_layout_active&&!s_slide_active&&
      layer_get_unobstructed_bounds(s_window_layer).size.h>=FULL_LAYOUT_HEIGHT&&
      watch_context_visibility(prv_current_pose())>0.72f) {
    prv_prepare_activity(card,(uint32_t)time(NULL),&s_native->activity_plan);
    needed=s_native->activity_plan.needs_tick;
  }
  if(!needed&&s_activity_timer){app_timer_cancel(s_activity_timer);s_activity_timer=NULL;}
  if(needed&&!s_activity_timer) {
    time_t seconds;uint16_t milliseconds;time_ms(&seconds,&milliseconds);
    s_activity_timer=app_timer_register(1000u-milliseconds,prv_activity_clock_tick,NULL);
  }
}
static void prv_draw_activity_image(GContext *ctx,const PavCard *activity,int x,int y,int size) {
  if(!(activity->flags&PAV_HAS_IMAGE)||!activity->width||!activity->height) {
    if(activity->presentation==PAV_PRESENTATION_MEDIA){
      xoce_ui_draw_content_icon(ctx,XOCE_ICON_MUSIC,GPoint(x+size/2,y+size/2),size,prv_accent_color());
      return;
    }
    graphics_context_set_stroke_color(ctx,prv_accent_color());graphics_context_set_stroke_width(ctx,2);
    graphics_draw_round_rect(ctx,GRect(x,y,size,size),3);
    for(int line=1;line<=2;++line)
      graphics_draw_line(ctx,GPoint(x+size/4,y+size*line/3),GPoint(x+size*3/4,y+size*line/3));
    return;
  }
  uint8_t ink=0;bool monochrome=true;
  for(unsigned i=0;i<PAV_PALETTE_BYTES;++i)if(activity->palette[i]&0xc0) {
    if(ink&&ink!=activity->palette[i])monochrome=false;
    ink=activity->palette[i];
  }
  const GRect fitted=xoce_ui_fit_image(GRect(x,y,size,size),activity->width,activity->height);
  const int width=fitted.size.w,height=fitted.size.h;
  const int left=fitted.origin.x,top=fitted.origin.y;
  const unsigned stride=(activity->width+1)/2;
  for(int row=0;row<height;++row) {
    int start=0;uint8_t previous=0;
    for(int column=0;column<=width;++column) {
      uint8_t color=0;
      if(column<width) {
        const unsigned sx=column*activity->width/width,sy=row*activity->height/height;
        const uint8_t pair=activity->pixels[sy*stride+sx/2];
        color=activity->palette[sx%2?pair&15:pair>>4];
        if(!(color&0xc0))color=0;
        else if(monochrome&&activity->presentation!=PAV_PRESENTATION_MEDIA)color=s_text_color.argb;
      }
      if(color!=previous) {
        if(previous&0xc0) {
          graphics_context_set_fill_color(ctx,(GColor){.argb=previous});
          graphics_fill_rect(ctx,GRect(left+start,top+row,column-start,1),0,GCornerNone);
        }
        previous=color;start=column;
      }
    }
  }
}
static void prv_activity_symbol(GContext *ctx,unsigned symbol,unsigned direction,int x,int y,int size) {
  XoceUiIcon icon=XOCE_ICON_GENERIC;
  if(direction) {
    icon=direction==PAV_DIRECTION_STRAIGHT?XOCE_ICON_DIRECTION_STRAIGHT:
        direction==PAV_DIRECTION_UTURN?XOCE_ICON_DIRECTION_UTURN:
        direction==PAV_DIRECTION_LEFT?XOCE_ICON_DIRECTION_LEFT:XOCE_ICON_DIRECTION_RIGHT;
  } else if(symbol==PAV_SYMBOL_NAVIGATION)icon=XOCE_ICON_NAVIGATION;
  else if(symbol==PAV_SYMBOL_TIMER)icon=XOCE_ICON_TIMER;
  else if(symbol==PAV_SYMBOL_MEDIA)icon=XOCE_ICON_MUSIC;
  xoce_ui_draw_content_icon(ctx,icon,GPoint(x+size/2,y+size/2),size,prv_accent_color());
}
static void prv_draw_activity(GContext *ctx,const PavCard *card,int y) {
  const uint32_t now=(uint32_t)time(NULL);ActivityPlan *plan=&s_native->activity_plan;
  prv_prepare_activity(card,now,plan);const ActivityLayout *layout=&plan->layout;
  if(!layout->main.count)return;
  const int x=0;
  for(int i=0;i<layout->main.count;++i) {
    if(layout->vector)prv_vector(ctx,layout->main.text[i],x+layout->left,
        y+layout->main_baseline[i],layout->point,s_text_color);
    else if(plan->numeric) {
      const int width=card->directions[0]?112:152,center=card->directions[0]?120:100;
      prv_draw_number(ctx,&plan->number,x+center,y+layout->main_baseline[i],layout->point,
          halftone_unit_point(s_type,layout->point),width,true);
    } else prv_text(ctx,layout->main.text[i],layout->point,x+layout->left,
        y+layout->main_baseline[i],layout->width,s_text_color,GTextAlignmentLeft);
  }
  if(card->main.type==PAV_VALUE&&card->directions[0]) {
    const MusicTextMetrics ink=prv_activity_value_measure(NULL,layout->main.text[0],layout->point);
    prv_activity_symbol(ctx,0,card->directions[0],x+24,
        y+layout->main_baseline[0]+(ink.descent-ink.ascent-32)/2,32);
  }
  if(layout->role_baseline)prv_text(ctx,plan->role,s_type.secondary,x+24,y+layout->role_baseline,152,
      prv_muted_text(1),GTextAlignmentLeft);
  for(int i=0;i<layout->support.count;++i)prv_text(ctx,layout->support.text[i],layout->support_point,x+24,
      y+layout->support_baseline[i],152,s_text_color,GTextAlignmentLeft);
  for(int i=0;i<layout->footer.count;++i)prv_text(ctx,layout->footer.text[i],layout->footer_point,
      x+layout->footer_left,y+layout->footer_baseline[i],layout->footer_width,
      prv_muted_text(1),GTextAlignmentLeft);
  if(layout->icon_size>0&&(layout->media||((card->flags&PAV_HAS_IMAGE)&&layout->footer.count)))
    prv_draw_activity_image(ctx,card,x+24,y+layout->icon_top,layout->icon_size);
  else if(layout->icon_size>0&&!layout->media&&layout->footer.count)prv_activity_symbol(ctx,card->identity_symbol,0,
      x+24,y+layout->icon_top,layout->icon_size);
  if(layout->meter) {
    graphics_context_set_stroke_color(ctx,prv_muted_text(1));graphics_draw_rect(ctx,GRect(x+24,y+layout->meter_top,152,4));
    graphics_context_set_fill_color(ctx,prv_accent_color());
    const int fill=((uint32_t)card->meter*150u+32767u)/65535u;
    if(fill)graphics_fill_rect(ctx,GRect(x+25,y+layout->meter_top+1,fill,2),0,GCornerNone);
  }
  if(layout->secondary&&plan->alternate) {
    graphics_context_set_stroke_color(ctx,prv_muted_text(1));
    graphics_context_set_stroke_width(ctx,1);
    graphics_draw_line(ctx,GPoint(24,y+layout->top+28),GPoint(176,y+layout->top+28));
    const PavCard *other=plan->alternate;const unsigned selected=other->compact_item?1:0;
    const bool bitmap=(other->flags&PAV_HAS_IMAGE)&&other->presentation!=PAV_PRESENTATION_MEDIA&&!other->directions[selected];
    const bool glyph=bitmap||other->directions[selected]||other->identity_symbol;
    const int left=glyph?56:24;
    if(bitmap)prv_draw_activity_image(ctx,other,24,y+layout->top+1,24);
    else if(glyph)prv_activity_symbol(ctx,other->identity_symbol,other->directions[selected],24,
        y+layout->top+1,24);
    prv_text(ctx,plan->secondary,s_type.secondary,left,y+layout->secondary_baseline,176-left,
        prv_muted_text(1),GTextAlignmentLeft);
  }
}
static void prv_presentation_refresh(void *context) {
  (void)context;s_presentation_timer=NULL;
  if(!s_app_focused)return;
  const PavCard *card=prv_primary_activity();
  const WatchPose pose=prv_current_pose();
  const ActivityPlan *plan=&s_native->activity_plan;
  const uint32_t now=(uint32_t)time(NULL);
  // A heartbeat confirms the last actual draw only while its exact plan is
  // still current. Expiry, motion, locale and clocks fall back to a new draw.
  if(card&&plan->cache.drawn&&!s_peek_transition&&pose.peek<0.01f&&!s_layout_active&&!s_slide_active&&
      watch_context_visibility(pose)>=0.999f&&
      activity_plan_current(&plan->cache,card,reading_language(i18n_get_system_locale()),now,s_phone_connected))
    prv_note_presentation(card,true);
  else if(s_context_layer)prv_dirty(s_context_layer);
}
static void prv_note_presentation(const PavCard *card,bool stable) {
  uint8_t primary=ACTIVITY_NAV_ABSENT,secondary=ACTIVITY_NAV_ABSENT;uint32_t expiry=0;
  const uint32_t now=(uint32_t)time(NULL);
  ActivityPlan *plan=&s_native->activity_plan;
  if(stable&&card&&plan->layout.main.count) {
    primary=(uint8_t)(card-s_activities.snapshot.items);expiry=card->source_valid_until;
    const PavDatum *items[]={&card->main,&card->support};
    for(unsigned i=0;i<2;++i)if(items[i]->type&&items[i]->valid_until&&items[i]->valid_until<expiry)
      expiry=items[i]->valid_until;
    if(plan->layout.secondary&&plan->alternate) {
      secondary=(uint8_t)(plan->alternate-s_activities.snapshot.items);
      if(plan->alternate->source_valid_until<expiry)expiry=plan->alternate->source_valid_until;
      const PavDatum *datum=activity_compact_datum(plan->alternate);
      if(datum->valid_until&&datum->valid_until<expiry)expiry=datum->valid_until;
    }
  }
  if(activity_navigation_update(&s_native->navigation,s_session.token,
      s_activities.snapshot.view_sequence,primary,secondary,0,expiry,now)) {
    if(s_presentation_timer){app_timer_cancel(s_presentation_timer);s_presentation_timer=NULL;}
    prv_send_presentation();
  }
  if(primary!=ACTIVITY_NAV_ABSENT&&!s_presentation_timer)
    s_presentation_timer=app_timer_register(ACTIVITY_NAV_REFRESH_SECONDS*1000,prv_presentation_refresh,NULL);
}
static void prv_draw_context(Layer *layer,GContext *ctx) {
  (void)layer;const WatchPose p=prv_current_pose();
  const float reveal=watch_smooth((watch_context_visibility(p)-0.72f)/0.28f);
  const int y=-ACTIVITY_EXPANDED_TOP+prv_round(12*(1-reveal));
  const PavCard *activity=prv_primary_activity();
  if(activity)prv_draw_activity(ctx,activity,y);
  else memset(&s_native->activity_plan,0,sizeof(s_native->activity_plan));
  if(s_slide_active) {
    graphics_context_set_fill_color(ctx,s_background_color);
    const int radius=3-(int)(s_slide_amount*3);
    if(radius>0)for(int yy=prv_activity_top();yy<208;yy+=8)
      for(int xx=28;xx<176;xx+=8)graphics_fill_circle(ctx,GPoint(xx,yy+y),radius);
  }
  const bool stable=s_app_focused&&!s_peek_transition&&p.peek<0.01f&&
      reveal>=0.99f&&!s_layout_active&&!s_slide_active;
  s_native->activity_plan.cache.drawn=stable&&activity&&s_native->activity_plan.layout.main.count;
  if(s_app_focused)prv_note_presentation(activity,stable);
}
static void prv_update_clock(void) {
  const time_t now=time(NULL);struct tm *current=localtime(&now);if(!current)return;
  s_use_12_hour=watch_clock_uses_12(s_clock_format,clock_is_24h_style());
  const char *day=prv_get_localized_day(i18n_get_system_locale(),(unsigned)current->tm_wday);
  strftime(s_time_buffer,sizeof(s_time_buffer),s_use_12_hour?"%I:%M":"%H:%M",current);
  if(s_use_12_hour&&s_time_buffer[0]=='0')memmove(s_time_buffer,s_time_buffer+1,strlen(s_time_buffer));
  watch_layout_abbreviate(day,s_weekday_buffer,sizeof(s_weekday_buffer),3);
  const unsigned day_number=(unsigned)current->tm_mday,month=(unsigned)current->tm_mon+1;
  if(day_number<1||day_number>31||month<1||month>12)return;
  snprintf(s_numeric_date_buffer,sizeof(s_numeric_date_buffer),"%u.%u.",day_number,month);
  snprintf(s_compact_date_buffer,sizeof(s_compact_date_buffer),"%s · %s",s_weekday_buffer,s_numeric_date_buffer);
  if(s_background_layer)prv_dirty(s_background_layer);
  // Minute/date changes need the background only. Repaint a static activity
  // only when its actual plan, locale, expiry or geometry has changed.
  const PavCard *activity=prv_primary_activity();
  const WatchPose target=prv_full_pose();
  if(!s_pose_ready||s_layout_active||s_slide_active||
      memcmp(&target,&s_pose_target,sizeof(target))||
      (activity&&(s_native->activity_plan.layout.top!=prv_activity_top()||
          !activity_plan_current(&s_native->activity_plan.cache,activity,
          reading_language(i18n_get_system_locale()),(uint32_t)now,s_phone_connected))))
    prv_apply_unobstructed_layout();
}

// A settings preview asks for the OS clock style, independently of this
// face's explicit override. If the normal request owns the outbox, its packet
// already carries the style; otherwise finish the query after that callback.
static void prv_send_clock_format(void) {
  if(!s_format_reply_pending||!s_transport_ready)return;
  DictionaryIterator *iterator;
  if(app_message_outbox_begin(&iterator)!=APP_MSG_OK)return;
  dict_write_uint8(iterator,MESSAGE_KEY_CLOCK_FORMAT,clock_is_24h_style()?24:12);
  s_outbox_format_only=true;s_format_reply_pending=false;
  if(app_message_outbox_send()!=APP_MSG_OK)s_outbox_format_only=false;
}

static void prv_send_presentation(void) {
  if(!s_transport_ready||!s_phone_connected||!s_native->navigation.pending)return;
  DictionaryIterator *iterator=NULL;
  if(app_message_outbox_begin(&iterator)!=APP_MSG_OK||!iterator)return;
  uint8_t bytes[ACTIVITY_NAV_BYTES];activity_navigation_encode(&s_native->navigation,bytes);
  dict_write_data(iterator,MESSAGE_KEY_ACTIVITY_PRESENTED,bytes,sizeof(bytes));
  s_outbox_presentation=true;s_native->navigation.pending=false;
  if(app_message_outbox_send()!=APP_MSG_OK) {
    s_outbox_presentation=false;s_native->navigation.pending=true;
  }
}
static void prv_request_complications(void) {
  if(!s_transport_ready)return;
  DictionaryIterator *iterator;
  const AppMessageResult result = app_message_outbox_begin(&iterator);
  if (result != APP_MSG_OK || iterator == NULL) {
    APP_LOG(APP_LOG_LEVEL_WARNING, "Could not begin complication request: %d", result);
    return;
  }
  dict_write_uint8(iterator, MESSAGE_KEY_REQUEST_COMPLICATIONS, 1);
  dict_write_uint32(iterator, MESSAGE_KEY_REQUEST_CONTEXT, halftone_context_request_marker(&s_session));
  dict_write_uint32(iterator, MESSAGE_KEY_REQUEST_ACTIVITIES, s_session.token);
  dict_write_uint8(iterator, MESSAGE_KEY_CLOCK_FORMAT, clock_is_24h_style()?24:12);
  s_outbox_format_only=false;
  const AppMessageResult sent = app_message_outbox_send();
  if (sent != APP_MSG_OK) {
    halftone_context_request_failed(&s_session);
    APP_LOG(APP_LOG_LEVEL_WARNING, "Complication request failed: %d", sent);
  } else { s_format_reply_pending=false;wfc_readings_request_accepted(&s_core, time(NULL)); }
}

static void prv_startup_request(void *context) {
  s_startup_timer = NULL;
  prv_request_complications();
}

static void prv_phone_connection_changed(bool connected) {
  if (!wfc_readings_connection_changed(&s_core, connected)) { return; }
  halftone_context_session_reset(&s_session,&s_context,connected);
  // Native public timers retain their original deadline as unconfirmed while
  // disconnected. Reconnect creates a new generation before accepting packets.
  pav_state_set_connected(&s_activities,connected);
  if(connected)pav_state_set_session(&s_activities,s_session.token);
  prv_private_clear();
  s_seen_burst=0;
  s_private_rebaseline=false;
  if(s_background_layer)prv_dirty(s_background_layer);
  prv_schedule_context_expiry();
  prv_apply_unobstructed_layout();
  if(connected)prv_display_reply(&s_native->display,DISPLAY_APPLIED,DISPLAY_HELLO);
  if (connected&&s_transport_ready) {
    persist_write_int(PERSIST_KEY_CONTEXT_SESSION, (int32_t)s_session.token);
    if (s_startup_timer != NULL) { app_timer_cancel(s_startup_timer); }
    s_startup_timer = app_timer_register(1000, prv_startup_request, NULL);
  }
}

static void prv_battery_changed(BatteryChargeState charge) {
  s_battery = charge;
  if(s_background_layer)prv_dirty(s_background_layer);
}

static void prv_tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  const bool request_due = wfc_readings_tick(&s_core, time(NULL));
  prv_update_clock();
  prv_apply_colors();
  // One request on the freshness transition; denied/unavailable slots do not
  // cause a polling loop. Provider refresh policies belong to the phone host.
  if (request_due) {
    prv_request_complications();
  }
  prv_schedule_context_expiry();
}


static void prv_unobstructed_area_will_change(GRect final_area,void *context) {
  (void)context;s_peek_transition=true;
  s_native->activity_plan.cache.drawn=false;
  const int current_height=layer_get_unobstructed_bounds(s_window_layer).size.h;
  prv_cancel_motion();
  prv_activity_reset();
  if(final_area.size.h>=current_height) s_pose=s_pose_target=prv_full_pose();
  prv_sync_layers();
}
static void prv_unobstructed_area_change(AnimationProgress progress,void *context) {
  (void)progress;(void)context;prv_sync_layers();
}
static void prv_unobstructed_area_did_change(void *context) {
  (void)context;s_peek_transition=false;s_pose=s_pose_target=prv_full_pose();prv_apply_unobstructed_layout();
  prv_sync_layers();
}
static void prv_apply_colors(void) {
  const bool night=s_native->display.value[DISPLAY_MODE]==DISPLAY_QUIET?quiet_time_is_active():s_native->display.value[DISPLAY_MANUAL]!=0;
  const GColor *palette=night?s_night_colors:s_day_colors;
  if(s_background_color.argb==palette[0].argb&&s_text_color.argb==palette[1].argb&&
      s_accent_color.argb==palette[2].argb)return;
  s_background_color=palette[0];s_text_color=palette[1];s_accent_color=palette[2];
  if(s_window)window_set_background_color(s_window,s_background_color);
  prv_sync_layers();
}

static void prv_send_display(void){
  if(!s_transport_ready||!s_phone_connected||!s_native->display_pending||s_native->display_attempts>=3)return;
  DictionaryIterator *out;if(app_message_outbox_begin(&out)!=APP_MSG_OK)return;
  ++s_native->display_attempts;
  dict_write_data(out,MESSAGE_KEY_DISPLAY_PREFERENCES_RESULT,s_native->display_reply,DISPLAY_BYTES);
  s_native->outbox_display=true;s_native->display_pending=false;s_native->display_flight=s_native->display_generation;
  if(app_message_outbox_send()!=APP_MSG_OK){s_native->outbox_display=false;s_native->display_pending=true;}
}
static void prv_display_reply(const DisplayPreferences *v,uint8_t status,uint8_t flags){
  display_encode(v,status,flags,s_native->display_reply);++s_native->display_generation;
  s_native->display_attempts=0;s_native->display_pending=true;prv_send_display();
}
static void prv_display_apply(const DisplayPreferences *v){
  const HalftoneType type=halftone_type(xoce_ui_effective_text_size(v->value[DISPLAY_TEXT_SIZE],s_system_text_size));
  // Each supported profile has a distinct body size. Optical changes also
  // invalidate measurements, including the Bigger Text geometry.
  if(type.body!=s_type.body||memcmp(v->value+DISPLAY_LARGE,s_native->display.value+DISPLAY_LARGE,4*sizeof(uint32_t))){s_native->activity_plan.cache.valid=false;s_native->activity_plan.cache.drawn=false;}
  s_native->display=*v;
  for(unsigned i=0;i<3;++i){s_day_colors[i]=GColorFromHEX(v->value[i]);s_night_colors[i]=GColorFromHEX(v->value[3+i]);}
  s_clock_format=(uint8_t)v->value[DISPLAY_CLOCK];s_show_status=v->value[DISPLAY_STATUS];s_animations_enabled=v->value[DISPLAY_ANIMATIONS];s_vibration=(uint8_t)v->value[DISPLAY_VIBRATION];
  s_large_text_enabled=v->value[DISPLAY_LARGE];s_depth_effect_enabled=v->value[DISPLAY_DEPTH];
  s_text_shadow_enabled=v->value[DISPLAY_SHADOW];s_panel_transitions=v->value[DISPLAY_PANEL];
  s_type=type;
}
static void prv_focus_will_change(bool focused) {
  if(!focused) {
    s_app_focused=false;s_native->activity_plan.cache.drawn=false;
    prv_cancel_motion();s_pose=s_pose_target;
    if(s_activity_timer){app_timer_cancel(s_activity_timer);s_activity_timer=NULL;}
    if(s_presentation_timer){app_timer_cancel(s_presentation_timer);s_presentation_timer=NULL;}
  }
}
static void prv_focus_did_change(bool focused) {
  if(focused) {
    // Reconcile expiry, identity and geometry without replaying an incoming
    // transition for content that changed beneath a system window. Refresh
    // clock/palette before the first visible paint after a minute boundary.
    s_app_focused=false;
    prv_schedule_context_expiry();prv_apply_unobstructed_layout();
    s_app_focused=true;
    prv_update_clock();prv_apply_colors();
    prv_sync_layers();prv_activity_clock_schedule();
  }
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
  bool layout_changed=false,clock_changed=false,background_changed=false;
  Tuple *activity_data=dict_find(iterator,MESSAGE_KEY_ACTIVITY_DATA);
  const uint32_t activity_request=prv_context_request_value(dict_find(iterator,MESSAGE_KEY_REQUEST_ACTIVITIES));
  if(!activity_data&&activity_request==1) {
    if(s_startup_timer)app_timer_cancel(s_startup_timer);
    s_startup_timer=app_timer_register(100,prv_startup_request,NULL);
  }
  if(prv_context_request_value(dict_find(iterator,MESSAGE_KEY_REQUEST_PRESENTATION))==1&&s_context_layer) {
    s_native->navigation.reported_at=0;prv_dirty(s_context_layer);
  }
  if(activity_data) {
    layout_changed=true;
    pav_state_receive(&s_activities,activity_data->type==TUPLE_BYTE_ARRAY?activity_data->value->data:NULL,
        activity_data->type==TUPLE_BYTE_ARRAY?activity_data->length:0,(uint32_t)time(NULL));
    memset(&s_native->activity_plan,0,sizeof(s_native->activity_plan));
    prv_schedule_context_expiry();
  }
  Tuple *context_data = dict_find(iterator, MESSAGE_KEY_CONTEXT_DATA);
  const uint32_t marker_value = prv_context_request_value(dict_find(iterator, MESSAGE_KEY_REQUEST_CONTEXT));
  if (context_data == NULL && marker_value == 1) {
    layout_changed=true;
    // PKJS may become ready after the first native request was acknowledged.
    // A new phone process starts a fresh event sequence and native session.
    halftone_context_session_reset(&s_session,&s_context,true);pav_state_set_session(&s_activities,s_session.token);
    persist_write_int(PERSIST_KEY_CONTEXT_SESSION,(int32_t)s_session.token);
    s_seen_burst=0;
    prv_private_clear();s_private_rebaseline=true;
    if (s_startup_timer != NULL) { app_timer_cancel(s_startup_timer); }
    s_startup_timer = app_timer_register(100, prv_startup_request, NULL);
  }
  if (context_data != NULL) {
    const WfcPhoneStatus previous=s_context;
    const bool bytes = context_data->type == TUPLE_BYTE_ARRAY;
    const bool accepted=halftone_context_receive(&s_session,&s_context,s_phone_connected, bytes ? context_data->value->data : NULL,
        bytes ? context_data->length : 0, marker_value);
    if(accepted && marker_value==s_session.token)s_private_rebaseline=false;
    if(!accepted){prv_private_clear();layout_changed=true;}
    background_changed=memcmp(&previous,&s_context,sizeof(previous))!=0;
    ContextEffects effects;
    const Tuple *state=dict_find(iterator,MESSAGE_KEY_CONTEXT_STATE);
    const bool valid=accepted&&state&&state->type==TUPLE_BYTE_ARRAY&&
        context_effects_read(state->value->data,state->length,&effects)&&
        effects.session==s_session.token;
    if(valid&&!s_session.awaiting_baseline&&!s_private_rebaseline&&
        context_effects_alert(&effects,s_session.token,(uint32_t)time(NULL),
            &s_seen_burst,s_vibration,quiet_time_is_active())) {
      if(s_vibration==1)vibes_short_pulse();else vibes_double_pulse();
    }
    prv_schedule_context_expiry();
  }
  Tuple *data = dict_find(iterator, MESSAGE_KEY_COMPLICATION_DATA);
  if (data != NULL) {
    background_changed=true;layout_changed=true;
    s_native->activity_plan.cache.valid=false;
    const bool bytes = data->type == TUPLE_BYTE_ARRAY;
    if (wfc_readings_receive(&s_core, bytes ? data->value->data : NULL,
        bytes ? data->length : 0, time(NULL))) {
      prv_remove_legacy_data();
    }
  }
  DisplayPreferences next=s_native->display;bool changed=false;
  Tuple *request=dict_find(iterator,MESSAGE_KEY_DISPLAY_PREFERENCES);uint8_t status=0,flags=0;
  bool valid=false;
  if(request)valid=request->type==TUPLE_BYTE_ARRAY&&display_decode(request->value->data,request->length,&next,&status,&flags)&&next.revision&&!status&&!flags;
  else {
    // Read the legacy mode first; an explicit modern field below wins.
    uint32_t legacy_night;
    if(native_setting_value(dict_find(iterator,MESSAGE_KEY_NIGHT_PALETTE),&legacy_night)&&legacy_night<=1)
      next.value[DISPLAY_MODE]=legacy_night?DISPLAY_QUIET:DISPLAY_EXPLICIT;
    static const uint32_t *const keys[]={&MESSAGE_KEY_BACKGROUND_COLOR,&MESSAGE_KEY_TEXT_COLOR,&MESSAGE_KEY_ACCENT_COLOR,&MESSAGE_KEY_NIGHT_BACKGROUND_COLOR,&MESSAGE_KEY_NIGHT_TEXT_COLOR,&MESSAGE_KEY_NIGHT_ACCENT_COLOR,&MESSAGE_KEY_CLOCK_FORMAT,&MESSAGE_KEY_SHOW_STATUS,&MESSAGE_KEY_ANIMATIONS,&MESSAGE_KEY_NOTIFICATION_VIBRATION,&MESSAGE_KEY_TEXT_SIZE,&MESSAGE_KEY_APPEARANCE_MODE,&MESSAGE_KEY_MANUAL_APPEARANCE,&MESSAGE_KEY_LARGE_TEXT,&MESSAGE_KEY_DEPTH_EFFECT,&MESSAGE_KEY_TEXT_SHADOW,&MESSAGE_KEY_PANEL_TRANSITIONS};
    for(unsigned i=0;i<DISPLAY_FIELDS;++i){uint32_t value;if(!native_setting_value(dict_find(iterator,*keys[i]),&value))continue;
      display_set(&next,i,value);
    }
    uint32_t value;
    if(!dict_find(iterator,MESSAGE_KEY_CLOCK_FORMAT)&&native_setting_value(dict_find(iterator,MESSAGE_KEY_USE_12_HOUR),&value)&&value<=1)next.value[DISPLAY_CLOCK]=value?12:24;
    changed=memcmp(&next,&s_native->display,sizeof(next))!=0;valid=changed;
  }
  uint32_t format;
  if(native_setting_value(dict_find(iterator,MESSAGE_KEY_CLOCK_FORMAT),&format)&&format==WATCH_CLOCK_QUERY){s_format_reply_pending=true;prv_send_clock_format();}
  if(valid){
    if(display_save(&next)){
      clock_changed=next.value[DISPLAY_CLOCK]!=s_native->display.value[DISPLAY_CLOCK];
      layout_changed|=memcmp(next.value+DISPLAY_TEXT_SIZE,s_native->display.value+DISPLAY_TEXT_SIZE,7*sizeof(uint32_t))||next.value[DISPLAY_ANIMATIONS]!=s_native->display.value[DISPLAY_ANIMATIONS];
      // Type and optical settings paint in the background layer as well as
      // the activity layer. Invalidate both immediately after a verified save.
      background_changed|=layout_changed||next.value[DISPLAY_STATUS]!=s_native->display.value[DISPLAY_STATUS];
      if(layout_changed){activity_navigation_update(&s_native->navigation,s_session.token,s_activities.snapshot.view_sequence,ACTIVITY_NAV_ABSENT,ACTIVITY_NAV_ABSENT,0,0,(uint32_t)time(NULL));}
      prv_display_apply(&next);
      prv_display_reply(&next,DISPLAY_APPLIED,request?0:DISPLAY_HELLO);
    }else if(request)prv_display_reply(&next,DISPLAY_SAVE_FAILED,0);
  }
  if(clock_changed)prv_update_clock();
  else if(layout_changed)prv_apply_unobstructed_layout();
  if(background_changed&&s_background_layer)prv_dirty(s_background_layer);
  prv_apply_colors();
}

static void prv_inbox_dropped(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_WARNING, "Complication message dropped: %d", reason);
}
static void prv_outbox_failed(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
  if(s_native->outbox_display){s_native->outbox_display=false;if(s_native->display_flight==s_native->display_generation)s_native->display_pending=true;prv_send_display();prv_send_clock_format();prv_send_presentation();return;}
  if(s_outbox_presentation){s_outbox_presentation=false;s_native->navigation.pending=true;prv_send_display();return;}
  if(s_outbox_format_only){s_outbox_format_only=false;prv_send_display();prv_send_presentation();return;}
  halftone_context_request_failed(&s_session);
  APP_LOG(APP_LOG_LEVEL_WARNING, "Complication request failed: %d", reason);
  prv_send_display();prv_send_clock_format();
}
static void prv_outbox_sent(DictionaryIterator *iterator, void *context) {
  if(s_native->outbox_display){s_native->outbox_display=false;prv_send_display();prv_send_clock_format();prv_send_presentation();return;}
  if(s_outbox_presentation)s_outbox_presentation=false;
  else if(s_outbox_format_only)s_outbox_format_only=false;
  else halftone_context_request_acknowledged(&s_session);
  prv_send_display();prv_send_clock_format();prv_send_presentation();
}


static void prv_window_load(Window *window) {
  window_set_background_color(window,s_background_color);
  s_window_layer=window_get_root_layer(window);
  const GRect bounds=layer_get_bounds(s_window_layer);
  for(size_t i=0;i<BODY_FONT_COUNT;++i) {
    s_body_fonts[i]=fonts_load_custom_font(resource_get_handle(s_body_resources[i]));
    s_body_loaded[i]=s_body_fonts[i]!=NULL;
    if(!s_body_fonts[i])s_body_fonts[i]=fonts_get_system_font(s_body_points[i]>=20?
        FONT_KEY_GOTHIC_24_BOLD:FONT_KEY_GOTHIC_14_BOLD);
  }
  s_background_layer=layer_create(bounds);
  layer_set_update_proc(s_background_layer,prv_draw_background);
  layer_add_child(s_window_layer,s_background_layer);
  s_context_layer=layer_create(GRect(0,86,200,0));
  layer_set_clips(s_context_layer,true);layer_set_update_proc(s_context_layer,prv_draw_context);
  layer_add_child(s_window_layer,s_context_layer);
  prv_update_clock();
  const UnobstructedAreaHandlers handlers={.will_change=prv_unobstructed_area_will_change,
    .change=prv_unobstructed_area_change,.did_change=prv_unobstructed_area_did_change};
  unobstructed_area_service_subscribe(handlers,NULL);
}
static void prv_window_unload(Window *window) {
  (void)window;unobstructed_area_service_unsubscribe();prv_cancel_motion();prv_private_clear();
  layer_destroy(s_context_layer);layer_destroy(s_background_layer);
  s_context_layer=NULL;s_background_layer=NULL;s_window_layer=NULL;
  for(size_t i=0;i<BODY_FONT_COUNT;++i) {
    if(s_body_loaded[i])fonts_unload_custom_font(s_body_fonts[i]);
    s_body_fonts[i]=NULL;s_body_loaded[i]=false;
  }
}
static bool prv_init(void) {
  const unsigned preferred=preferred_content_size();s_system_text_size=preferred;
  s_type=halftone_type(xoce_ui_effective_text_size(0,preferred));
  APP_LOG(APP_LOG_LEVEL_INFO,"Text OS=%u date=%d body=%d secondary=%d",preferred,s_type.date,s_type.body,s_type.secondary);
  s_native=calloc(1,sizeof(*s_native));
  if(!s_native)return false;
  s_clock_path.points=s_clock_path_points;
  s_background_color=GColorFromHEX(0xFF5500);s_text_color=GColorWhite;s_accent_color=GColorFromHEX(0x55AAFF);
  s_animations_enabled=true;s_show_status=true;
  const WfcConfig core_config={.storage={.size=prv_storage_size,.read=prv_storage_read,
    .write=prv_storage_write,.remove=prv_storage_remove},.cache_first_key=PERSIST_KEY_COMPLICATION_FIRST};
  wfc_readings_init(&s_core,&core_config,connection_service_peek_pebble_app_connection());
  halftone_context_session_init(&s_session,persist_exists(PERSIST_KEY_CONTEXT_SESSION)?
      (uint32_t)persist_read_int(PERSIST_KEY_CONTEXT_SESSION):0);
  pav_state_init(&s_activities,s_session.token,s_phone_connected);
  persist_write_int(PERSIST_KEY_CONTEXT_SESSION,(int32_t)s_session.token);
  s_battery=battery_state_service_peek();
  DisplayPreferences saved;display_load(&saved);prv_display_apply(&saved);
  persist_delete(PERSIST_KEY_LAYOUT_STYLE);wfc_readings_load_cache(&s_core,time(NULL));
  prv_apply_colors();
  s_window=window_create();
  if(!s_window){memset(s_native,0,sizeof(*s_native));free(s_native);s_native=NULL;return false;}
  window_set_background_color(s_window,s_background_color);
  window_set_window_handlers(s_window,(WindowHandlers){.load=prv_window_load,.unload=prv_window_unload});
  app_message_register_inbox_received(prv_inbox_received);app_message_register_inbox_dropped(prv_inbox_dropped);
  app_message_register_outbox_failed(prv_outbox_failed);app_message_register_outbox_sent(prv_outbox_sent);
  app_focus_service_subscribe_handlers((AppFocusHandlers){.will_focus=prv_focus_will_change,
      .did_focus=prv_focus_did_change});
  // One v4 snapshot is bounded at5206bytes, plus dictionary/setting overhead.
  const AppMessageResult messaging=app_message_open(NATIVE_INBOX_BYTES,128);
  s_transport_ready=messaging==APP_MSG_OK;
  if(!s_transport_ready)APP_LOG(APP_LOG_LEVEL_WARNING,"AppMessage unavailable: %d",messaging);
  tick_timer_service_subscribe(MINUTE_UNIT,prv_tick_handler);
  window_stack_push(s_window,false);
  prv_display_reply(&s_native->display,DISPLAY_APPLIED,DISPLAY_HELLO);
  APP_LOG(APP_LOG_LEVEL_INFO,"Native state %lu bytes; free heap %lu",
      (unsigned long)sizeof(*s_native),(unsigned long)heap_bytes_free());
  connection_service_subscribe((ConnectionHandlers){.pebble_app_connection_handler=prv_phone_connection_changed});
  battery_state_service_subscribe(prv_battery_changed);
  if(s_transport_ready)s_startup_timer=app_timer_register(1000,prv_startup_request,NULL);
  return true;
}
static void prv_deinit(void) {
  if(!s_native)return;
  if(s_startup_timer)app_timer_cancel(s_startup_timer);
  if(s_context_timer)app_timer_cancel(s_context_timer);
  if(s_activity_timer)app_timer_cancel(s_activity_timer);
  if(s_presentation_timer)app_timer_cancel(s_presentation_timer);
  prv_cancel_motion();prv_private_clear();memset(&s_context,0,sizeof(s_context));
  battery_state_service_unsubscribe();connection_service_unsubscribe();tick_timer_service_unsubscribe();
  app_focus_service_unsubscribe();
  app_message_deregister_callbacks();window_destroy(s_window);s_window=NULL;
  memset(s_native,0,sizeof(*s_native));free(s_native);s_native=NULL;
}
int main(void) {if(!prv_init())return 0;app_event_loop();prv_deinit();return 0;}
