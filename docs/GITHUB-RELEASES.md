# GitHub releases

[Halftone 1.10.3](https://github.com/xefensor/halftone-watchface/releases/tag/v1.10.3)
is the current stable release. It is also published in
[Pebble Store](https://apps.repebble.com/48d7f4eab704414c8bc1fa7e) for Time 2 and
Round 2. The release page supplies its exact PBW, source archive, Store package,
debug files and checksums. [Current publication record](../store/publication.json).

## Maintain an existing release

Published tags and assets retain their original bytes. A README, support or
contributor-tooling update does not rebuild or replace the source shipped with
1.10.3. `.github/release.json` pins that version's source commit to
`22f4193c07fd28d4cffacce68bb89e425dcc3610`; preparation validates its immutable
archives against that commit and checks their bytes still match the current
branch's selected artifacts. An identical rerun verifies and reuses the
existing release; a conflicting tag or altered published asset fails.

```sh
npm run release:prepare
```

This reads committed inputs and writes `build/release/`. It never builds,
creates a tag, uploads or publishes. Run it from a committed checkout. Its
manifest reports the original `source_commit` separately from the maintenance
trigger commit. No extra physical-device approval gate is created for an
already published release; existing test gaps remain explicit.

## Prepare a future version

A behaviour/dependency change belongs in a new reviewed app release. Select its
new version and intended platforms, run the owning source, SDK, artifact,
configuration and Store checks, and record actual browser/emulator/device scope.
New captures retain their own source identity; reuse needs an explicit proof.

`python3 scripts/freeze-release.py` freezes only a new version's checked PBW,
debug and Store inputs and creates its standalone source ZIP. It refuses an
existing version. Commit the complete source/artifact/metadata set, then run
the preparer. A version different from the pinned historical bootstrap uses
its own committed HEAD and strict source/archive checks.

## Publish separately

The manual GitHub release workflow runs only through **Run workflow** on main.
Its check job has read access and runs `npm test`, including freezer/release
regressions. Publication uses the built-in GitHub token in a separate job with
`contents: write`. Normal pushes and tests do not publish.

The helper validates PBW UUID/version, source and native/JavaScript identity,
asset allowlists/checksums, and the PBW embedded in the Store package. It rejects
working directories and unapproved compiled PBWs in source archives. It never
silently replaces an existing tag or published asset. Interrupted drafts can
resume under the same policy.

GitHub publication does not submit to Pebble Store. For a future version,
verify listing ownership, UUID, unused numeric version, live support/privacy
URLs and exact checked bytes before that separately authorized submission.
A local kit or successful preparation establishes consistency, not account
ownership or a completed upload.

## History and evidence

[Release readiness](RELEASE-READINESS.md) owns the current version's scope.
The [earlier publishing guide](https://github.com/xefensor/halftone-watchface/blob/22f4193c07fd28d4cffacce68bb89e425dcc3610/docs/GITHUB-RELEASES.md)
retains rc.6/1.10.1 preparation details. Older tags, source snapshots, checksums
and [rc.6 validation](VALIDATION.md) remain unchanged.
