# Weather through Pebble complications

This guide applies to **Halftone 1.6.1 beta 8**. Its five data areas use the
Pebble app's global complications. Earlier betas had a weather preset; those
settings and six-hour forecasts are not active in this build.

The current package is `Halftone-1.6.1-beta.8.pbw`, internal version `1.6.1`,
with the existing Halftone UUID. This is a testing build rather than a new
Store release. See [all slot positions and formats](COMPLICATIONS.md).

## Choose weather readings

Enable the plugin preview if needed, then open **Complications** in the Pebble
phone app's Settings. In some preview builds it is under **Settings → Plugins**.
Configure a weather provider and locations in Pebble first, then select:

| Complication | Example source reading |
| --- | --- |
| 1 | Weather → Location → Temperature |
| 2 | Weather → Location → High |
| 3 | Weather → Location → Low |
| 4 | Weather → Location → Precipitation |
| 5 | Weather → Location → Condition |

Choose the same location for each reading if you want one coherent weather
arrangement. The location selector is positional: reordering saved weather
locations can change which place an existing complication refers to. Recheck
all five after changing that order.

These are examples, not reserved weather roles. A slot can show phone battery,
a calendar reading or another supported source instead. Halftone keeps the
numbered positions fixed and does not combine High and Low, turn a percentage
into a droplet, or infer a weather symbol from text or probability. A source's
own icon can accompany its text; icon-only readings display their artwork.

## Units and permissions

Pebble and the selected provider control source units and formatted text.
Halftone preserves them rather than offering a separate Celsius/Fahrenheit
setting. Use Pebble's weather/unit settings or the provider's configuration.
The five sources can use different units if that is what you selected.

The beta declares no Internet or blanket Location permission. Reading a chosen
weather source can ask for Location through Pebble's normal source-permission
flow. Other choices can require their own permissions or provider sign-in.
Approve and configure those in the Pebble phone app. Halftone makes no
independent weather HTTP request and has no separate API-key setting.

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
expiry if earlier. Its original confirmation survives caching; replaying it,
reopening the face or changing layout does not renew its age. Confirmation
means receipt from Pebble, not a new measurement by the weather provider.

There is no hourly forecast cache or independent weather fallback in beta 8.
An expired or unavailable selected reading shows `--`. An unconfigured slot
is hidden without moving the other slots. The native clock and date keep
running while data is unavailable.

Choose scalar Temperature, High, Low or Precipitation instead of an hourly or
daily series. Series-only properties are unsupported and show `--` with a
settings diagnostic. Missing values never become zero; a supplied `0%` remains
valid. If a provider is absent, a permission is denied, or an instance position
no longer exists, check Halftone's per-slot diagnostics and the global source
configuration.

For `PLUGIN_UNAVAILABLE` across multiple faces, use the [weather troubleshooting
guide](WEATHER-TROUBLESHOOTING.md). Beta 8 shows the full reason in Halftone
settings and retries source registration with bounded backoff.

## Device checks

- Configure the five example readings and verify their fixed positions in each
  layout. Replace slot 1 with phone battery to confirm there is no weather role.
- Leave slot 2 empty and confirm slots 3–5 retain their own positions.
- Compare matching source locations/units, then change the global slot choices
  and provider. Check that replaced data clears.
- Deny and allow a selected source permission. Confirm the slot reports the
  problem and resumes after access is allowed, without another weather client.
- Check `0%`, negative values, long text, source icons/images and a series-only
  choice. Check the unavailable diagnostic rather than treating it as zero.
- Restart offline within and after the two-hour limit, and test an earlier
  provider expiry. Confirm receipt times are not presented as observation times.
- Open Timeline Peek: only complication 1 remains with the compact clock.
  Restore the full face and verify slots 2–5 return to their fixed locations.

Build instructions are in the [README](../README.md); actual checks are
recorded by version in [VALIDATION.md](VALIDATION.md). Historical beta source
archives retain the documentation matching their earlier weather presets.

References: [Pebble plugin guide](https://developer.repebble.com/guides/plugins/preview/),
[Preferences implementation](https://github.com/coredevices/mobileapp/blob/master/pebble/src/commonMain/kotlin/coredevices/pebble/plugin/PreferencesPlugin.kt),
and [native Weather importer](https://github.com/coredevices/mobileapp/blob/master/pebble/src/commonMain/kotlin/coredevices/pebble/weather/WeatherFetcher.kt).
