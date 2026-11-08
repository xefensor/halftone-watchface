# Working on Halftone

Halftone targets stock PebbleOS, Pebble Time 2 / Emery (200 × 228).
Read CONTRIBUTING.md and docs/MAINTENANCE.md for the current development contract.
The v1.9.0-rc.6 release and its docs/VALIDATION.md evidence remain frozen.

## Ownership and compatibility

- Halftone owns its centered Fira clock/value outlines, black zig-zag dot border,
  rounded corners, adaptive geometry, Big text, shadow and three/four-step depth.
  Keep the two left/right reading homes above activities and native Peek. Small
  measured vertical shifts may keep supporting text clear of the dot border;
  retain Fira shapes, clock sizes, Bigger Text, colours and border design.
- Core 0.5.2 owns public readings/cache/transport. Activities 0.4.4 owns ACT3
  sources, roles and private context. UI 0.1.1 supplies utility roles and symbols.
  Exact archives and provenance live in vendor/. Never fix installed node_modules.
- Preserve UUID d4dd5046-53be-4624-99e8-46e0b377fe66, the original 31 AppMessage
  key numbers, persistent key ranges, session token and halftone-complications-v1
  phone namespace. Append new keys. Keep legacy reading decoding.
- One queue, one native render plan. Only actually painted primary/secondary
  activities may be confirmed or exported for navigation. Hidden items stay hidden.
- Preserve original observation/receipt/expiry. Cache replay does not renew data.
  Private music/notification content never persists or logs. Clearing privacy,
  permission, expiry or disconnect takes priority over motion. Notifications
  default Off, message text is opt-in, extra vibration defaults Off.
- The bounded 180ms incoming dissolve only accompanies genuine item replacement.
  Repeated snapshots/ticks do not replay it. Covered views reconcile expiry without
  decorative work or new presentation claims. Clock ticks do not persist or send.
- Provider text/units/identity remain provider-owned. No weather client or local
  unit rewriting. Text starts at its beginning and truncates without paging.

## Development and release

Run npm test, npm run build, npm run check:artifact and npm run check:config.
Use Node 22, Python 3.12, a C99 compiler and SDK 4.33.1 for native builds.
Ordinary candidates and QA belong in ignored build/. Never overwrite dist/,
releases/ or historical evidence. Check actual emulator renders for UI changes;
portable, simulated phone, emulator and physical-device evidence stay separate.
No version bump, release archive, push, publication or appstore submission is
implicit in development. GitHub releases require manual workflow dispatch.
