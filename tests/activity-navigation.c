#include <assert.h>
#include "../src/c/activity_navigation.h"
int main(void){
  ActivityNavigation n={0};uint8_t bytes[24];
  assert(!activity_navigation_update(&n,1,1,0,1,0,200,100));
  assert(activity_navigation_update(&n,7,4,0,1,0,200,100));assert(n.sequence==1&&n.pending);
  activity_navigation_encode(&n,bytes);assert(bytes[0]==1&&bytes[1]==0&&bytes[2]==1&&bytes[3]==0);
  assert(bytes[4]==7&&bytes[8]==4&&bytes[12]==1&&bytes[16]==100&&bytes[20]==200);
  assert(!activity_navigation_update(&n,7,4,0,1,0,200,129));
  assert(activity_navigation_update(&n,7,4,0,1,0,200,130));assert(n.sequence==2);
  assert(activity_navigation_update(&n,7,4,1,255,0,200,131));assert(n.sequence==3);
  assert(activity_navigation_update(&n,7,5,255,255,0,0,132));assert(n.primary==255&&n.secondary==255);
  n.sequence=UINT32_MAX;assert(!activity_navigation_update(&n,7,6,0,255,0,200,133));
  return 0;
}
