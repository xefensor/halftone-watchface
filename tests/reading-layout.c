#include <assert.h>
#include "../src/c/reading_layout.h"

static void bounded(ReadingNumberLayout p) {
  assert(!p.overflow&&p.point>=22&&p.width<=READING_CONTENT_WIDTH);
}

int main(void) {
  // Representative Fira advances at100pt and exact Roboto22 unit widths.
  ReadingNumberLayout p=reading_number_layout(60,40,22,20,true,false,false);
  bounded(p);assert(p.icon&&!p.unit_below&&p.point==40);
  p=reading_number_layout(190,40,22,20,true,false,true);
  bounded(p);assert(!p.icon&&!p.unit_below); // Unit+qualifier precede decoration.
  p=reading_number_layout(190,40,14,20,true,true,false);
  bounded(p);assert(p.icon); // A bare percent keeps its meaningful icon.
  p=reading_number_layout(180,40,45,20,true,false,false);
  bounded(p);assert(!p.icon&&p.unit_below&&p.point==40);
  p=reading_number_layout(180,28,45,18,true,false,true);
  assert(p.overflow&&!p.unit_below); // Caption owns the second line.
  p=reading_number_layout(260,40,36,20,false,false,true);
  assert(p.overflow&&!p.unit_below); // Full currency value cannot fit at22.
  p=reading_number_layout(900,28,0,0,false,false,false);
  assert(p.overflow); // Never turn an arbitrary long number into an ellipsis.
  p=reading_number_layout(60,40,100,20,true,false,false);
  assert(p.overflow); // Units are never shrunk or silently truncated.
  for(int preferred=24;preferred<=40;++preferred)
    for(int advance=45;advance<=240;advance+=15)
      for(int unit=0;unit<=60;unit+=12)
        for(unsigned required=0;required<2;++required)
          for(unsigned caption=0;caption<2;++caption) {
            p=reading_number_layout(advance,preferred,unit,20,true,required,caption);
            if(p.overflow)continue;
            bounded(p);assert(!required||p.icon);assert(!caption||!p.unit_below);
            assert(p.width==p.number_width+(p.icon?24:0)+
                (!p.unit_below&&unit?unit+READING_UNIT_GAP:0));
          }
  return 0;
}
