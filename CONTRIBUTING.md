# Developing Halftone

Follow the [XOCE contributor conventions](https://github.com/xefensor/xoce/blob/main/docs/contributor-conventions.md). Project-specific commands and exceptions are below.

Use Node 22 (see .node-version), Python 3.12 (see .python-version), a C99 compiler,
and Pebble SDK 4.44 on PATH for native builds. Font asset regeneration additionally
uses fontTools 4.61.1 and skia-pathops 0.9.2; ordinary builds use committed geometry.

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run check:artifact
npm run check:config
```

The JS test runner extracts the real installed Clay bundle into a temporary directory
and invokes each suite directly. It does not require Node's subprocess test isolation.
Development PBW/debug outputs and their source fingerprints live in build/candidate/;
disposable renders and verification reports live in build/qa/. The SDK caches/builds
also stay in build/. Published dist/ and releases/ files remain frozen.

Regenerate Fira outlines with `python3 scripts/generate-clock-glyphs.py`; use
`--check --json` to verify their exact source. Roboto bitmap metrics are generated
with `scripts/generate-body-metrics.py` using freetype-py. The artifact checker compares
linked Fira point, contour and glyph tables and exact SDK native/resource payloads.

`src/c/halftone.c` integrates SDK events and Halftone rendering. Native activity
and reading layout helpers use its bezel-safe content bounds. `src/pkjs` and
`src/common` integrate sources, atomic settings and navigation; `src/plugin`
exposes Halftone's own navigation source. Libraries are independently pinned in vendor/.

For UI changes inspect fresh native renders at all three actual OS text sizes,
in both themes and Peek, with Bigger Text/depth/shadow off and on.
The supporting-type and Peek proof is in [the native checkpoint](docs/native-type-checkpoint.md).
Phone settings checks must exercise the actual generated config.html. Fixture transports
are simulated and do not establish live plugin, phone delivery, hardware or battery results.

The old `package-beta.py`, `check-clock-fonts.py` and versioned release scripts describe
v1.9.0-rc.6's bitmap-font release process. They are retained for that frozen release;
use the current candidate workflow above for the scalable Fira implementation.


## Pinned native build checks

The native CI job uses Node/Python version files, `requirements-release.txt`,
`.github/sdk-lock.json` and the SDK npm lock to build every declared platform.
It downloads verified SDK 4.44 and matching Linux x86_64 toolchain archives into
ignored `.build-tools/`. It does not log in, upload, publish or deploy.
`python scripts/bootstrap-sdk.py --verify-only /path/to/SDKs/4.44` checks an
existing installation without changing it. A new isolated installation needs
a local venv with `requirements-release.txt` and its `bin` directory on PATH;
set `XDG_DATA_HOME` to this checkout's `.build-tools/data` for subsequent builds.
Historical root `dist.zip` files and released versions remain unchanged.

## Freeze a reviewed Store candidate

After current source, artifact, configuration and Store checks pass, run
`python3 scripts/freeze-release.py` to copy the exact checked PBW, debug and Store
kit bytes and make the standalone source ZIP. It refuses an existing version
and writes `releases/SHA256SUMS-VERSION.txt`; old root checksums and artifacts
remain untouched. Commit these files locally, then run `npm run release:prepare`
to validate committed HEAD. No build, tag, upload or publication happens during
freezing or preparation. The current candidate's physical-device and account
gates remain in `docs/RELEASE-READINESS.md`.
