# Halftone native supporting text checkpoint

This local development checkpoint keeps Halftone's Fira clock and value outlines,
left/right reading homes, colours, dot rings, corner treatment, Bigger Text,
shadow, depth and incoming dissolve. It adds Small/Medium/Large supporting text
selected from the actual PebbleOS preference. Per-face manual preferences,
appearance modes and their confirmed phone delivery remain a separate task stage.
The public v1.9.0-rc.6 release and its evidence remain unchanged.

## Result and bounds

The profiles are date/body/secondary/footer 22/22/20/22, 24/24/22/24 and
26/28/26/26. Medium retains the established supporting roles. Measurement and
painting use the same selected resource, including a bounded smaller-font fit
for unusually long required qualifiers or atomic details. Units fit with long
numeric values; required values and paused state take precedence over optional
identity, artwork and a compact secondary activity.

Xef authorized small vertical shifts on 8 November 2026. The layout measures the
actual width-fitted Fira ink, dates, both reading groups and required primary space
inside the existing bezel and real unobstructed height. Whole dates are preferred;
the optional Bigger Text date bonus, weekday and finally date can yield in a tight
composition. Clock points, x positions and width fitting are unchanged.
Measured free space can move the activity start up by at most18px from its former
minimum, after both reading groups. This allows a complete paused state and
required detail to retain room above their footer. Activities end at y208 for classic depth and y203 for four-step depth, within
x24–176. Native Peek retains both readings and owns the lower event panel.

The unused 11px body resource is replaced by 28px. All eight sizes retain the
complete 919-character source-font repertoire plus the SDK wildcard. Exact
codepoint ranges replace a redundant flat lookup in the native image; every BMP
lookup is checked against the full source table. Ascent/descent rows remain exact.
This keeps SDK 4.33.1's 16-bit image-size baseline: static footprint 64,982 bytes,
resources 260,444 bytes. No SDK, minimum-firmware, version, UUID or wire/storage
identity change is part of this checkpoint.

## Candidate and binding

- Candidate: `build/candidate/Halftone-1.9.0.pbw`
- PBW SHA-256: `e0de2c813ad3ea2689d4071dbf2bf7797fe8bea417f599f35c7325b603a0e0c8`
- JS debug archive: `48edc7f23ef7b9365cfc5ccec3e631da00ccb12c108dddf868e916c02684d713`
- Native binary: `283d1dfb9f8f0eb186d0750fff7cee05ef68509d912885744bebf30137ee6730`
- Resources: `db9ae1bc039026afe77bb1f0a775319c0aa00b5a46de706a9d410deaa209d520`
- Native manifest: `9d5cc0d6f10c7d97eb5496e5e847309e9f24f92184326aee07977fb53ff33bd6`

The full matrix used local candidate `5cfd1e4fc8be88c2748ff6d0099dd3ed4e64d76a4ce18f69cc33a1a604cf4204`.
After refreshing the embedded settings examples from Medium native captures,
the packaged binary and resources are byte-identical. Only the SDK manifest's
`generatedAt`, `application.timestamp` and `resources.timestamp` changed.
`build/qa/native-type-payload-equivalence.json` records both sets of hashes and
those exact differences. The artifact checker still binds examples to the native
binary/resources and compares the final package with the actual SDK output.

The pre-change reference is a **local development baseline**, PBW
`53bcdb8d0957b65ee33188b349553377704809716878fcfadc2183b7a0cbae8a`.
It is not a published-PBW upgrade test. Its native captures, with identical
settings/data, are preserved under `/tmp/halftone-before-native-type/`.

## Automated checks

`npm test` passes 264 JavaScript tests, 21 portable native programs, four actual
native-callback tests and nine workflow tests (two release-only guards skipped).
The layout suite covers 2,784 size/optics/height/pose combinations, plus tight
capacity and full-BMP lookup checks. Regressions exercise retained long required
details and their optional labels, a complete paused music state, an omitted secondary staying absent from navigation, and the actual
measure/draw callbacks fitting the same unit beside a long navigation value.

`npm run build`, `npm run check:artifact`, `npm run check:config` and the body metric
regeneration check pass. The artifact audit independently checks all 7,360
packaged glyph ascent/descent pairs, their complete repertoire and fallback,
linked compressed tables, exact linked Fira geometry, package identity, keys,
permissions, pinned inputs and native-preview binding.

## Actual native Emery checks

SDK 4.33.1, CLI 5.0.40, actual bundled firmware 4.33.2. The environment used
Node 26.12.0 and Python 3.13.16; the contributor-pinned runtimes remain a separate
final clean-environment check. QEMU ran through isolated local FIFOs. Captures
execute the actual native binary and resources; phone JavaScript is replaced by
explicit synthetic source fixtures.

Six runs cover real OS content sizes 1/2/3, each with Bigger Text/depth/shadow
all Off and all On. Each run includes 24 standard presets, 72 activity
compositions and 30 focused reading captures across idle, activity and real
Peek, in Light and Dark. Local live-clock checks verify only actually painted
clocks, without resending their source snapshot; hidden compact clocks are
explicitly recorded as not applicable.

All 144 standard main-clock comparisons retain the exact antialiased glyph
pixels, size, colour and x position; only an integer vertical translation is
allowed. Observed shifts range from −12 to +7 px. Both outer border/corner
strips also match the pre-change reference exactly. The Fira header and dot-ring
algorithm are unchanged. Inspected boards show before/after Medium, all three
sizes, long values/units, paused state, accents and Peek.

Six separate Czech/German native lookup fixtures cover all three actual OS sizes
with Bigger Text/depth/shadow On, the wide date 31 December 2026, ten activity
compositions and 12 focused reading captures each. These explicitly override
native locale lookup; they do not establish installed OS language-pack behaviour.
Czech fixture PBW: `4f9a35ce0668e4e7791410214410ca3e84e9eb890efc4f004e08b77149889ccd`;
German: `87ff12afb9bcd29b6a17d1789ef246019f498ba5154f3e3262224a55644673c1`.
The fixture UTC is set before native startup so its first clock cache cannot
retain the host date.

With one unchanged Timer snapshot per case, Peek receipt probes at all three OS
sizes and both visual-setting extremes withdraw primary/secondary while covered
and restore the primary afterward. Presentation sequence increases while the
source view/expiry remain unchanged; the snapshot is not resent.

Native motion captures observe the two settled entry and genuine-replacement
endpoints. Serial screenshot transfer observed **zero intermediate frames** in
both sequences; the GIFs contain captured frames only. The native layout remains
250ms EaseInOut and incoming dot dissolve 180ms EaseOut, with no added input or
presentation delay. This is not a physical timing or smoothness measurement.

Every standard matrix and locale exit reports zero outstanding allocations.
The standard candidate reports 15,192-byte native state, 22,356-byte peak app
allocation and 43,732 bytes free after initialization.

## Evidence and remaining scope

Ignored evidence is indexed by `build/qa/native-type-summary.json`. Canonical
runs are `native-size-{1,2,3}-optics-{0,1}-final/`,
`native-{cs,de}-size-{1,2,3}-final/`, both `native-peek-presentation` directories,
and `native-motion-final-verified/`. The inspected contact sheets are
`native-type-before-after.png`, `native-type-sizes-optics-{0,1}.png` and
`native-type-locales.png`. Raw captures remain unmodified; contact sheets only
arrange them for comparison.

Physical Time 2, paired-phone plugin delivery, actual Quick Launch/Timeline
payloads, current-firmware acceptance and published-PBW upgrade tests are not
claimed by this stage. The broader task tracks those separately. No push,
publication, release archive or appstore submission occurred.
