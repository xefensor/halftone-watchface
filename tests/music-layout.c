#include <assert.h>
#include "../src/c/music_layout.h"
#include "../src/c/generated_body_metrics.h"

// Deterministic advances isolate wrapping from the SDK. Vertical bounds use
// the exact packaged native font metrics; emulator QA checks actual advances.
static MusicTextMetrics measure(void *context, const char *text, int point) {
  (void)context;
  int characters = 0;
  const unsigned char *cursor = (const unsigned char *)text;
  while (*cursor) { body_metric_next_codepoint(&cursor); ++characters; }
  return (MusicTextMetrics){characters*point/2,body_text_ascent(text,point),
                            body_text_descent(text,point)};
}

static void check(const MusicLayout *layout, bool art) {
  assert(layout->title.count >= 0 && layout->title.count <= 3);
  assert(layout->artist.count >= 0 && layout->artist.count <= 2);
  assert(layout->title_point == XOCE_UI_BODY_POINT);
  assert(layout->artist_point == XOCE_UI_SECONDARY_POINT);
  assert(layout->title_top >= MUSIC_TOP && layout->cover_top == 176);
  const bool metadata = art || layout->artist.count;
  assert(layout->metadata_top <= (metadata ? 176 : 216));
  assert(layout->title_bottom == layout->metadata_top-(metadata?8:0));
  if (layout->title.count) {
    const int last = layout->title.count-1;
    assert(layout->title_baseline[0]-body_text_ascent(layout->title.text[0],layout->title_point)
           == layout->title_top);
    assert(layout->title_baseline[last]+body_text_descent(layout->title.text[last],layout->title_point)
           == layout->title_bottom);
  }
  if (layout->artist.count) {
    const int last = layout->artist.count-1;
    assert(layout->artist_baseline[last]+body_text_descent(layout->artist.text[last],layout->artist_point)
           == MUSIC_BOTTOM);
  }
  for (int group = 0; group < 2; ++group) {
    const MusicLines *lines = group ? &layout->artist : &layout->title;
    const int point = group ? layout->artist_point : layout->title_point;
    const int *baseline = group ? layout->artist_baseline : layout->title_baseline;
    const int width = group && art ? 130 : 180;
    for (int i = 0; i < lines->count; ++i) {
      assert(measure(NULL,lines->text[i],point).width <= width);
      if (i) assert(baseline[i-1]+body_text_descent(lines->text[i-1],point)+2 <=
                    baseline[i]-body_text_ascent(lines->text[i],point));
    }
  }
}

int main(void) {
  MusicLines lines;
  music_wrap("Justice, Tame Impala",20,130,2,true,measure,NULL,&lines);
  assert(lines.complete && lines.count == 2);
  assert(strcmp(lines.text[0],"Justice,") == 0 && strcmp(lines.text[1],"Tame Impala") == 0);
  music_wrap("One Two Three",20,75,3,false,measure,NULL,&lines);
  assert(lines.complete && lines.count == 3 && strcmp(lines.text[2],"Three") == 0);
  music_wrap("ABCDEFGHIJKL",20,40,3,false,measure,NULL,&lines);
  assert(lines.complete && lines.count == 3);
  assert(strcmp(lines.text[0],"ABCD") == 0 && strcmp(lines.text[1],"EFGH") == 0 &&
         strcmp(lines.text[2],"IJKL") == 0);
  music_wrap("ČŘŽÁÉÍÓÚČŘŽÁ",20,40,3,false,measure,NULL,&lines);
  assert(lines.complete && strcmp(lines.text[0],"ČŘŽÁ") == 0 &&
         strcmp(lines.text[1],"ÉÍÓÚ") == 0 && strcmp(lines.text[2],"ČŘŽÁ") == 0);
  music_wrap("ČŘŽÁÉÍÓÚČŘŽÁ",20,20,2,false,measure,NULL,&lines);
  assert(!lines.complete && strcmp(lines.text[0],"ČŘ") == 0 && strcmp(lines.text[1],"Ž…") == 0);
  assert(lines.consumed==strlen("ČŘŽ"));
  music_wrap("ČŘŽÁÉÍÓÚČŘŽÁ"+lines.consumed,20,20,2,false,measure,NULL,&lines);
  assert(strcmp(lines.text[0],"ÁÉ")==0); // continuation never splits UTF-8
  const char *continued="Extended Recording";
  music_wrap(continued,24,180,1,false,measure,NULL,&lines);
  assert(strcmp(lines.text[0],"Extended Recor…")==0);
  music_title_boundary(continued,&lines);
  assert(strcmp(lines.text[0],"Extended…")==0);
  assert(strcmp(continued+lines.consumed,"Recording")==0);
  continued="Příběhy Čtvrteční";
  music_wrap(continued,24,180,1,false,measure,NULL,&lines);
  music_title_boundary(continued,&lines);
  assert(strcmp(lines.text[0],"Příběhy…")==0);
  assert(strcmp(continued+lines.consumed,"Čtvrteční")==0);
  music_wrap("First\nSecond\nThird",20,180,3,false,measure,NULL,&lines);
  assert(lines.complete && lines.count == 3 && strcmp(lines.text[1],"Second") == 0);
  music_wrap("  \t\n",20,180,3,false,measure,NULL,&lines);
  assert(lines.complete && lines.count == 0);

  const char *titles[] = {"Genesis","Flower In A Hurricane [from the soundtrack]",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUV",
    "Колесом / Kolesom","Καλημέρα κόσμε","Čtvrteční příběhy gypq",""};
  const char *artists[] = {"","Justice","Justice, Tame Impala","Příliš žluťoučký gypq, Tame Impala",
    "Verylongunbrokenartistnamewithoutanyspacesatall"};
  for (unsigned ti=0;ti<sizeof(titles)/sizeof(titles[0]);++ti)
    for (unsigned ai=0;ai<sizeof(artists)/sizeof(artists[0]);++ai)
      for (int art=0;art<=1;++art) {
          MusicLayout layout;
          music_layout_build(titles[ti],artists[ai],art,measure,NULL,&layout);
          check(&layout,art);
          if (!titles[ti][0]) assert(layout.title.count == 0);
          if (!artists[ai][0]) assert(layout.artist.count == 0);
        }
  MusicLayout short_song,long_song;
  music_layout_build("Genesis","Justice, Tame Impala",true,measure,NULL,&short_song);
  music_layout_build(titles[1],"Justice, Tame Impala",true,measure,NULL,&long_song);
  assert(short_song.title_point == 24 && short_song.title.count == 1);
  assert(long_song.title.count == 3 && long_song.title_top < short_song.title_top);
  assert(short_song.title_bottom == long_song.title_bottom && long_song.cover_top == short_song.cover_top);
  assert(short_song.artist_point == XOCE_UI_SECONDARY_POINT && short_song.artist.count == 2);
  assert(short_song.title_point==long_song.title_point);
  // The source remains one scalar string, even when a band name contains
  // punctuation that offers a useful line break.
  music_wrap("Earth, Wind & Fire",20,110,2,true,measure,NULL,&lines);
  assert(lines.complete&&strcmp(lines.text[0],"Earth,")==0&&strcmp(lines.text[1],"Wind & Fire")==0);
  char long_text[COMPLICATION_MAX_TEXT_BYTES+1];
  memset(long_text,'W',sizeof(long_text)-1);long_text[sizeof(long_text)-1]='\0';
  music_wrap(long_text,26,180,3,false,measure,NULL,&lines);
  assert(!lines.complete&&lines.count==3&&strstr(lines.text[2],"…"));
  size_t at=0;unsigned pages=0;
  do {
    music_wrap(long_text+at,24,180,3,false,measure,NULL,&lines);
    assert(lines.consumed>0);at+=lines.consumed;++pages;
  } while(!lines.complete);
  assert(at==strlen(long_text)&&pages>1&&pages<10);
  {
    MusicLayout banner;
    music_layout_build_at(long_text,"Justice, Tame Impala",true,116,measure,NULL,&banner);
    check(&banner,true);
    assert(banner.title_top>=116&&banner.cover_top==176&&banner.artist.count==2);
    const int last=banner.artist.count-1;
    assert(banner.artist_baseline[last]+body_text_descent(banner.artist.text[last],banner.artist_point)==216);
  }
  return 0;
}
