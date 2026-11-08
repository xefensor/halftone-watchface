#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
enum { DISPLAY_FIELDS=17,DISPLAY_BYTES=76,DISPLAY_APPLIED=0,DISPLAY_SAVE_FAILED=1,DISPLAY_HELLO=1,
 DISPLAY_DAY_BG=0,DISPLAY_DAY_TEXT,DISPLAY_DAY_ACCENT,DISPLAY_NIGHT_BG,DISPLAY_NIGHT_TEXT,DISPLAY_NIGHT_ACCENT,
 DISPLAY_CLOCK,DISPLAY_STATUS,DISPLAY_ANIMATIONS,DISPLAY_VIBRATION,DISPLAY_TEXT_SIZE,DISPLAY_MODE,DISPLAY_MANUAL,DISPLAY_LARGE,DISPLAY_DEPTH,DISPLAY_SHADOW,DISPLAY_PANEL,
 DISPLAY_FOLLOW=0,DISPLAY_QUIET=1,DISPLAY_EXPLICIT=2 };
typedef struct {uint32_t revision,value[DISPLAY_FIELDS];} DisplayPreferences;
bool display_valid(const DisplayPreferences *value);
bool display_set(DisplayPreferences *value,unsigned field,uint32_t selected);
void display_encode(const DisplayPreferences *value,uint8_t status,uint8_t flags,uint8_t bytes[DISPLAY_BYTES]);
bool display_decode(const uint8_t *bytes,size_t size,DisplayPreferences *value,uint8_t *status,uint8_t *flags);
void display_load(DisplayPreferences *value);
bool display_save(const DisplayPreferences *value);
