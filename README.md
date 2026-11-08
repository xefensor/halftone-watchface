# Halftone

A Pebble Time 2 watchface with a centered Fira clock, procedural dot border and
two readings. Music, notifications and Timeline Peek retain both reading positions.

## Download

The public [v1.9.0-rc.6 release](https://github.com/xefensor/halftone-watchface/releases/tag/v1.9.0-rc.6)
is a **prerelease** for sideloading:

- [Installable PBW](https://github.com/xefensor/halftone-watchface/releases/download/v1.9.0-rc.6/Halftone-1.9.0-rc.6.pbw)
- [Source archive](https://github.com/xefensor/halftone-watchface/releases/download/v1.9.0-rc.6/Halftone-1.9.0-rc.6-source.zip)
- [Prepared store package](https://github.com/xefensor/halftone-watchface/releases/download/v1.9.0-rc.6/Halftone-1.9.0-rc.6-store-package.zip)
- [Checksums](https://github.com/xefensor/halftone-watchface/releases/download/v1.9.0-rc.6/SHA256SUMS.txt)

The numeric SDK label is 1.9.0. Development in this checkout is a separate local
candidate using Core 0.5.2, Activities 0.4.4 and shared UI 0.1.1, with activity
navigation and current settings/privacy handling. It does not replace rc.6 or
its original evidence. See [candidate validation](docs/DEVELOPMENT-VALIDATION.md).

## Compatibility

Target: **Pebble Time 2 / Emery**, built with **Pebble SDK 4.33.1**. The phone
needs Pebble's plugin and complication APIs; enable the plugin preview if your
phone version requires it. A library is bundled in the PBW and needs no separate
watch installation. Readings use their providers' permissions and units.

GitHub prerelease availability and Pebble appstore eligibility are separate.
Check the [publishing checklist](store/PUBLISHING.md) before any submission.
[Version-specific validation](docs/VALIDATION.md) records phone/watch gaps.

## Setup and use

1. Open the released PBW with the Pebble phone app and install it on the watch.
2. Configure the first two **Complications** choices in Pebble's settings.
3. Open Halftone's gear settings, choose appearance, clock and context options,
   then save. Keep saved palettes and the explicit clock-size option.
4. Grant the permissions required by the selected sources. Configure their
   services in Pebble when needed.

Either reading can show temperature, precipitation, battery or another supported
scalar source. Values keep the source's text and units. Unconfigured positions
stay empty; stale or unavailable configured readings show `--`. Both positions
remain visible above music, notifications and Timeline Peek. The date, clock,
watch battery and connection state keep their native watch behavior.

[Reading formats and limits](docs/COMPLICATIONS.md) · [Weather setup](docs/PLUGIN-WEATHER.md) ·
[Context and privacy](docs/DYNAMIC-CONTENT.md) · [Current UI](docs/UI.md).

The local development candidate adds independent Text Size and Appearance choices,
including Manual Day/Night and Follow Quiet Time. Bigger Text and optical settings
remain separate. Follow Pebble Appearance is unavailable on the pinned SDK and
retains the last manual palette. See the [preferences checkpoint](docs/ui-preferences-checkpoint.md)
for candidate evidence and limits; published downloads retain their original UI.

## Development

Use the runtimes and tools in [CONTRIBUTING](CONTRIBUTING.md): Node 22, Python
3.12, a C99 compiler and Pebble SDK 4.33.1. Ordinary builds use committed font
geometry; regeneration has additional documented prerequisites.

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run check:artifact
npm run check:config
```

Development PBW/debug packages live in `build/candidate/`; captures and reports
live in `build/qa/`. Build independently from the pinned archives and provenance
in `vendor/`. Keep `dist/` and existing release evidence frozen. The font/preview
audits bind screenshots to the actual native renderer; refresh development
previews when that renderer changes.

Read [maintenance contracts](docs/MAINTENANCE.md), [shared-core notes](docs/SHARED-CORE.md)
and [release preparation](docs/GITHUB-RELEASES.md). A push to main can publish;
local verification does not authorize it. Earlier release details and commands
are preserved in the [earlier README](docs/history/readme-before-native-ui.md)
and [changelog](CHANGELOG.md).

## Licence

Halftone's source code and original artwork are available under the
[PolyForm Noncommercial License 1.0.0](LICENSE). You may use, modify and share
them for noncommercial purposes. Commercial use requires separate permission
from Xef. Redistributed copies and derivatives must retain the license and the
required attribution notice naming Xef as the original author.

Because commercial use is restricted, Halftone is source-available rather than
OSI-approved open-source software.

Fira Sans Condensed and Roboto Condensed retain their SIL Open Font License 1.1
notices. Keep [third-party notices](THIRD-PARTY-NOTICES.md), the bundled license
texts and [font provenance](resources/fonts/font-provenance.json).
