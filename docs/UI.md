# Halftone development UI

Halftone keeps its centered Fira clock and value shapes, black alternating dot rings,
rounded corners, orange/white default palette and three/four-step depth. Big text and
floating shadows retain their old preferences. Fira source outlines scale continuously
between the idle, activity and native Timeline Peek arrangements; utility text uses
measured Roboto Condensed supporting roles selected by the per-face Text Size choice. The dot-ring algorithm remains Halftone's original.

The two global reading homes stay left/right. Complete values and units take priority
over optional symbols. Qualifiers and public source identity survive when meaningful;
unconfigured positions stay empty and expired/unavailable sources lose their old values.
An arbitrary percentage never becomes rain. Public observation age is distinct from receipt.

A compact centered clock leaves room below the readings for an activity. The primary
retains its title/value and context footer; the secondary occupies one static row when
it fits. The secondary is omitted from both painting and navigation when space is needed
for the primary. Text wraps from its beginning and uses ellipsis; no paging or rotation.
Activity content stays within x24–176 and ends at y208 for the classic border or
y203 for four-step depth. The same font measures and paints each text role.
Required long values retain their full unit through measured fitting; optional
identity, artwork and compact rows yield before the primary value or paused state. Native Peek
owns the lower event panel and hides activities while retaining both reading positions.

Clock/layout transitions use bounded native timing. A genuine replacement activity or
music item receives an incoming-only 180ms dot dissolve; it retains no private outgoing
snapshot. Expiry and privacy clears do not wait for animations. Repeated source snapshots
and clock ticks do not restart content motion. Animations and dissolve have separate controls.

Phone settings use shared light/dark styling, native Halftone example images, appearance,
content/priority and connection/help groups. Example selection is independent of enabled
features. Custom recoloring is approximate; provider artwork and native Timeline areas
retain their pixels. The same source supports legacy Clay and stay-open config delivery.

## Supporting text and native Peek

Follow Pebble reads `preferred_content_size()` on launch; Small, Medium and Large
overrides select the same profiles independently of that OS choice. It keeps
Fira clock points and width fitting separate from supporting text:

| Effective size | Date | Body | Secondary | Footer |
| --- | ---: | ---: | ---: | ---: |
| Small | 22 | 22 | 20 | 22 |
| Medium | 24 | 24 | 22 | 24 |
| Large | 26 | 28 | 26 | 26 |

Bigger Text retains its original Fira clock/value size choices. Its optional date
bonus yields when space is tight. Measure the actual fitted clock, reading values,
inline units, captions and visible glyph ink against the real unobstructed height.
Small vertical shifts, including use of the free band above the former activity
start when needed, keep them inside the existing dots and clear of one another.
The whole date is preferred; its bonus and weekday can yield before hiding it in a
crowded activity/Peek arrangement. The clock and both reading homes remain.

Supporting captions reserve space for observation-age markers. A long required
qualifier or atomic activity detail can use a measured smaller existing font;
measurement and painting use that same choice. Main activity values remain complete.
Optional text wraps from byte zero and ends in an ellipsis without paging. A compact
activity that does not fit is absent from both paint and navigation receipts.

The profile applies to idle, activity and native Peek using one render plan.
See [native validation and scope](native-type-checkpoint.md) and the
[display preferences checkpoint](ui-preferences-checkpoint.md).

## Per-face appearance and confirmation

Appearance selects Follow Pebble, Follow Quiet Time or Manual. Manual Light uses
the saved Day palette; Manual Dark uses Night and exposes its colour editors.
Follow Quiet Time selects Night only while Quiet Time is active. Switching modes
preserves both palettes and all Bigger Text, depth, shadow and dissolve choices.
Legacy Quiet Time users migrate to Follow Quiet Time; other saved colours stay
Manual Light. Supported older boolean and numeric-key encodings remain readable.

SDK 4.33.1 has no supported system appearance API. Follow Pebble Appearance stays
saved and renders its last Manual Light/Dark fallback; the phone explains this
limit. The main clock retains its own Bigger Text control and Fira shapes.

Saved on phone and Applied on watch are distinct. Only an exact native receipt
for the complete, verified 17-field snapshot permits Applied. Pending choices
survive reopening and reconnect. Retry uses the existing queue, with bounded
attempts. Status polling preserves drafts. Each optical toggle can independently
make the page dirty, save, reopen and Discard without changing another choice.


## Supporting text contrast

Supporting/help text uses the normal foreground colour rather than blended grey.
This keeps black text on white and white text on black readable without changing
type sizes or layouts. See the [contrast checkpoint](text-contrast-checkpoint.md)
for the current candidate and verification scope.

## Matching reading values

Both visible numeric reading homes use one shared size. Before measuring row
heights, the renderer chooses the largest point size within the face's existing
range that fits both complete values, units and required symbols. Measurement
and painting reuse the same per-slot fit, including optional-icon removal and
second-line units where captions allow them. Required captions retain their line.
Unfittable values use the existing overflow label rather than partial digits.
Empty, unavailable, text-only and bitmap-only homes do not reduce the other
home's numeric size. A single numeric home fits normally. The plan recomputes
with each value, text-size, activity and Peek layout, including Bigger
Text. Supporting values, units and captions keep their existing respective roles;
the clock, face typography, palette and artwork remain unchanged.

The compact-layout implementation and current verification scope are recorded in
[the compact layout checkpoint](compact-layout-checkpoint.md).
