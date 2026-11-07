#include <assert.h>
#include <string.h>
#include "../src/c/activity_presentation.h"
static PavCard card(void) {
  PavCard r={0};strcpy(r.provider,"01234567-89ab-cdef-0123-456789abcdef");strcpy(r.id,"run");
  r.source_state=PAV_ACTIVE;r.source_revision=1;r.source_observed_at=100;r.source_valid_until=1000;
  r.main.type=PAV_CLOCK;r.main.flags=PAV_RUNNING|PAV_RETAIN;r.main.observed_at=100;r.main.valid_until=800;
  r.main.base_seconds=200;r.main.anchor_at=100;r.support=r.main;r.support.flags|=PAV_ELAPSED;r.support.base_seconds=50;return r;
}
int main(void){
  PavCard main=card(),other=card();strcpy(other.id,"other");
  assert(activity_view_needs_tick(&main,false,NULL,false,110,true));
  main.main.flags&=(uint8_t)~PAV_RUNNING;main.main.anchor_at=0;
  assert(!activity_view_needs_tick(&main,false,NULL,false,110,true));
  assert(activity_view_needs_tick(&main,true,NULL,false,110,true));
  assert(!activity_view_needs_tick(&main,true,NULL,false,800,true));
  other.main.type=PAV_TEXT;other.compact_item=1;
  assert(activity_compact_datum(&other)==&other.support);
  assert(!activity_view_needs_tick(&main,false,&other,false,110,true));
  assert(activity_view_needs_tick(&main,false,&other,true,110,true));
  other.flags=PAV_PRIVATE;assert(!activity_view_needs_tick(&main,false,&other,true,110,false));
  main=card();main.source_state=PAV_PAUSED;
  assert(activity_view_needs_tick(&main,true,NULL,false,110,true));
  main.source_state=PAV_COMPLETED;main.flags|=PAV_SHOW_TERMINAL;assert(activity_is_result(&main));
  main.main.type=PAV_VALUE;main.main.flags=PAV_RETAIN;main.support.type=PAV_NONE;
  main.flags=PAV_SOURCE_UNCONFIRMED;
  assert(!activity_view_needs_tick(&main,false,NULL,false,135,true));
  PavCard named={0};strcpy(named.strings,"Timer");strcpy(named.strings+6,"Rest");
  named.caption_length=5;named.main.label_length=5;assert(!activity_role(&named,&named.main)[0]);
  named.main.label_offset=6;named.main.label_length=4;assert(!strcmp(activity_role(&named,&named.main),"Rest"));
  PavCard media=card();media.presentation=PAV_PRESENTATION_MEDIA;media.main.type=PAV_TEXT;
  media.main.flags=PAV_RETAIN;media.main.base_seconds=media.main.anchor_at=0;
  strcpy(media.strings,"Track");strcpy(media.strings+6,"Artist");
  media.main.text_length=5;media.support.type=PAV_TEXT;media.support.text_offset=6;media.support.text_length=6;
  media.support.flags=PAV_RETAIN;media.support.base_seconds=media.support.anchor_at=0;
  char footer[100];
  assert(!strcmp(activity_media_footer(&media,110,true,"Paused",footer,sizeof(footer)),"Artist"));
  media.source_state=PAV_PAUSED;
  assert(!strcmp(activity_media_footer(&media,110,true,"Paused",footer,sizeof(footer)),"Paused · Artist"));
  assert(!strcmp(activity_media_footer(&media,110,true,"Pozastaveno",footer,sizeof(footer)),"Pozastaveno · Artist"));
  media.support.valid_until=111;
  assert(!strcmp(activity_media_footer(&media,112,true,"Paused",footer,sizeof(footer)),"Paused"));
  assert(!strcmp(media.strings+6,"Artist"));
  media.support.type=PAV_NONE;
  assert(!strcmp(activity_media_footer(&media,110,true,"Paused",footer,sizeof(footer)),"Paused"));
  media.source_state=PAV_ACTIVE;
  assert(!activity_media_footer(&media,110,true,"Paused",footer,sizeof(footer))[0]);
  return 0;
}
