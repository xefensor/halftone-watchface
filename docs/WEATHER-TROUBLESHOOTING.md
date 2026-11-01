# Weather source unavailable

This guide addresses weather failing across Halftone and Pebble's demo faces
while phone battery, music or other plugin sources still work. That establishes
that some plugin communication works; it does not identify the weather failure.

## Check the actual provider

In the Pebble phone app, open **Apps → Plugins → Weather**. This is the built-in
Weather plugin, rather than the watch's Weather app. If its button says
**Enable**, enable it. If it says **Disable**, it is already enabled. Disabling
a built-in plugin persists across app restarts.

The official **Weather Face (Plugin Demo)** has its own provider dropdown in
its gear settings. Its saved selection can override Pebble's global weather
provider. For an unambiguous built-in test, change the dropdown to another
provider and then explicitly back to **Weather**. Merely seeing Weather as the
first displayed option need not establish which provider the subscription uses.

Halftone uses global complication choices and the source selected by Pebble.
It does not have the demo's private provider picker. Recheck the selected
weather location and source permissions in the phone app. The current plugin
guide describes mobile app **1.16.0.5**; earlier preview builds can differ.

## Read the whole error

Halftone's gear settings show the numbered slot,
category/item, code and the provider/host's original failure message. For example:

`#1 · weather/location · PLUGIN_UNAVAILABLE · No plugin for weather/location`

The message matters because the same code has several origins:

| Detail | Interpretation |
| --- | --- |
| `No plugin for weather/location` | No enabled registered plugin serves that source. Check the built-in Weather and external provider's enabled state. |
| A named provider `has no source weather/location` | That provider disappeared or its declaration no longer matches. Rebind after enabling or updating it. |
| `no source handler registered` | A JavaScript provider loaded without a registered source handler. Check the provider version and phone app compatibility. |
| Provider-specific message | The provider itself could not serve data; the reason may concern its location coverage, feeds or setup. |
| `PERMISSION_DENIED` | The caller or provider lacks required access. This is a different error from an unavailable source. |
| `PROPERTY_UNAVAILABLE` / `INVALID_DATA` in Halftone | A source answered, but the selected instance/property did not contain usable data. |

An empty built-in weather database produces an empty instance list; the demo
can show **No location**. That is not the same evidence as a router reporting
**No plugin**. Changing providers cannot be diagnosed from the short code alone.

This diagnostic was introduced in 1.6.1 beta 8 and remains available in
1.9.0 rc.6 for the two selected readings.

## Automatic recovery

Halftone rebinds its generic sources after a `PLUGIN_UNAVAILABLE` error with
backoff of **5 seconds, 15 seconds, 60 seconds, then 120 seconds**. The normal
30-minute backup remains separate. It stops recovery when the failure clears
or the selected complications change. Unrelated phone/music success cannot
reset the backoff into a fast retry loop.

The retry does not choose another weather service or renew a held value's
source receipt time. Error messages remain local to the phone settings; they
are not written into the watch snapshot, persisted in its cache or sent to a
developer service. Provider text is bounded and escaped as literal text in Clay.

If the checks above do not resolve the failure, record the complete Halftone
error line and the exact Pebble phone-app version from About. Halftone retries
registration and exposes the cause; no root cause for the reported on-device
weather failure has been confirmed from the code and fixture checks alone.

## Primary implementation references

- [Source routing and the missing-provider message](https://github.com/coredevices/mobileapp/blob/master/libpebble3/src/commonMain/kotlin/io/rebble/libpebblecommon/plugin/SourceDispatcher.kt)
- [Persistent built-in enable/disable state](https://github.com/coredevices/mobileapp/blob/master/libpebble3/src/commonMain/kotlin/io/rebble/libpebblecommon/plugin/PluginRegistry.kt)
- [Built-in plugin enable button](https://github.com/coredevices/mobileapp/blob/master/pebble/src/commonMain/kotlin/coredevices/pebble/ui/NativePluginScreen.kt)
- [Weather Face's private provider selection](https://github.com/coredevices/pebble-apps/blob/main/weather-face/src/pkjs/index.js)
- [Plugin API version and setup](https://developer.repebble.com/guides/plugins/preview/)
