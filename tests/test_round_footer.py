"""Required native footer data must survive the narrower Gabbro chord."""
from pathlib import Path
import os,subprocess,tempfile,unittest
ROOT=Path(__file__).resolve().parents[1]
class RoundFooter(unittest.TestCase):
 def test_required_unit_and_overflow_use_the_final_circle_band(self):
  source=(ROOT/'src/c/halftone.c').read_text();start=source.index('static int prv_fit_round_footer(');body=source[start:source.index('\n}',start)+2]
  geometry=(ROOT/'node_modules/pebble-xoce-ui/src/c/layout.c').read_text();start=geometry.index('GRect xoce_ui_circle_band(');circle=geometry[start:geometry.index('\n}',start)+2]
  prelude=r'''
#include <assert.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>
typedef struct {int x,y;} GPoint;
typedef struct {int w,h;} GSize;
typedef struct {GPoint origin;GSize size;} GRect;
#define GRect(x,y,w,h) ((GRect){{x,y},{w,h}})
enum {FACE_WIDTH=260,FULL_LAYOUT_HEIGHT=260};
static bool s_depth_effect_enabled=true;
static const struct {int secondary;} s_type={26};
static int prv_point(int p){return p;}
static GSize prv_measure(const char *text,int point){int width=0;for(const char *c=text;*c;++c)width+=*c=='1'?point/3:*c==' '?point/4:point/2;return (GSize){width,point};}
static const char *i18n_get_system_locale(void){return "en_US";}
static const char *reading_overflow_label(const char *locale){(void)locale;return "Too long";}
static void watch_layout_copy_utf8(const char *s,char *d,size_t n){snprintf(d,n,"%s",s);}
'''
  cases=r'''
int main(void){
 char caption[128]="Paused · 1111111111111 km";int bottom=218,point=32;bool symbol=true;
 int width=prv_fit_round_footer(caption,sizeof(caption),"Paused","1111111111111 km",true,125,&bottom,&point,&symbol);
 assert(!strcmp(caption,"Paused\n1111111111111 km"));assert(!symbol&&point<32);
 assert(prv_measure("1111111111111 km",point).w<=width);
 assert(bottom<=218&&bottom>=189);
 const char *huge="999999999999999999999999999999999999999999999999999999999999999999 km";
 snprintf(caption,sizeof(caption),"Paused · %s",huge);bottom=218;point=32;symbol=true;
 width=prv_fit_round_footer(caption,sizeof(caption),"Paused",huge,true,125,&bottom,&point,&symbol);
 assert(!strcmp(caption,"Paused\nToo long"));assert(!strstr(caption,"…"));
 assert(prv_measure("Too long",point).w<=width);return 0;
}
'''
  with tempfile.TemporaryDirectory() as directory:
   p=Path(directory);(p/'test.c').write_text(prelude+circle+body+cases)
   subprocess.run([os.environ.get('CC','cc'),'-std=c99','-Wall','-Wextra','-Werror',str(p/'test.c'),'-o',str(p/'test')],check=True)
   subprocess.run([str(p/'test')],check=True)
