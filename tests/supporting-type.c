#include <assert.h>
#include <stdio.h>
#include "../src/c/watch_layout.h"
#include "../src/c/supporting_type.h"
#include "../src/c/generated_body_metrics.h"
static MusicTextMetrics ink(const char *text,int point) {
  return (MusicTextMetrics){0,body_text_ascent(text,point),body_text_descent(text,point)};
}
int main(void) {
  unsigned checks=0;
  for(unsigned cp=0;cp<=65535;++cp) {
    size_t expected=BODY_METRIC_WILDCARD_INDEX;
    for(unsigned i=0;i<BODY_METRIC_COUNT;++i)if(body_metric_codepoints[i]==cp){expected=i;break;}
    assert(body_metric_index(cp)==expected);
  }
  for(unsigned size=0;size<3;++size)for(int big=0;big<2;++big)
    for(int depth=0;depth<2;++depth)for(int shadow=0;shadow<2;++shadow)
      for(int height=171;height<=228;++height)for(int active=0;active<2;++active) {
        const HalftoneType type=halftone_type(size);
        assert((type.date==(int[]){22,24,26}[size]));
        assert((type.body==(int[]){22,24,28}[size]));
        assert((type.secondary==(int[]){20,22,26}[size]));
        WatchPose pose=halftone_pose_at_height(halftone_pose(active,big),height,big);
        const MusicTextMetrics clock={152,(int)(pose.clock_size*.53f+.999f),1};
        MusicTextMetrics dates[4];for(unsigned i=0;i<4;++i)
          dates[i]=ink(i>=2?"31.12.":"ČTV 31.12.",type.date+((i%2==0&&big)?2:0));
        const MusicTextMetrics first=ink("Žluťoučký",type.secondary);
        const int first_height=(int)(pose.number_size*.7f+.999f)>first.ascent+first.descent?
            (int)(pose.number_size*.7f+.999f):first.ascent+first.descent;
        const int inset=depth?25:18;
        const int reserve=(int)(40*watch_context_visibility(pose)*(1-pose.peek));
        HalftoneView view=halftone_supporting_view(pose,height,inset,shadow,reserve,
            clock,dates,first_height,first.ascent,first.descent,true);
        assert(view.pose.clock_x==pose.clock_x&&view.pose.clock_size==pose.clock_size);
        assert(view.pose.number_size==pose.number_size&&view.pose.date_x==pose.date_x);
        assert(view.pose.clock_y-clock.ascent>=inset-.01f);
        assert(view.pose.row_y-first_height/2.0f>=view.pose.clock_y+clock.descent+shadow+.99f);
        assert(view.pose.row_y+view.pose.label_y-first.ascent>=view.pose.row_y+first_height/2.0f+shadow+.99f);
        assert(view.reading_bottom<=height-inset-reserve+1);
        if(view.date_visible) {
          assert(view.pose.date_y-dates[view.date_variant].ascent>=inset-.01f);
          assert(view.pose.date_y+dates[view.date_variant].descent+shadow+.99f<=view.pose.clock_y-clock.ascent);
        }
        ++checks;
      }
  for(unsigned i=0;i<3;++i) {
    const HalftoneType type=halftone_type(i);
    assert(halftone_unit_point(type,14)<=14);
  }
  const MusicTextMetrics dates[4]={{0,24,4},{0,24,4},{0,24,4},{0,24,4}};
  const HalftoneView tight=halftone_supporting_view(halftone_pose(true,true),228,25,1,110,
      (MusicTextMetrics){152,35,1},dates,30,26,4,true);
  assert(!tight.date_visible&&tight.pose.clock_y>=60);
  assert(tight.reading_bottom<=203);
  printf("Halftone supporting layout: %u size/optics/height/pose checks passed\n",checks);
  return 0;
}
