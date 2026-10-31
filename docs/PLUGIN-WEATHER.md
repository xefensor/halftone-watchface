# Shared Pebble weather beta

Halftone 1.5.1 beta 6 reads the weather already stored by the Pebble phone app.
Its built-in Weather plugin exposes the same database that feeds the watch's
Weather app, including the weather provider selected in Pebble. Subscribing
does not make another weather API request. Halftone saves up to six hours of
the shared hourly forecast for offline use. Classic remains the default layout;
Comic cover and Stacked time remain available in settings. Beta 6 makes the
date and weather details easier to read and adds an optional current-condition icon.

The downloadable beta is `Halftone-1.5.1-beta.6.pbw`. The SDK's internal
version is `1.5.1`; its UUID is unchanged, so it updates the existing watchface.
This is a testing build, not a new Store release. The plugin API remains a
preview and can change.

## Set up on the phone

1. Use the Pebble mobile app 1.16.x or later and enable **Settings → Plugins →
   Plugins / permissions preview**. These instructions follow the 1.16.0.5
   plugin guide; menu labels may change in later builds.
2. Install the beta PBW and allow Halftone's **Location** permission if asked.
   Weather sources require that permission even though Halftone does not request
   GPS coordinates itself in shared-weather mode.
3. Configure the weather provider and locations in Pebble's weather settings.
   Halftone follows the first configured location by default. Its settings can
   choose another saved weather location.
4. Choose **Follow Pebble** for temperature units to match Pebble's display.
   A valid Pebble preference response is authoritative; a weather payload's
   unit does not override it. Before that preference is available, the shared
   temperature's own unit can supply the fallback. Existing Celsius/Fahrenheit
   overrides remain available and existing users' choices are retained.
5. Optionally enable **Show today's low and high** or **Show today's rain / snow
   chance** in Halftone's settings. Both are off by default. **Show weather icon**
   is on by default and can be disabled independently.
6. Choose **Comic cover** or **Stacked time** under **Layout style** to use a new
   design. Classic is the default, including on a new installation.

These are the English control names; Halftone's settings interface is
translated. Existing option identifiers and saved choices are unchanged.

Pebble controls network fetching in shared-weather mode. Halftone receives
updates from an open subscription. Every 30 minutes, and when the watch requests
an update, a temporary subscription re-reads the shared database and ends after
one result. This makes no independent weather HTTP request. A 15-second deadline
and two-minute retry recover a stalled read.

Halftone uses the shared source's **current conditions** (`temperature`), which
matches the detailed weather report's stored current-conditions value for the
same location and units. PebbleOS's main Weather screen can instead display the
hourly forecast for the current hour. These are different values in the same
database. Halftone keeps current conditions until they are no longer usable;
it does not switch to hourly forecast merely because 30 minutes elapsed.

The settings page shows the active weather source, selected location and rounded
native temperature received, plus any source error. This is a diagnostic snapshot
when settings open. It identifies whether shared weather or the compatibility
client is actually active.

## Layout style

Classic preserves the original arrangement. Comic cover and Stacked time are
optional alternatives selected in the phone settings. Comic cover combines a
wide clock with a weather column; Stacked time places hours above minutes. The
saved choice survives relaunching the watchface. Each style uses the live clock
and date and respects the existing 12-hour/24-hour choice. All text uses the
saved text color. Comic cover now has a plain, unboxed date.
Unusually long weekday/date combinations use smaller date fonts when
needed. Stacked sizes the hour and minute rows together to fit its clock column.

Layout selection is independent of the shared-weather settings. Enabled,
available low/high and precipitation values appear in the selected design;
missing or disabled values stay hidden, and column layouts recenter the
remaining values. All styles switch to the same compact clock layout while
Timeline Peek / Quick View is visible, then return to the selected design.

These layouts use the same shared-weather source and permissions.

## Languages

Halftone supports English, Czech, Slovak, German, French, Spanish, Italian,
Portuguese, Dutch, Polish, Danish, Swedish, Norwegian, Finnish, Hungarian,
Romanian and Turkish. Norwegian accepts `no`, `nb` and `nn`. Regional variants
use the supported base language; unsupported languages fall back to English.

The watch's weekday follows the PebbleOS language. Daily range and precipitation
use language-neutral numbers and symbols. The phone settings prefer the active
watch's language when available,
then the phone's language, and finally English. This covers the existing color
and display controls, the layout selector, the weather section and its dynamic
status messages.
No separate language setting is needed.

## Optional daily details

The two optional settings add daily weather details to each layout. The range
reads high then low, such as `19/5`, in the selected temperature unit. A large
droplet sits beside the precipitation percentage, such as `40%`. This is today's
probability of rain or snow, as supplied by Pebble, rather than an amount in
millimetres. A supplied zero is valid (`0%`), while a missing or invalid field
is hidden.

These details use only the selected shared Pebble weather location. Halftone
does not make extra HTTP requests to obtain them, and the compatibility client
does not add a separate daily-details request. Availability therefore depends
on the selected Pebble weather provider and what the shared database exposes.

The details retain their last confirmed shared-read time and are usable for at
most six hours. They also expire at their applicable day boundary rather than
being carried into tomorrow. Changing location clears its previous details.
Turning a display setting off hides that detail. The daily details hide while
Timeline Peek / Quick View is visible, then return if their data remains
usable. With both settings off, the selected layout has no daily-details values.

The shared source supplies a minute offset and fixed-length daily slots, not a
location timezone with daylight-saving rules. Details require compatible day
anchors and an explicit offset; inconsistent metadata is hidden. A cached
offset that has not yet reported a clock change cannot be corrected here.

## Current-condition icon

**Show weather icon** is enabled by default and applies to all three layouts.
It draws the current condition from the selected shared weather location:
sun, partly cloudy, cloudy, rain, snow or mixed rain and snow. Light and heavy
rain share artwork, as do light and heavy snow. The icon uses the saved text color.

Only Pebble's supported current-condition codes are accepted. Missing, unknown
or unsupported codes stay hidden; Halftone does not infer a condition from
rain probability, free-form text or an hourly forecast. The compatibility
weather client does not supply this icon, and no extra HTTP request is made.

A condition remains usable for at most two hours from its original confirmed
shared-database read, or until the source's expiry if earlier. Reopening the
face or replaying a held value cannot extend that time. This is a confirmation
time, not the provider's observation time. The icon hides during Timeline Peek
along with daily details.

## Future complication slots

Halftone currently uses its weather preset. Pebble's global **Complications**
list does not configure this build. An optional mode following those slots
could allow other plugin readings in a future version; it is not implemented
in beta 6. It would use the same plugin system and would not itself make weather
more accurate or refresh the provider more often.

## Offline data and compatibility

- Hourly forecasts are selected by their actual UTC timestamps. Forecast
  estimates keep the `~` marker and survive restarting the watchface.
- Changing the selected location clears its previous cached weather so one
  city's forecast is not shown for another.
- Older mobile apps, disabled plugin preview, or an unavailable built-in
  Weather plugin use the existing client: Pebble's weather endpoint first,
  Open-Meteo fallback, with 30-minute refreshes.
- A denied permission or a transient error while shared weather is available
  keeps the shared cache and subscription. It does not silently switch to a
  different provider. Allow the permission in the Pebble app to resume updates.
- The fallback client requires internet permission for
  `weather-api.repebble.com` and `api.open-meteo.com`. The shared-data path needs
  no separate network request by Halftone.

### Freshness limitation

The built-in Weather source publishes neither an observation timestamp nor an
expiry time (`validUntilMs` is null). A successful source read confirms what
Pebble currently stores; it does not prove that the provider just fetched a new
observation. Halftone follows that current value while the source is available.
Its two-hour offline current-conditions limit starts from the last successful
source confirmation, even if the temperature has not changed. Merely replaying
an old snapshot or changing units does not renew that confirmation.

Forecast age is tracked for each absolute UTC hour across reconnects, restarts
and location changes. Advancing the forecast window does not turn existing
hours into newly received data. The watch's packed current-hour-plus-six-hours
forecast uses the oldest retained age among the included slots, conservatively
preserving the six-hour offline limit. Unit changes or replaying a held snapshot
do not renew it. Migration from older beta caches preserves their original age.

The same limitation applies to daily details: a successful shared read confirms
Pebble's stored values, not a new provider observation. No displayed receipt,
confirmation or cache time should be interpreted as the weather's measurement
time. After current conditions expire, a usable cached forecast is marked with
`~`; without either, Halftone shows `--`.

## Build and package

```sh
npm ci
npm test
pebble clean
pebble build
python3 scripts/package-beta.py
```

The clean step regenerates SDK message keys after updating the source; an
incremental build can otherwise retain older generated keys. The final packaging
step is required with SDKs that omit the new permission manifest. It copies `usesPermissions` from `package.json` into the PBW's root
`appinfo.json` and sets `manifestVersion` to 2. It verifies the existing UUID,
version and target platforms, and checks that JavaScript, watch binaries and
resources remain byte-for-byte unchanged. It writes
`dist/Halftone-1.5.1-beta.6.pbw`, leaving the ordinary SDK output intact.

Halftone consumes a plugin; it does not contain or install a weather plugin of
its own. No plugin SDK branch or plugin-only project is required.

## Checks on a real Pebble Time 2

- Select each layout, save and reopen the watchface. Check that Classic is the
  default before choosing another style, and that the saved choice survives a
  relaunch. Check live minute/date changes and both time formats in every style.
- Test each style with both daily options enabled, each alone and neither,
  including missing weather fields. Check that hidden values leave no empty
  columns. Check high/low order, the droplet with `0%` and `100%`, and that
  Timeline Peek uses the common compact clock layout.
- Toggle **Show weather icon** in each style. Check known condition codes,
  unknown/missing data, expiry, offline restart, custom colors and Peek.
- Change the watch language and reopen Halftone's phone settings. Check the
  weekday, layout names, existing display controls,
  weather controls and status messages. Also check phone-language fallback when the watch
  language is unavailable, and English fallback for unsupported languages.
- Compare the settings diagnostic's received temperature and Halftone display
  with the detailed weather report's current conditions, in matching units and
  location. Change the global weather provider and confirm they update.
- Leave the face open beyond 30 minutes and beyond two hours, including when
  the shared source keeps returning the same temperature. Confirm it remains
  current conditions while source reads succeed.
- Change the selected saved location and check that old weather disappears.
- Change Pebble's temperature units while using Follow Pebble, then test each
  explicit override. Confirm a weather payload in another unit does not undo a
  valid preference response.
- Enable each daily-detail option separately and together. Check supplied zero
  probability, missing fields, location changes, day rollover and six-hour
  expiry. Confirm no daily details appear when both options are off.
- Open Timeline Peek / Quick View with daily details enabled; confirm the detail
  line hides without crowding the compact event layout and returns afterward.
- Keep Halftone open across a weather update. Check that it updates without
  entering another menu.
- Deny and then allow Location; confirm no independent fallback requests occur
  during denial and shared weather resumes after permission is allowed.
- Restart offline and cross an hour boundary; confirm the correct forecast and
  `~` marker. Check expiry and the `--` placeholder after usable data runs out.
- Disable plugin preview and reopen Halftone; confirm the older weather client
  still works. Re-enable preview and confirm the shared source is used again.

References: [Pebble plugin guide](https://developer.repebble.com/guides/plugins/preview/),
[built-in Weather implementation](https://github.com/coredevices/mobileapp/blob/master/pebble/src/commonMain/kotlin/coredevices/pebble/weather/WeatherPlugin.kt),
and [Pebble's packaging script](https://github.com/coredevices/pebble-apps/blob/main/scripts/pack-plugin-pbw.py).
