# Activities, music and notifications

This guide describes published **Halftone 1.10.3**. Its two global readings stay
above compatible activities; the [reading guide](COMPLICATIONS.md) describes
those separate Complications choices. [Earlier rc.6 panel behaviour](https://github.com/xefensor/halftone-watchface/blob/22f4193c07fd28d4cffacce68bb89e425dcc3610/docs/DYNAMIC-CONTENT.md)
remains historical and does not define the current activity engine.

## Choose activities and priority

In **Content & priority**, turn on **Show activity plugins** and the intended
provider's **Show** checkbox. Use **Move up / Move down** to set its position.
The first eligible source becomes Primary and the next becomes Secondary when
space allows. Either role can contain a compatible Timer, music or notification
activity. Halftone's order is independent of Dynamic and Dashboard.

Music and Notifications participate in the same list but retain their own
visibility and privacy choices. Hiding a provider preserves its saved order.
A missing, expired, private or unfittable activity yields instead of displaying
old content. Timeline Peek owns its native area; activities make room for it.

Save confirms phone persistence. A separate status describes delivery to the
watch. The [illustrated setup](https://xefensor.github.io/xoce/docs/pebble/setup/#illustrated-first-setup)
shows the current controls and their separate statuses.

## Timer and Open Activity

Install Timer separately, enable it in Halftone, save, then start a countdown
on the watch and press Back twice to return to the watchface. Timer owns its
saved countdown and alarm. Halftone only displays its shared activity; a zero
shown by a prediction is not proof that the native alarm fired. A paused Timer
activity leaves the view after its bounded five-minute visibility interval.

Open Activity is an optional, separately installed helper. Choose Halftone as
its source and configure Primary/Secondary shortcuts, then match those in
Pebble's Quick Launch settings. A valid recent displayed destination can open
its associated app. A missing Secondary never substitutes Primary. The helper
opens the whole app, not a specific saved timer, song or notification.

Halftone exports only activities actually painted by its native renderer. The
navigation plugin retains bounded destination metadata, not activity text.
Use one connected watch for the supported handoff flow. The platform does not
prove the previously active watchface or reliably recall a dispatched launch.

## Music and source-owned content

Built-in music and notification sources require Android and their Pebble
permissions. Music can show supplied title, artist and artwork; missing content
stays absent. Use Pebble's Music app for playback. Halftone does not issue
provider playback or other contextual action commands.

A real item change can enter with a brief 180ms dot dissolve when enabled.
Repeated snapshots, countdown ticks and late artwork do not replay that
transition. Text starts at its beginning, then fits or truncates without
marquees or automatic text paging. Both watch shapes use fitted geometry;
Round 2 is not a rectangular screen cropped into a circle.

## Privacy, expiry and notifications

Notifications and message text start off. Choose App-only, summary or message
detail deliberately; even a summary title can contain private text. App filters
limit display without replacing Android/Pebble permission controls. Additional
vibration is optional, defaults off and respects Quiet Time. PebbleOS's own
notification alerts remain independent.

Startup/reconnect establishes a baseline rather than replaying old notices.
A fresh continuous notification burst has one original **eight-second** bound,
shortened by earlier source expiry. Identical updates and unrelated source
traffic do not renew it. Music and phone state use their bounded original
confirmation leases; a source receipt is not a new observation.

Private activity, music and notification content stays transient. Expiry,
disconnect, removed permission and privacy changes clear it before decoration.
Public reading caches keep their original receipt/expiry and cannot become
fresh through replay. [Privacy details](../PRIVACY.md) ·
[current ownership contracts](MAINTENANCE.md).

## Source and evidence

The app pins Activities 0.4.5 for ACT3/schema 4 activity handling, Core 0.6.0 for
readings/transport and UI 0.1.3 for presentation helpers. Providers own source
meaning; Halftone owns priority, fitted layout, settings and native lifecycle.
The exact archives and provenance are in `vendor/`.

[Current release evidence](RELEASE-READINESS.md) distinguishes portable tests,
packaged browser simulation and native emulator rendering. None of these
establishes physical-watch comfort, battery life or real-phone provider results.
Published source archives and older captures keep their original versions.
