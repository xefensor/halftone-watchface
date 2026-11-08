#include <pebble.h>
#include <string.h>
#include "display_preferences.h"
#define DISPLAY_STORAGE_KEY 78
static const uint8_t legacy_keys[14]={2,3,70,75,76,77,72,19,71,73,6,4,5,62};
static uint32_t get32(const uint8_t *p){return (uint32_t)p[0]|(uint32_t)p[1]<<8|(uint32_t)p[2]<<16|(uint32_t)p[3]<<24;}
static void put32(uint8_t *p,uint32_t value){for(unsigned i=0;i<4;++i)p[i]=(uint8_t)(value>>(i*8));}
static bool field_valid(unsigned i,uint32_t n){
 if(i>=DISPLAY_FIELDS)return false;
 if(i<6)return n<=0xffffff;
 if(i==DISPLAY_CLOCK)return n==0||n==12||n==24;
 if(i==DISPLAY_TEXT_SIZE)return n<=3;
 if(i==DISPLAY_VIBRATION||i==DISPLAY_MODE)return n<=2;
 return n<=1;
}
bool display_valid(const DisplayPreferences *v){
 if(!v)return false;
 for(unsigned i=0;i<DISPLAY_FIELDS;++i)if(!field_valid(i,v->value[i]))return false;
 return true;
}
bool display_set(DisplayPreferences *v,unsigned field,uint32_t selected){
 if(!v||!field_valid(field,selected))return false;
 v->value[field]=selected;return true;
}
void display_encode(const DisplayPreferences *v,uint8_t status,uint8_t flags,uint8_t bytes[DISPLAY_BYTES]){
 bytes[0]=1;bytes[1]=DISPLAY_FIELDS;bytes[2]=status;bytes[3]=flags;put32(bytes+4,v->revision);
 for(unsigned i=0;i<DISPLAY_FIELDS;++i)put32(bytes+8+i*4,v->value[i]);
}
bool display_decode(const uint8_t *bytes,size_t size,DisplayPreferences *v,uint8_t *status,uint8_t *flags){
 if(!bytes||size!=DISPLAY_BYTES||bytes[0]!=1||bytes[1]!=DISPLAY_FIELDS||bytes[2]>1||bytes[3]>1)return false;
 DisplayPreferences result;result.revision=get32(bytes+4);
 for(unsigned i=0;i<DISPLAY_FIELDS;++i)result.value[i]=get32(bytes+8+i*4);
 if(!display_valid(&result))return false;
 *v=result;if(status)*status=bytes[2];if(flags)*flags=bytes[3];return true;
}
void display_load(DisplayPreferences *v){
 memset(v,0,sizeof(*v));v->value[0]=0xff5500;
 v->value[1]=v->value[4]=0xffffff;v->value[2]=v->value[5]=0x55aaff;
 v->value[7]=v->value[8]=v->value[16]=1;v->value[11]=DISPLAY_EXPLICIT;
 for(unsigned i=0;i<14;++i)if(persist_exists(legacy_keys[i])){
  const unsigned field=i<10?i:i+3;
  const uint32_t old=(i==7||i==8||i>=10)?persist_read_bool(legacy_keys[i]):(uint32_t)persist_read_int(legacy_keys[i]);
  display_set(v,field,old);
 }
 if(!persist_exists(72)&&persist_exists(7))v->value[6]=persist_read_bool(7)?12:24;
 if(persist_read_bool(74))v->value[11]=DISPLAY_QUIET;
 uint8_t bytes[DISPLAY_BYTES],status,flags;DisplayPreferences stored;
 if(persist_get_size(DISPLAY_STORAGE_KEY)==DISPLAY_BYTES&&persist_read_data(DISPLAY_STORAGE_KEY,bytes,sizeof(bytes))==DISPLAY_BYTES&&display_decode(bytes,sizeof(bytes),&stored,&status,&flags)&&!status&&!flags)*v=stored;
}
bool display_save(const DisplayPreferences *v){
 if(!display_valid(v))return false;
 uint8_t bytes[DISPLAY_BYTES],check[DISPLAY_BYTES];display_encode(v,0,0,bytes);
 const bool same=persist_read_data(DISPLAY_STORAGE_KEY,check,sizeof(check))==DISPLAY_BYTES&&!memcmp(bytes,check,sizeof(bytes));
 if(!same&&persist_write_data(DISPLAY_STORAGE_KEY,bytes,sizeof(bytes))!=DISPLAY_BYTES)return false;
 if(persist_get_size(DISPLAY_STORAGE_KEY)!=DISPLAY_BYTES||persist_read_data(DISPLAY_STORAGE_KEY,check,sizeof(check))!=DISPLAY_BYTES||memcmp(bytes,check,sizeof(bytes)))return false;
 // The verified snapshot owns all native choices; retain earlier builds' mirrors.
 for(unsigned i=0;i<14;++i){
  const unsigned field=i<10?i:i+3;const bool boolean=i==7||i==8||i>=10;const uint32_t old=boolean?persist_read_bool(legacy_keys[i]):(uint32_t)persist_read_int(legacy_keys[i]);
  if(persist_exists(legacy_keys[i])&&old==v->value[field])continue;
  if(boolean)persist_write_bool(legacy_keys[i],v->value[field]);else persist_write_int(legacy_keys[i],(int32_t)v->value[field]);
 }
 const bool night=v->value[DISPLAY_MODE]==DISPLAY_QUIET;
 if(!persist_exists(74)||persist_read_bool(74)!=night)persist_write_bool(74,night);
 return true;
}
