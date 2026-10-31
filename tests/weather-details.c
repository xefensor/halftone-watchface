#include <assert.h>
#include <string.h>
#include "../src/c/weather_details.h"

static const time_t NOW = 1793433600;

static void put_u32(uint8_t *bytes, uint32_t value) {
  for (unsigned i = 0; i < 4; ++i) { bytes[i] = (uint8_t)(value >> (8 * i)); }
}

static void put_i16(uint8_t *bytes, int value) {
  bytes[0] = (uint8_t)value;
  bytes[1] = (uint8_t)((uint16_t)value >> 8);
}

static void sample(uint8_t *bytes) {
  memset(bytes, 0, WEATHER_DETAILS_BYTES);
  bytes[0] = 1;
  bytes[1] = WEATHER_DETAILS_RANGE | WEATHER_DETAILS_RAIN;
  put_u32(bytes + 2, NOW - 3600);
  put_u32(bytes + 6, NOW + 5 * 3600);
  put_u32(bytes + 10, NOW - 3600);
  put_i16(bytes + 14, 5);
  put_i16(bytes + 16, 41);
  put_i16(bytes + 18, 9);
  put_i16(bytes + 20, 48);
  bytes[22] = 40;
}

int main(void) {
  uint8_t bytes[WEATHER_DETAILS_BYTES];
  char text[48];
  WeatherDetails details;
  sample(bytes);
  assert(weather_details_read(bytes, sizeof(bytes), NOW, &details));
  assert(details.low_celsius == 5 && details.high_fahrenheit == 48);
  assert(details.confirmed_at == NOW - 3600);
  assert(weather_details_format(bytes, sizeof(bytes), NOW, true, true, false,
                                text, sizeof(text)));
  assert(strcmp(text, "L5° H9° · P40%") == 0);
  assert(weather_details_format(bytes, sizeof(bytes), NOW, true, false, true,
                                text, sizeof(text)));
  assert(strcmp(text, "L41° H48°") == 0);
  assert(weather_details_format(bytes, sizeof(bytes), NOW, false, true, false,
                                text, sizeof(text)));
  assert(strcmp(text, "P40%") == 0);
  assert(!weather_details_format(bytes, sizeof(bytes), NOW, false, false, false,
                                 text, sizeof(text)) && text[0] == '\0');

  // Every weekday language has natural compact weather labels too. Regional
  // separators and all three Norwegian language codes select the same labels.
  const struct {
    const char *locale;
    const char *expected;
  } translations[] = {
    {"en_GB", "L5° H9° · P40%"},
    {"cs_CZ", "min5° max9° · S40%"},
    {"sk-SK", "min5° max9° · Z40%"},
    {"de_DE", "min5° max9° · N40%"},
    {"fr-FR", "min5° max9° · P40%"},
    {"es_ES", "min5° max9° · P40%"},
    {"it-IT", "min5° max9° · P40%"},
    {"pt_BR", "min5° max9° · P40%"},
    {"nl-NL", "min5° max9° · N40%"},
    {"pl_PL", "min5° max9° · O40%"},
    {"da-DK", "min5° maks9° · N40%"},
    {"sv_SE", "min5° max9° · N40%"},
    {"no-NO", "min5° maks9° · N40%"},
    {"nb_NO", "min5° maks9° · N40%"},
    {"nn-NO", "min5° maks9° · N40%"},
    {"fi_FI", "alin5° ylin9° · S40%"},
    {"hu-HU", "min5° max9° · Cs40%"},
    {"ro_RO", "min5° max9° · P40%"},
    {"tr-TR", "min5° maks9° · Y40%"},
    {"CS-cz", "min5° max9° · S40%"},
  };
  for (size_t i = 0; i < sizeof(translations) / sizeof(translations[0]); ++i) {
    assert(weather_details_format_localized(bytes, sizeof(bytes), NOW,
        true, true, false, text, sizeof(text), translations[i].locale));
    assert(strcmp(text, translations[i].expected) == 0);
  }
  const char *fallback_locales[] = {NULL, "", "c", "cz_CZ", "english", "csbad", "zz"};
  for (size_t i = 0; i < sizeof(fallback_locales) / sizeof(fallback_locales[0]); ++i) {
    assert(weather_details_format_localized(bytes, sizeof(bytes), NOW,
        true, true, false, text, sizeof(text), fallback_locales[i]));
    assert(strcmp(text, "L5° H9° · P40%") == 0);
  }
  assert(weather_details_format_localized(bytes, sizeof(bytes), NOW,
      true, false, true, text, sizeof(text), "cs"));
  assert(strcmp(text, "min41° max48°") == 0);
  assert(weather_details_format_localized(bytes, sizeof(bytes), NOW,
      false, true, true, text, sizeof(text), "hu"));
  assert(strcmp(text, "Cs40%") == 0);
  assert(!weather_details_format_localized(bytes, sizeof(bytes), NOW,
      false, false, false, text, sizeof(text), "fi") && text[0] == '\0');

  // Both units are rounded by the provider, not converted from rounded Celsius.
  put_i16(bytes + 14, 7);
  put_i16(bytes + 16, 44);
  assert(weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  assert(weather_details_format(bytes, sizeof(bytes), NOW, true, false, true,
                                text, sizeof(text)));
  assert(strcmp(text, "L44° H48°") == 0);

  // Zero is a real temperature/probability; an absent flag is not a zero value.
  memset(bytes + 14, 0, 9);
  assert(weather_details_format(bytes, sizeof(bytes), NOW, true, true, false,
                                text, sizeof(text)));
  assert(strcmp(text, "L0° H0° · P0%") == 0);
  assert(weather_details_format_localized(bytes, sizeof(bytes), NOW,
      true, true, false, text, sizeof(text), "cs"));
  assert(strcmp(text, "min0° max0° · S0%") == 0);
  bytes[1] = WEATHER_DETAILS_RAIN;
  put_i16(bytes + 14, -32768); // Unused range fields do not become displayed data.
  assert(weather_details_format(bytes, sizeof(bytes), NOW, true, true, false,
                                text, sizeof(text)));
  assert(strcmp(text, "P0%") == 0);
  assert(!weather_details_format(bytes, sizeof(bytes), NOW, true, false, false,
                                 text, sizeof(text)));
  bytes[1] = WEATHER_DETAILS_RANGE;
  put_i16(bytes + 14, 0);
  bytes[22] = 255;
  assert(weather_details_format(bytes, sizeof(bytes), NOW, true, true, false,
                                text, sizeof(text)));
  assert(strcmp(text, "L0° H0°") == 0);

  // Inclusive start, exclusive expiry, including the provider's local midnight.
  sample(bytes);
  put_u32(bytes + 2, NOW);
  put_u32(bytes + 6, NOW + 60);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW - 1, NULL));
  assert(weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  assert(weather_details_read(bytes, sizeof(bytes), NOW + 59, NULL));
  assert(!weather_details_read(bytes, sizeof(bytes), NOW + 60, NULL));
  assert(!weather_details_format(bytes, sizeof(bytes), NOW + 60, true, true, false,
                                 text, sizeof(text)) && text[0] == '\0');

  sample(bytes);
  assert(!weather_details_read(NULL, sizeof(bytes), NOW, NULL));
  assert(!weather_details_read(bytes, 0, NOW, NULL));
  assert(!weather_details_read(bytes, sizeof(bytes) - 1, NOW, NULL));
  assert(!weather_details_read(bytes, sizeof(bytes) + 1, NOW, NULL));
  bytes[0] = 2;
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  bytes[1] = 0;
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  bytes[1] = 4;
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  bytes[1] = 7;
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));

  sample(bytes);
  put_u32(bytes + 2, 0);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_u32(bytes + 6, NOW - 3600);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_u32(bytes + 10, 0);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_u32(bytes + 10, NOW + 301);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  put_u32(bytes + 10, NOW + 300);
  assert(weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  // A forecast confirmed before midnight may become valid after midnight.
  put_u32(bytes + 2, NOW);
  put_u32(bytes + 10, NOW - 60);
  put_u32(bytes + 6, NOW + 60);
  assert(weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_u32(bytes + 6, NOW + 5 * 3600 + 1);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  // Timestamp arithmetic must not wrap the six-hour validity cap.
  sample(bytes);
  put_u32(bytes + 10, UINT32_MAX - 100);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));

  sample(bytes);
  bytes[22] = 101;
  details.rain_percent = 17;
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, &details));
  assert(details.rain_percent == 17); // Invalid replacement cannot partially copy.
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  bytes[22] = 100;
  assert(weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_i16(bytes + 14, -101);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_i16(bytes + 18, 101);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_i16(bytes + 16, -149);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_i16(bytes + 20, 213);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_i16(bytes + 14, 10);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_i16(bytes + 16, 49);
  assert(!weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  sample(bytes);
  put_i16(bytes + 14, -100);
  put_i16(bytes + 16, -148);
  put_i16(bytes + 18, 100);
  put_i16(bytes + 20, 212);
  assert(weather_details_read(bytes, sizeof(bytes), NOW, NULL));
  assert(weather_details_format_localized(bytes, sizeof(bytes), NOW,
      true, true, true, text, sizeof(text), "fi"));
  assert(strcmp(text, "alin-148° ylin212° · S40%") == 0);
  assert(!weather_details_format_localized(bytes, sizeof(bytes), NOW,
      true, true, true, text, 12, "fi") && text[0] == '\0');
  assert(!weather_details_format(bytes, sizeof(bytes), NOW, true, true, false,
                                 text, 4) && text[0] == '\0');
  assert(!weather_details_format(bytes, sizeof(bytes), NOW, true, true, false,
                                 NULL, sizeof(text)));
  return 0;
}
