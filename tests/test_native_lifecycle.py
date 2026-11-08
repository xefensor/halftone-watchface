"""Exercise actual native callbacks with counted SDK boundaries, without QEMU."""
from pathlib import Path
import os
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def callback(source, name):
    match = re.search(r'^static [^\n]+\b' + name + r'\([^)]*\)\s*\{', source, re.M)
    if not match:
        raise AssertionError('Missing production callback ' + name)
    begin = source.index('{', match.start())
    depth = 1
    end = begin + 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[match.start():end]


class NativeLifecycleTests(unittest.TestCase):
    def test_actual_callbacks_cancel_covered_work_and_reconcile_without_replaying_motion(self):
        source = (ROOT / 'src/c/halftone.c').read_text()
        names = ['prv_dirty', 'prv_cancel_motion', 'prv_motion_frame', 'prv_schedule_motion',
                 'prv_apply_unobstructed_layout', 'prv_sync_layers',
                 'prv_activity_clock_tick', 'prv_context_expired',
                 'prv_focus_will_change', 'prv_focus_did_change',
                 'prv_draw_context', 'prv_update_clock']
        bodies = [callback(source, name) for name in names]
        declarations = '\n'.join(body[:body.index('{')].strip() + ';' for body in bodies)
        harness = r'''
#include <assert.h>
#include <stdio.h>
#include <time.h>
#include "watch_layout.h"
#include "activity_plan_cache.h"
#define PAV_PROVIDER_BYTES 37
#define PAV_ID_BYTES 65
#define PAV_PRESENTATION_MEDIA 2
#define MOTION_FRAME_MS 33
#define LAYOUT_DURATION_MS 250
#define INCOMING_DURATION_MS 180
#define ACTIVITY_EXPANDED_TOP 116
#define FULL_LAYOUT_HEIGHT 228
typedef struct { int value; } Layer, AppTimer, GContext;
typedef struct { struct { int y; } origin; struct { int h; } size; } GRect;
#define GRect(x,y,w,h) ((GRect){{y},{h}})
typedef struct { char provider[37],id[65];int presentation;uint8_t visual_token[8]; } PavCard;
typedef struct { ActivityPlanCache cache;struct { int top;struct { int count; } main; } layout; } Plan;
typedef struct { Plan activity_plan;char activity_identity[PAV_PROVIDER_BYTES+PAV_ID_BYTES+2];uint8_t activity_visual[8]; } Native;
static Native storage,*s_native=&storage;
static Layer background,context,window;
static Layer *s_background_layer=&background,*s_context_layer=&context,*s_window_layer=&window;
static AppTimer timers[64],*s_motion_timer,*s_activity_timer,*s_presentation_timer,*s_context_timer;
static bool s_app_focused=true,s_animations_enabled=true,s_panel_transitions=true,s_peek_transition,s_layout_active,s_slide_active,s_pose_ready;
static WatchPose s_pose,s_pose_from,s_pose_target;
static int unobstructed=228,frame_y,frame_height;
static float s_slide_amount=1;
static int s_background_color;
static void graphics_context_set_fill_color(GContext *c,int color){(void)c;(void)color;}
#define GPoint(x,y) (x)
static void graphics_fill_circle(GContext *c,int p,int r){(void)c;(void)p;(void)r;}
static uint32_t s_layout_started,s_slide_started,millis,last_interval;
static int prv_round(float value){return (int)(value+0.5f);}
static PavCard card,*selected=&card;
static bool s_phone_connected=true,s_use_12_hour;
static uint8_t s_clock_format=24;
static char s_time_buffer[6],s_weekday_buffer[13],s_numeric_date_buffer[8],s_compact_date_buffer[24];
static const char english[]="en",czech[]="cs";
static const char *locale=english;
static time_t now=1700000000;
static unsigned dirty_background,dirty_context,registrations,cancellations,geometry,scheduled,prunes,draws,reports,stable_reports;
static bool fail_timer;
static time_t fake_time(time_t *out){if(out)*out=now;return now;}
#define time fake_time
static uint32_t prv_millis(void){return millis;}
static const PavCard *prv_primary_activity(void){return selected;}
static int activity_top=86;
static int prv_activity_top(void){return activity_top;}
static WatchPose prv_full_pose(void){return selected?watch_pose_context(false):watch_pose_idle();}
static WatchPose prv_current_pose(void){return watch_pose_at_height(s_pose,unobstructed);}
static GRect layer_get_unobstructed_bounds(Layer *layer){(void)layer;return GRect(0,0,200,unobstructed);}
static void layer_mark_dirty(Layer *layer){if(layer==&background)++dirty_background;else if(layer==&context)++dirty_context;}
static void layer_set_frame(Layer *layer,GRect rect){(void)layer;frame_y=rect.origin.y;frame_height=rect.size.h;++geometry;}
static void layer_set_bounds(Layer *layer,GRect rect){(void)layer;(void)rect;++geometry;}
static void layer_set_hidden(Layer *layer,bool hidden){(void)layer;(void)hidden;++geometry;}
static AppTimer *app_timer_register(uint32_t ms,void(*fn)(void *),void *ctx){last_interval=ms;(void)fn;(void)ctx;++registrations;return fail_timer?NULL:&timers[registrations%64];}
static void app_timer_cancel(AppTimer *timer){assert(timer);++cancellations;}
static void prv_activity_clock_schedule(void){++scheduled;}
static void prv_schedule_context_expiry(void){++prunes;}
static void prv_apply_colors(void){}
static int s_activities;
static void pav_state_prune(int *state,uint32_t at){(void)state;(void)at;++prunes;}
static const char *i18n_get_system_locale(void){return locale;}
static const char *reading_language(const char *language){return language;}
static bool clock_is_24h_style(void){return true;}
static const char *prv_get_localized_day(const char *language,unsigned day){(void)language;(void)day;return "MON";}
static void prv_draw_activity(GContext *ctx,const PavCard *item,int y){(void)ctx;(void)item;(void)y;++draws;}
static void prv_note_presentation(const PavCard *item,bool stable){(void)item;++reports;if(stable)++stable_reports;}
'''
        harness += declarations + '\n' + '\n'.join(bodies)
        harness += r'''
static void reset_counts(void){dirty_background=dirty_context=registrations=cancellations=geometry=scheduled=prunes=draws=reports=stable_reports=0;}
int main(void){
  strcpy(card.provider,"provider");strcpy(card.id,"first");card.presentation=PAV_PRESENTATION_MEDIA;
  s_pose_ready=true;s_pose=s_pose_target=watch_pose_context(false);
  s_layout_active=s_slide_active=true;
  s_motion_timer=&timers[0];s_activity_timer=&timers[1];s_presentation_timer=&timers[2];
  prv_focus_will_change(false);
  assert(!s_app_focused&&!s_layout_active&&!s_slide_active);
  assert(!s_motion_timer&&!s_activity_timer&&!s_presentation_timer&&cancellations==3);
  reset_counts();prv_motion_frame(NULL);prv_activity_clock_tick(NULL);
  assert(!registrations&&!dirty_context&&!dirty_background&&!prunes);
  for(unsigned i=0;i<20;++i){++card.visual_token[0];prv_apply_unobstructed_layout();prv_dirty(&background);}
  assert(!registrations&&!dirty_context&&!dirty_background&&!geometry);
  assert(!s_layout_active&&!s_slide_active);
  prv_context_expired(NULL);assert(prunes==1&&!registrations&&!dirty_context&&!dirty_background);
  s_native->activity_plan.layout.main.count=1;prv_draw_context(&context,NULL);
  assert(draws==1&&!reports&&!s_native->activity_plan.cache.drawn);
  now+=61;prv_focus_did_change(true);
  assert(s_app_focused&&!s_layout_active&&!s_slide_active);
  assert(dirty_context&&dirty_background&&geometry&&prunes==2);
  assert(s_time_buffer[0]&&s_numeric_date_buffer[0]);
  prv_draw_context(&context,NULL);assert(reports==1&&s_native->activity_plan.cache.drawn);
  s_native->activity_plan.layout.top=activity_top;
  s_native->activity_plan.cache=(ActivityPlanCache){selected,locale,(uint32_t)now,(uint32_t)now+300,true,true,false,true};
  reset_counts();now+=60;prv_update_clock();assert(dirty_background==1&&!dirty_context&&!geometry);
  activity_top=106;reset_counts();prv_update_clock();assert(dirty_context==1&&!s_slide_active&&!registrations);
  s_native->activity_plan.layout.top=activity_top;reset_counts();prv_update_clock();assert(dirty_background==1&&!dirty_context);
  activity_top=86;s_native->activity_plan.layout.top=86;reset_counts();
  locale=czech;prv_update_clock();assert(dirty_context==1);
  s_native->activity_plan.cache.language=locale;s_native->activity_plan.cache.valid_until=(uint32_t)now;
  prv_update_clock();assert(dirty_context==2);
  s_native->activity_plan.cache.valid_until=(uint32_t)now+300;s_native->activity_plan.cache.ticking=true;
  prv_update_clock();assert(dirty_context==3);
  /* Passive updates stay still; genuine media/item identity animates. */
  reset_counts();prv_apply_unobstructed_layout();assert(!s_slide_active);
  ++card.visual_token[0];millis=100;prv_apply_unobstructed_layout();
  assert(s_slide_active&&s_slide_amount==0&&last_interval==33);
  const uint32_t incoming=s_slide_started;
  prv_draw_context(&context,NULL);assert(!s_native->activity_plan.cache.drawn);
  millis=incoming+115;prv_motion_frame(NULL);assert(s_slide_amount>0&&s_slide_amount<1);
  prv_apply_unobstructed_layout();assert(s_slide_started==incoming);
  millis=incoming+231;prv_motion_frame(NULL);assert(!s_slide_active&&s_slide_amount==1);
  strcpy(card.id,"replacement");prv_apply_unobstructed_layout();assert(s_slide_active);
  millis=s_slide_started+231;prv_motion_frame(NULL);
  /* Idle/activity transitions interpolate the complete pose over250ms. */
  selected=NULL;prv_apply_unobstructed_layout();millis=s_layout_started+250;prv_motion_frame(NULL);
  assert(s_pose.context==0);selected=&card;millis+=10;reset_counts();prv_apply_unobstructed_layout();
  assert(s_layout_active&&s_pose.context==0&&s_pose_target.context==1&&last_interval==33);
  const uint32_t started=s_layout_started;
  s_native->activity_plan.layout.main.count=1;prv_draw_context(&context,NULL);assert(!stable_reports);
  millis=started+125;prv_motion_frame(NULL);assert(s_pose.context==0.5f&&s_pose.clock_y>42&&s_pose.clock_y<110);
  prv_apply_unobstructed_layout();assert(s_layout_started==started);
  millis=started+250;prv_motion_frame(NULL);assert(!s_layout_active&&s_pose.context==1&&frame_y==116&&frame_height==92);
  prv_draw_context(&context,NULL);assert(stable_reports==1&&s_native->activity_plan.cache.drawn);
  const unsigned settled=registrations,paints=dirty_context;prv_motion_frame(NULL);
  assert(registrations==settled&&dirty_context==paints);
  /* Native Peek follows actual height, without an independent timer/replay. */
  unobstructed=220;prv_apply_unobstructed_layout();
  assert(!s_layout_active&&!s_slide_active&&!s_motion_timer);
  const WatchPose peek_part=prv_current_pose();assert(peek_part.peek>0&&peek_part.peek<1);
  prv_draw_context(&context,NULL);assert(!s_native->activity_plan.cache.drawn);
  unobstructed=171;assert(prv_current_pose().peek==1);
  unobstructed=228;prv_apply_unobstructed_layout();assert(!s_slide_active&&!s_layout_active);
  /* Expired content disappears immediately even while header returns idle. */
  selected=NULL;prv_context_expired(NULL);assert(!s_slide_active&&s_pose_target.context==0);
  const unsigned previous_draws=draws;prv_draw_context(&context,NULL);
  assert(draws==previous_draws&&!s_native->activity_plan.layout.main.count);
  prv_cancel_motion();fail_timer=true;selected=&card;prv_apply_unobstructed_layout();
  assert(!s_layout_active&&!s_slide_active&&!s_motion_timer);
  assert(!memcmp(&s_pose,&s_pose_target,sizeof(s_pose)));
  puts("covered callbacks: zero decorative registrations/dirty requests; fresh return and static-minute/expiry/locale gates passed");
  return 0;
}
'''
        with tempfile.TemporaryDirectory(prefix='halftone-native-lifecycle-') as tmp:
            path = Path(tmp) / 'callbacks.c'
            path.write_text(harness)
            output = Path(tmp) / 'callbacks'
            subprocess.run([os.environ.get('CC', 'cc'), '-std=c99', '-Wall', '-Wextra', '-Werror',
                            '-I' + str(ROOT / 'src/c'), str(path), '-o', str(output)], check=True)
            subprocess.run([str(output)], check=True)


    def test_actual_presentation_gate_never_exports_a_yielded_secondary(self):
        source = (ROOT / 'src/c/halftone.c').read_text()
        body = callback(source, 'prv_note_presentation')
        harness = r'''
#include <assert.h>
#include <time.h>
#include "activity_navigation.h"
typedef struct { unsigned type;uint32_t valid_until; } PavDatum;
typedef struct { uint32_t source_valid_until;PavDatum main,support; } PavCard;
typedef struct { struct { struct {int count;}main;bool secondary;}layout;const PavCard *alternate;}ActivityPlan;
typedef struct { ActivityPlan activity_plan;ActivityNavigation navigation;}Native;
typedef struct {int unused;}AppTimer;
static Native store,*s_native=&store;
static struct {struct {PavCard items[2];uint32_t view_sequence;}snapshot;}s_activities;
static struct {uint32_t token;}s_session={7};
static AppTimer timer,*s_presentation_timer;
static uint8_t sent[ACTIVITY_NAV_BYTES];
static unsigned sends;
static const PavDatum *activity_compact_datum(const PavCard *card){return &card->main;}
static void app_timer_cancel(AppTimer *value){assert(value==&timer);}
static void prv_presentation_refresh(void *context){(void)context;}
static AppTimer *app_timer_register(unsigned delay,void(*callback)(void *),void *context){
 assert(delay==30000&&callback==prv_presentation_refresh&&!context);return &timer;
}
static void prv_send_presentation(void){++sends;activity_navigation_encode(&store.navigation,sent);}
''' + body + r'''
int main(void){
 const uint32_t now=(uint32_t)time(NULL);
 s_activities.snapshot.view_sequence=11;
 s_activities.snapshot.items[0]=(PavCard){.source_valid_until=now+120,.main={1,now+90}};
 s_activities.snapshot.items[1]=(PavCard){.source_valid_until=now+60,.main={1,now+30}};
 store.activity_plan.layout.main.count=1;
 store.activity_plan.alternate=&s_activities.snapshot.items[1];
 /* A fitted-out row can still have its candidate pointer; it must remain absent
  * from both the actual receipt and the Open Activity navigation wire. */
 store.activity_plan.layout.secondary=false;
 prv_note_presentation(&s_activities.snapshot.items[0],true);
 assert(sends==1&&sent[1]==0&&sent[2]==ACTIVITY_NAV_ABSENT);
 assert(store.navigation.expires_at==now+90);
 store.activity_plan.layout.secondary=true;
 prv_note_presentation(&s_activities.snapshot.items[0],true);
 assert(sends==2&&sent[1]==0&&sent[2]==1&&store.navigation.expires_at==now+30);
 store.activity_plan.layout.secondary=false;
 prv_note_presentation(&s_activities.snapshot.items[0],true);
 assert(sends==3&&sent[2]==ACTIVITY_NAV_ABSENT&&store.navigation.expires_at==now+90);
 prv_note_presentation(&s_activities.snapshot.items[0],false);
 assert(sends==4&&sent[1]==ACTIVITY_NAV_ABSENT&&sent[2]==ACTIVITY_NAV_ABSENT);
 assert(!s_presentation_timer);
 return 0;
}
'''
        with tempfile.TemporaryDirectory(prefix='halftone-presentation-fit-') as tmp:
            path = Path(tmp) / 'presentation.c'
            path.write_text(harness)
            output = Path(tmp) / 'presentation'
            subprocess.run([os.environ.get('CC', 'cc'), '-std=c99', '-Wall', '-Wextra', '-Werror',
                            '-I' + str(ROOT / 'src/c'), str(path), '-o', str(output)], check=True)
            subprocess.run([str(output)], check=True)


    def test_primary_required_detail_wraps_while_unfit_secondary_stays_absent(self):
        source = (ROOT / 'src/c/halftone.c').read_text()
        body = callback(source, 'prv_activity_line')
        harness = r'''
#include <assert.h>
#include <stdio.h>
#include "watch_layout.h"
#define ACTIVITY_LINE_BYTES 128
enum {PAV_TEXT=1,PAV_VALUE=2};
typedef struct {unsigned type;}PavDatum;
typedef struct {const char *value,*label;}PavCard;
typedef struct {int w;}GSize;
static bool s_phone_connected=true;
static struct {int secondary;}s_type={26};
static bool pav_format_item(const PavCard *card,const PavDatum *datum,unsigned now,
    bool connected,char *out,size_t capacity){(void)datum;(void)now;(void)connected;snprintf(out,capacity,"%s",card->value);return true;}
static GSize prv_measure(const char *text,int point){return (GSize){(int)strlen(text)*point/2};}
static void prv_activity_append(char *text,size_t capacity,const char *tail){
 const size_t n=strlen(text);if(n+4<capacity){watch_layout_copy_utf8(" · ",text+n,capacity-n);watch_layout_copy_utf8(tail,text+strlen(text),capacity-strlen(text));}
}
static const char *activity_role(const PavCard *card,const PavDatum *datum){(void)datum;return card->label?card->label:"";}
static void prv_ellipsize(char *text,size_t capacity,int point,int width){(void)text;(void)capacity;(void)point;(void)width;assert(false);}
''' + body + r'''
int main(void){
 const PavCard card={"1111111111111 km",NULL};const PavDatum detail={PAV_VALUE};char text[128];
 assert(prv_activity_line(&card,&detail,1,152,true,NULL,NULL,text,sizeof(text)));
 assert(!strcmp(text,card.value));
 assert(!prv_activity_line(&card,&detail,1,152,false,NULL,NULL,text,sizeof(text)));
 s_type.secondary=16;
 assert(prv_activity_line(&card,&detail,1,152,false,NULL,NULL,text,sizeof(text)));
 assert(!strcmp(text,card.value));
 s_type.secondary=26;
 const PavCard labelled={"5:12 /km","A very long optional timer label"};
 assert(prv_activity_line(&labelled,&detail,1,152,true,NULL,NULL,text,sizeof(text)));
 assert(!strcmp(text,labelled.value));return 0;
}
'''
        with tempfile.TemporaryDirectory(prefix='halftone-required-detail-') as tmp:
            path = Path(tmp) / 'detail.c'
            path.write_text(harness)
            output = Path(tmp) / 'detail'
            subprocess.run([os.environ.get('CC', 'cc'), '-std=c99', '-Wall', '-Wextra', '-Werror',
                            '-I' + str(ROOT / 'src/c'), str(path), '-o', str(output)], check=True)
            subprocess.run([str(output)], check=True)


    def test_long_navigation_value_measures_and_draws_the_same_fitted_unit(self):
        source = (ROOT / 'src/c/halftone.c').read_text()
        bodies = '\n'.join(callback(source, name) for name in
                           ['prv_vector_width', 'prv_activity_clock_measure',
                            'prv_draw_number', 'prv_activity_value_measure'])
        harness = r'''
#include <assert.h>
#include <stdio.h>
#include "watch_layout.h"
#include "supporting_type.h"
#include "generated_body_metrics.h"
#include "generated_clock_glyphs.h"
typedef int GContext;
typedef struct {int w;} GSize;
typedef struct {char number[32],unit[16];} ReadingParts;
typedef struct {int directions[2];} Card;
typedef struct {const Card *card;} ActivityPlan;
enum {READING_PART_BYTES=32,GTextAlignmentLeft=0};
static HalftoneType s_type;
static int s_text_color,drawn_unit_point;
static int prv_round(float value){return (int)(value+.5f);}
static int prv_point(int point){return point;}
static const ClockGlyph *prv_clock_glyph(unsigned code){
 for(unsigned i=0;i<CLOCK_GLYPH_COUNT;++i)if(clock_glyphs[i].code==code)return &clock_glyphs[i];
 return NULL;
}
/* The packaged Roboto PFO advances for "mi" equal the selected point at
 * 14,16,20,22,24,26 and28px. Its fallback is independent of Fira's advances. */
static GSize prv_measure(const char *text,int point){return (GSize){(int)strlen(text)*point/2};}
static MusicTextMetrics prv_music_measure(void *ctx,const char *text,int point){
 (void)ctx;return (MusicTextMetrics){prv_measure(text,point).w,
   body_text_ascent(text,point),body_text_descent(text,point)};
}
static bool reading_parts(const char *text,ReadingParts *parts){
 return sscanf(text,"%31s %15s",parts->number,parts->unit)==2;
}
static void reading_native_number(const char *text,char *out,size_t size){snprintf(out,size,"%s",text);}
static bool activity_simple_unit(const char *unit){return !strcmp(unit,"mi");}
static void prv_vector(GContext *ctx,const char *text,float x,float y,float point,int color){
 (void)ctx;(void)text;(void)x;(void)y;(void)point;(void)color;
}
static void prv_text(GContext *ctx,const char *text,int point,int x,int y,int width,int color,int align){
 (void)ctx;(void)text;(void)x;(void)y;(void)width;(void)color;(void)align;drawn_unit_point=point;
}
''' + bodies + r'''
int main(void){
 const Card card={{1,0}};ActivityPlan plan={&card};
 ReadingParts parts;assert(reading_parts("1234567890123 mi",&parts));
 for(unsigned size=0;size<3;++size){
  s_type=halftone_type(size);
  MusicTextMetrics value=prv_activity_value_measure(&plan,"1234567890123 mi",14);
  assert(value.width==142&&value.ascent+value.descent==32);
  assert(prv_draw_number(NULL,&parts,106,160,14,halftone_unit_point(s_type,14),112,true));
  assert(drawn_unit_point==14);
 }
 return 0;
}
'''
        profile=(ROOT / 'src/c/supporting_type.h').read_text()
        profile=profile[profile.index('typedef struct {int date'):profile.index('typedef struct {\n  WatchPose')]
        harness=harness.replace('#include "supporting_type.h"',
            'typedef struct {int width,ascent,descent;} MusicTextMetrics;\n'+profile)
        with tempfile.TemporaryDirectory(prefix='halftone-fitted-unit-') as tmp:
            path = Path(tmp) / 'unit.c'
            path.write_text(harness)
            output = Path(tmp) / 'unit'
            subprocess.run([os.environ.get('CC', 'cc'), '-std=c99', '-Wall', '-Wextra', '-Werror',
                            '-I' + str(ROOT / 'src/c'), str(path), '-o', str(output)], check=True)
            subprocess.run([str(output)], check=True)


if __name__ == '__main__':
    unittest.main()
