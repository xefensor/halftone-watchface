# Store publication and local reference kit

Halftone **1.10.3** is published for Time 2 and Round 2. Its
[publication record](publication.json) identifies the verified Store/GitHub
locations, UUID, version and exact PBW hash. This record describes observed
publication; it does not authorize another upload.

`listing.json` describes that current published version. The local generator
accepts published metadata only when the record matches identity, canonical
release/download URLs and the exact selected PBW bytes. `store_submission_allowed`
remains false: no test or local command submits anything to an account.

`npm run store:prepare` reads the exact hash-validated PBW from `releases/`
and writes a reference kit under ignored `build/store/`; `npm run store:check`
verifies that local output. Preparation-state listings retain the strict fresh
candidate/local ELF path. The kit manifest identifies which validation scope ran. A reference generated after documentation maintenance does not
replace the frozen 1.10.3 Store archive. Keep earlier screenshots and captures
unchanged, with their original versions and gallery-reuse proof.

For a new app version, prepare a new reviewed kit, verify the Developer
Dashboard listing/UUID/version and live support/privacy URLs, then upload only
the exact checked artifacts under separately authorized publication scope.
Published tags/assets remain immutable.

Pebble's [plugin publishing guide](https://developer.repebble.com/guides/plugins/publishing-plugins/)
supersedes the former blanket preview restriction. A phone-app build can still
require enabling Plugins / permissions preview. Music and notification sources
require Android. Neither publication nor a local check establishes unobserved
physical-watch or real-phone behaviour.

The [artwork guide](README.md) identifies checked-in masters and the maintained
XOCE generator reference. Native Store screenshots remain raw and unframed;
marketing banners have their own provenance. The
[earlier Store preparation notes](https://github.com/xefensor/halftone-watchface/blob/22f4193c07fd28d4cffacce68bb89e425dcc3610/store/PUBLISHING.md)
remain available with the historical source.
