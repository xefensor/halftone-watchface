# Halftone publishing package

## Current status

The files in this directory describe the 1.9.0 release candidate 3 build.
They replace the former 1.3.1 listing, which described a weather client that is
no longer used.

This package is prepared for a release candidate. **Do not submit this
plugin-dependent build to the public appstore while Pebble's preview restriction
remains in place.** Checked on 31 October 2026, the official [Plugins guide](https://developer.repebble.com/guides/plugins/) says: "Do not publish apps that
use plugins to the appstore yet". Its linked publishing guide limits plugin
publishing to invited developers. This watchface consumes plugins; it does not
supply a plugin. Preparing these files or distributing the PBW for sideload
testing does not establish appstore approval.

The implementation targets the plugin contract documented for Pebble mobile
**1.16.0.5**, with the plugin preview enabled. This is not a claim of physical
phone/watch verification. Music and notification sources are currently Android
features. Current build/emulator results and remaining device checks are in
[validation](../docs/VALIDATION.md).

The candidate bundle is `Halftone-1.9.0-rc.3-store-package.zip`. The PBW keeps
the numeric SDK version **1.9.0**; `rc.3` identifies the test package, not a
separate native version. If another 1.9.0 is already in the dashboard, choose a
new unused numeric version before uploading.

The normal layout uses two equal horizontal complication columns. Both readings
condense above music or notification context; neither is replaced. Native
Timeline Peek keeps both selected readings in a compact horizontal row above
Pebble's native panel. Halftone's own contextual panel yields while Peek is open.
**Big text** enlarges the date, clock, readings and units, and contextual text,
with fitting for longer content. The clock is centered using compiled glyph
bounds and adapts to active context. Album art matches the two-line music
block (40 pixels normally, 48 with Big text), using a source image capped at
24 pixels. Rectangular music images are center-cropped to a square before
scaling, preserving proportions without stretching. One-line music art uses
32 pixels; generic complication images and 24-pixel notification icons fit
inside their boxes without cropping. The title inset follows the displayed art, preserving the long-title
hide-art rule. The halftone dots and rounded border are unchanged.

## Listing fields

| Field | Prepared value |
| --- | --- |
| Type | Watchface |
| Title | Halftone |
| Developer | Xef |
| Platform | Pebble Time 2 / Emery only |
| Version | 1.9.0 — verify it has not already been used in this listing |
| UUID | `d4dd5046-53be-4624-99e8-46e0b377fe66` |
| Description | [description.txt](description.txt) |
| Release notes | [release-notes.txt](release-notes.txt) |
| Binary | `Halftone-1.9.0-rc.3.pbw` |
| Website/source URL | https://github.com/xefensor/halftone-watchface |
| Privacy information | https://github.com/xefensor/halftone-watchface/blob/main/store/PRIVACY.md |
| Support | https://github.com/xefensor/halftone-watchface/issues |
| Source license | PolyForm Noncommercial 1.0.0; retain Xef's attribution notice |

Use the existing Halftone listing and UUID. The developer's existing account
identity and support-email settings should be checked in its preview. This
project does not specify a separate companion app. Keep the bundled font's SIL
Open Font License with source distributions.

## Images

The included screenshots were captured from the final candidate native binary
and resources. Their hashes and fixture provenance are recorded in
[asset-provenance.json](asset-provenance.json). Recapture them after any future
native change, keeping the names below:

| Order | File | Content |
| --- | --- | --- |
| 1 | `emery_01_orange.png` | Orange, two balanced complication columns |
| 2 | `emery_02_blue_large.png` | Blue, Big text enabled |
| 3 | `emery_03_green_shadow.png` | Green theme with text shadow |
| 4 | `emery_04_music.png` | Dynamic music panel |
| 5 | `emery_05_notification.png` | Optional notification panel with fictional sample text |

Emery screenshots must be raw **200 × 228** images without a watch frame; at
most five can be used. A promotional banner is optional and must be **720 × 320**.
Image files and the PBW each have a **4.4 MB** upload limit. Watchapp icons are
not required for this watchface. The prepared PNGs meet the image format choice.
The description is kept below 1,600 characters for compatibility with older
listing forms; the current submission guide specifies plain text.

`banner-source.svg` references `emery_01_orange.png` and the bundled Fira font.
The included 720 × 320 banner was re-rendered from that final screenshot.
Re-render it after changing the screenshot so the banner and release agree. Framing belongs in the banner only. Emulator
fixtures illustrate the design; sample weather is not a live accuracy claim.
Do not use the Timeline emulator's blank system placeholder as a store screenshot.

## Package verification

- Confirm `package.json`, the exact PBW and the listing agree on numeric version,
  UUID, watchface type and Emery target. Preserve the app identity for upgrades.
- Verify the packaged PBW has `manifestVersion: 2` and declares `ReadMusic`.
  Runtime source permissions remain Pebble's responsibility; no Internet
  permission or provider-specific weather fallback is added.
- Verify the release PBW's native binary, resources and JavaScript match the
  tested SDK output. Check its SHA-256 against the included checksum file.
- Use the current description, release notes and privacy information; do not
  reuse the old independent-weather disclosure or six-hour-cache claims.
- Confirm every image has the exact required size and current build provenance.
- Keep a source archive with the licenses, and exclude dependencies, credentials
  and nested release archives.

## Remaining device checks

Install the exact release PBW on a physical PT2 with a supported preview-enabled
Pebble mobile app, then check:

- Set global complications 1 and 2; verify empty choices retain their positions.
  Change a provider and source units in Pebble, then verify the shown values.
- Confirm source updates while the face remains open, including a source error
  and recovery. Do not infer a failed refresh solely from an unchanged value.
- Test 12/24-hour time, normal/Big text, longest localized dates, negative
  and decimal values, colors, shadow and both border options. Compare `22:14`
  and `1:05` with and without context: the clock must balance between the date
  and readings, fit its current space and stay still during dissolve frames.
- Play, change, pause and stop music. Both readings must remain in the compact
  row above it. Test short/long titles, one/two-line music blocks and missing
  artwork. Verify album art height matches the music block, notification icons
  stay small, and long-title artwork hiding still works. Rectangular album
  art should fill the square through a centered crop, without stretching;
  generic reading images and notification icons must remain fully visible.
- Opt into notification summaries. Verify existing notifications do not replay,
  app filtering works, body text stays hidden by default, and turning it off or
  disconnecting clears private content immediately.
- Disconnect/reconnect the real phone. Verify data resumes and earlier private
  content cannot replay. The emulator's Bluetooth flag is not proof of this path.
- Show/dismiss Timeline Peek during normal readings, music and a notification.
  Both selected readings must remain visible side by side above the native
  panel in both text sizes. Halftone's contextual panel must yield to Peek.
  A notification that expires while Peek is visible must not return afterward.
- Confirm the settings translations and chosen source permissions on the phone.

## Submission after the preview restriction is lifted

Recheck [Preparing a Submission](https://developer.repebble.com/guides/appstore-publishing/preparing-a-submission/)
and [Publishing an App](https://developer.repebble.com/guides/appstore-publishing/publishing-an-app/)
before using these instructions. Requirements can change while plugins are in
preview.

Use the [Developer Dashboard](https://developer.repebble.com/dashboard), open the
existing Halftone app and choose **New Release**. Upload the exact prepared PBW,
add the release notes, and **uncheck Publish immediately** to keep it as a draft.
Update the listing text and images through its Edit screen. Saving listing
changes can affect the live listing; the new release should remain a draft until
all eligibility and device checks are complete.

Avoid using `pebble publish` just to prepare a preview: its uploads are published
immediately, and it rebuilds the project. A dashboard draft allows the exact
verified permission-packaged PBW to be uploaded without that rebuild. No public
store submission has been performed by preparing this package.
