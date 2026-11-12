# Current Halftone contracts

The development candidate adopts Dynamic 0.18.3's shared engine and activity capabilities.
The SDK label remains 1.9.0 for local development; this is not a replacement rc.6 release.

Core 0.5.2 supplies v1–v4 reading decoding, public identity/observation metadata and
public-only cache handling. Generic receipt leases last at most two hours, shortened
by original source expiry. Music/notification readings do not survive cache reopening.
Halftone preserves its legacy cache namespace, persistent ranges and original key numbers.

Activities 0.4.4 supplies ACT3 source/run identity, primary/secondary selection, clocks,
Timer/plugin activities and built-in music/notifications. New notifications use an
original eight-second burst, shortened by earlier expiry; updates do not extend it.
Start/reconnect requires a confirmed baseline. Private content is transient and clears
immediately on invalidation, privacy revocation or disconnect. Additional vibration is
Off by default, deduplicated per burst and suppressed by Quiet Time.

Only actually painted indices are confirmed to the phone and published through
Halftone's navigation plugin. Open Activity is separately installed and configured to
use this source. The plugin stores destinations and freshness, not private activity text.
The stock platform cannot prove which face immediately preceded an app launch.

Settings retain the clay-settings authority and explicit named/numeric migration,
including Big text, shadow, depth and panel transitions. New colors default to Halftone's
orange/white, with a blue accent. Existing colors and privacy switches survive upgrading.
Follow Pebble/12/24 format, Quiet Time colors, activity priorities, notification filtering
and privacy are supported in all 17 existing locales. Saving preserves a draft until
readback confirms storage; watch delivery is tracked separately and retries are bounded.
Previewing an example never enables its feature or changes privacy.

The watch uses one queue and one bounded native render plan. Clock ticks neither send
messages nor persist data. Covered views update expiry without decorative redraws or
new navigation claims. Genuine incoming item changes may dissolve for 180ms; appearance
transitions and native Peek movement respect the animation preference and unobstructed area.

Development and QA use ignored build/. Historical documents and store materials describe
their original published version; docs/VALIDATION.md does not certify this candidate.

Supporting type follows its local override or the launch-time OS size using
Halftone-owned profiles and
measured bezel/Peek bounds. See [native type validation](native-type-checkpoint.md)
for the exact local candidate, font audit, comparison captures and remaining scope.

## Display preference ownership

The existing `clay-settings` record remains authoritative on the phone. Delivery
metadata under `halftone-settings-delivery-v1` is now version 2; old transport-only
success cannot establish Applied. Valid older pending choices migrate through a
verified settings save. Unknown saved fields survive. A phone with no explicit
native preferences adopts the watch's raw colours/optics before sending defaults.
Configuration-only plugin reads never initialize watch delivery or activity work.

Native key **78** owns a versioned 76-byte snapshot: revision, both raw RGB
palettes, clock/status/animations/vibration, text size, appearance mode, last
manual palette, Bigger Text, depth, shadow and panel dissolve. Validate all fields,
verify persistence readback, then apply and reply. Keep legacy integer/boolean
keys as compatible mirrors. Preserve raw RGB before GColor quantization.
Measurements and painted-role cache invalidate when type or optical choices change.
Display outbox replies never acknowledge a Core session or refresh observations.

New desired choices and fresh runtime/native mismatch retries use new verified
wire revisions. Old receipts and late callbacks cannot establish Applied after
invalidation; failed revision storage prevents reuse. Source traffic cannot reset
an exhausted retry budget. The phone keeps pending choices through reopening.

The pinned SDK retains its 65,535-byte native virtual-size limit. Compact key
references, per-field validation and narrower constant tables preserve every
font/clock/dot value while fitting the candidate. Keep that budget explicit when
adding native code; do not silently change the SDK or omit glyph coverage.


## Round 2 development layout

Gabbro uses the complete 260×260 physical display. Text and artwork are fitted
inside the chord for their vertical band; the shared UI library owns only
geometry and drawing. Time 2 retains its established rectangular composition.
The SDK 4.44 reference and disposable candidate evidence are in the workspace's
`Round2-Development/` directory. This is development work; frozen release files
and historical QA are unchanged. No physical Round 2 or Android result is implied.

Clock raster buffers and activity transition distances use the display dimensions.
Readings fit one shared numeric size before measuring their supporting lines.
Activity plans retain their fitted endpoint geometry throughout item motion.
Peek reads the root window's unobstructed area and keeps the physical circle's
center fixed. Phone preview frames select the connected watch's display shape;
an unknown watch exposes the temporary preview-watch selector.

When the face is running, phone previews select the connected Time 2 / Round 2 automatically. Plugin-only settings cannot read WatchInfo; their temporary preview-watch selector affects only the current page and is never saved or sent to the watch.

Required round activity footer data is fitted against its final circular band before optional labels and symbols. The existing utility outlines may yield down to 16px for an atomic value and unit; an unrepresentable datum uses the localized overflow label. Optional identity may ellipsize. Secondary content yields before the required primary block.
