# Halftone privacy information

Halftone does not require an account and contains no advertising, analytics or
developer-operated tracking service.

## Shared weather (1.4.1 beta 2)

When the Pebble mobile app's plugin preview is enabled and its built-in Weather
source is available, Halftone subscribes to that source. It receives weather
for the selected saved location, including hourly forecasts, and can follow
Pebble's temperature unit preference. This path reads the same weather database
as Pebble's Weather app and makes no independent weather or GPS request.
Pebble and the weather provider chosen in its settings handle network fetching.
The plugin requires Location permission. A permission denial or temporary error
does not switch to a different provider.

The selected location ID, unit preference, and a bounded record of each weather
snapshot's contents and first-seen time are stored locally on the phone to
prevent reconnecting from renewing stale data. These records are not uploaded
to Halftone's developer. Up to six hours of hourly temperatures are also stored
on the watch for offline use. The shared source currently exposes no observation
timestamp. A successful source read confirms the current value stored by Pebble;
current conditions expire two hours after the last successful source confirmation.
The forecast cache retains its conservative first-seen age for unchanged contents.
The settings diagnostic shows the source, location and native temperature received
locally; these diagnostic details are not uploaded to the developer.

## Compatibility weather client

The following direct requests are used only on older apps, when plugins are
disabled, or when the built-in Weather source is not installed/available.

To show local weather, the Pebble phone app requests an approximate location
from the phone. The coordinates are sent to Pebble's weather service
(`weather-api.repebble.com`) to request the current temperature. If that service
fails or returns invalid or stale data, the same coordinates are sent directly
to Open-Meteo (`api.open-meteo.com`) as a fallback. Open-Meteo also supplies a
supplemental hourly forecast when Pebble's response lacks timestamped hourly
data. Halftone does not send the
location to a server operated by its developer and does not retain location
history. Weather request logs do not include coordinates.

The last successful temperature, up to six hours of hourly forecasts and the
selected visual preferences are stored
locally so the watchface remains useful when the phone or network is temporarily
unavailable. If location permission is denied, the watchface continues working
and shows an available observation or the current hour's cached forecast.
Forecast readings are marked with `~` and expire six hours after fetching.
Observations expire after two hours. When neither is available, a placeholder
is shown. Cached values without a timestamp from older versions are not shown
until the first successful refresh. No location history is stored.

Open-Meteo privacy policy: https://open-meteo.com/en/terms#privacy
