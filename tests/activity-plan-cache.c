#include <assert.h>
#include "../src/c/activity_plan_cache.h"

int main(void) {
  char card=0,other=0,english=0,czech=0;
  ActivityPlanCache cache={&card,&english,100,108,true,true,true,false};
  assert(activity_plan_current(&cache,&card,&english,100,true));
  // A running second cannot retain the previous digits or compact fit.
  assert(!activity_plan_current(&cache,&card,&english,101,true));
  cache.ticking=false;
  assert(activity_plan_current(&cache,&card,&english,107,true));
  assert(!activity_plan_current(&cache,&card,&english,108,true));
  assert(!activity_plan_current(&cache,&card,&english,99,true));
  assert(!activity_plan_current(&cache,&other,&english,100,true));
  assert(!activity_plan_current(&cache,&card,&czech,100,true));
  assert(!activity_plan_current(&cache,&card,&english,100,false));
  cache.valid=false;
  assert(!activity_plan_current(&cache,&card,&english,100,true));
  return 0;
}
