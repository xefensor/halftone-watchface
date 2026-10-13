# Halftone 1.3.1 publishing checklist

## Store listing

- Type: Watchface
- Title: Halftone
- Developer: Xef
- Platform: Pebble Time 2 / Emery
- Version: 1.3.1
- UUID: `d4dd5046-53be-4624-99e8-46e0b377fe66`
- Description: copy `description.txt`
- Release notes: copy `release-notes.txt`
- Binary: upload `Halftone-1.3.1.pbw`
- Screenshots: upload the `emery_*.png` files in filename order
- Banner: `halftone-banner-720x320.png` is optional for a watchface
- Source URL and website: optional; add them only after a real public URL exists
- Support email: leaving this empty uses the developer-account email

The screenshots are raw 200 × 228 Emery captures and must not be placed inside
a watch frame for the screenshot fields. The framed promotional layout is used
only in the optional banner.

## Publish from the command line

Install the current tool and sign in:

```sh
uv tool install pebble-tool
pebble sdk install 4.33.1
pebble login
```

From the project directory run `pebble publish`. For a new listing, answer the
prompts using the values above and select the prepared screenshots. Leave the
release as a draft first, verify its public preview, and only then publish it.

The same files can instead be uploaded through the Pebble Developer Dashboard:
https://developer.repebble.com/dashboard

## Final checks before making it public

- Install the exact release PBW on a physical Pebble Time 2.
- Open settings and save every option at least once.
- Confirm weather after granting location permission.
- Keep the face open for at least 35 minutes; confirm a successful weather
  refresh without opening a menu or restarting the face. If the temperature
  stays the same, check the delivery log rather than assuming no refresh happened.
- Compare the selected unit with Pebble weather at the same coordinates.
- Disconnect and reconnect the phone; confirm a prompt weather refresh.
- Stay offline across hour changes; confirm ~ marks the correct cached forecast.
- Restart the watchface offline; confirm the forecast cache remains available.
- Confirm the forecast expires six hours after fetching and a placeholder appears
  when no recent observation remains.
- Review the changed weather privacy disclosure (Pebble first, Open-Meteo fallback).
- Show and dismiss Timeline Quick View.
- Verify normal and extra-large text at 00:00, 11:11 and 23:59.
- Toggle 12-hour time and Fahrenheit, then confirm 13:00 becomes 1:00 and a
  known Celsius value converts to the expected Fahrenheit value.
- Switch PebbleOS between English, Czech and Polish; confirm the weekday updates
  automatically and the longest date line remains on one line.
- Confirm the developer name and support email in the listing preview.
