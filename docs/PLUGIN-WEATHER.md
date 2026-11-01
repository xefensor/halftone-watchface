# Weather through Pebble complications

This guide applies to **Halftone 1.9.0 rc.6**. It displays the first **two**
global complication choices from the Pebble phone app. Choices 3–5 remain
available to other faces but are not subscribed to, displayed or cached by
Halftone. Download the candidate from the [README](../README.md).

There is no Halftone weather preset, provider picker, API-key setting or hourly
forecast cache. The native clock and date do not use complication slots.
See [the slot positions and supported formats](COMPLICATIONS.md).

## Choose weather readings

Enable the plugin preview if needed, then open **Complications** in the Pebble
phone app's Settings. In some preview builds it is under **Settings → Plugins**.
Configure a weather provider and locations in Pebble, then choose two readings:

| Global choice | Suggested reading | Other examples |
| --- | --- | --- |
| 1 — left | Weather → Location → Temperature | High, Low, Condition or another scalar reading |
| 2 — right | Weather → Location → Precipitation | High, Low, Condition or another scalar reading |

Choose the same location for both readings if you want one coherent weather
arrangement. The location selector is positional: reordering saved weather
locations can change which place an existing complication refers to. Recheck
both choices after changing that order.

These are examples, not reserved weather roles. Either slot can show phone
battery, a calendar reading or another supported source instead. Halftone
preserves the left/right positions and does not combine High and Low. A valid
weather/location precipitation probability from 0–100 can use the rain droplet;
other percentages, including humidity and battery, do not become rain readings.
A source's own icon or image can accompany its value.

## Units and permissions

Pebble and the selected provider control source units and formatted text.
Halftone preserves them rather than offering a separate Celsius/Fahrenheit
setting. Use Pebble's weather/unit settings or the provider's configuration.
The two sources can use different units if that is what you selected.

Halftone declares no Internet or blanket Location permission. Reading a chosen
weather source can ask for Location through Pebble's source-permission flow.
Other choices can require their own permissions or provider sign-in; configure
those in the Pebble phone app. Halftone makes no independent weather HTTP request.

## Comparing with Pebble Weather

A complication reads the plugin selected for its category and item in Pebble.
For weather, this can be the external preferred provider directly. Pebble's
native Weather app can instead show the database produced after the phone's
weather importer normalizes that provider's data and applies its own per-location
fallback. Available fields, rounding, instance order and update times can
therefore differ.

Use matching locations and units when comparing values. Switching to generic
complications does not improve the upstream provider's accuracy or fetch it
more often. Halftone does not replace a failed direct source with another
provider; any fallback inside Pebble or the provider belongs to that source.

## Offline values and missing data

A confirmed reading is usable for at most two hours, or until the source's
expiry if earlier. Its original confirmation survives caching; replaying it
or reopening the face does not renew its age. Confirmation means receipt from
Pebble, not a new measurement by the weather provider.

An expired or unavailable selected reading shows `--`. An unconfigured slot is
blank without moving the other reading. Both readings remain visible in a
compact horizontal row above music, notifications or native Timeline Peek.
The native clock and date keep running while data is unavailable.

Choose scalar Temperature, High, Low or Precipitation instead of an hourly or
daily series. Series-only properties are unsupported and show `--` with a
settings diagnostic. Missing values never become zero; a supplied `0%` remains
valid. If a provider is absent, a permission is denied, or an instance position
no longer exists, check Halftone's per-slot diagnostics and the global source
configuration.

For `PLUGIN_UNAVAILABLE` across multiple faces, use the [weather troubleshooting
guide](WEATHER-TROUBLESHOOTING.md). Halftone shows the full reason in settings
and retries source registration with bounded backoff; it has no independent
weather fallback.

## Remaining device checks

- Configure the two suggested readings and verify their fixed left/right
  positions. Replace either with phone battery to confirm it has no fixed weather role.
- Leave one slot empty and confirm the other retains its position. Change
  choices 3–5 and confirm they do not affect Halftone.
- Compare matching source locations/units, then change the global choices and
  provider. Check that replaced data clears.
- Deny and allow a selected source permission. Confirm the slot reports the
  problem and resumes after access is allowed.
- Check `0%`, negative values, long text, source icons/images and a series-only
  choice. Check the unavailable diagnostic rather than treating it as zero.
- Restart offline within and after the two-hour limit, and test an earlier
  provider expiry. Confirm receipt times are not presented as observation times.
- Open and dismiss Timeline Peek during normal readings and context. Both
  readings must remain side by side above the native panel, in both text sizes.

These are checks to perform on a supported physical phone/PT2, not a claim that
those paths have already been verified. Actual build/emulator checks are
recorded by version in [VALIDATION.md](VALIDATION.md). Historical beta archives
retain the documentation matching their earlier weather presets and five-slot
layouts.

References: [Pebble plugin guide](https://developer.repebble.com/guides/plugins/preview/),
[Preferences implementation](https://github.com/coredevices/mobileapp/blob/master/pebble/src/commonMain/kotlin/coredevices/pebble/plugin/PreferencesPlugin.kt),
and [native Weather importer](https://github.com/coredevices/mobileapp/blob/master/pebble/src/commonMain/kotlin/coredevices/pebble/weather/WeatherFetcher.kt).
