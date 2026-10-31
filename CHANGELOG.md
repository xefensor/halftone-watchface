# Changelog

## 1.9.0 rc.3

- Positions the clock using visible bounds measured from compiled font glyphs,
  balancing shorter times such as `22:14` without crowding taller `1:05`.
- Fits the clock to the space available above active context. The visible clock
  center is 96 pixels normally and 88 with context; Big text caps contextual
  clock fonts at 88 pixels. The clock remains still during dissolve frames.
- Keeps accented weekday tails clear of the clock across all 17 languages.
- Displays album art at the height of its two-line music block: 40 pixels
  normally, 48 with Big text, or 32 for a single-line music panel. Source
  bitmaps remain capped at 24 pixels and are scaled for display. Rectangular
  music images are center-cropped to a square without stretching; generic
  complication images and notification icons keep their contain-fit behavior.
- Sizes the title inset to the displayed artwork while retaining the existing
  rule that hides art when doing so lets the full title fit. Notification
  icons remain 24 pixels.
- Retains both horizontal complications under native Timeline Peek, Big text,
  the established dot border and the plugin-preview publishing hold.

## 1.9.0 rc.2

- Keeps both selected complications in equal horizontal columns when native
  Timeline Peek opens, instead of hiding the second reading.
- Changes the large-clock option to **Big text**, enlarging the date, clock,
  reading numbers and units, and contextual music/notification text together.
- Adds a 44-pixel reading font for Big text, compared with the standard
  38-pixel preference; long values fit down to remain readable.
- Refines compact spacing around the native Timeline area and the contextual
  panel while preserving the procedural halftone dots and rounded border.
- Preserves the saved text-size setting, source choices, and notification
  privacy defaults. Settings explanations remain localized.
- Remains a sideloaded plugin-preview candidate. Public-store submission waits
  for Pebble's preview restriction to be lifted and device checks to complete.

## 1.9.0 rc.1

- Introduced two equal horizontal complication columns, with both readings
  compacted above music or notification context.
- Refined date fitting, text margins and settings organization.
- Kept only complication 1 visible during native Timeline Peek.
- Retained the earlier extra-large clock option and existing optical effects.

Earlier release history and version-specific checks remain in
[validation](docs/VALIDATION.md).
