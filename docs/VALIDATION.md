# Halftone beta validation

## 1.6.1 beta 8 — source recovery and diagnostic checks

This update addresses a recovery gap and exposes the original source failure
message. It does not establish or claim a fix for the reported on-device
weather failure across multiple watchfaces.

- All **176 JavaScript tests** pass. New checks cover source registration after
  `PLUGIN_UNAVAILABLE`, one bounded 5/15/60/120-second retry timer, unrelated
  successful groups, synchronous failures, old callbacks, pending watch delivery,
  preference changes and API loss. The normal 30-minute backup remains separate.
- Retry/configuration replay does not renew source receipt times or select an
  alternate weather service. Successful data clears its own diagnostic; other
  sources cannot reset an unavailable source's backoff.
- Full diagnostic messages are bounded and sanitized, matched to their slot/code,
  and escaped as literal text in Clay. They are not persisted, sent in the watch
  snapshot or logged. Existing translated framing is reused for all 17 languages;
  original provider/host messages remain source data.
- SDK **4.33.1** builds the update successfully. Permission packaging verifies the
  original UUID, manifest version 2 and unchanged SDK payloads. Native sources,
  snapshot format, settings IDs and font resources are unchanged from beta 7.
  The packaged native watch binary and resources are byte-identical to beta 7.
  Its native layout checks below therefore remain relevant; no new physical
  phone/watch testing is claimed.
- Read-only checks of ČHMÚ 0.5.0's real entry handler/client with public fixtures
  succeed for a saved České Budějovice location and GPS fallback. Its PBW/script
  packaging also validates. These checks do not prove live phone/plugin behavior
  or upstream data availability, and no ČHMÚ code change was justified.

The [weather troubleshooting guide](WEATHER-TROUBLESHOOTING.md) distinguishes
provider availability, the demo face's private picker, missing locations and
permission errors. The complete error detail and exact phone-app version are
still needed if the user's failure persists.

Permission-packaged PBW SHA-256:

`0f20c7b75f390e8021dd90357839648578e9c2128c936b7d34b5d075cc349578`

## 1.6.0 beta 7 — five-complication checks

All source data now comes from five fixed global complication slots. Clock and
date remain native. The active bundle has no weather preset, independent HTTP
fallback, pinned provider, local temperature-unit rewrite or hourly forecast
cache. Historical sections below describe the archived versions and their
matching documentation.

- All **167 JavaScript tests** and **seven standalone C suites** pass. Native
  helper suites compile with C99 and `-Wall -Wextra -Werror`; JavaScript syntax
  and `git diff --check` also pass. The packet decoder additionally passed
  AddressSanitizer/UndefinedBehaviorSanitizer checks.
- Generic tests cover global IDs with omitted slots, positional source-instance
  indices and instance reordering; category/item subscription grouping and
  unpinned routing; actual-preferences cache restoration; source/configuration
  rebinding, late callbacks and complete-snapshot delivery retries. Known zero,
  false, negatives and native units remain valid values.
- Supported scalar, text, boolean, timestamp, icon and image formats are checked.
  Series-only data is explicitly unsupported. Source bitmaps use compact rows;
  a 3×2 regression verifies repacking into the watch's padded rows. Invalid
  epoch-zero timestamps cannot invalidate neighboring slots. Wire checks cover
  CRC, UTF-8, status/flag combinations, length/bitmap bounds and exclusive expiry.
- All 17 language catalogs include the five-slot instructions, each layout map,
  Peek behavior, diagnostic messages and boolean states. Old visual setting IDs,
  layout values and the app UUID are preserved.
- A clean native Emery build succeeds with **SDK 4.33.1**: resources **117,903
  bytes**, RAM footprint **17,449 bytes**, free heap **113,623 bytes**. The
  permission packager adds manifest version 2 and an empty declared permission
  list for dynamic selected-source access. It verifies that SDK-built JavaScript,
  resources and watch binary remain byte-identical. The final bundle contains
  neither legacy direct-weather endpoint.
- **70 native emulator captures** cover all layouts with all five values, mixed
  data, empty holes, denied placeholders, zero/false, negative Fahrenheit,
  long localized text, icon-only and color-image data, largest packets, normal
  and extra-large text, shadows/depth and custom text colors.
- Clock checks include `11:11`, midnight, `23:59`, single-digit 12-hour time and
  watch-local timestamp formatting. Long Czech/Finnish dates are checked in all
  three layouts. Peek keeps the date/clock and slot 1, hides slots 2–5 and restores
  their original positions on dismissal.
- The exact **1,866-byte maximum packet** survives all eight persistence chunks
  and relaunch with an exact before/after image match. Advancing the clock past
  the original receipt expiry shows placeholders instead of renewing data. The
  border regression has zero changed pixels in all four outer bands against
  beta 6; the locale tables and dot geometry helpers are unchanged.
- **12 additional guide captures** show weather, phone-plus-weather and both Peek
  cases. The numbered map uses native layout coordinates. Guide interactions
  were checked for slot selection, example switching, Peek and restoration.

Visual fixtures use the released watch binary/resources with an idle phone
script so live source callbacks cannot overwrite the injected records. The
Czech/Finnish previews are explicitly locale-only derivatives; the release uses
its real clock and watch locale. Peek uses the emulator's debug overlay. Native
provider delivery, permissions and physical phone/watch behavior still need
on-device checks; these results do not claim live provider accuracy or parity
with the Weather app.

Permission-packaged PBW SHA-256:

`59c7ae581a2110a6965833e55b0bc36719ef957f9d22c9d3a5e6fbea06d07777`

## 1.5.1 beta 6 — historical readability and condition checks

This update uses high/low ranges such as `19/5` and a larger droplet with a
precipitation percentage in all three styles. Comic cover's date is plain, and
its large clock is lifted slightly so the tallest `11:11` font clears the icon.
The optional current-condition icon defaults to on. Generic Pebble complication
slots are not implemented in this build.

- All **143 JavaScript tests** and **six standalone C test suites** pass. C checks
  use C99 with `-Wall -Wextra -Werror`; JavaScript syntax and `git diff --check`
  also pass.
- Coverage includes high-first range order, original Celsius/Fahrenheit values,
  negative temperatures, zero probability, missing fields, bounded buffers and
  independent settings. The new ten-byte condition packet accepts only the
  canonical current codes, retains its original shared-read confirmation and
  hides unsupported, malformed, future or expired data.
- Condition updates and clearing work independently of temperature availability.
  Delivery tests cover held snapshots, source/location changes, compatibility
  clearing and failed or superseded location-clear messages. A late callback
  cannot acknowledge another location's pending invalidation.
- All 17 language catalogs include the numeric range/droplet explanation and
  condition-icon controls. Saved option IDs, values and user location names
  remain unchanged.
- A native Emery build succeeds with **SDK 4.33.1**: resources **85,006 bytes**,
  RAM footprint **17,828 bytes**, free heap **113,244 bytes**. Permission packaging
  verifies manifest version 2, the original UUID and byte-identical SDK-built
  watch binary, resources and JavaScript.
- Native emulator captures cover Classic, Comic cover and Stacked time with
  both detail settings, each alone and neither; icon on/off and unknown/expired
  conditions; Celsius/Fahrenheit, negative extremes, forecast markers, `0%` and
  `100%`; normal/extra-large text, shadow/depth effects and custom text colors.
  The six supported icon types were visually inspected.
- Clock checks cover `11:11`, `23:59`, midnight, single-digit 12-hour time and a
  later date/time. Comic's `11:11` icon overlap was caught during inspection and
  corrected without shrinking the clock. Long Czech and Finnish dates were
  checked in both column layouts.
- Timeline Peek hides the icon and detail rows, then restores the selected
  layout. Relaunching preserves the selected style and weather/icon data with
  an exact before/after image match. Classic with icon and details disabled has
  a zero-pixel difference from beta 5's corresponding baseline.

Visual fixtures use the release watch binary/resources with an idle phone
script so live callbacks cannot overwrite them. The Czech/Finnish previews are
explicit locale-only source derivatives; the released app uses the watch's real
system locale and clock. Peek uses the emulator's debug overlay. These checks
do not claim physical phone/watch testing or live provider/Weather-app parity.
The on-device checks in `PLUGIN-WEATHER.md` still apply.

Permission-packaged PBW SHA-256:

`f82adb705091a0c058282d60982d8a66cb5ea32062ae88f90952d1898ced36e1`

## 1.5.0 beta 5 — historical layout checks

This update adds Comic cover and Stacked time beside the existing Classic layout.
Classic remains the default for upgrades and new installations. The layout
choice is saved independently of weather settings, and all styles use the
common compact clock layout during Timeline Peek. Layouts use the existing
weather sources, permissions and data protocol.

Checked on 31 October 2026:

- All **124 JavaScript tests** and **five standalone C test suites** pass.
  C checks use C99 with `-Wall -Wextra -Werror`. New coverage includes layout
  settings/enum conversion, all 17 translations, localized weather columns,
  clock splitting for 12/24-hour time, geometry and compact Peek selection.
- An Emery build succeeds with Pebble Tool 5.1.1, SDK 4.33.1 and GCC 14.2.1.
  The final package has the original UUID, manifest version 2 and the existing
  permissions. SDK-built watch binaries/resources and JavaScript are retained
  byte for byte by permission packaging.
- The final PBW SHA256 is
  `39b40b67672d4ba4b784d9f6cbe776bfb2a3dd43e56592d1f23c28b03a754a17`.
  Resources occupy 81,732 bytes; app RAM footprint is 16,000 bytes. A 24px
  temperature font gives longer readings an intermediate fitting size.
- QEMU checks use the exact delivered watch binary/resources with an idle
  phone script and dated weather fixtures. Inspected renders cover all styles,
  independent weather options, missing details, Celsius/Fahrenheit, negative
  extremes and forecast markers. Comic cover and Stacked keep signs and units
  visible and restore their selected layout after Timeline Peek.
- Actual clock/date changes were checked at 10:15, 15:42, 23:59, midnight and
  1:05 in 12-hour mode, including a change of day/month. No clock or date is
  frozen in the release. Stacked's rendering and saved values match before and
  after reinstalling/relaunching the same build in the emulator.
- Custom black text, the contrasting Comic caption, shadows and the four-step
  border were inspected. A matching Classic clock/weather sample has **zero
  changed pixels** compared with beta 4.
- Explicitly forced-locale derivative builds check Czech/Finnish long dates,
  abbreviated weekday fallback and localized columns. These differ at platform
  locale reads only; they do not verify installing a language pack on hardware.
- Visual checking caught `Fill` treating column newlines as spaces. Columns now
  use `WordWrap` for measurement and rendering; fresh English and Finnish
  screenshots confirm distinct rows. Classic retains its original inline mode.
- The harness waits for AppMessage acknowledgements and for injected watch time
  to settle before evaluating sample ages. This avoids stale fixture reads while
  changing emulator apps or dates. Syntax and `git diff --check` pass.

No physical phone/watch testing is claimed. Native Weather delivery and the
other historical runtime limitations below still apply.

## 1.4.3 beta 4 — historical localization checks

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
