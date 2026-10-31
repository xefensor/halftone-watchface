# Five fixed complications

**Halftone 1.6.0 beta 7** uses the five global complication choices in the
Pebble phone app. A complication is a source reading: a temperature, phone
battery level, calendar time, condition or another plugin property. The clock
and date remain native watch functions and do not consume a slot.

## Choose what each number means

Open **Complications** in the Pebble phone app's Settings; some preview versions
place it under **Settings → Plugins**. Configure slots 1–5, then choose a layout
in Halftone's settings. Classic is the default for new and existing users.
The saved layout and time format survive relaunching the face.

A weather example is Temperature in slot 1, High in 2, Low in 3, Precipitation
in 4 and Condition in 5, all for the same location. Alternatively, put phone
battery in slot 1 or use any other supported source in any position. There is
no fixed weather preset or weather inference in Halftone.

## Where the five readings appear

![Native watchface captures with the five global slot numbers](images/complication-layout-map.png)

Each number always refers to the same global complication, even when an earlier
slot is empty. Unconfigured slots are hidden. A configured slot waiting for
usable data, denied permission or an unsupported format shows `--`; later slots
do not move into its position.

| Global complication | Classic | Comic cover | Stacked time |
| --- | --- | --- | --- |
| 1 | Large central reading below the clock | Large reading at lower left | Right column, second from top |
| 2 | Upper-left cell of the lower grid | Right column, top | Right column, third from top |
| 3 | Upper-right cell of the lower grid | Right column, middle | Right column, fourth from top |
| 4 | Bottom-left cell | Right column, bottom | Right column, bottom |
| 5 | Bottom-right cell | Left side, above slot 1 | Right column, top |

Classic keeps a wide clock and central primary reading. Comic cover places the
wide clock over the left-side readings and a separate right column. Stacked
time puts hours above minutes on the left and all five readings down the right.
The date is plain and remains live in every layout.

During **Timeline Peek / Quick View**, every style uses the common compact
clock layout with **complication 1 only**. Complications 2–5 are hidden until
Peek closes, then return to their original positions.

## How a selected reading is drawn

A property can supply several formats. Halftone prefers usable `shortText`,
then supports a numeric value, longer text, a boolean or a timestamp. It uses
the source's units and formatted text instead of applying weather-specific
rounding or conversions. A real zero is valid.

| Source format | Display |
| --- | --- |
| `shortText` | Source's compact text; preferred when available |
| `numericValue` | Number and its supplied unit |
| `longText` | Text fitted or ellipsized to the slot |
| `boolean` | Localized state text |
| `timestamp` | Time in the watch's local timezone, respecting the 12-hour/24-hour choice |
| `icon` / `image` | Small source-supplied artwork, alongside text when both are supplied |
| Series only | `--` and an unsupported-format diagnostic |

Artwork is capped at 24 pixels. Beside text it occupies a 16-pixel area;
bitmap-only readings are centered in a 24-pixel area. A source `icon` is
preferred over its `image` when both exist. Icons use Halftone's chosen text
color; images retain their source palette. A condition is displayed only as
the selected source provides it, not derived from precipitation or another slot.

Text packets retain at most 48 UTF-8 bytes, and the renderer fits or ellipsizes
long values within the fixed cell. This is suitable for compact readings rather
than long messages. Empty or malformed formats do not become fake zeros.
An hourly or daily series is not automatically sampled at its first value;
select a scalar current reading instead.

## Sources, units and access

The Pebble app chooses the provider for each category/item. Source configuration,
units and sign-in belong to Pebble or the provider, while layout, colors and
12-hour/24-hour time remain Halftone settings. Changing one global slot changes
that numbered reading across the layouts.

Halftone declares no Internet or hard-coded Location permission. Pebble requests
only the access required by the selected sources through its normal permission
flow. A source can need Location, Calendar or another permission. Provider
credentials and authentication are configured with that provider, not in
Halftone's settings.

A direct source can differ from the normalized data displayed in Pebble's native
Weather app. Generic complication support does not itself change weather
accuracy or provider refresh intervals. See [weather setup and comparison](PLUGIN-WEATHER.md).

## Cache and expiry

A slot's cached reading lasts at most **two hours from its original confirmed
receipt**, capped by an earlier source expiry. Reopening the watchface, changing
layout or replaying saved data cannot renew that confirmation. Receipt time is
not the source's measurement or model issue time. There is no generic observation
timestamp and no six-hour weather forecast cache in this build.

After expiry, a still-configured slot shows `--` until usable data arrives.
If plugins are unavailable or a source cannot be read, Halftone does not start
an independent HTTP fallback. Clock and date continue on the watch.

## Source contract for developers

Halftone reads `preferences/complications` with `Pebble.subscribeToSource`, then
subscribes to each selected category/item and property. Global UI slots 1–5
have preference `instanceId` values `"0"`–`"4"`. Empty slots are omitted from the
preference envelope, so its array position is not a slot number. The entry's
separate `index.numericValue.value` selects an instance of the underlying source
by zero-based position, not by stable instance ID. Reordering source instances
can therefore retarget a configured slot.

`validUntilMs` is milliseconds. A `timestamp.value` is epoch seconds representing
the reading itself, not its freshness. Series-only properties remain unsupported
even if a source declares them. Missing or unsupported data is diagnosed per
slot rather than replaced with a different reading.

References: [plugin guide](https://developer.repebble.com/guides/plugins/preview/),
[preference serialization](https://github.com/coredevices/mobileapp/blob/master/pebble/src/commonMain/kotlin/coredevices/pebble/plugin/PreferencesPlugin.kt),
and [shape definitions](https://github.com/coredevices/mobileapp/blob/master/libpebble3/src/commonMain/kotlin/io/rebble/libpebblecommon/plugin/Plugin.kt).
