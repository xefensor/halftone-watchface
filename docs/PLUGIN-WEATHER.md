# Shared Pebble weather beta

Halftone 1.4.1 beta 2 reads the weather already stored by the Pebble phone app.
Its built-in Weather plugin exposes the same database that feeds the watch's
Weather app, including the weather provider selected in Pebble. Subscribing
does not make another weather API request. Halftone keeps its current design
and saves up to six hours of the shared hourly forecast for offline use.

The downloadable beta is `Halftone-1.4.1-beta.2.pbw`. The SDK's internal
version is `1.4.1`; its UUID is unchanged, so it updates the existing watchface.
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

The settings page shows the active weather source, selected location and exact
native temperature received, plus any source error. This is a diagnostic snapshot
when settings open. It identifies whether shared weather or the compatibility
client is actually active.

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

Forecasts retain their conservative first-seen age across reconnects, restarts
and location changes. Their six-hour offline limit is not extended by repeatedly
reading identical forecast contents. After current conditions expire, a usable
cached forecast is marked with `~`; without either, Halftone shows `--`.

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
`dist/Halftone-1.4.1-beta.2.pbw`, leaving the ordinary SDK output intact.

Halftone consumes a plugin; it does not contain or install a weather plugin of
its own. No plugin SDK branch or plugin-only project is required.

## Checks on a real Pebble Time 2

- Compare the settings diagnostic's received temperature and Halftone display
  with the detailed weather report's current conditions, in matching units and
  location. Change the global weather provider and confirm they update.
- Leave the face open beyond 30 minutes and beyond two hours, including when
  the shared source keeps returning the same temperature. Confirm it remains
  current conditions while source reads succeed.
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
