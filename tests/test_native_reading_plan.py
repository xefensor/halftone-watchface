"""Compile the production reading measurement entry point with controlled fonts.
Regresses two-line overflow reservation before clock/activity placement.
"""
from pathlib import Path
import os,subprocess,tempfile
root=Path(__file__).resolve().parents[1]
face='halftone'if(root/'src/c/halftone.c').exists()else'dynamic'
native=(root/f'src/c/{face}.c').read_text()
name='prv_view'if face=='halftone'else'prv_reading_pose'
a=native.index(('static HalftoneView prv_view(WatchPose pose,int height) {'if face=='halftone'else'static WatchPose prv_reading_pose(WatchPose pose,int height,int *bottom) {'))
b=native.index('\nstatic void prv_reading_caption',a)
source=r'''
#include <assert.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#include "reading_layout.h"
typedef struct {float clock_size,number_size,row_y,label_y,peek;} WatchPose;
typedef struct {WatchPose pose;} HalftoneView;
typedef struct {int width,ascent,descent;} MusicTextMetrics;
typedef struct {int w;} Size;
typedef struct {unsigned flags;} ComplicationSlot;
typedef struct {char number[32],unit[32];} ReadingParts;
typedef int ReadingState;
typedef int PavCard;
enum {COMPLICATION_MAX_TEXT_BYTES=64,COMPLICATION_MAX_LABEL_BYTES=32,READING_PART_BYTES=32,READING_VALUE=2,COMPLICATION_FLAG_BITMAP=4};
static bool s_has_complications=true,s_depth_effect_enabled=false,s_large_text_enabled=false,s_text_shadow_enabled=false;
static struct {ComplicationSlot slots[2];} s_complications={{{1},{0}}};
static struct {int secondary,date;} s_type={26,26};
static char s_time_buffer[]="13:05",s_numeric_date_buffer[]="1.11.",s_compact_date_buffer[]="SUN 1.11.";
static ReadingNumberLayout s_reading_numbers[2];
static bool measured_second,caption,wide=true;
static int prv_round(float n){return (int)n;}
static float watch_clamp(float n){return n;}
static float watch_context_visibility(WatchPose p){return p.peek;}
static void prv_fit_reading_numbers(WatchPose p){(void)p;}
static bool complication_is_selected(const ComplicationSlot *s){return s->flags;}
static ReadingState reading_state(const ComplicationSlot *s,time_t n){(void)s;(void)n;return READING_VALUE;}
static bool prv_slot_text(const ComplicationSlot *s,char *out,size_t cap){(void)s;snprintf(out,cap,"1234567890");return true;}
static const char *i18n_get_system_locale(void){return "en";}
static const char *reading_state_label(ReadingState s,const char *l){(void)s;(void)l;return "No data";}
static bool reading_parts(const char *s,ReadingParts *p){snprintf(p->number,sizeof(p->number),"%s",s);p->unit[0]=0;return true;}
static unsigned reading_semantic(const ComplicationSlot *s,const ReadingParts *p,bool n){(void)s;(void)p;(void)n;return 0;}
static void reading_caption(const ComplicationSlot *s,unsigned k,unsigned i,const char *l,char *out,size_t cap){(void)s;(void)k;(void)i;(void)l;snprintf(out,cap,"%s",caption?"TEMP":"");}
static MusicTextMetrics prv_music_measure(void *c,const char *t,int p){(void)c;(void)p;return (MusicTextMetrics){!strcmp(t,"Too long")&&wide?100:20,18,5};}
static void reading_native_number(const char *s,char *out,size_t cap){snprintf(out,cap,"%s",s);}
static const char *reading_overflow_label(const char *l){(void)l;return "Too long";}
static MusicTextMetrics prv_activity_clock_measure(void *c,const char *t,int p){return prv_music_measure(c,t,p);}
static Size prv_measure(const char *t,int p){(void)t;(void)p;return (Size){10};}
static float prv_vector_width(const char *t,float p){(void)t;(void)p;return 60;}
static bool reading_is_aged(const ComplicationSlot *s,time_t n){(void)s;(void)n;return false;}
static const PavCard *prv_primary_activity(void){return NULL;}
static int prv_activity_reserve(const PavCard *c,time_t n){(void)c;(void)n;return 60;}
static WatchPose dynamic_reading_pose(WatchPose p,int h,int f,int a,int d,bool second){(void)h;(void)f;(void)a;(void)d;measured_second=second;return p;}
static HalftoneView halftone_supporting_view(WatchPose p,int h,int i,int s,int r,MusicTextMetrics c,MusicTextMetrics dates[4],int f,int a,int d,bool second){(void)h;(void)i;(void)s;(void)r;(void)c;(void)dates;(void)f;(void)a;(void)d;measured_second=second;return (HalftoneView){p};}
'''
call='prv_view(p,228)'if face=='halftone'else'prv_reading_pose(p,228,NULL)'
source+=native[a:b]+'''
int main(void){
 WatchPose p={40,40,100,20,0};
 s_reading_numbers[0].overflow=true;CALL;assert(measured_second);
 wide=false;CALL;assert(!measured_second);
 wide=true;s_reading_numbers[0].overflow=false;CALL;assert(!measured_second);
 caption=true;CALL;assert(measured_second);
 return 0;
}
'''.replace('CALL',call)
with tempfile.TemporaryDirectory()as tmp:
 folder=Path(tmp);(folder/'plan.c').write_text(source)
 subprocess.run([os.environ.get('CC','cc'),'-std=c99','-Wall','-Wextra','-Werror','-Wno-unused-function','-Wno-unused-variable','-I'+str(root/'src/c'),str(folder/'plan.c'),'-o',str(folder/'plan')],check=True)
 subprocess.run([str(folder/'plan')],check=True)
print(face+' production reading plan: overflow wraps before height measurement PASS')
