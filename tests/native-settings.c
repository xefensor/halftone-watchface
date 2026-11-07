#include <assert.h>
#include <stddef.h>
#include <stdint.h>

// A Tuple's documented value members and declared width are the parser's
// complete input contract. Poison the unused bytes to catch wide bool reads.
enum { TUPLE_BYTE_ARRAY, TUPLE_CSTRING, TUPLE_UINT, TUPLE_INT };
typedef union {
  int8_t int8; uint8_t uint8;
  int16_t int16; uint16_t uint16;
  int32_t int32; uint32_t uint32;
} TupleValue;
typedef struct { unsigned type,length; const TupleValue *value; } Tuple;
#include "../src/c/native_settings.h"

int main(void) {
  TupleValue bytes={.uint32=0xffffff00};
  Tuple tuple={TUPLE_UINT,1,&bytes};uint32_t value=99;
  assert(native_setting_value(&tuple,&value)&&value==0);
  bytes.uint8=1;assert(native_setting_value(&tuple,&value)&&value==1);
  tuple.type=TUPLE_INT;assert(native_setting_value(&tuple,&value)&&value==1);
  bytes.int8=-1;assert(!native_setting_value(&tuple,&value));
  tuple.length=2;bytes.uint32=0xffff0001;
  assert(native_setting_value(&tuple,&value)&&value==1);
  bytes.int16=-1;assert(!native_setting_value(&tuple,&value));
  tuple.length=4;bytes.uint32=0xffffff;
  assert(native_setting_value(&tuple,&value)&&value==0xffffff);
  bytes.uint32=0x1000000;assert(!native_setting_value(&tuple,&value));
  bytes.int32=-1;assert(!native_setting_value(&tuple,&value));
  tuple.type=TUPLE_UINT;tuple.length=3;assert(!native_setting_value(&tuple,&value));
  tuple.length=0;assert(!native_setting_value(&tuple,&value));
  tuple.length=4;tuple.type=TUPLE_CSTRING;assert(!native_setting_value(&tuple,&value));
  tuple.type=TUPLE_BYTE_ARRAY;assert(!native_setting_value(&tuple,&value));
  assert(!native_setting_value(NULL,&value));
  return 0;
}
