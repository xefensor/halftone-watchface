# Historical native settings previews

The 24 embedded Emery frames and 24 Gabbro frames retain their original `1.10.2` module version, PNG data and capture provenance. They are historical examples, not fresh captures of candidate `1.10.3`. Earlier originalCaptureVersion fields remain unchanged.

The exact supplied `Halftone-1.10.2.pbw` is retained under `tests/fixtures/historical-preview/` as a read-only audit baseline. `scripts/historical_preview.py` pins its complete SHA-256, verifies that each platform matches the original capture renderer identity, and compares the candidate with it. All executable, constant and relocation bytes and all eight compiled font payloads must remain identical. The comparison permits only launcher resource ID 0 to 9, resource CRC binding, and SDK checksum/timestamp/GNU build-ID fields; it validates CRCs before comparison. Semver patch is absent from the SDK 4.44 native process version, so native major/minor remain unchanged.

Resource 9 is the reviewed 25×25 transparent black launcher glyph, appended after font IDs 1–8. The auditor verifies its declaration, approved source SHA-256, binary alpha, visible black ink, packaged pixels and native-header resource ID. Black is deliberate: actual SDK 4.44 launcher QA showed white unselected rows and non-inverting artwork.

`npm run check:artifact` produces compatibility proof only after every byte-level check passes. It never claims these 48 frames were freshly captured. Fresh candidate main-screen and launcher captures on Emery and Gabbro are separate native QA evidence. A changed executable byte, font payload, unsupported resource or artwork mismatch must fail the audit and requires a new preview capture/review rather than a broader exception.
