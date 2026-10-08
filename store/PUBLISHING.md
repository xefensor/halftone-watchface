# Halftone 1.1.0 publishing checklist

## Store listing

- Type: Watchface
- Title: Halftone
- Developer: Xef
- Platform: Pebble Time 2 / Emery
- Version: 1.1.0
- UUID: `d4dd5046-53be-4624-99e8-46e0b377fe66`
- Description: copy `description.txt`
- Release notes: copy `release-notes.txt`
- Binary: upload `Halftone-1.1.0.pbw`
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
- Show and dismiss Timeline Quick View.
- Verify normal and extra-large text at 00:00, 11:11 and 23:59.
- Toggle 12-hour time and Fahrenheit, then confirm 13:00 becomes 1:00 and a
  known Celsius value converts to the expected Fahrenheit value.
- Switch PebbleOS between English, Czech and Polish; confirm the weekday updates
  automatically and the longest date line remains on one line.
- Confirm the developer name and support email in the listing preview.
