"""Compile the production display codec/store against failing persistence boundaries."""
from pathlib import Path
import os, re, subprocess, tempfile, zipfile
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='halftone-display-store-') as tmp:
    out=Path(tmp)
    for package in ['pebble-watchface-core','pebble-activities']:
        with zipfile.ZipFile(ROOT/'node_modules'/package/'dist.zip') as archive:
            for name in archive.namelist():
                if name.startswith('include/'):archive.extract(name,out)
    (out/'pebble.h').write_text('''#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
bool persist_exists(uint32_t key); bool persist_read_bool(uint32_t key);
int32_t persist_read_int(uint32_t key); int persist_get_size(uint32_t key);
int persist_read_data(uint32_t key,void *out,size_t size);
int persist_write_data(uint32_t key,const void *data,size_t size);
int persist_write_int(uint32_t key,int32_t value); int persist_write_bool(uint32_t key,bool value);
''')
    source=r'''
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "pebble.h"
static uint8_t data[100][80];static int sizes[100],writes;static bool fail_write,corrupt_read;
bool persist_exists(uint32_t key){return sizes[key]>0;}
int persist_get_size(uint32_t key){return sizes[key];}
int persist_read_data(uint32_t key,void *out,size_t size){int n=sizes[key];if(n>(int)size)n=(int)size;memcpy(out,data[key],n);if(corrupt_read&&key==78&&n)((uint8_t*)out)[10]^=1;return n;}
int32_t persist_read_int(uint32_t key){int32_t value=0;if(sizes[key]==4)memcpy(&value,data[key],4);return value;}
bool persist_read_bool(uint32_t key){return sizes[key]>0&&data[key][0]!=0;}
int persist_write_data(uint32_t key,const void *value,size_t size){if(fail_write&&key==78)return -1;assert(size<=80);memcpy(data[key],value,size);sizes[key]=(int)size;++writes;return (int)size;}
int persist_write_int(uint32_t key,int32_t value){return persist_write_data(key,&value,4);}
int persist_write_bool(uint32_t key,bool value){uint8_t b=value;return persist_write_data(key,&b,1);}
#include "display_preferences.c"
int main(void){
 DisplayPreferences value,loaded,decoded;uint8_t bytes[DISPLAY_BYTES],status,flags;
 display_load(&value);assert(value.value[DISPLAY_MODE]==DISPLAY_EXPLICIT&&value.value[DISPLAY_TEXT_SIZE]==0&&value.revision==0);
 persist_write_int(2,0x123456);persist_write_int(3,0x654321);persist_write_int(75,0xabcdef);persist_write_bool(74,true);persist_write_bool(7,true);persist_write_bool(71,false);
 persist_write_bool(6,true);persist_write_bool(4,true);persist_write_bool(5,true);persist_write_bool(62,false);
 display_load(&value);assert(value.value[13]&&value.value[14]&&value.value[15]&&!value.value[16]);assert(value.value[0]==0x123456&&value.value[1]==0x654321&&value.value[3]==0xabcdef&&value.value[DISPLAY_MODE]==DISPLAY_QUIET&&value.value[DISPLAY_CLOCK]==12&&!value.value[DISPLAY_ANIMATIONS]);
 value.revision=0xffffffff;value.value[DISPLAY_TEXT_SIZE]=3;value.value[DISPLAY_MODE]=DISPLAY_FOLLOW;value.value[DISPLAY_MANUAL]=1;
 display_encode(&value,DISPLAY_APPLIED,DISPLAY_HELLO,bytes);assert(display_decode(bytes,sizeof(bytes),&decoded,&status,&flags));assert(!memcmp(&value,&decoded,sizeof(value))&&!status&&flags==DISPLAY_HELLO);
 assert(!display_decode(bytes,sizeof(bytes)-1,&decoded,NULL,NULL));bytes[1]=12;assert(!display_decode(bytes,sizeof(bytes),&decoded,NULL,NULL));
 assert(display_save(&value));display_load(&loaded);assert(!memcmp(&value,&loaded,sizeof(value)));assert(!persist_read_bool(74));
 int before=writes;assert(display_save(&value));assert(writes==before);
 const uint32_t previous_rgb=persist_read_int(2);value.value[0]=0x111122;value.revision=2;fail_write=true;assert(!display_save(&value));assert((uint32_t)persist_read_int(2)==previous_rgb);fail_write=false;
 display_load(&loaded);assert(loaded.value[0]==previous_rgb);corrupt_read=true;assert(!display_save(&value));corrupt_read=false;
 value.value[0]=0x1000000;assert(!display_save(&value));value.value[0]=0x123456;
 for(unsigned mode=0;mode<=2;++mode)for(unsigned size=0;size<=3;++size){value.value[DISPLAY_MODE]=mode;value.value[DISPLAY_TEXT_SIZE]=size;assert(display_save(&value));display_load(&loaded);assert(!memcmp(&loaded,&value,sizeof(value)));}
 sizes[78]=5;display_load(&loaded);assert(loaded.value[0]==0x123456&&loaded.value[3]==0xabcdef&&loaded.value[DISPLAY_MODE]==DISPLAY_EXPLICIT);
 puts("native display: exact RGB migration, codec, all profiles/modes, readback failure, legacy mirrors and relaunch PASS");return 0;
}
'''
    native=(ROOT/'src/c/halftone.c').read_text()
    def callback(name):
        match=re.search(r'^static void '+name+r'\([^)]*\)\s*\{',native,re.M);assert match;begin=match.start();brace=native.index('{',begin);end=brace+1;depth=1
        while depth:
            depth+=(native[end]=='{')-(native[end]=='}');end+=1
        return native[begin:end]
    declarations=r'''
#include "supporting_type.h"
#include "pebble-xoce-ui/native-type.h"
typedef struct {uint32_t argb;} GColor;
#define GColorFromHEX(value) ((GColor){(value)})
static GColor s_day_colors[3],s_night_colors[3],s_background_color,s_text_color,s_accent_color;
static struct {DisplayPreferences display;struct {struct {bool valid,drawn;} cache;} activity_plan;} native_state,*s_native=&native_state;
static unsigned s_system_text_size;static HalftoneType s_type;
static bool s_large_text_enabled,s_depth_effect_enabled,s_text_shadow_enabled,s_panel_transitions;
static uint8_t s_clock_format,s_vibration;static bool s_show_status,s_animations_enabled,quiet;
static void *s_window=(void*)1;static unsigned palette_updates;
static bool quiet_time_is_active(void){return quiet;}
static void window_set_background_color(void *window,GColor color){(void)window;(void)color;++palette_updates;}
static void prv_sync_layers(void){}
'''
    checks=r'''
 for(unsigned choice=0;choice<=3;++choice)for(unsigned os_size=1;os_size<=3;++os_size){
  value.value[DISPLAY_TEXT_SIZE]=choice;s_system_text_size=os_size;
  HalftoneType old=s_type;s_native->activity_plan.cache.valid=s_native->activity_plan.cache.drawn=true;prv_display_apply(&value);
  if(memcmp(&old,&s_type,sizeof(old)))assert(!s_native->activity_plan.cache.valid&&!s_native->activity_plan.cache.drawn);
  HalftoneType expected=halftone_type(choice?choice-1:os_size-1);assert(!memcmp(&s_type,&expected,sizeof(expected)));
 }
 for(unsigned mode=0;mode<=2;++mode)for(unsigned manual=0;manual<=1;++manual)for(unsigned active=0;active<=1;++active){
  value.value[DISPLAY_MODE]=mode;value.value[DISPLAY_MANUAL]=manual;quiet=active;prv_display_apply(&value);prv_apply_colors();
  const bool night=mode==DISPLAY_QUIET?active:manual;
  assert(s_background_color.argb==value.value[night?DISPLAY_NIGHT_BG:DISPLAY_DAY_BG]);
  assert(s_text_color.argb==value.value[night?DISPLAY_NIGHT_TEXT:DISPLAY_DAY_TEXT]);
  assert(s_accent_color.argb==value.value[night?DISPLAY_NIGHT_ACCENT:DISPLAY_DAY_ACCENT]);
 }
 for(unsigned mask=0;mask<16;++mask){
  for(unsigned i=0;i<4;++i)value.value[DISPLAY_LARGE+i]=(mask>>i)&1;
  assert(display_save(&value));display_load(&loaded);assert(!memcmp(&value,&loaded,sizeof(value)));prv_display_apply(&value);
  assert(s_large_text_enabled==!!(mask&1)&&s_depth_effect_enabled==!!(mask&2)&&s_text_shadow_enabled==!!(mask&4)&&s_panel_transitions==!!(mask&8));
 }
 assert(!display_set(&value,DISPLAY_FIELDS,1));assert(!display_set(&value,DISPLAY_CLOCK,13));assert(!display_set(&value,DISPLAY_LARGE,2));assert(display_set(&value,DISPLAY_LARGE,0));
 assert(palette_updates);puts("actual native palette resolver: Manual, Quiet Time, retained Follow fallback and all effective type profiles PASS");
'''
    source=source.replace('int main(void){',declarations+'\n'+callback('prv_apply_colors')+'\n'+callback('prv_display_apply')+'\nint main(void){')
    source=source.replace(' puts("native display:',checks+'\n puts("native display:',1)
    (out/'test.c').write_text(source)
    subprocess.run([os.environ.get('CC','cc'),'-std=c99','-Wall','-Wextra','-Werror','-I'+str(out),'-I'+str(out/'include'),'-I'+str(ROOT/'src/c'),'-I'+str(ROOT/'node_modules'),'-I'+str(ROOT/'node_modules/pebble-watchface-core/include'),'-I'+str(ROOT/'node_modules/pebble-activities/include'),str(out/'test.c'),'-o',str(out/'test')],check=True)
    subprocess.run([str(out/'test')],check=True)
