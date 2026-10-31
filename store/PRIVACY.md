# Halftone privacy information

This information describes the current two-complication build. Archived releases
through 1.5 used different weather clients and caches; their disclosures are
included in their release archives.

Halftone does not require an account with its developer and contains no
advertising, analytics or developer-operated tracking service. The Pebble app
and selected plugins may require their own accounts and have their own privacy
practices.

## Two selected complications

Halftone reads the first two global complication choices in the Pebble phone
app. They can contain weather, phone state, calendar or other plugin data.
It requests the chosen source properties and optional artwork. The remaining
global choices are ignored by its new subscriptions and phone cache.

Pebble and the selected source handle fetching and permissions. Halftone has
no independent weather HTTP client, does not request GPS coordinates itself,
and does not send source readings to a server operated by its developer.
The package declares no Internet permission. Source units and formatted values
are retained rather than converted locally.

The two descriptors, bounded values/icons and original confirmation times are
cached locally on the phone; a bounded snapshot is retained on the watch.
They expire at the source's reported expiry or two hours after confirmation,
whichever is earlier. Receipt/confirmation time is not an observation time.
Reopening the face or changing display settings does not renew the cache.
Changing or clearing a choice invalidates its old value. Temporary failures may
retain an unexpired value; denied access clears it. This is a current-value
cache, not a history uploaded to the developer.

A property explicitly chosen as a normal complication follows these cache
rules, including a music or notification property. That differs from the
separate dynamic panels described below. Older native snapshots can be decoded
on upgrade, but only their first two positions are displayed; the new phone
cache rejects five-reading cache records.

## Dynamic music, notifications and status

Music and low phone-battery indicators use additional built-in Pebble sources.
The package declares `ReadMusic`. The dynamic source content is kept in memory,
not persisted or logged by Halftone. Music and phone state require confirmation
at least every two minutes. Paused music yields after five seconds.

Notification summaries are off by default. Enabling them uses Pebble's source
permission flow. Message text is a separate option and is also off by default.
An optional comma-separated app-name filter limits the sources shown; an empty
filter includes apps allowed by Pebble. New summaries can contain an app name,
title and optional body. They last at most 12 seconds and retain their original
expiry even if another source updates.

Existing notifications are not replayed on startup, reconnect or notification
reconfiguration. Dynamic content disappears when its lease expires, on phone
disconnection or when the native watchface relaunches. A local nonprivate
session counter helps prevent delayed messages from replaying after reconnect.
Native watch battery and phone-connection indicators do not require a remote
service.

## Settings and diagnostics

Colors, time format, display effects, panel preferences and app-name filters are
stored locally. Translation selection uses the active watch language, then the
phone language, and requires no network request. The settings status can show a
bounded source error to help diagnose failures; it is not uploaded to the
developer. Dynamic music and notification contents are not included in logs.

Halftone does not operate its own cloud service. Source-plugin accounts,
permissions and their data must be managed separately in Pebble or the source
service.

Project and support: https://github.com/xefensor/halftone-watchface
