# GitHub releases

The release workflow publishes versioned downloads to the repository's
[Releases page](https://github.com/xefensor/halftone-watchface/releases).
The release workflow uploads the existing, checked packages; it preserves their
bytes and keeps the native SDK build separate from publishing.

## Current candidate

The initial automated release is **v1.9.0-rc.6**, using tested commit
`dca19138bae62455609d359065324acffedbf041`. Its native Pebble version is
`1.9.0`; `halftoneReleaseCandidate: 6` supplies the `-rc.6` GitHub/filename
suffix. The GitHub release is marked **prerelease**.

The selected assets are:

- `Halftone-1.9.0-rc.6.pbw`
- `Halftone-1.9.0-rc.6-source.zip`
- `Halftone-1.9.0-rc.6-store-package.zip`
- A checksum file for the selected release assets.

The initial tag points to that tested commit. Adding the automation does not
rebuild those packages or change the previously checked source archive.

## Future releases

1. Update `package.json` to the intended numeric SDK version and prerelease
   number. Keep only one of `halftoneReleaseCandidate` or `halftoneBeta`; omit
   both for a stable version. Keep the existing app UUID.
2. Run the portable tests and the normal SDK/render checks described in
   [validation](VALIDATION.md). Package the intended PBW, source archive and
   store archive, then update `dist/SHA256SUMS.txt` and the release notes.
3. Confirm the exact filenames match `.github/release.json`. The templates
   use `{release_id}`, including any `-rc.N` or `-beta.N` suffix. Check the
   configured GitHub prerelease flag before publishing a stable release.
4. Commit the version, exact artifacts, checksums and notes to `main`. The
   GitHub Actions release workflow validates them and publishes the versioned
   downloads. It attaches the prepared packages rather than rebuilding them.

The release configuration is repository-maintained metadata. Its `bootstrap`
entry identifies only the initial existing candidate; future versions use
their own artifact commit. Source-archive metadata and PBW identity must agree
with the chosen version, UUID and Emery target. Existing release assets are
immutable: bump the candidate/version when package bytes need to change.

A manual rerun through the release workflow's **Run workflow** button is safe
for the same version and identical assets. It verifies the existing release
instead of creating a duplicate. Conflicting tag targets or changed asset
bytes fail validation rather than replacing a published release.

## Pebble distribution status

GitHub provides the sideloaded candidate downloads. Pebble appstore submission
remains governed by the [publishing checklist](../store/PUBLISHING.md), the
plugin-preview restriction and the remaining physical phone/watch checks.
The GitHub workflow does not submit anything to the Pebble appstore.
