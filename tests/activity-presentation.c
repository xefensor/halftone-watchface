#include <assert.h>
#include "../src/c/activity_presentation.h"
#include "../src/c/generated_body_metrics.h"
#include "../src/c/generated_clock_glyphs.h"

static MusicTextMetrics measure(void *context,const char *text,int point) {
  (void)context;int width=0;
  if(point>32)point=32;
  const unsigned char *cursor=(const unsigned char *)text;
  while(*cursor){const uint32_t code=body_metric_next_codepoint(&cursor);width+=point/(code==' '?4:2);}
  return (MusicTextMetrics){width,body_text_ascent(text,point),body_text_descent(text,point)};
}
static MusicTextMetrics clock_measure(void *context,const char *text,int point) {
  (void)context;int width=0,ascent=0,descent=0;
  for(const unsigned char *at=(const unsigned char *)text;*at;++at) {
    const ClockGlyph *glyph=NULL;
    for(unsigned i=0;i<CLOCK_GLYPH_COUNT;++i)if(clock_glyphs[i].code==*at)glyph=&clock_glyphs[i];
    assert(glyph);width+=glyph->advance;
    if(glyph->y_max>ascent)ascent=glyph->y_max;
    if(-glyph->y_min>descent)descent=-glyph->y_min;
  }
  return (MusicTextMetrics){(width*point+500)/1000,(ascent*point+999)/1000,(descent*point+999)/1000};
}

static void check(ActivityLayout *p,const char *main,bool vector) {
  assert(p->main.count>0&&p->main.count<=3);
  const MusicTextMetrics first=(vector?clock_measure:measure)(NULL,p->main.text[0],p->point);
  assert(p->left>=24&&p->left+first.width<=176);
  assert(p->main_baseline[0]-first.ascent>=p->top+(p->secondary?32:4));
  for(int i=0;i<p->main.count;++i) {
    const MusicTextMetrics ink=(vector?clock_measure:measure)(NULL,p->main.text[i],p->point);
    assert(p->main_baseline[i]+ink.descent<=MUSIC_BOTTOM);
  }
  if(vector)assert(p->main.complete&&!strcmp(p->main.text[0],main));
  if(p->footer.count) {
    const int last=p->footer.count-1;
    assert(p->footer_left>=24&&p->footer_left+p->footer_width<=176);
    assert(p->footer_baseline[last]+measure(NULL,p->footer.text[last],p->footer_point).descent<=208);
  }
}
int main(void) {
  ActivityLayout p;
  const char *clocks[]={"00:00","02:31","59:59","24:00:00","1193046:28:15"};
  for(unsigned top=ACTIVITY_EXPANDED_TOP;top<=ACTIVITY_CONTENT_TOP;++top)
    for(unsigned secondary=0;secondary<2;++secondary)
      for(unsigned i=0;i<sizeof(clocks)/sizeof(clocks[0]);++i) {
        activity_layout_build(clocks[i],"","","Tea",false,true,false,secondary,false,false,true,
          24,22,top,measure,clock_measure,NULL,&p);
        check(&p,clocks[i],true);
      }
  const char *titles[]={"Track","Flower In A Hurricane [from the soundtrack]","Dlouhý název se třemi řádky a diakritikou"};
  for(unsigned i=0;i<3;++i)for(unsigned secondary=0;secondary<2;++secondary) {
    activity_layout_build(titles[i],"","","Justice",true,false,false,secondary,true,false,true,
        24,22,ACTIVITY_CONTENT_TOP,measure,clock_measure,NULL,&p);
    check(&p,titles[i],false);
    assert(p.point==24&&p.icon_size==28&&p.footer_left==60);
    assert(!strncmp(p.main.text[0],titles[i],strlen(p.main.text[0])-3));
  }
  activity_layout_build("Xef","","Long optional message body that needs ellipsis","Signal",false,false,false,false,true,false,true,
      24,22,ACTIVITY_EXPANDED_TOP,measure,clock_measure,NULL,&p);
  check(&p,"Xef",false);assert(p.support.count==1);
  char protected[128]="5:12 /km";
  const int width=measure(NULL,protected,24).width;
  activity_footer_optional(protected,sizeof(protected),"Long optional identity",24,width,measure,NULL);
  assert(!strcmp(protected,"5:12 /km"));
  assert(activity_simple_unit("km")&&!activity_simple_unit(":12 /km"));
  return 0;
}
