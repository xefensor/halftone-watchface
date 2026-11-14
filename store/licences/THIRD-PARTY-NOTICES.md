# Third-party notices

Halftone is by Xef. Its own code, Pebble Watchface Core and Pebble Activities use the PolyForm
Noncommercial License 1.0.0, with the required attribution notices preserved.
The activity host, settings and lifecycle integration were adapted from Dynamic
by Xef (https://github.com/xefensor/pebble-watchface-dynamic). Its required notice
is retained in LICENSE. The third-party components below retain their own licenses.

| Component | Copyright / attribution | License text |
| --- | --- | --- |
| Halftone | Halftone watchface by Xef | [LICENSE](LICENSE) |
| Pebble Watchface Core | Xef; inherited Halftone attribution is retained | [Core license](licenses/pebble-watchface-core-LICENSE.txt) |
| Pebble Activities | Xef; inherited Halftone attribution is retained | [Activities license](licenses/pebble-activities-LICENSE.txt) |
| Pebble SDK injected `_pkjs_shared_additions.js` | Copyright 2024 Google LLC | [Apache License 2.0](licenses/Apache-2.0.txt) |
| Clay settings framework | Copyright (c) 2016 Pebble Technology | [MIT](licenses/Clay-MIT.txt) |
| Clay bundled helpers and generated styles | Buffer, base64-js, deepcopy, ieee754, isarray, toSource, Minified.js / JSON-js and Bourbon | [Full component notices](licenses/Clay-bundled-NOTICES.txt) |
| Fira Sans Condensed clock font and derived outlines | Digitized data copyright 2012–2016, The Mozilla Foundation and Telefonica S.A. | [SIL Open Font License 1.1](resources/fonts/OFL-FiraSans.txt) |
| Roboto Condensed body fonts and derived metrics | Copyright 2011 The Roboto Project Authors | [SIL Open Font License 1.1](resources/fonts/OFL-RobotoCondensed.txt) |

Font source snapshots, hashes and derivation details are recorded in
[font provenance](resources/fonts/font-provenance.json). The exact library releases
are recorded in [vendor/CORE.json](vendor/CORE.json) and
[vendor/ACTIVITIES.json](vendor/ACTIVITIES.json); the Clay release and its
integrity are pinned by [package-lock.json](package-lock.json).
The bundled-helper license snapshots and exact installed Clay bundle hash are
recorded in [their provenance](licenses/clay-bundled-provenance.json).
The unmodified SDK component adds Pebble event aliases and error reporting.
Its notice remains in the phone bundle; its exact source and license hashes
are recorded in [SDK component provenance](licenses/sdk-bundled-provenance.json).

The standalone PBW includes these notices and the full license texts in its
`licenses/` directory. The source archive includes the same source documents.
License packaging does not alter the SDK's compiled watch or phone payloads.

## XOCE shared UI

The locally pinned `pebble-xoce-ui` 0.1.1 library supplies shared native drawing
and phone-settings styles. It is authored by Xef and uses the same PolyForm
Noncommercial license as this application. Its sources and license are included
in the committed vendor archive; it is not a separately installed service.
