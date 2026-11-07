#include <assert.h>
#include "../src/c/watch_layout.h"
#include "../src/c/reading_presentation.h"

int main(void) {
  assert(watch_ease_in_out(0)==0&&watch_ease_in_out(1)==1);
  assert(watch_ease_in_out(0.25f)==0.125f&&watch_ease_in_out(0.75f)==0.875f);
  assert(watch_incoming(0.5f)==0.75f&&watch_incoming(1)==1);
  float previous_layout=0,previous_incoming=0;
  for(unsigned elapsed=0;elapsed<=300;++elapsed) {
    const float layout=watch_ease_in_out(elapsed/250.0f),incoming=watch_incoming(elapsed/231.0f);
    assert(layout>=previous_layout&&layout<=1&&incoming>=previous_incoming&&incoming<=1);
    previous_layout=layout;previous_incoming=incoming;
  }
  assert(watch_clock_format(-1,-1)==WATCH_CLOCK_FOLLOW);
  assert(watch_clock_format(-1,0)==WATCH_CLOCK_24);
  assert(watch_clock_format(-1,1)==WATCH_CLOCK_12);
  assert(watch_clock_format(WATCH_CLOCK_FOLLOW,1)==WATCH_CLOCK_FOLLOW);
  assert(watch_clock_format(99,0)==WATCH_CLOCK_24);
  assert(watch_clock_format(1,-1)==WATCH_CLOCK_FOLLOW);
  assert(watch_clock_format(13,-1)==WATCH_CLOCK_FOLLOW);
  assert(watch_clock_format(WATCH_CLOCK_QUERY,0)==WATCH_CLOCK_24);
  assert(watch_clock_format(WATCH_CLOCK_QUERY,1)==WATCH_CLOCK_12);
  assert(watch_clock_uses_12(WATCH_CLOCK_FOLLOW,false));
  assert(!watch_clock_uses_12(WATCH_CLOCK_FOLLOW,true));
  assert(watch_clock_uses_12(WATCH_CLOCK_12,true));
  assert(!watch_clock_uses_12(WATCH_CLOCK_24,false));
  {
    const WatchPose idle=watch_pose_idle(), active=watch_pose_context(false);
    const WatchPose notice=watch_pose_context(true), peek=watch_pose_peek();
    const WatchPose summary=watch_pose_summary();
    assert(summary.clock_size==peek.clock_size&&summary.row_y==peek.row_y&&summary.peek==0);
    assert(watch_context_visibility(summary)==1&&watch_context_visibility(peek)==0);
    assert(watch_context_visibility(active)==1&&watch_context_visibility(notice)==1);
    assert(watch_context_visibility(watch_pose_at_height(summary,171))==0);
    /* Readable value/label bands fit before the independent secondary row. */
    assert(active.row_y==99&&active.row_y+active.label_y==124);
    assert(idle.row_y==158&&idle.row_y+idle.label_y==189);
    assert(peek.row_y==127&&peek.row_y+peek.label_y==152);
    assert(active.number_size==28&&idle.number_size==38);
    assert(idle.label_y>=20);
    /* Idle weekday accents fit; compact numeric date shares a clock row. */
    assert(idle.date_y-25>=4&&active.date_y-19>=10);
    assert(active.label_y>=25&&peek.label_y>=25);
    assert(idle.clock_x==100 && idle.clock_y==111 && idle.context==0);
    assert(active.clock_x==100 && active.context==1 && active.music==1);
    assert(notice.notice==1 && notice.row_y==active.row_y);
    for (int height=160;height<=228;++height) {
      WatchPose p=watch_pose_at_height(active,height);
      assert(p.clock_size>=40 && p.clock_size<=76);
      assert(p.row_y<height);
      assert(p.row_y+9<height);
      assert(p.date_y<p.clock_y && p.clock_y<p.row_y);
      if(height<=171)assert(!memcmp(&p,&peek,sizeof(p)));
      else if(height<228)assert(p.peek>0&&p.peek<1&&p.context>0&&p.context<1);
      else assert(!memcmp(&p,&active,sizeof(p)));
    }
    const WatchPose from_idle=watch_pose_at_height(idle,166);
    const WatchPose from_active=watch_pose_at_height(active,166);
    assert(!memcmp(&from_idle,&peek,sizeof(peek))&&!memcmp(&from_active,&peek,sizeof(peek)));
  }
  for(unsigned large=0;large<2;++large)for(unsigned active=0;active<2;++active) {
    const WatchPose p=halftone_pose(active,large);
    assert(p.clock_x==100&&p.clock_y<p.row_y);
    const WatchPose peek=halftone_pose_at_height(p,171,large);
    assert(peek.row_y+peek.label_y<157&&peek.peek==1);
    if(large) {
      assert(p.number_size>halftone_pose(active,false).number_size);
      // Big text must retain the date above the enlarged Fira clock.
      assert(p.clock_y-p.clock_size*0.72f>p.date_y+3);
    }
  }
  char abbr[16];
  watch_layout_abbreviate("ČTVRTEK",abbr,sizeof(abbr),3);
  assert(strcmp(abbr,"ČTV")==0);
  watch_layout_abbreviate("ÚTERÝ",abbr,4,3);
  assert(strcmp(abbr,"ÚT")==0);
  char bounded[5];
  watch_layout_copy_utf8("ČTVRTEK",bounded,sizeof(bounded));
  assert(strcmp(bounded,"ČTV")==0);
  char hours[3],minutes[3];
  assert(watch_layout_split_time("9:05",hours,minutes));
  assert(strcmp(hours,"9")==0 && strcmp(minutes,"05")==0);
  assert(!watch_layout_split_time("24:05",hours,minutes));
  ReadingParts negative;
  assert(reading_parts("−10°C",&negative));
  char native[READING_PART_BYTES];
  reading_native_number(negative.number,native,sizeof(native));
  assert(strcmp(native,"-10")==0 && strcmp(negative.number,"−10")==0);
  assert(strcmp(negative.unit,"°C")==0);
  char tiny[2] = {'x','y'};
  reading_native_number(negative.number,tiny,1);
  assert(tiny[0]=='\0' && tiny[1]=='y');
  return 0;
}
