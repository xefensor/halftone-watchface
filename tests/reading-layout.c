#include <assert.h>
#include "../src/c/reading_layout.h"

static void bounded(ReadingNumberLayout p) {
  assert(!p.overflow&&p.point>=22&&p.width<=READING_CONTENT_WIDTH);
}

static void paired(void) {
  ReadingNumberInput input[2]={{60,22,18,true,false,false},{120,18,18,true,true,false}};
  ReadingNumberLayout out[2],reversed[2];
  reading_number_pair(input,40,out);
  bounded(out[0]);bounded(out[1]);assert(out[0].point==out[1].point);
  // Width boundary: exactly full is legal, the next pixel must reflow.
  input[0]=(ReadingNumberInput){(READING_CONTENT_WIDTH-20)*2.5f,18,0,false,false,true};
  input[1]=(ReadingNumberInput){60,0,0,false,false,false};
  reading_number_pair(input,40,out);assert(out[0].point==40&&out[0].width==READING_CONTENT_WIDTH);
  input[0].width_at_100+=2.5f;
  reading_number_pair(input,40,out);assert(out[0].point<40&&out[0].point==out[1].point);
  for(int preferred=24;preferred<=46;preferred+=2)
    for(int width=50;width<=450;width+=17)
      for(unsigned caption=0;caption<2;++caption){
        input[0]=(ReadingNumberInput){60,22,18,true,false,caption};
        input[1]=(ReadingNumberInput){width,18,18,true,true,caption};
        reading_number_pair(input,preferred,out);
        assert(out[0].point==out[1].point);
        for(unsigned i=0;i<2;++i)if(!out[i].overflow){
          bounded(out[i]);assert(!caption||!out[i].unit_below);
          if(i)assert(out[i].icon);
        }
        ReadingNumberInput swap[2]={input[1],input[0]};reading_number_pair(swap,preferred,reversed);
        for(unsigned i=0;i<2;++i){assert(out[i].point==reversed[1-i].point);assert(out[i].width==reversed[1-i].width);}
        // No larger point in the existing range can fit both complete slots.
        if(out[0].point<preferred&&out[0].point<46){
          ReadingNumberLayout a=reading_number_at(input[0],out[0].point+2),b=reading_number_at(input[1],out[1].point+2);
          assert(a.overflow||b.overflow);
        }
      }
  input[0]=(ReadingNumberInput){60,22,18,true,false,false};
  input[1]=(ReadingNumberInput){0};reading_number_pair(input,40,out);assert(out[0].point==40);
  input[1]=(ReadingNumberInput){900,0,0,false,false,true};reading_number_pair(input,40,out);
  assert(out[1].overflow&&out[0].point==out[1].point); // Full overflow, never partial digits.
}

int main(void) {
  paired();
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
