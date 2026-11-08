#pragma once

#include <stdio.h>
#include "music_layout.h"
#include <pebble-activities/pebble-activity-view.h>

/* The host has two positions, not two different source contracts. */
enum { ACTIVITY_SECONDARY_TOP=106, ACTIVITY_SECONDARY_LEFT=42,
       ACTIVITY_SECONDARY_WIDTH=120, ACTIVITY_SECONDARY_ICON=24, ACTIVITY_SECONDARY_HEIGHT=26,
       ACTIVITY_CONTENT_TOP=133, ACTIVITY_EXPANDED_TOP=116, ACTIVITY_CONTENT_BOTTOM=208 };

static inline const char *activity_identity(const PavCard *card) {
  return pav_caption(card);
}
/* Playback state belongs beside the media context, without replacing the song
 * title or changing the existing cover/artist footer composition. Put it first
 * so a long artist or an absent/expired artist cannot hide the paused state. */
static inline const char *activity_media_footer(const PavCard *card,uint32_t now,
    bool connected,const char *paused,char *buffer,size_t capacity) {
  const char *artist=pav_datum_visible(card,&card->support,now,connected)?
      pav_text(card,&card->support):"";
  if(card->source_state!=PAV_PAUSED)return artist;
  watch_layout_copy_utf8(paused,buffer,capacity);
  const size_t length=strlen(buffer);
  if(artist[0]&&length+4<capacity) {
    watch_layout_copy_utf8(" · ",buffer+length,capacity-length);
    watch_layout_copy_utf8(artist,buffer+strlen(buffer),capacity-strlen(buffer));
  }
  return buffer;
}
static inline const char *activity_role(const PavCard *card,const PavDatum *datum) {
  const char *label=pav_label(card,datum);
  return strcmp(label,activity_identity(card))?label:"";
}
static inline bool activity_is_result(const PavCard *card) {
  return card->source_state==PAV_COMPLETED||card->source_state==PAV_CANCELLED;
}
/* A formatted score/pace is one value, not a decimal followed by a guessed
 * unit. Ambiguous or exotic suffixes use the complete body-font fallback. */
static inline bool activity_simple_unit(const char *unit) {
  const unsigned char first=(unsigned char)unit[0];
  if(first&&!((first>='a'&&first<='z')||(first>='A'&&first<='Z')||
      first=='%'||first=='/'||(first==0xc2&&(unsigned char)unit[1]==0xb0)))return false;
  for(const unsigned char *at=(const unsigned char *)unit;*at;++at)
    if((*at>='0'&&*at<='9')||*at==':'||*at=='+'||*at=='-')return false;
  return true;
}
static inline const PavDatum *activity_compact_datum(const PavCard *card) {
  return card->compact_item?&card->support:&card->main;
}
static inline bool activity_datum_changes(const PavCard *card,const PavDatum *datum,
                                           uint32_t now,bool connected) {
  if(!pav_datum_visible(card,datum,now,connected))return false;
  const PavClockValue clock=pav_clock_value(card,datum,now,connected);
  return clock.running&&((datum->flags&PAV_ELAPSED)||clock.seconds);
}
static inline bool activity_view_needs_tick(const PavCard *card,bool support_visible,
    const PavCard *alternate,bool summary_visible,uint32_t now,bool connected) {
  return activity_datum_changes(card,&card->main,now,connected)||
      (support_visible&&activity_datum_changes(card,&card->support,now,connected))||
      (summary_visible&&alternate&&activity_datum_changes(alternate,
          activity_compact_datum(alternate),now,connected));
}

typedef struct {
  MusicLines main,support,footer;
  int main_baseline[MUSIC_MAX_LINES],support_baseline[MUSIC_MAX_LINES];
  int footer_baseline[MUSIC_MAX_LINES];
  int secondary_height,top,point,left,width,role_baseline,footer_left,footer_width,footer_point,support_point;
  int icon_top,icon_size,meter_top,secondary_baseline;
  bool vector,scalar,secondary,meter,media;
} ActivityLayout;

/* Center visible glyph ink, not the point-size box, next to a fixed icon. */
static inline int activity_centered_baseline(int top,int height,MusicTextMetrics ink) {
  return top+(height+ink.ascent-ink.descent)/2;
}

/* Optional identity may ellipsize; it must not make a required state/value lose
 * its final unit just to reserve the ellipsis. Only the last explicit line grows. */
static inline void activity_footer_optional(char *caption,size_t capacity,const char *value,
    int point,int width,MusicMeasure measure,void *context) {
  if(!value||!value[0])return;
  const char *line=strrchr(caption,'\n');line=line?line+1:caption;
  if(line[0]&&measure(context,line,point).width+measure(context," · …",point).width>width)return;
  const size_t length=strlen(caption);
  if(!length){watch_layout_copy_utf8(value,caption,capacity);return;}
  if(length+4>=capacity)return;
  watch_layout_copy_utf8(" · ",caption+length,capacity-length);
  watch_layout_copy_utf8(value,caption+strlen(caption),capacity-strlen(caption));
}

/* All wrapping starts at byte zero. The last available line ellipsizes; no
 * continuation state or timer exists. A bounded plan is reused by draw/ticks. */
static inline void activity_layout_build_type(const char *main,const char *role,
    const char *support,const char *footer,bool media,bool vector,bool scalar,
    bool secondary,bool image,bool meter,bool footer_symbol,int footer_point,int support_point,int top,MusicMeasure measure,
    MusicMeasure scalar_measure,void *context,ActivityLayout *out,
    int body_point,int secondary_point,int secondary_height,int bottom,bool required_footer) {
  bool dense=false,omit_footer=false;
layout_again:
  memset(out,0,sizeof(*out));out->top=top;out->media=media;out->secondary=secondary;
  out->vector=vector;out->scalar=scalar;out->left=24;out->width=152;
  out->secondary_height=secondary_height;
  int content_top=top+(secondary?secondary_height+6:dense?1:4);out->support_point=support_point;
  out->secondary_baseline=top+4+measure(context,"Ag",secondary_point).ascent;
  if(omit_footer){footer="";footer_symbol=false;}
  out->icon_size=footer_symbol&&(image||!media)?28:0;
  out->footer_left=out->icon_size?60:24;
  out->footer_width=176-out->footer_left;out->footer_point=footer_point;
  const int footer_lines=strchr(footer,'\n')?2:1;
  music_wrap(footer,out->footer_point,out->footer_width,footer_lines,false,measure,context,&out->footer);
  const int footer_height=music_line_offsets(&out->footer,out->footer_point,
      measure,context,out->footer_baseline);
  const int footer_box=out->footer.count?(out->footer.count>1?footer_height+6:footer_height+4>28?footer_height+4:28):out->icon_size;
  out->icon_top=bottom-footer_box+(footer_box-out->icon_size)/2;
  for(int i=0;i<out->footer.count;++i)
    out->footer_baseline[i]+=bottom-footer_box+(footer_box-footer_height)/2;
  const int footer_top=bottom-footer_box;
  const int limit=footer_top-(footer_top<bottom?(dense?3:8):0);
  if(content_top>=limit){if(secondary){secondary=false;goto layout_again;}if(!dense){dense=true;goto layout_again;}
    if(!required_footer&&!omit_footer){omit_footer=true;goto layout_again;}out->secondary=false;return;}
  if(media) {
    out->point=body_point;
    for(int count=secondary&&top>=ACTIVITY_CONTENT_TOP?2:3;count>=1;--count) {
      music_wrap(main,body_point,152,count,false,measure,context,&out->main);
      const int height=music_line_offsets(&out->main,body_point,measure,context,out->main_baseline);
      if(content_top+height<=limit) {
        for(int i=0;i<out->main.count;++i)out->main_baseline[i]+=limit-height;
        return;
      }
    }
    if(secondary){secondary=false;goto layout_again;}if(!dense){dense=true;goto layout_again;}
    if(!required_footer&&!omit_footer){omit_footer=true;goto layout_again;}out->main.count=0;out->secondary=false;return;
  }
  const int role_height=role[0]?measure(context,role,secondary_point).ascent+
      measure(context,role,secondary_point).descent+4:0;
  if(role[0]){out->role_baseline=content_top+measure(context,role,secondary_point).ascent;content_top+=role_height;}
  int support_height=0;
  if(support[0]) {
    music_wrap(support,support_point,152,secondary||vector||scalar?1:2,false,measure,context,&out->support);
    support_height=music_line_offsets(&out->support,support_point,measure,context,out->support_baseline)+4;
  }
  int main_limit=limit-support_height-(meter?8:0);
  if(secondary&&out->support.count&&main_limit-content_top<(vector||scalar?26:
      measure(context,main,body_point).ascent+measure(context,main,body_point).descent)) {
    secondary=false;goto layout_again;
  }
  const MusicTextMetrics main_ink=measure(context,main,body_point);
  const int minimum_main=vector||scalar?18:main_ink.ascent+main_ink.descent;
  if(main_limit-content_top<minimum_main&&out->support.count&&!dense) {dense=true;goto layout_again;}
  if(main_limit-content_top<minimum_main&&out->support.count>1) {
    music_wrap(support,support_point,152,1,false,measure,context,&out->support);
    support_height=music_line_offsets(&out->support,support_point,measure,context,out->support_baseline)+4;
    main_limit=limit-support_height-(meter?8:0);
  }
  if(main_limit-content_top<minimum_main){out->support.count=0;support_height=0;main_limit=limit-(meter?8:0);}
  int main_bottom=content_top;
  if(vector||scalar) {
    const int points[]={64,56,48,40,32,26,20,16,14};
    MusicTextMetrics value={0};
    unsigned first=secondary&&top>=ACTIVITY_CONTENT_TOP?1:0;
    for(unsigned pass=0;pass<2;++pass) {
      for(unsigned i=first;i<sizeof(points)/sizeof(points[0]);++i) {
        out->point=points[i];value=scalar_measure(context,main,out->point);
        if(value.width>0&&value.width<=152&&value.ascent+value.descent<=main_limit-content_top)break;
      }
      if(value.width>0&&value.width<=152&&value.ascent+value.descent<=main_limit-content_top)break;
      if(out->support.count){out->support.count=0;main_limit=limit-(meter?8:0);}
      else {if(secondary){secondary=false;goto layout_again;}out->main.count=0;out->secondary=false;return;}
    }
    if(!value.width||value.width>152||value.ascent+value.descent>main_limit-content_top) {
      if(secondary){secondary=false;goto layout_again;}out->main.count=0;out->secondary=false;return;
    }
    if(secondary&&out->point<32&&scalar_measure(context,main,32).width<=152) {
      secondary=false;goto layout_again;
    }
    watch_layout_copy_utf8(main,out->main.text[0],MUSIC_TEXT_BYTES);
    out->main.count=1;out->main.complete=true;
    out->main_baseline[0]=content_top+value.ascent;
    if(vector)out->left=24+(152-value.width)/2;
    main_bottom=out->main_baseline[0]+value.descent;
  } else {
    out->point=body_point;
    for(int count=secondary&&top>=ACTIVITY_CONTENT_TOP?2:3;count>=1;--count) {
      music_wrap(main,body_point,152,count,false,measure,context,&out->main);
      const int height=music_line_offsets(&out->main,body_point,measure,context,out->main_baseline);
      if(content_top+height<=main_limit) {
        for(int i=0;i<out->main.count;++i)out->main_baseline[i]+=content_top;
        main_bottom=content_top+height;break;
      }
      out->main.count=0;
    }
    if(!out->main.count){if(secondary){secondary=false;goto layout_again;}
      if(!required_footer&&!omit_footer){omit_footer=true;goto layout_again;}out->secondary=false;return;}
  }
  if(out->support.count) {
    for(int i=0;i<out->support.count;++i)out->support_baseline[i]+=main_bottom+4;
    const int last=out->support.count-1;
    main_bottom=out->support_baseline[last]+measure(context,out->support.text[last],support_point).descent;
  }
  out->meter=meter&&main_bottom+8<=limit;
  /* Pack the whole primary block above its footer; the optional secondary
   * retains its own fixed top position. Font and wrapping capacity stay fixed. */
  const int shift=limit-main_bottom-(out->meter?8:0);
  for(int i=0;i<out->main.count;++i)out->main_baseline[i]+=shift;
  for(int i=0;i<out->support.count;++i)out->support_baseline[i]+=shift;
  if(out->role_baseline)out->role_baseline+=shift;
  out->meter_top=main_bottom+4+shift;
}

/* Preserve the established profile for portable legacy callers. */
static inline void activity_layout_build(const char *main,const char *role,
    const char *support,const char *footer,bool media,bool vector,bool scalar,
    bool secondary,bool image,bool meter,bool footer_symbol,int footer_point,int support_point,int top,MusicMeasure measure,
    MusicMeasure scalar_measure,void *context,ActivityLayout *out) {
  activity_layout_build_type(main,role,support,footer,media,vector,scalar,secondary,image,meter,
      footer_symbol,footer_point,support_point,top,measure,scalar_measure,context,out,
      XOCE_UI_BODY_POINT,XOCE_UI_SECONDARY_POINT,ACTIVITY_SECONDARY_HEIGHT,ACTIVITY_CONTENT_BOTTOM,false);
}
