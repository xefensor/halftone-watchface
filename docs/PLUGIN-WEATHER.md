# Shared Pebble weather beta

Halftone 1.4.0 beta reads the weather already stored by the Pebble phone app.
Its built-in Weather plugin exposes the same database that feeds the watch's
Weather app, including the weather provider selected in Pebble. Subscribing
does not make another weather API request. Halftone keeps its current design
and saves up to six hours of the shared hourly forecast for offline use.

The downloadable beta is `Halftone-1.4.0-beta.1.pbw`. The SDK's internal
version is `1.4.0`; its UUID is unchanged, so it updates the existing watchface.
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
   Existing Celsius/Fahrenheit overrides remain available and existing users'
   choices are retained.

Pebble controls network fetching in shared-weather mode. Halftone receives
updates from an open subscription; it does not force a fresh weather download
every 30 minutes. Comparing the same location and units should show the same
temperature as Pebble's Weather app after delivery.

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

The current built-in Weather source publishes neither an observation timestamp
nor an expiry time (`validUntilMs` is null). Receiving a message therefore does
not prove a new observation was fetched. Halftone conservatively remembers when
it first saw the same weather snapshot instead of extending its lifetime on
every reconnect or restart. An unchanged snapshot can expire even if Pebble
refetched identical values; a first installation cannot establish how old
Pebble's pre-existing cached observation was. The timestamped hourly series
still identifies which forecast hour each value belongs to.

## Build and package

```sh
npm ci
npm test
pebble build
python3 scripts/package-beta.py
```

The final packaging step is required with SDKs that omit the new permission
manifest. It copies `usesPermissions` from `package.json` into the PBW's root
`appinfo.json` and sets `manifestVersion` to 2. It verifies the existing UUID,
version and target platforms, and checks that JavaScript, watch binaries and
resources remain byte-for-byte unchanged. It writes
`dist/Halftone-1.4.0-beta.1.pbw`, leaving the ordinary SDK output intact.

Halftone consumes a plugin; it does not contain or install a weather plugin of
its own. No plugin SDK branch or plugin-only project is required.

## Checks on a real Pebble Time 2

- Compare the first saved location in Halftone and the Weather app, in matching
  units, then change the global weather provider and confirm both update.
- Change the selected saved location and check that old weather disappears.
- Change Pebble's temperature units while using Follow Pebble, then test each
  explicit override.
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
