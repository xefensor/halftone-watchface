#pragma once

#include "music_layout.h"

typedef struct {int date,body,secondary,footer,unit_delta;} HalftoneType;
static inline HalftoneType halftone_type(unsigned size) {
  const HalftoneType profiles[]={{22,22,20,22,-2},{24,24,22,24,0},{26,28,26,26,4}};
  return profiles[size>2?2:size];
}
static inline int halftone_unit_point(HalftoneType type,int number_point) {
  const int point=(number_point>32?20:14)+type.unit_delta;
  return point>number_point?number_point:point;
}
typedef struct {
  WatchPose pose;
  int date_variant,reading_bottom;
  bool date_visible;
} HalftoneView;
static inline float halftone_between(float value,float low,float high) {
  return value<low?low:value>high?high:value;
}
/* Keep Fira sizes and x positions. Dates/clock/readings can shift vertically
 * inside the real bezel and unobstructed bounds. Prefer the whole date, then
 * the numeric date; its optional Big-text bonus yields before essential text. */
static inline HalftoneView halftone_supporting_view(WatchPose pose,int height,int inset,
    int shadow,int reserve,MusicTextMetrics clock,const MusicTextMetrics dates[4],
    int first_height,int second_ascent,int second_descent,bool second_line) {
  const float half=first_height/2.0f;
  int variant=0,gap=3;
  float label=pose.label_y;
  const int available=height-2*inset-reserve;
  bool fits=false;
  for(variant=0;variant<5&&!fits;++variant) {
    const int date_height=variant<4?dates[variant].ascent+dates[variant].descent+shadow:0;
    for(gap=3;gap>=1;--gap) {
      label=second_line?half+shadow+gap+second_ascent:pose.label_y;
      if(label<pose.label_y)label=pose.label_y;
      const float readings=second_line?half+label+second_descent+shadow:first_height+shadow;
      const float needed=date_height+(variant<4?gap:0)+clock.ascent+clock.descent+shadow+gap+readings;
      if(needed<=available){fits=true;break;}
    }
  }
  --variant;
  if(!fits) {
    variant=4;gap=1;
    /* Essential clock/readings stay inside Peek and the bezel. If the full
     * primary reservation cannot fit, its optional content yields in layout. */
    const float readings=second_line?half+label+second_descent+shadow:first_height+shadow;
    reserve=(int)(height-2*inset-clock.ascent-clock.descent-shadow-gap-readings);
    if(reserve<0)reserve=0;
  }
  const bool date_visible=variant<4;
  const MusicTextMetrics date=date_visible?dates[variant]:(MusicTextMetrics){0};
  const float max_row=height-inset-reserve-(second_line?label+second_descent+shadow:half+shadow);
  const float max_clock=max_row-half-gap-clock.descent-shadow;
  const float min_date=inset+date.ascent;
  if(date_visible)pose.date_y=halftone_between(pose.date_y,min_date,
      max_clock-clock.ascent-gap-date.descent-shadow);
  const float min_clock=date_visible?pose.date_y+date.descent+shadow+gap+clock.ascent:inset+clock.ascent;
  pose.clock_y=halftone_between(pose.clock_y,min_clock,max_clock);
  pose.row_y=halftone_between(pose.row_y,pose.clock_y+clock.descent+shadow+gap+half,max_row);
  pose.label_y=label;
  return (HalftoneView){pose,variant,(int)(pose.row_y+(second_line?label+second_descent+shadow:half+shadow)+0.999f),date_visible};
}
