# Halftone 1.4.2 beta 3 validation

Checked on 31 October 2026. This is a sideloadable beta, not a Store release.

## Automated checks

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

## SDK build and emulator

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

## Remaining limits

No physical phone/watch testing is claimed. Check settings permissions, actual
provider delivery, saved-location changes, reconnection and daily rollover on
the device. Native shared weather does not provide the provider's original
measurement timestamp or model issue time; a successful read only confirms the
values stored by Pebble. Its fixed UTC offset and daily steps also cannot
reconstruct unreported daylight-saving changes.

Daily details require explicit supported units and compatible date metadata.
They stay hidden when unavailable or while the compatibility weather client is
active. The new toggles default to off, preserving the existing default layout.
