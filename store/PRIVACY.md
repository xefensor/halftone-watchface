# Halftone privacy information

Halftone does not require an account and contains no advertising, analytics or
developer-operated tracking service.

To show local weather, the Pebble phone app requests an approximate location
from the phone. The coordinates are sent to Pebble's weather service
(`weather-api.repebble.com`) to request the current temperature. If that service
fails or returns invalid or stale data, the same coordinates are sent directly
to Open-Meteo (`api.open-meteo.com`) as a fallback. Halftone does not send the
location to a server operated by its developer and does not retain location
history. Weather request logs do not include coordinates.

The last successful temperature and the selected visual preferences are stored
locally so the watchface remains useful when the phone or network is temporarily
unavailable. If location permission is denied, the watchface continues working
and shows the last available temperature for up to two hours from its observation
time, then a placeholder. Cached values without a timestamp from older versions
are not shown until the first successful refresh.

Open-Meteo privacy policy: https://open-meteo.com/en/terms#privacy
