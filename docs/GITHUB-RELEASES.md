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

## Prepare the stable 1.10.1 release

Xef accepted the reviewed Round 2 implementation for a stable public release on
2026-11-13. This does not alter the frozen rc.6 or 1.10.0 archives, nor establish
new physical-device test results. Current evidence is in
[release readiness](RELEASE-READINESS.md).

Run the current source, SDK candidate, artifact, configuration and Store-kit
checks. Refresh native captures before preparing the Store kit, then use
`python3 scripts/freeze-release.py` to freeze the exact checked candidate into
new `releases/` files. The source snapshot is made last. The 1.10.1 configuration
sets `prerelease` to false.

Commit the complete source/metadata/artifact set locally, then run:

```sh
python3 scripts/github-release.py prepare --output build/release-stable-1.10.1
```

Preparation reads committed HEAD and never uploads. Publication uses the manual
GitHub release workflow on main and the same frozen PBW in the Developer
Dashboard. Existing tags and published asset bytes remain immutable.

## Validation and automation

The workflow runs only through **Run workflow** on `main` in GitHub Actions. It installs the locked Node dependencies, runs `npm test`,
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
current Pebble publishing instructions and the recorded review acceptance. See [privacy](../store/PRIVACY.md) for the current source/cache contract.
