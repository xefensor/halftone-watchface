# Store review kit

This directory prepares Halftone 1.10.0 for Time 2 and Round 2. Duo is deferred.
The kit is local and has not been submitted or published.

Run `npm run store:prepare`, then `npm run store:check`. Both use the exact
checked candidate PBW. `listing.json` contains the proposed fields;
`capture-provenance.json` binds the current raw screenshots to its native code
and resources. Screenshots contain synthetic sample data, with no added frame,
labels or modified pixels. Each target has its own native dimensions.

Pebble now documents plugin publishing in its
[publishing guide](https://developer.repebble.com/guides/plugins/publishing-plugins/).
The former blanket preview restriction is historical. Current phone versions
still require enabling Plugins / permissions preview as described in the
[preview guide](https://developer.repebble.com/guides/plugins/preview/).
Music and notification integration requires Android.

Before publication, complete physical Time 2 and Android checks, verify listing
ownership and that the version is unused, publish the proposed privacy/support
URLs, and obtain the final approval. Round 2 evidence is emulator-only.
A successful local kit check establishes package consistency only.

Files with the old `emery_` naming and the old asset manifest/provenance belong
to earlier releases; they are excluded from the new kit. Historical archives,
checksums and download links remain unchanged. Current capture names use hyphens.
