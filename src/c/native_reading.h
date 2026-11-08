#pragma once

#include "reading_presentation.h"
#include "watch_layout.h"

typedef enum { READING_VALUE, READING_LOADING, READING_UNAVAILABLE, READING_EXPIRED } ReadingState;

static inline ReadingState reading_state(const ComplicationSlot *slot,time_t now) {
  if(slot->status==COMPLICATION_STATUS_LOADING)return READING_LOADING;
  if(slot->status==COMPLICATION_STATUS_EXPIRED)return READING_EXPIRED;
  if(slot->status==COMPLICATION_STATUS_READY)
    return complication_is_fresh(slot,now)?READING_VALUE:READING_EXPIRED;
  return READING_UNAVAILABLE;
}

static inline unsigned reading_semantic(const ComplicationSlot *slot,const ReadingParts *parts,
                                         bool numeric) {
  if(slot->semantic_kind!=COMPLICATION_SEMANTIC_GENERIC)return slot->semantic_kind;
  if(numeric&&(strcmp(parts->unit,"°C")==0||strcmp(parts->unit,"°F")==0))
    return COMPLICATION_SEMANTIC_TEMPERATURE;
  if(numeric&&slot->display_kind==COMPLICATION_DISPLAY_PRECIPITATION&&reading_is_probability(parts))
    return COMPLICATION_SEMANTIC_PRECIPITATION;
  return COMPLICATION_SEMANTIC_GENERIC;
}

// Optional source bounds are authoritative. A plain percent is never enough
// to infer a rain/battery/humidity range or a weather condition.
static inline bool reading_range(const ComplicationSlot *slot,double *amount) {
  const unsigned required=COMPLICATION_SEMANTIC_VALUE|COMPLICATION_SEMANTIC_MIN|COMPLICATION_SEMANTIC_MAX;
  if((slot->semantic_flags&required)!=required||!isfinite(slot->numeric_value)||
      !isfinite(slot->minimum)||!isfinite(slot->maximum)||slot->maximum<=slot->minimum)return false;
  double value=(slot->numeric_value-slot->minimum)/(slot->maximum-slot->minimum);
  if(!isfinite(value))return false;
  *amount=value<0?0:value>1?1:value;
  return true;
}

typedef struct {
  const char *lang;
  const char *labels[12];
  const char *details[12];
  const char *forecast;
  const char *loading,*unavailable,*expired,*first,*second,*paused;
  const char *overflow;
} ReadingLanguage;

static inline const ReadingLanguage *reading_language(const char *locale) {
  static const ReadingLanguage languages[]={
    {"en",{"READING","TEMP","RAIN","BATTERY","HUMIDITY","WIND","UV","WEATHER","RANGE","VALUE","STATUS","TIME"},{"","TEMP","Feels","High","Low","RAIN","HUMIDITY","WIND SPEED","DIRECTION","UV","WEATHER","PHONE"},"Forecast","Loading","No data","Expired","SLOT 1","SLOT 2","Paused","Too long"},
    {"cs",{"HODNOTA","TEPLOTA","DÉŠŤ","BATERIE","VLHKOST","VÍTR","UV","POČASÍ","ROZSAH","HODNOTA","STAV","ČAS"},{"","TEPLOTA","Pocitová","Max","Min","DÉŠŤ","VLHKOST","RYCHLOST","SMĚR","UV","POČASÍ","TELEFON"},"Předp.","Načítání","Bez dat","Vypršelo","POZICE 1","POZICE 2","Pozastaveno","Dlouhé"},
    {"sk",{"HODNOTA","TEPLOTA","DÁŽĎ","BATÉRIA","VLHKOSŤ","VIETOR","UV","POČASIE","ROZSAH","HODNOTA","STAV","ČAS"},{"","TEPLOTA","Pocitová","Max","Min","DÁŽĎ","VLHKOSŤ","RÝCHLOSŤ","SMER","UV","POČASIE","TELEFÓN"},"Predp.","Načítanie","Bez dát","Vypršalo","POZÍCIA 1","POZÍCIA 2","Pozastavené","Dlhé"},
    {"de",{"ANZEIGE","TEMP","REGEN","AKKU","FEUCHTE","WIND","UV","WETTER","BEREICH","WERT","STATUS","ZEIT"},{"","TEMP","Gefühlt","Hoch","Tief","REGEN","FEUCHTE","WINDSTÄRKE","RICHTUNG","UV","WETTER","TELEFON"},"Prognose","Lädt","Nicht da","Verfallen","FELD 1","FELD 2","Pausiert","Zu lang"},
    {"fr",{"DONNÉE","TEMP","PLUIE","BATTERIE","HUMIDITÉ","VENT","UV","MÉTÉO","PLAGE","VALEUR","ÉTAT","HEURE"},{"","TEMP","Ressenti","Max","Min","PLUIE","HUMIDITÉ","VITESSE","DIRECTION","UV","MÉTÉO","TÉLÉPHONE"},"Prévision","En cours","Sans info","Expiré","ZONE 1","ZONE 2","En pause","Trop long"},
    {"es",{"DATO","TEMP","LLUVIA","BATERÍA","HUMEDAD","VIENTO","UV","TIEMPO","RANGO","VALOR","ESTADO","HORA"},{"","TEMP","Percibida","Máx","Mín","LLUVIA","HUMEDAD","VELOCIDAD","DIRECCIÓN","UV","TIEMPO","TELÉFONO"},"Previsión","Cargando","Sin datos","Caducado","ESPACIO 1","ESPACIO 2","En pausa","Largo"},
    {"it",{"DATO","TEMP","PIOGGIA","BATTERIA","UMIDITÀ","VENTO","UV","METEO","INTERVALLO","VALORE","STATO","ORA"},{"","TEMP","Percepita","Max","Min","PIOGGIA","UMIDITÀ","VELOCITÀ","DIREZIONE","UV","METEO","TELEFONO"},"Prev.","Attendi","Assente","Scaduto","SPAZIO 1","SPAZIO 2","In pausa","Lungo"},
    {"pt",{"DADO","TEMP","CHUVA","BATERIA","UMIDADE","VENTO","UV","TEMPO","INTERVALO","VALOR","ESTADO","HORA"},{"","TEMP","Sensação","Máx","Mín","CHUVA","UMIDADE","VELOCIDADE","DIREÇÃO","UV","TEMPO","TELEFONE"},"Previsão","Aguarde","Sem info","Expirado","ESPAÇO 1","ESPAÇO 2","Em pausa","Longo"},
    {"nl",{"WAARDE","TEMP","REGEN","ACCU","VOCHT","WIND","UV","WEER","BEREIK","WAARDE","STATUS","TIJD"},{"","TEMP","Gevoel","Hoog","Laag","REGEN","VOCHT","WINDSNELHEID","RICHTING","UV","WEER","TELEFOON"},"Verwacht","Laden","Geen info","Verlopen","VAK 1","VAK 2","Gepauzeerd","Te lang"},
    {"pl",{"DANE","TEMP","DESZCZ","BATERIA","WILGOTNOŚĆ","WIATR","UV","POGODA","ZAKRES","WARTOŚĆ","STAN","CZAS"},{"","TEMP","Odczucie","Maks","Min","DESZCZ","WILGOTNOŚĆ","PRĘDKOŚĆ","KIERUNEK","UV","POGODA","TELEFON"},"Prognoza","Ładuje","Brak","Wygasło","POLE 1","POLE 2","Wstrzymano","Za długie"},
    {"da",{"VÆRDI","TEMP","REGN","BATTERI","FUGT","VIND","UV","VEJR","OMRÅDE","VÆRDI","STATUS","TID"},{"","TEMP","Føles","Høj","Lav","REGN","FUGT","VINDHAST","RETNING","UV","VEJR","TELEFON"},"Prognose","Indlæser","Mangler","Udløbet","FELT 1","FELT 2","Sat på pause","For langt"},
    {"sv",{"VÄRDE","TEMP","REGN","BATTERI","FUKT","VIND","UV","VÄDER","INTERVALL","VÄRDE","STATUS","TID"},{"","TEMP","Känns","Hög","Låg","REGN","FUKT","VINDHAST","RIKTNING","UV","VÄDER","TELEFON"},"Prognos","Laddar","Saknas","Utgånget","FÄLT 1","FÄLT 2","Pausad","Långt"},
    {"no",{"VERDI","TEMP","REGN","BATTERI","FUKT","VIND","UV","VÆR","OMRÅDE","VERDI","STATUS","TID"},{"","TEMP","Føles","Høy","Lav","REGN","FUKT","VINDSTYRKE","RETNING","UV","VÆR","TELEFON"},"Prognose","Laster","Mangler","Utløpt","FELT 1","FELT 2","Satt på pause","For langt"},
    {"fi",{"ARVO","LÄMPÖ","SADE","AKKU","KOSTEUS","TUULI","UV","SÄÄ","ALUE","ARVO","TILA","AIKA"},{"","LÄMPÖ","Tuntuu","Ylin","Alin","SADE","KOSTEUS","NOPEUS","SUUNTA","UV","SÄÄ","PUHELIN"},"Ennuste","Ladataan","Ei tietoa","Vanhent.","PAIKKA 1","PAIKKA 2","Keskeytetty","Pitkä"},
    {"hu",{"ÉRTÉK","HŐFOK","ESŐ","AKKU","PÁRA","SZÉL","UV","IDŐJÁRÁS","TARTOMÁNY","ÉRTÉK","ÁLLAPOT","IDŐ"},{"","HŐFOK","Hőérzet","Max","Min","ESŐ","PÁRA","SEBESSÉG","IRÁNY","UV","IDŐJÁRÁS","TELEFON"},"Előrejel.","Betöltés","Hiányzik","Lejárt","HELY 1","HELY 2","Szüneteltetve","Hosszú"},
    {"ro",{"VALOARE","TEMP","PLOAIE","BATERIE","UMIDITATE","VÂNT","UV","VREME","INTERVAL","VALOARE","STARE","ORĂ"},{"","TEMP","Resimțită","Max","Min","PLOAIE","UMIDITATE","VITEZĂ","DIRECȚIE","UV","VREME","TELEFON"},"Prognoză","Încărcare","Fără date","Expirat","POZIȚIA 1","POZIȚIA 2","În pauză","Prea lung"},
    {"tr",{"DEĞER","SICAKLIK","YAĞMUR","PİL","NEM","RÜZGÂR","UV","HAVA","ARALIK","DEĞER","DURUM","SAAT"},{"","SICAKLIK","Hissed.","Yüksek","Düşük","YAĞMUR","NEM","HIZ","YÖN","UV","HAVA","TELEFON"},"Tahmin","Yüklüyor","Veri yok","Süre bitti","ALAN 1","ALAN 2","Duraklatıldı","Çok uzun"}
  };
  if(locale)for(size_t i=1;i<sizeof(languages)/sizeof(languages[0]);++i) {
    const char *code=languages[i].lang;
    if((locale[0]==code[0]&&locale[1]==code[1]&&(!locale[2]||locale[2]=='_'||locale[2]=='-'))||
        (code[0]=='n'&&code[1]=='o'&&locale[0]=='n'&&(locale[1]=='b'||locale[1]=='n')&&
         (!locale[2]||locale[2]=='_'||locale[2]=='-')))return &languages[i];
  }
  return &languages[0];
}

static inline const char *reading_label(const ComplicationSlot *slot,unsigned kind,
                                         unsigned index,const char *locale) {
  const ReadingLanguage *language=reading_language(locale);
  if(kind>COMPLICATION_SEMANTIC_TIMESTAMP)kind=COMPLICATION_SEMANTIC_GENERIC;
  if(slot->detail==COMPLICATION_DETAIL_TEMPERATURE&&
      (slot->qualifiers&COMPLICATION_QUALIFIER_FORECAST))return language->forecast;
  if(slot->detail>COMPLICATION_DETAIL_NONE&&slot->detail<=COMPLICATION_DETAIL_PHONE_BATTERY)
    return language->details[slot->detail];
  if(kind==COMPLICATION_SEMANTIC_BATTERY&&slot->source_kind==COMPLICATION_SOURCE_PHONE)
    return language->details[COMPLICATION_DETAIL_PHONE_BATTERY];
  // Legacy v3 packets lack a detail code. Their temperature label may still
  // distinguish a high, low or feels-like value; never replace it with NOW.
  if(kind==COMPLICATION_SEMANTIC_TEMPERATURE&&slot->label[0])return slot->label;
  if(slot->label[0]&&(kind==COMPLICATION_SEMANTIC_GENERIC||kind==COMPLICATION_SEMANTIC_NUMBER||
      kind==COMPLICATION_SEMANTIC_RANGE||kind==COMPLICATION_SEMANTIC_BOOLEAN||
      kind==COMPLICATION_SEMANTIC_TIMESTAMP))return slot->label;
  if(kind==COMPLICATION_SEMANTIC_GENERIC)return index?language->second:language->first;
  return language->labels[kind];
}

static inline bool reading_same_label(const char *a,const char *b) {
  while(*a&&*b) {
    unsigned x=(unsigned char)*a++,y=(unsigned char)*b++;
    if(x>='A'&&x<='Z')x+='a'-'A';
    if(y>='A'&&y<='Z')y+='a'-'A';
    if(x=='_')x=' ';
    if(y=='_')y=' ';
    if(x!=y)return false;
  }
  return !*a&&!*b;
}

/* Qualifiers retain priority when a renderer fits the optional context tail. */
static inline const char *reading_qualifier(const ComplicationSlot *slot,unsigned kind,
    const char *locale) {
  const ReadingLanguage *language=reading_language(locale);
  if(slot->detail>=COMPLICATION_DETAIL_FEELS_LIKE&&slot->detail<=COMPLICATION_DETAIL_LOW)
    return language->details[slot->detail];
  if(kind==COMPLICATION_SEMANTIC_TEMPERATURE&&(slot->qualifiers&COMPLICATION_QUALIFIER_FORECAST))
    return language->forecast;
  return "";
}

/* An icon replaces a type name, never the source/variant which identifies a
 * reading. Unknown/custom labels retain their original spelling and case. */
static inline const char *reading_caption(const ComplicationSlot *slot,unsigned kind,
    unsigned index,const char *locale,char *buffer,size_t capacity) {
  if(!buffer||!capacity)return "";
  buffer[0]=0;
  const ReadingLanguage *language=reading_language(locale),*english=reading_language("en");
  if(kind>COMPLICATION_SEMANTIC_TIMESTAMP)kind=COMPLICATION_SEMANTIC_GENERIC;
  const char *qualifier=reading_qualifier(slot,kind,locale),*context=slot->label;
  // Missing/amount-only precipitation has no validated probability kind.
  // Localize its known property name without inventing a gauge or a value.
  if(kind==COMPLICATION_SEMANTIC_GENERIC&&slot->source_kind==COMPLICATION_SOURCE_WEATHER&&
      reading_same_label(context,"precipitation"))context=language->labels[COMPLICATION_SEMANTIC_PRECIPITATION];
  const unsigned detail=slot->detail<=COMPLICATION_DETAIL_PHONE_BATTERY?slot->detail:0;
  if(reading_same_label(context,language->labels[kind])||
      reading_same_label(context,english->labels[kind])||
      (detail&&(reading_same_label(context,language->details[detail])||
        reading_same_label(context,english->details[detail])))||
      (*qualifier&&reading_same_label(context,qualifier))||
      (kind==COMPLICATION_SEMANTIC_TEMPERATURE&&reading_same_label(context,"temperature"))||
      (detail==COMPLICATION_DETAIL_FEELS_LIKE&&reading_same_label(context,"feels like"))||
      (kind==COMPLICATION_SEMANTIC_PRECIPITATION&&reading_same_label(context,"precipitation"))||
      (kind==COMPLICATION_SEMANTIC_BATTERY&&(reading_same_label(context,"battery level")||
        (slot->source_kind==COMPLICATION_SOURCE_PHONE&&
         reading_same_label(context,language->details[COMPLICATION_DETAIL_PHONE_BATTERY])))))context="";
  if(!*qualifier&&!*context) {
    if(kind==COMPLICATION_SEMANTIC_TEMPERATURE||kind==COMPLICATION_SEMANTIC_PRECIPITATION||
        kind==COMPLICATION_SEMANTIC_HUMIDITY||
        (kind==COMPLICATION_SEMANTIC_BATTERY&&slot->source_kind==COMPLICATION_SOURCE_PHONE))return buffer;
    context=reading_label(slot,kind,index,locale);
  }
  watch_layout_copy_utf8(*qualifier?qualifier:context,buffer,capacity);
  if(*qualifier&&*context) {
    const size_t length=strlen(buffer);
    if(length+5<capacity) {
      memcpy(buffer+length," · ",5);
      watch_layout_copy_utf8(context,buffer+length+4,capacity-length-4);
    }
  }
  return buffer;
}

typedef int (*ReadingLabelWidth)(const void *context,const char *text);
// This is the measured label-fitting path used by the renderer. Preserve
// whole source scalars and reserve all three ellipsis bytes plus its NUL.
static inline void reading_label_ellipsize(char *text,size_t capacity,int width,
                                           ReadingLabelWidth measure,const void *context) {
  if(!text||!capacity||!measure||measure(context,text)<=width)return;
  if(capacity<4){text[0]='\0';return;}
  char prefix[COMPLICATION_MAX_LABEL_BYTES+16];
  const size_t prefix_capacity=capacity-3<sizeof(prefix)?capacity-3:sizeof(prefix);
  watch_layout_copy_utf8(text,prefix,prefix_capacity);
  for(;;) {
    const size_t length=strlen(prefix);
    memcpy(text,prefix,length);memcpy(text+length,"…",4);
    if(measure(context,text)<=width||!watch_layout_pop_utf8(prefix))return;
  }
}

static inline const char *reading_state_label(ReadingState state,const char *locale) {
  const ReadingLanguage *language=reading_language(locale);
  return state==READING_LOADING?language->loading:state==READING_EXPIRED?language->expired:language->unavailable;
}

static inline const char *reading_overflow_label(const char *locale) {
  return reading_language(locale)->overflow;
}

// A clock mark means a known observation is at least an hour old. Native
// cache origin or an unknown measurement time alone never earns this mark.
static inline bool reading_is_aged(const ComplicationSlot *slot,time_t now) {
  return slot->observed_at>0&&now>0&&(uint64_t)now>=(uint64_t)slot->observed_at+3600;
}

// The display has four intensities per channel. These lookup values are
// linear-sRGB luminance scaled by1e6, so contrast needs no pow()/float math.
static inline uint32_t reading_color_luminance(uint8_t color) {
  static const uint32_t linear[]={0,90842,401978,1000000};
  return (uint32_t)(((uint64_t)linear[(color>>4)&3]*2126+
      (uint64_t)linear[(color>>2)&3]*7152+(uint64_t)linear[color&3]*722)/10000);
}
static inline bool reading_color_contrasts(uint8_t a,uint8_t b,unsigned thousandths) {
  uint32_t x=reading_color_luminance(a),y=reading_color_luminance(b);
  if(x<y){const uint32_t swap=x;x=y;y=swap;}
  return (uint64_t)(x+50000)*1000>=(uint64_t)(y+50000)*thousandths;
}
static inline uint8_t reading_contrast_ink(uint8_t background) {
  const uint32_t light=reading_color_luminance(background);
  return (uint64_t)(light+50000)*(light+50000)>=52500000000ULL?0xc0:0xff;
}
static inline uint8_t reading_warning_ink(uint8_t background) {
  const uint8_t amber=reading_color_luminance(background)>400000?0xe4:0xf8;
  return reading_color_contrasts(amber,background,3000)?amber:reading_contrast_ink(background);
}
static inline uint8_t reading_secondary_ink(uint8_t foreground,uint8_t background) {
  (void)background;
  return foreground;
}
static inline uint8_t reading_accent_ink(uint8_t accent,uint8_t background,uint8_t foreground) {
  if(reading_color_contrasts(accent,background,2000))return accent;
  if(reading_color_contrasts(foreground,background,2000))return foreground;
  return reading_contrast_ink(background);
}
