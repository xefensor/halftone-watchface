# GitHub releases

The [Releases page](https://github.com/xefensor/halftone-watchface/releases)
provides versioned sideload downloads. GitHub Actions uploads the existing,
checked packages; the native SDK build and render checks happen before
publication. This workflow does not submit anything to the Pebble appstore.

## Published candidate

[**v1.9.0-rc.6**](https://github.com/xefensor/halftone-watchface/releases/tag/v1.9.0-rc.6)
is published as a **prerelease**, using tested artifact commit
`dca19138bae62455609d359065324acffedbf041`. Its numeric Pebble SDK version is
`1.9.0`; `halftoneReleaseCandidate: 6` supplies the `-rc.6` GitHub/filename suffix.

| Download | Purpose |
| --- | --- |
| [Halftone-1.9.0-rc.6.pbw](https://github.com/xefensor/halftone-watchface/releases/download/v1.9.0-rc.6/Halftone-1.9.0-rc.6.pbw) | Installable Emery watchface |
| [Halftone-1.9.0-rc.6-source.zip](https://github.com/xefensor/halftone-watchface/releases/download/v1.9.0-rc.6/Halftone-1.9.0-rc.6-source.zip) | Source matching the candidate |
| [Halftone-1.9.0-rc.6-store-package.zip](https://github.com/xefensor/halftone-watchface/releases/download/v1.9.0-rc.6/Halftone-1.9.0-rc.6-store-package.zip) | Prepared listing materials and the same PBW |
| [SHA256SUMS.txt](https://github.com/xefensor/halftone-watchface/releases/download/v1.9.0-rc.6/SHA256SUMS.txt) | Flat checksums for these three assets |

The initial tag stays on the tested commit. The automation was added later on
`main` and did not rebuild the PBW or archives. Documentation-only updates do
not require repackaging that release; its source archive remains the source
snapshot shipped with the candidate.

## Prepare a future release

1. Update `package.json` to the intended numeric SDK version and prerelease
   number. Keep only one of `halftoneReleaseCandidate` or `halftoneBeta`; omit
   both for a stable version. Preserve the existing app UUID.
2. Run the portable tests, SDK build and packaged-font checks from the
   [README](../README.md), then the affected render/lifecycle checks in
   [validation](VALIDATION.md). `scripts/package-beta.py` prepares the PBW;
   assemble the matching source and store ZIPs separately. Refresh listing
   captures if the native output changes.
3. Update `dist/SHA256SUMS.txt` and the release notes. Confirm all exact filenames
   match `.github/release.json`; its `{release_id}` includes any `-rc.N` or
   `-beta.N` suffix. Before a stable release, set the configured GitHub prerelease
   flag to false. Candidates must keep it true.
4. Commit the version, intended artifacts, checksums, notes and relevant source
   locally. The preflight reads **committed `HEAD`**, so run it after this commit:

   ```sh
   python3 -m unittest discover -s tests -p test_github_release.py
   python3 scripts/github-release.py prepare --output ../tmp/halftone-release-check
   ```

5. Resolve any validation failure and commit the correction before rerunning.
   Push the checked commit to `main`. The release workflow validates it and
   publishes the versioned downloads without rebuilding the SDK project.

The release-helper suite currently has **18 tests** and needs Python's standard
library only. The local `prepare` command writes a release plan, selected assets
and checksums outside the source tree; it does not upload them.

## Validation and automation

The workflow runs on release-related pushes to `main`, or through **Run workflow**
in GitHub Actions. It installs the locked Node dependencies, runs `npm test`,
runs the Python release-helper tests and prepares the release. Publication is a
separate job using the built-in GitHub token with `contents: write`; the check
job has read access. No personal access token or external schedule is required.

The helper validates PBW identity/version, matching source metadata,
checksums and the PBW inside the store package. The source archive must exclude
root `build/`, `node_modules/`, `.git/` and `.pebble/` directories and any embedded
PBW, including differently cased names. Use the explicit asset allowlist in
`.github/release.json`; unrelated historical files in `dist/` are not uploaded.
The attached checksum file contains only the selected release assets.

The configuration's `bootstrap` entry freezes the first existing candidate to
its tested commit. Future versions use their own artifact commit. Versioned tags
and published asset bytes are immutable: changes require a new candidate or
version. Identical reruns verify and reuse the existing release rather than
creating duplicates; interrupted drafts can resume. Conflicting tags or changed
published bytes fail rather than replacing a release. The live rc.6 rerun was
checked to preserve the existing tag, asset IDs and bytes.

## Pebble distribution status

GitHub downloads are separate from the older public store listing. Appstore
submission remains governed by the [publishing checklist](../store/PUBLISHING.md),
Pebble's plugin-preview restriction and the remaining physical phone/watch
checks. See [privacy](../store/PRIVACY.md) for the current source/cache contract.
