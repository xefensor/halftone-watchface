# Dynamic content

Halftone 1.8.0 beta 10 uses one adaptive layout. The clock, plain date and primary
complication stay in their established areas. The lower area shows complication
2, music, or a brief new-notification summary. Complication 1 is larger and stays in its own full-width area.

## Panel priority

| Available content | Lower panel |
| --- | --- |
| A fresh new-notification summary | App/title and optional message text |
| Music playing, or its short paused grace period | Song title, artist and artwork when supplied |
| Neither | Global complication 2, centered and slightly smaller than the primary |

Complication 1 is not replaced by these panels. During Timeline Peek / Quick
View, all secondary content hides and the clock, date and complication 1 adapt
to the space Pebble leaves available. Calendar events and other Timeline items
remain Pebble's responsibility; Halftone does not duplicate them in another
panel.

There is no timer integration, automatic rain-warning panel, separate calendar
panel or automatic page rotation in this beta. Buttons and touch retain their
normal Pebble behavior. Use Pebble's Music app for next/previous and play/pause;
Halftone does not add motion-based playback controls.

## Music

**Show music while playing** defaults to on. Halftone subscribes to the phone's
`music/track` source and reads title, artist, playing state and artwork. The
built-in source is currently an Android feature. Artwork is optional, static
and at most 24 pixels. Title and artist use two wide, left-aligned lines. When
removing artwork allows the full title to fit, the artwork is omitted. If the
title still cannot fit, it uses a clean ellipsis; it does not continuously scroll
or force smaller and smaller text.
There is no playback-position or duration reading in that source, so Halftone
does not invent a progress bar.

Pausing releases the panel after a five-second grace period. Stopping playback,
losing usable source data, disabling music or losing the phone connection also
releases it. Music data has a maximum 120-second confirmation lease, capped by
an earlier source expiry. A one-minute source refresh obtains current state;
it does not renew notification lifetimes or change the weather refresh cadence.

## Panel presentation and transitions

The normal second reading is centered. Music and notification text use wide,
left-aligned lines so titles have room. Short number/unit readings use larger
digits and smaller recognized units without converting source values. The
primary reading is not replaced or moved by contextual content.

**Brief halftone transitions** defaults to on. A real incoming panel-content
change can reveal the new content with a 180 ms halftone dissolve, using three
short timer callbacks. The effect is clipped to the lower interior: clock,
primary reading and bezel remain still. Repeated snapshots with identical
visible content do not restart it merely because receipt or expiry times change.

Expiry, privacy clearing, disconnection and Timeline Peek hide content
immediately instead of waiting for an effect. Peek restoration is not animated.
The switch disables the effect while keeping the same layout and data behavior.

## Notification summaries

**Show new notification summaries** defaults to off. Enable it in Halftone's
settings and allow notification access through Pebble. **Include message text**
is a separate switch and also defaults to off. With it disabled, the panel shows
the app and notification title, which can itself contain a sender or other
private text.

**Apps to show** accepts comma-separated app names, for example `Signal,
WhatsApp`. Matching is case-insensitive; an exact package name can also be used.
An empty field includes every notification app allowed for Halftone in Pebble.
This display filter does not grant Android or Pebble notification access.

The first source snapshot establishes a baseline. Notifications already in it
are not shown as new. A new notification ID, or changed title/message text on an existing ID after
that baseline, can appear for at most 12 seconds, with a shorter lifetime if
the source expires sooner. This supports chat apps that reuse a notification
ID. Identical redeliveries and artwork-only changes do not replay it. Another
source update cannot extend its original expiry. Removing the active notification, disabling
summaries or losing the source clears the panel. Reconnection establishes a
new baseline, so notifications accumulated while disconnected are not replayed.

The source represents active notifications in the phone's notification shade,
not a reliable unread-message count or Pebble's notification history. Android
notification access and each app's notification behavior determine what data
is available. Halftone adds no duplicate notification sound or vibration and
provides no dismiss or reply action.

## Status indicators

**Show low battery and connection indicators** defaults to on. It controls small
indicators beside the primary complication:

- Watch battery at 10% or less while not charging, read on the watch.
- Phone battery at 15% or less, read from `phone/phone_state`.
- A disconnected phone, read on the watch.

These indicators do not take over the main panel. Phone battery has the same
maximum 120-second confirmation lease as music, and disappears if it cannot be
confirmed. Zero is a valid low-battery value. Disabling the option hides the
native indicators and stops the contextual phone-battery subscription; a phone
battery chosen separately as a global complication remains the user's choice.

## Privacy, freshness and transport

Contextual music, notification content and phone battery are not persisted in
Halftone's watch cache or phone storage and are not logged. Native context is
cleared on disconnection and is absent after the watchface relaunches. Global
complication cache behavior is separate: choosing a music or notification
property as a global complication follows that generic cache contract.

Source errors clear their own contextual data. Disabled, empty or expired
sources release the lower panel rather than leaving an old song or message
visible. Settings expose content-free source diagnostics. Music needs
`ReadMusic`; notification access is requested only when summaries are enabled.
Halftone has no Internet permission or independent network fallback.

All theme, global-complication and contextual deliveries share a serialized
AppMessage queue. Native expiry timers remove short-lived content without
waiting for the next minute tick. Already-expired deliveries cannot renew a
summary, and invalid packets do not become displayable context.

## Context packet contract

`CONTEXT_DATA` uses the shared five-record complication codec and CRC. New
packets use version 2; native decoding also accepts legacy version 1. The
20-byte record header is unchanged, and contextual records require the generic
`displayKind` value 0 at byte 5. Weather hints cannot be carried as media or
notification content. It is a complete snapshot on a separate message key, not
an update to the two displayed global choices.

| Record index | Meaning | Maximum lease |
| --- | --- | --- |
| 0 | Music title and optional artwork | 120 seconds |
| 1 | Artist | 120 seconds |
| 2 | Notification app/title and optional app icon | 12 seconds |
| 3 | Notification body, only when enabled | 12 seconds |
| 4 | Low phone battery formatted as `15%` | 120 seconds |

Records retain original confirmation and absolute expiry times; timestamps
are not used as display content. Native selection requires a fresh record 2
for a notification or a fresh record 0 for music. Notification and artist/body
records do not independently create a panel. The global-complication packet is
still carried by `COMPLICATION_DATA` and retains its original persistence rules.

`REQUEST_CONTEXT` value 1 requests a regular contextual refresh. Values 2 and
above carry the native session token described below. The native watchface
requests both contextual and global-complication data as needed.

### Reconnect boundary

The watch assigns a new nonprivate session token at launch and reconnect. A
standalone `REQUEST_CONTEXT=1` from PKJS asks the watch to repeat that token;
regular native refresh requests can also use value 1. Values 2 through
2,147,483,647 identify the current session. The controller echoes the exact
token alongside a valid context snapshot containing no notification records.
The watch suppresses notification records until that matching boundary arrives,
and the controller waits for its matching delivery ACK before sending fresh
summaries. Old queued packets and old boundary tokens cannot reopen a new
session. Context arriving while the phone session is disconnected is cleared.
The token counter contains no music or notification content.

Settings changes retract content in the next delivered snapshot. They cannot
recall a packet already in transit; its original short expiry remains in force.
