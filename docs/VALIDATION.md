# Halftone beta validation

## 1.4.3 beta 4 — localization checks

The localization update targets the same 17 supported languages on the watch
and in Halftone's phone settings. It adds translated watch weather-detail
labels, the weather settings section, existing Clay controls and dynamic
status messages. The phone interface prefers the active watch language, then
the phone language, and finally English; saved option identifiers are unchanged.

Checked on 31 October 2026:

- All **121 JavaScript tests** and **four standalone C test suites** pass.
  C tests use C99 with `-Wall -Wextra -Werror`.
- Catalog tests check every visible Halftone label/help string and dynamic
  weather-status key in all 17 languages, including matching placeholders.
  Integration checks cover active-watch precedence, phone/English fallback,
  disconnected watch-info reads, regional locale forms, Norwegian aliases,
  language changes between settings opens and unchanged settings/location IDs.
- C tests cover the localized low/high/precipitation prefixes, unknown-language
  fallback, normal and extreme values, independent visibility options and the
  unchanged packet/expiry rules. Settings help matches the prefixes on the face.
- A clean Emery build succeeds with Pebble Tool 5.1.1, SDK 4.33.1 and GCC
  14.2.1. Permission packaging verifies the existing UUID and unchanged SDK-built
  payloads. Resources occupy 80,168 bytes; app RAM footprint is 12,664 bytes.
- The delivered PBW SHA256 is
  `1923000461964faa2a165c6a302684265956536ce92ef90cd02c879061c03a7c`.
- Inspected QEMU previews cover Czech, German and Finnish labels and weekdays,
  Celsius, long negative/positive Fahrenheit ranges, 100% precipitation and
  Timeline Peek. Long detail lines fall back from Gothic 18 Bold to Gothic 14
  Bold and fit the existing frame. The default English layout with details off
  matches beta 3 with **zero changed pixels**.
- Locale previews substitute a fixed locale at the two platform locale reads
  and use an idle phone script for injected data. The release formatter, fonts
  and layout are otherwise unchanged; the English default preview uses the
  exact delivered watch binary. This checks rendering, not a physical watch's
  language-pack installation or live phone delivery.
- JavaScript syntax and `git diff --check` pass. No physical phone/watch testing
  is claimed. The historical weather/runtime limitations below still apply.

## 1.4.2 beta 3 — historical validation

Checked on 31 October 2026. This is a sideloadable beta, not a Store release.

### Automated checks

- All 110 JavaScript tests pass with `npm test`.
- All four standalone C test suites pass with C99 and
  `-Wall -Wextra -Werror`: scheduling, hourly forecasts, display selection and
  the new daily-details packet.
- New coverage checks day selection, stale scalar fields after midnight,
  independent missing range/probability fields, valid zero probability,
  original source confirmation and exclusive expiry. Celsius and Fahrenheit
  are converted before rounding; rainfall amounts never become probabilities.
- Shared-weather regressions cover authoritative unit preferences, reconnects,
  per-UTC-slot forecast ages, old-cache migration and forecast-window changes.
  Unit-only responses before weather arrives preserve valid offline details.
  Switching to compatibility weather clears details from the shared provider.
- `git diff --check` and JavaScript syntax checks pass.

### SDK build and emulator

The clean build uses Pebble Tool 5.1.1, SDK 4.33.1 and GCC 14.2.1 for Emery.
The permission-packaging step verifies manifest version 2, the existing UUID,
declared permissions, target platform and byte-identical SDK-built payloads.
The build reports 80,168 resource bytes and 11,956 bytes of app RAM footprint.
The delivered PBW SHA256 is
`5c3eb269578938383189c93f513703d0916f1c04bd33ce88af85dfd58c44465d`.

Visual checks use QEMU 10.1.5-pebble14 with injected example weather. The visual
harness keeps the delivered watch binary, resources and manifest byte for byte;
an idle phone script prevents live callbacks from replacing the test fixtures.
This verifies rendering and AppMessage handling, not a physical phone's plugin
runtime or a provider's live weather.

Inspected screenshots cover normal and extra-large time, both temperature units,
independent rain probability, zero probability, maximum accepted Fahrenheit
range and percentage, stored details after reinstallation, and Timeline Peek.
The detail line remains readable below the temperature and hides during Peek.
Invalid replacement data clears the line. Advancing beyond its six-hour limit
and refreshing the display removes expired details.
With both options disabled, a screenshot at the same time and temperature
matches the previous 1.4.1 beta 2 default layout with **zero changed pixels**.

### Remaining limits

No physical phone/watch testing is claimed. Check settings permissions, actual
provider delivery, saved-location changes, reconnection and daily rollover on
the device. Native shared weather does not provide the provider's original
measurement timestamp or model issue time; a successful read only confirms the
values stored by Pebble. Its fixed UTC offset and daily steps also cannot
reconstruct unreported daylight-saving changes.

Daily details require explicit supported units and compatible date metadata.
They stay hidden when unavailable or while the compatibility weather client is
active. The new toggles default to off, preserving the existing default layout.
