#include <assert.h>
#include <stdio.h>
#include <pebble-activities/pebble-activity-view.h>
#include "../src/c/activity_presentation.h"
#include "../src/c/activity_navigation.h"

int main(void) {
  /* Portable ABI budgets for the bounded protocol and reusable layout. These
   * do not model NativeState or claim runtime heap/stack measurements. */
  assert(PAV_MAX_CARDS==2);
  assert(sizeof(PavState)<4096);
  assert(sizeof(ActivityLayout)<2400);
  assert(sizeof(ActivityNavigation)<64);
  printf("bounded portable state: view %lu, layout %lu, navigation %lu bytes (host ABI)\n",
      (unsigned long)sizeof(PavState),(unsigned long)sizeof(ActivityLayout),
      (unsigned long)sizeof(ActivityNavigation));
  return 0;
}
