# Halftone support

Halftone **1.10.3** is published for **Pebble Time 2 and Round 2**.
[Product and installation](https://xefensor.github.io/xoce/projects/halftone/) ·
[Setup guide](https://xefensor.github.io/xoce/docs/pebble/halftone/) ·
[Common problems](https://xefensor.github.io/xoce/docs/pebble/troubleshooting/).

## A reading or activity is missing

Enable plugin support where your phone-app build requires it, keep the phone
connected and review permissions for the chosen sources. Readings use Pebble's
first two global **Complications** choices. Timer uses the separate
**Content & priority → Activity priority** list: enable **Show activity plugins**
and Timer's **Show**, then adjust its Move up / Move down controls and Save.
Halftone has its own activity order, separate from Dynamic and Dashboard.

Built-in music and notification integration requires Android. Halftone does not
run its own weather service; see [weather troubleshooting](docs/WEATHER-TROUBLESHOOTING.md)
for missing-provider diagnostics. Missing, expired and unavailable readings are
not invented as zero.

## Saving, appearance and shortcuts

**✓ Saved** confirms phone persistence, separately from Applied on watch. Keep
the connection and use the page's watch-delivery retry when offered. Failed or
uncertain writes keep the draft. Follow Pebble appearance is unavailable on the
pinned SDK and keeps the last explicit Light/Dark fallback; choose a palette or
Follow Quiet Time when you want a predictable watch appearance.

For Open Activity, select **Halftone** as its source, save its Primary/Secondary
shortcuts and match them in Pebble's Quick Launch settings. It opens the whole
associated app. Timer retains its own pause/resume and alarm controls.

## Report a problem

[Open an issue](https://github.com/xefensor/halftone-watchface/issues). Include the
Halftone version, watch model/firmware, phone/Pebble app versions, selected source,
steps to reproduce, expected result and actual result. Remove private notification,
music and exact-location content from screenshots or logs.

Current [release evidence](docs/RELEASE-READINESS.md) distinguishes portable tests,
browser simulation, emulator rendering and physical-device gaps. Publication does
not turn an emulator capture into a physical-watch test. Older source archives
retain their original policy and setup descriptions.
