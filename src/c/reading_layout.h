#pragma once

#include <stdbool.h>

enum { READING_COLUMN_WIDTH=100, READING_CONTENT_WIDTH=72,
       READING_ICON_GAP=4, READING_UNIT_GAP=2 };

typedef struct {
  int point, number_width, width;
  bool icon, unit_below, overflow;
} ReadingNumberLayout;

/* Numeric outlines scale exactly with point size. Units stay at Roboto22.
 * Prefer the large role, then yield optional decoration before moving a unit
 * onto a free second line. A necessary caption always keeps that line. */
static inline ReadingNumberLayout reading_number_layout(float width_at_100,
    int preferred, int unit_width, int icon_size, bool icon, bool required_icon,
    bool caption) {
  ReadingNumberLayout out={0,0,0,icon,false,true};
  if(width_at_100<=0||unit_width>READING_CONTENT_WIDTH)return out;
  if(preferred>46)preferred=46;
  if(preferred<24)preferred=24;
  preferred&=~1;
  const int usual_minimum=preferred>32?32:preferred>28?preferred:24;
  for(unsigned pass=0;pass<3;++pass) {
    if(pass==1) {
      if(!unit_width||caption)continue;
      out.unit_below=true;
    }
    if(pass==2)out.unit_below=false;
    const int minimum=pass?22:usual_minimum;
    for(int point=preferred;point>=minimum;point-=2) {
      const int number=(int)(width_at_100*point/100+0.999f);
      const int unit=!out.unit_below&&unit_width?unit_width+READING_UNIT_GAP:0;
      int width=number+unit+(out.icon?icon_size+READING_ICON_GAP:0);
      if(width>READING_CONTENT_WIDTH&&out.icon&&!required_icon) {
        out.icon=false;width=number+unit;
      }
      if(width<=READING_CONTENT_WIDTH) {
        out.point=point;out.number_width=number;out.width=width;
        out.overflow=false;return out;
      }
    }
  }
  out.unit_below=false;
  return out;
}
