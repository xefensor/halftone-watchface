# Halftone release validation

## Distribution and documentation

The current downloads are the
[v1.9.0-rc.6 GitHub prerelease](https://github.com/xefensor/halftone-watchface/releases/tag/v1.9.0-rc.6),
frozen from tested commit `dca19138bae62455609d359065324acffedbf041`.
The measurements below describe those artifacts and their earlier candidates.
Later documentation and [release automation](GITHUB-RELEASES.md) changes on
`main` do not rebuild or replace them. Release-helper tests and asset validation
are separate from native rendering and physical phone/watch verification.

## 1.9.0 rc.6 — shared core migration

- The data, transport and native cache/lifecycle engine is now supplied by the
  pinned **Pebble Watchface Core 0.1.0** package, shared with Dynamic. The same
  committed tarball, SHA-256, npm integrity and source commit are recorded in
  `vendor/CORE.json`; `npm ci` installs it without a registry publication.
- Halftone retains its UUID, all 31 AppMessage keys, persistent settings/cache
  keys and legacy phone cache namespace. Native rendering and fonts are local.
  No dot, layout, font or color change is part of this migration.
- **225 JavaScript tests and nine strict C99 suites pass** through the actual
  installed dependency. Core's own **83 JS tests + three native suites** cover
  packet fixtures, queues, expiry, reconnect handshakes, cache failures and
  privacy clearing; the core-state suite also passes sanitizers.
- **14 exact native visual comparisons to rc.5 pass**, including both text
  sizes, music/notifications/Peek and all five listing themes. Five native
  upgrade/lifecycle checks pass: saved settings and cached readings survive
  installation, session tokens advance, music/notification expiry works without
  menu navigation, Peek restoration uses fresh context and relaunch clears
  transient private content. The run has 22 screenshots (21 candidate, one
  legacy seed); 204 fixture packets also match the extracted JS encoder byte
  for byte. These are emulator checks, not physical phone/plugin verification.
- Final core repackaging leaves the tested native binary/resources and exact
  PBW hash unchanged. The compiled-font verifier retains **25,920 clock +
  522,648 date + 820 context-glyph checks**. The active phone dependency graph
  contains seven local modules and five core modules; no legacy weather client
  is active. Native identity and permission packaging remain unchanged.

PBW SHA-256:

`c2b4a629c9ad00b8244ada66e0d224a40bd57680a3a4014e14a997b613c4959c`

Native binary SHA-256:

`f879373427e69f698018d1bc4953ecb589d079ed0887809e55e6b1ad30eda0d7`

Resources SHA-256 remains:

`b52b3456e45f5bdeb4e97ecec2ddf188953f6cdade42aa33feaf58070433e803`

## 1.9.0 rc.5 — artwork aligned to the text bottom

- Artwork keeps the rc.4 sizes (32px standard / 40px Big for two lines; 28px
  for one line). Its opaque bottom now follows the fitted foreground text,
  excluding the one-pixel shadow. The text is prepared once after font fitting
  and ellipsis; visible bounds respect the existing context-layer clipping.
  Text positions, clock/date, readings and border geometry are unchanged.
- A generated table covers **205 bundled codepoints × four context fonts =
  820 exact ink-bottom values**, verified against the final packaged PFOs.
  The same bitmap sampling path drives rendering and visible-bottom lookup,
  accounting for crop, contain-fit letterboxing and transparent icon padding.
- **34 final native captures pass:** 30 actual opaque-bottom comparisons plus
  four unchanged Timeline Peek endpoints. Standard/Big, one/two-line music and
  notifications, descenders, long fitted/ellipsized strings, transparent and
  landscape icons, mixed emoji, BMP fallback and explicit missing glyphs are
  covered. **30,000 source-pixel checks pass.** Final sheets were visually
  reviewed before refreshing the listing/documentation captures.
- Two-line Genesis/Justice and notification panels now end at foreground row
  203 with artwork ending on the same row. Single-line standard Genesis ends
  at 195 and WhatsApp/Petr at 196; their art follows each fitted line rather
  than using a shared fixed offset. Big mixed Orbit/emoji ends at 193 and
  standard at 195, also matching the artwork.
- Native testing found that system emoji bypass the bundled wildcard font.
  The final policy follows PebbleOS's emoji baseline convention while keeping
  source text unchanged; non-emoji missing glyphs retain the compiled wildcard
  metric. Firmware owns fallback glyph artwork, so this is not an exact ink
  guarantee for all Unicode. Separate emoji-only Saturn diagnostics show a
  2px painted-ink/baseline difference; these are not counted as exact alignment
  passes. Existing context text/shadow clipping is unchanged by this tweak.
- **225 JavaScript tests and nine strict C99 suites pass**. The final changed
  reading helper passes AddressSanitizer/UndefinedBehaviorSanitizer with
  unsupported leak scanning disabled. The compiled helper also passed 944
  session checks across glyphs, text, Unicode and bounded UTF-8 decoding.
  The release verifier retains **25,920 clock checks + 522,648 localized date
  checks**, and rejects drift in the generated context metrics.
- SDK 4.33.1 builds **149,964 resource bytes**, a **28,970-byte RAM footprint**
  and **102,102 bytes free heap**. Exact SDK payloads, all 31 C/JS keys, eight
  active phone-source modules, original UUID/ReadMusic permission and seven
  nonfallback Unicode-minus glyphs pass release audit. Settings controls and
  translations are unchanged; the earlier Clay browser corpus is retained.
- Native captures use idle phone JavaScript and production-encoded fixtures.
  They verify rendering, not live phone/provider data or playback. Physical
  Bluetooth callbacks and real Timeline event text still need device checks.
  Five final listing screenshots are separate from the 34 focused captures.

Final PBW SHA-256:

`5caec4ca5464ff8de5aca8d63eb1431e4ad4b6a3ba48b23aabf38780fc60dae0`

Native binary SHA-256:

`65740ee124dd74f17a56fe47626220abdc4d0baf67c5636370fcc399f068f51d`

Resources SHA-256:

`b52b3456e45f5bdeb4e97ecec2ddf188953f6cdade42aa33feaf58070433e803`

## 1.9.0 rc.4 — smaller, lowered artwork and matching notification icons

- Two-line music artwork and notification icons now share a **32px standard /
  40px Big text box**, inset 4px vertically then lowered another 2px. Their
  two-line boxes end at screen y202, leaving 2px before the panel bottom.
  Single-line context uses a 28px box, also 2px below vertical center.
  Text remains 6px to the right of the displayed box.
- Music images retain center-cropping; notification icons retain their aspect
  ratio and contain fit. Artwork fitting and rendering use the same width.
  The balanced clock, date guard, two reading columns and dots are unchanged.
- **16 focused native captures pass** on the final rc.4 payload: normal/Big
  music and notification panels, two/one-line text, rectangular music sources,
  and Timeline Peek. **13,632 source-pixel checks** verify music crop sampling
  and notification mask scaling/placement. Both Peek views hide context and
  retain both readings. Minimum measured date/clock gap is 13px; clock/reading
  gap is 9px. The contact sheets were visually reviewed before asset refresh.
  Five final listing screenshots are separate from these 16 captures.
- **225 JavaScript tests and nine strict C99 suites pass**; the changed reading
  helper also passes AddressSanitizer/UndefinedBehaviorSanitizer with unsupported
  leak scanning disabled. The exact-PBW verifier retains all **25,920 clock +
  522,648 date checks**, including the 7px minimum corpus date/clock gap.
- Release audit verifies exact SDK payloads, all 31 C/JS message keys, eight
  active phone-source modules, original identity/permissions and seven real
  Unicode-minus glyphs. Resources remain **149,964 bytes**, RAM footprint is
  **26,791 bytes**, with **104,281 bytes free heap**. Settings controls and
  translations are unchanged; the earlier 68-case Clay browser corpus is not
  repeated for this artwork-only change.
- Captures use an idle phone-script derivative with production-packed fixtures.
  The broad rc.3 state tests remain recorded below against their named builds.
  Live phone/plugin delivery, physical playback, Bluetooth callbacks and actual
  Timeline event text still require device confirmation.

Final PBW SHA-256:

`5d4fd52f545ac0b8cbd36e9954ffab088452feac2323ea716bc9bdefa5b5ae33`

Native binary SHA-256:

`7f517b883fcea5eab518ae60fc4668cc8b3f187bdc7d23067f9e8e897ef75aff`

Resource SHA-256 remains:

`b52b3456e45f5bdeb4e97ecec2ddf188953f6cdade42aa33feaf58070433e803`

## 1.9.0 rc.3 — balanced clock and full-height album art

- The clock is positioned from compiled glyph ink bounds, with a 96px visible
  center in the normal view and 88px with active context or Timeline Peek.
  Big contextual clocks fit within an 88px font cap. This lowers shorter clocks
  such as `22:14` while preserving clearance around tall narrow clocks.
- Album art fills the two-line music block: **40×40px normally, 48×48px with
  Big text**, or 32×32px for one line. Rectangular music images are center-cropped
  before scaling; source images remain capped at 24px. Generic complication
  images and notification icons retain their contain fit. Text insets and the
  hide-art-to-fit rule use the actual displayed artwork width.
- Accented weekday tails are guarded against the clock. The release verifier
  reads the exact packaged PFO font resources and checks the C metric tables.
  **25,920 clock checks** cover 2,160 formatted 12/24-hour values across 12
  size/context/shadow presentations. **522,648 date checks** cover 43,554
  weekday/date strings from all 17 languages across those presentations.
  All 11 clock fonts, five date fonts and eight date-tail rows agree with the
  compiled glyphs. Minimum corpus date/clock gap is 7px; date ink starts at
  least 20px below the top. These are compiled-font checks, not screenshots
  from 17 installed language packs. Stale packages and deliberately altered
  clock/date metric tables are rejected.
- **225 JavaScript tests and nine strict C99 suites pass.** Both changed helper
  suites also pass AddressSanitizer/UndefinedBehaviorSanitizer with unsupported
  leak scanning disabled. Crop bounds cover all 576 source dimensions from
  1×1 through 24×24. Existing layout checks cover every visible height from
  171 through 228px, either size, equal columns and footer clearance.
- **68 actual Clay browser cases pass:** 17 languages × two widths × light/dark.
  No overflow or clipped controls; toggle/save behavior and the rc.3 diagnostic
  label pass. The form and translations are unchanged from rc.2, so the approved
  settings-preview images are retained.
- **356 broad native captures pass** across both sizes, six representative
  clocks, normal/music/notification/Peek states, empty and sparse slots,
  loading/stale data, extreme values, ranges, status indicators, artwork
  shown/hidden/missing, long titles and one-line panels. All 108 whole-image
  Peek comparisons hide context consistently. Pixel checks verify rectangular
  covers are center-cropped into 40/48px squares. Minimum measured gaps are
  7px from date to clock and 7px from clock to readings.
- Broad checks include notification expiry back to music, pause grace, expiry
  during Peek, explicit and malformed clears, context transitions, identical
  heartbeat updates and disabled transitions. Only the footer changes during
  dissolve frames. This broad run used the pre-date-guard package
  `05b5a09e5c6643e218e45c5a306e4bf4010631a5e590c3ab2c88f36b8da13698`,
  native binary `e904a66e25eb8d5c61900ebab3d93c8d8576ea64620336da0f52cd0891b1967d`.
  Its resources are identical to the final candidate. The final native change
  adds only the date-tail clearance guard.
- **16 final-candidate endpoint captures pass**, including the reported
  `22:14` with shadow, normal/Big full/Peek/music, narrow tall clocks, artwork
  hidden to fit and rectangular covers. Minimum measured endpoint gaps are
  9px/9px. Both selected complications remain horizontal in Peek. Final listing
  screenshots and documentation previews use this candidate's native payloads.
- Native captures use an idle phone-script derivative and production-encoded
  AppMessage fixtures. The emulator's system Peek card is blank; real event
  text, physical phone/plugin data, actual playback and Bluetooth-disconnect
  callbacks still need device confirmation. No physical-device result is claimed.
- SDK 4.33.1 builds Emery with **149,964 resource bytes**, a **26,831-byte RAM
  footprint** and **104,241 bytes free heap**. Exact packaged SDK payloads,
  all 31 C/JS keys, eight current phone-source modules, the original UUID and
  `ReadMusic` permission pass release audit. Seven complication fonts contain
  real Unicode minus glyphs. No legacy weather client is active.

Final PBW SHA-256:

`b1fe582f1da703d26e294e9961180bf69a9d4a6704edc1a9eda8ca67ce08be3d`

Final native binary SHA-256:

`a738a5dcb1c5ef37feb704a64239399bd6b1515efdecec5b24bb862204f48a2b`

Resources SHA-256:

`b52b3456e45f5bdeb4e97ecec2ddf188953f6cdade42aa33feaf58070433e803`

Earlier sections describe their named historical builds.

## 1.9.0 rc.2 — two readings during Timeline Peek and Big text

- Native Timeline Peek now retains both selected complications in equal left/right
  columns above the system event panel. Empty choices retain their positions;
  music/notification context still yields to the native timeline.
- Big text retains the existing saved setting and enlarges date, clock,
  complications, units and contextual text. A new 44px complication font is
  available above the standard 38px preference. Every reading still fits down
  for long strings and narrow layouts; all seven reading fonts contain a real
  Unicode minus glyph.
- Complication rows sit higher to reduce unused space. The contextual panel is
  raised to clear the bottom dots, and status icons follow the chosen insets.
  The procedural dots and rounded bezel are unchanged.
- **225 JavaScript tests and nine strict C99 suites pass.** Layout invariants
  cover both readings at every visible height from 171 through 228px, either
  text size, legacy style values, equal columns and footer clearance. The
  changed geometry suite also passes AddressSanitizer/UndefinedBehaviorSanitizer
  with unsupported leak scanning disabled.
- **68 actual Clay browser cases pass:** all 17 languages, 320/390px widths and
  light/dark themes. Translated Big text/Peek help and actual toggle, save,
  color and notification controls pass. Both settings previews are refreshed.
- Compiled-font analysis fits **43,554 weekday/date strings** from all 17
  languages within the conservative 166px standard date budget. Clock font
  metrics cover **2,160 formatted 12/24-hour values**; focused native captures
  check the actual layout.
- **44 focused native screenshots pass** across both text sizes,
  full/Peek/music/notification layouts, wide and narrow clocks, signed extreme
  values, ranges and low watch/phone batteries. Earlier exploratory captures
  informed spacing. Four attempted emulator Bluetooth-disconnect captures did
  not trigger the real connection callback and are excluded from that count;
  the disconnect icon still needs a physical-device check.
- Final Peek interpolation targets the actual full/contextual row, with no
  last-frame position/size jump. Tests bound each geometry step to one pixel.
  **Eight final-build full/Peek endpoints and five Store captures** pass and
  are RGB-identical to the corresponding verified endpoint images. Earlier
  edge cases remain separately recorded against their prior native build.
- The native emulator uses an idle phone-script derivative and production-packed
  fixture messages. The final phone-side diagnostic version-label correction
  leaves native binary/resources byte-identical to those final captures.
  This is not physical phone/plugin/Bluetooth verification.
- SDK 4.33.1 builds the Emery candidate with **149,964 resource bytes**. All 31
  C/JS message keys, eight active source modules, original UUID/platform and
  ReadMusic permission are retained. Permission packaging preserves SDK native
  payloads. No legacy weather client is active.

PBW SHA-256:

`2037ec0af28197f8f73f8f28062c2e9d024288d4534638ccc38f5fc7265c58e5`

Earlier sections describe their named historical builds.

## 1.9.0 rc.1 — horizontal readings, spacing and settings

The checks below use the final release candidate, deterministic fixtures and
real browser/emulator rendering. No physical phone/watch result or public-store
acceptance is claimed.

- The first two global complications use equally sized horizontal columns.
  Both shrink into a compact row above music or notification context; neither
  is replaced. Empty slots keep their left/right positions. Native Timeline
  Peek still keeps complication 1 only while Pebble owns the lower area.
- Date fitting uses a consistent inset and a compact day/month separator, with
  a smaller font available for long translated weekdays. Large-clock fitting
  and vertical spacing are revised to keep text clear of the reading row. The
  contextual panel is inset and raised away from the bottom dots. The
  procedural bezel geometry is preserved.
- Settings group appearance, complications, dynamic content, optical effects
  and status/help. Short descriptions sit beside relevant controls, source
  diagnostics move to the bottom, and new help is translated in all 17
  supported languages. Existing setting keys and defaults are retained.
- Global source ownership/cache behavior, number/unit formatting, precipitation
  hints, artwork fitting, optional transitions, notification privacy and
  session-boundary behavior remain in scope.
- Prepared PBW, source archive, screenshots, banner, listing copy, privacy
  disclosure and publishing checklist are candidate deliverables. Pebble's
  [current plugin guide](https://developer.repebble.com/guides/plugins/) says
  apps using plugins should not be published to the public appstore yet.
  The candidate remains suitable for sideloaded preview testing while that
  restriction and physical-device checks are outstanding.

- **225 JavaScript tests** and **nine strict C99 suites** pass. The three
  complication/context/presentation helper suites also pass AddressSanitizer
  and UndefinedBehaviorSanitizer checks; leak scanning is disabled because the
  environment lacks the required `/proc` process data.
- SDK **4.33.1** builds the final Emery candidate: resources **130,180 bytes**,
  RAM footprint **24,306 bytes**, free heap **106,766 bytes**. All **31** C/JS
  message keys and **eight** bundled source modules match current source.
  Permission packaging preserves the SDK native binary/resources/JavaScript,
  original UUID and Emery target, adds manifest version 2, and declares
  `ReadMusic`. Repeat packaging is byte-identical and ZIP integrity passes.
  All six complication fonts contain a real Unicode minus glyph. No active
  legacy weather client or endpoint is bundled.
- Compiled-font metrics cover **43,554** localized weekday/day/month
  combinations. Compact `d.M.` dates fit all 17 languages within the 166-pixel
  text budget, including shadow allowance. **2,160** formatted clock values
  cover both 12-hour and 24-hour modes. Native screenshots caught a minimum-font
  overflow at `00:00`; standard and extra-large fitting now fall back to the
  existing 64px and 72px fonts respectively. This font-metric coverage is
  separate from the native screenshot cases and is not a claim of installing
  every watch language pack.
- The actual installed Clay form runs in Chromium **138** for **68 cases**:
  17 languages × two phone widths (320/390px) × light/dark themes. No JavaScript
  errors, clipped labels or horizontal overflow occur. Actual toggle, app-name
  filter, 64-color picker and Save interactions retain the expected values.
  Fresh color defaults remain `0xFF5500` and `0xFFFFFF`; Clay's sunlight-preview
  swatch does not rewrite the saved value. Long diagnostics wrap at 320px.
  See [light](images/settings-light.png) and [dark](images/settings-dark.png).

- **103 final native screenshots** pass: 92 layout/context/animation/privacy/
  spacing captures, six notification/session/Peek-expiry captures and five Store
  images. Both horizontal readings remain visible above context. Fitting covers
  sparse and hidden choices, signed/decimal/zero values, units, Unicode minus,
  artwork retention/removal, text truncation, low battery and white/black text.
  **36 focused full/Peek screenshots** meet measured horizontal margins of at
  least 4px for extra-large text and 16px for standard text. Complete `00:00`,
  `08:08`, `11:11` and `23:59` render without ellipses. The compact rain icon
  scales with the smaller row and clears the tall `1:05` clock.
- Classic and four-step procedural bezels are byte-identical in RGB to beta 10
  under an empty-reading, neutral-foreground fixture. Date/time margin changes
  are excluded from that comparison. Context stays clear of the bottom dots
  and yields as soon as native Peek begins to cover the screen.
- Independent transition frames affect only the footer; both readings, date,
  clock and bezel remain still. Identical lease heartbeats and transition-off
  captures remain pixel-identical. Expiry, explicit clears and malformed
  private packets clear immediately. A notice is captured while visible, then
  hidden by Peek, and never restored after its original expiry. Wrong session
  boundaries cannot unlock notices; a matching empty boundary permits fresh
  delivery. The local emulator transport required a backed-up state reset
  after repeated hot installs; the same final binary passed afterward. This is
  a tooling recovery, not physical Bluetooth verification.
- All native captures use the final binary/resources with an idle phone-script
  derivative and production-encoded AppMessage fixtures. Phone/plugin delivery,
  permission prompts, actual media apps and Bluetooth loss/recovery still need
  physical confirmation. See the [layout preview](images/horizontal-layout-states.png)
  and [native Peek capture](images/horizontal-peek.png).
- Five unretouched **200 × 228** native PNGs and the refreshed **720 × 320**
  banner meet the prepared listing dimensions and file limits. The banner uses
  the final orange screenshot and bundled Fira font. Asset hashes and fixture
  provenance are recorded in [asset-provenance.json](../store/asset-provenance.json).
  Listing text, release notes, current privacy disclosure, licenses and the
  publication hold/checklist are included in the store package.
- Source and Store archives are reproducible with fixed ZIP metadata and are
  byte-checked against current files. The source excludes dependencies, build
  output, credentials and nested release archives. The Store archive contains
  the exact verified PBW and an internal checksum manifest. Outer artifact
  hashes are recorded in `dist/SHA256SUMS.txt`.

Permission-packaged PBW SHA-256:

`51a91538f4fbb52cc85b6b0e8d4645efdc5666724c595d42da90045af94bf2f7`

Historical results below apply only to their named versions.

## 1.8.0 beta 10 — two large readings and panel presentation

The checks below use deterministic source fixtures and the released native
watch binary/resources. They do not claim physical phone/watch confirmation.

- Only global complication choices 1 and 2 are used. The first is the larger,
  pinned full-width reading; the second is slightly smaller and yields to music
  or new-notification context. Choices 3–5 are not subscribed to or cached.
  The new phone-cache signature rejects older five-reading cache records.
- Recognized numeric text separates large digits from smaller units while
  preserving source formatting, sign and locale punctuation. Unknown text,
  ranges and timestamps remain whole-text readings. A droplet requires an
  explicit weather-precipitation hint and valid 0–100% syntax; arbitrary battery
  or humidity percentages do not acquire weather artwork.
- Version-2 packets keep the five-record transport and 20-byte record header,
  using byte 5 for the generic/precipitation hint. Native decoding retains
  version-1 compatibility; contextual packets reject non-generic hints.
- Music and notification lines are wide and left-aligned. Artwork is omitted
  when its removal permits the full title to fit; other long text ends in a
  clean ellipsis. The primary reading remains in place across context changes.
- The optional incoming halftone dissolve lasts 180 ms with three callbacks,
  affects only the lower interior, and does not restart for identical content
  or lease refreshes. It does not delay expiry, privacy clearing, disconnection
  or Timeline Peek, and does not animate Peek restoration. The new control and
  two-reading help are translated in all 17 languages.
- Existing source ownership, units, permissions, short context leases,
  notification baselines/session tokens, app filtering, private-context
  non-persistence and native Timeline Peek behavior remain in scope. No timer,
  separate calendar, rain-warning or playback-control integration is added.

- **223 JavaScript tests** pass. These include two-choice source subscriptions,
  cache migration, sparse preference IDs, semantic precipitation hints and the
  retained context/transport/privacy behavior. All 17 languages cover the new
  two-reading help and transition control.
- **Nine native C suites** pass with C99 and `-Wall -Wextra -Werror`.
  Complication-data, context-data and reading-presentation helpers also pass
  AddressSanitizer/UndefinedBehaviorSanitizer checks. Leak scanning is disabled
  because the execution environment does not expose the required `/proc`
  process data; no leak check is claimed.
- An SDK **4.33.1** Emery build succeeds: resources **130,180 bytes**, RAM
  footprint **23,906 bytes**, free heap **107,166 bytes**. All **31** generated
  C/JavaScript message keys and seven bundled source-map modules match the
  current manifest and source. UUID, Emery target and `ReadMusic` are preserved.
- Visual review caught an old cached font that omitted the Unicode minus.
  The build now includes complete font definitions in each font task's cache
  signature. A clean default-cache build produces identical font/resource
  bytes; native code differs only in the SDK's resource-timestamp header.
  Independent decoding of the final PBW confirms a distinct, nonzero U+2212
  glyph in all six complication fonts. Source signs and punctuation are retained.
- Permission packaging adds manifest version 2 while preserving all original
  SDK payloads. ZIP integrity and repeat-packaging byte equality pass. The active
  bundle has no legacy weather client or endpoints; the bundled Clay utility's
  generic XMLHttpRequest helper does not add a weather fallback.
- **51 final native emulator screenshots** cover the two readings, holes,
  ignored hidden records, version-1 compatibility, numeric units, signed values,
  Unicode minus, decimal comma, Fahrenheit, zeroes, ranges and unknown text.
  Source artwork is retained for short titles, hidden when that lets the whole
  title fit, and retained with an ellipsis for overlong titles.
  Notification title/body privacy, low battery indicators, themes and clock
  widths/formats also pass. Four outer 18-pixel bezel bands are byte-identical
  in RGB to beta 9. See the [normal/context previews](images/two-reading-states.png)
  and [native Peek capture](images/two-readings-peek.png).
- Independent animation samples requested at **40.9/70.1/140.1/240.1 ms** show
  the shrinking mask only within the lower content area; the final frame is
  pixel-identical to the still state. Clock, date, primary reading and bezel
  remain fixed. Identical lease-only heartbeats and transition-off snapshots
  remain pixel-identical. Expiry, explicit clear during a dissolve, malformed
  private packets and clearing during Peek act immediately. Peek restores
  current music, but never restores a notification that expired while hidden.
- Native session tokens advance across installs. Wrong-token boundaries cannot
  release unmarked notifications; a matching empty boundary permits a later
  fresh notice. The emulator's Bluetooth flag does not sever its phone session,
  so synthetic toggles do not prove physical disconnection. Actual media apps,
  plugin delivery, permission prompts and Bluetooth loss/recovery still need
  phone/watch confirmation.
- Native captures use an idle-JavaScript derivative with the final release
  native binary/resources; production-encoded fixtures are injected over
  AppMessage. Source coordination and permissions are checked separately by
  the JavaScript suites. The source archive is reproducible and byte-checked
  against current repository files, excluding dependencies, credentials,
  build outputs and nested release archives.

Permission-packaged PBW SHA-256:

`f383d0b9dbf257250fde41c29ea9d3dbb3f9ff77b438caa6c15156f9ada13e4b`

No physical-phone/watch success is claimed for beta 10. Historical results below
apply to their named versions.

## 1.7.0 beta 9 — historical adaptive layout and ephemeral context

The checks below use deterministic source fixtures and the released native
watch binary/resources. They do not claim physical phone/watch confirmation.

- One adaptive layout replaces the three-style selector. The clock, date and
  global complication 1 retain their areas. Global complications 2–5 form the
  normal lower grid; music or new notification summaries can replace that grid.
- Native Timeline Peek remains authoritative. It hides all secondary/contextual
  content and keeps the compact clock, date and primary complication. No
  separate calendar, timer or rain-trigger implementation is included.
- Music and low phone battery use maximum 120-second confirmation leases, with
  a one-minute source refresh. Paused music has a five-second grace period.
  Notification summaries are opt-in, last at most 12 seconds and keep their
  original expiry across unrelated updates. Baselines suppress existing items
  on startup, reconfiguration and reconnect; app-name filtering and a separate
  message-text switch control summaries.
- Context is a separately validated five-record snapshot. Native context is
  ephemeral and is not written to the global-complication cache. Disconnection
  and relaunch clear it. Native expiry scheduling does not wait for a minute
  tick. Low battery and connection status use small indicators, not panel
  takeovers. All AppMessage producers use one serialized delivery queue.
- Music declares `ReadMusic`; optional notification summaries use Pebble's
  runtime permission flow. No Internet permission, weather HTTP fallback or
  provider pin is added. The existing UUID and global complication contract
  remain unchanged. New settings and status framing cover all 17 languages.

- **217 JavaScript tests** pass, including an entrypoint integration test with
  the real complication/context coordinators and the shared transport. Tests
  cover opt-in notification access, same-ID chat updates, no replay of initial
  snapshots, stale/old ACKs, source expiry, permission/API changes, callbacks,
  heartbeat confirmation, pause grace, filters and translated controls.
- **Eight C suites** pass with C99 and `-Wall -Wextra -Werror`. The complication
  and contextual packet decoders also pass AddressSanitizer/UndefinedBehavior-
  Sanitizer checks. Leak scanning is disabled because the execution environment
  does not expose the required `/proc` process data; no leak check is claimed.
- A clean SDK **4.33.1** Emery build succeeds: resources **117,903 bytes**, RAM
  footprint **20,653 bytes**, free heap **110,419 bytes**. The Waf message-key
  generator now includes its key mapping in the cache signature; a previously
  stale SDK cache cannot restore old C/JS keys. All 30 generated keys match the
  package manifest. Compiled source-map contents match the current modules.
- Permission packaging preserves the app UUID and SDK payloads, adds manifest
  version 2 and declares `ReadMusic`. Optional notification permission remains
  requested only when enabled. The active JavaScript bundle contains no legacy
  weather HTTP endpoint. Repeat packaging produces identical PBW bytes.
- **34 native emulator captures** on the final PBW cover default readings,
  music/artwork, notification title/body privacy, long accented values, zeroes,
  holes, maximum packets, themes, shadow/depth and clock widths/formats. Clock,
  date and primary reading remain pixel-identical across six context states.
  Expiry restores the grid or music precisely; Peek hides and restores context;
  relaunch drops private data. Both low watch/phone battery icons render after
  the emulator's battery-monitor update. All four border bands are pixel-
  identical to the previous native reference.
- Reconnect protection uses a nonprivate session counter, exact token matching
  and notification-free boundary snapshots. Only a matching ACK releases fresh
  notification delivery. **14 additional native captures** verify fresh unmarked notifications stay
  hidden; corrupt or wrong-token boundaries cannot open the gate; a matching
  empty boundary permits later fresh notices; relaunch advances the token and
  rejects the previous one. Unmarked music, precise expiry and Peek restoration
  remain correct. All image equality checks use RGB differences, not the
  alpha channel of SDK screenshots.
- The emulator's synthetic Bluetooth toggle does **not** disconnect its Pebble
  app session. Those two captures are labelled as an injection limitation;
  they do not prove physical native disconnect behavior. Callback wiring and
  native clearing/gating are reviewed, and coordinator disconnection is tested.
  Actual Bluetooth loss/recovery, media apps and permission prompts still need
  on-device confirmation.
- The source archive is checked against current repository files and excludes
  dependencies, credentials and nested release archives.

Permission-packaged PBW SHA-256:

`5adff11c1963c00dc5e1ad34ea1fba9a2e16cce65566a2657eca64e35a332ee4`

No physical-phone/watch success is claimed for beta 9 until it is confirmed on
the device. Historical results below apply to their named versions.

## 1.6.1 beta 8 — historical source recovery and diagnostic checks

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

## 1.6.0 beta 7 — historical five-complication checks

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
