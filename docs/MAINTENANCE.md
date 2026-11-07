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
