#pragma once

#include <stdbool.h>
#include <stdint.h>

// Tuple is supplied by the Pebble SDK. Read only the declared integer width;
// callers narrow this shared colour/preference range to their own enum.
static bool native_setting_value(const Tuple *tuple,uint32_t *result) {
  if(!tuple||(tuple->type!=TUPLE_INT&&tuple->type!=TUPLE_UINT))return false;
  uint32_t value;
  if(tuple->length==1) {
    if(tuple->type==TUPLE_INT&&tuple->value->int8<0)return false;
    value=tuple->value->uint8;
  } else if(tuple->length==2) {
    if(tuple->type==TUPLE_INT&&tuple->value->int16<0)return false;
    value=tuple->value->uint16;
  } else if(tuple->length==4) {
    if(tuple->type==TUPLE_INT&&tuple->value->int32<0)return false;
    value=tuple->value->uint32;
  } else return false;
  if(value>0xffffff)return false;
  *result=value;
  return true;
}
