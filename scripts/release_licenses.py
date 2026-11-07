"""Exact license documents carried by the standalone Halftone PBW."""
from pathlib import Path
import hashlib
import io
import json
import tarfile


LICENSE_FILES = {
    "licenses/Halftone-LICENSE.txt": "LICENSE",
    "licenses/THIRD-PARTY-NOTICES.txt": "THIRD-PARTY-NOTICES.md",
    "licenses/pebble-watchface-core-LICENSE.txt": "licenses/pebble-watchface-core-LICENSE.txt",
    "licenses/pebble-xoce-ui-LICENSE.txt": "licenses/pebble-xoce-ui-LICENSE.txt",
    "licenses/pebble-activities-LICENSE.txt": "licenses/pebble-activities-LICENSE.txt",
    "licenses/Apache-2.0.txt": "licenses/Apache-2.0.txt",
    "licenses/Clay-MIT.txt": "licenses/Clay-MIT.txt",
    "licenses/Clay-bundled-NOTICES.txt": "licenses/Clay-bundled-NOTICES.txt",
    "licenses/OFL-FiraSans.txt": "resources/fonts/OFL-FiraSans.txt",
    "licenses/OFL-RobotoCondensed.txt": "resources/fonts/OFL-RobotoCondensed.txt",
}


def license_payloads(root):
    root = Path(root)
    payloads = {name: (root / source).read_bytes()
                for name, source in LICENSE_FILES.items()}
    own = payloads["licenses/Halftone-LICENSE.txt"]
    if (b"Required Notice: Halftone watchface by Xef" not in own):
        raise ValueError("Required Halftone or inherited Halftone attribution is missing")
    clay = payloads["licenses/Clay-MIT.txt"]
    if clay != (root / "node_modules/@rebble/clay/LICENSE").read_bytes():
        raise ValueError("Clay license differs from the installed pinned dependency")
    bundled = json.loads((root / "licenses/clay-bundled-provenance.json").read_text())
    if (hashlib.sha256((root / bundled["installed_bundle_file"]).read_bytes()).hexdigest() !=
            bundled["installed_bundle_sha256"] or
            hashlib.sha256(payloads["licenses/Clay-bundled-NOTICES.txt"]).hexdigest() !=
            bundled["notice_sha256"]):
        raise ValueError("Review bundled Clay dependency notices for this installed bundle")
    sdk = json.loads((root / "licenses/sdk-bundled-provenance.json").read_text())
    if (sdk["licenseFile"] != "licenses/Apache-2.0.txt" or
            hashlib.sha256(payloads["licenses/Apache-2.0.txt"]).hexdigest() != sdk["licenseSha256"]):
        raise ValueError("SDK-injected JavaScript license differs from reviewed provenance")
    for metadata_file, package in (("CORE.json", "pebble-watchface-core"),
                                   ("ACTIVITIES.json", "pebble-activities")):
        pin = json.loads((root / "vendor" / metadata_file).read_text())
        raw = (root / "vendor" / pin["artifact"]).read_bytes()
        if hashlib.sha256(raw).hexdigest() != pin["sha256"]:
            raise ValueError("Pinned dependency archive differs: " + package)
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
            license_text = archive.extractfile("package/LICENSE").read()
        if payloads["licenses/" + package + "-LICENSE.txt"] != license_text:
            raise ValueError("Dependency license differs from pinned archive: " + package)
    for name, marker in [("licenses/Clay-MIT.txt", b"Permission is hereby granted"),
                         ("licenses/Apache-2.0.txt", b"Version 2.0, January 2004"),
                         ("licenses/OFL-FiraSans.txt", b"SIL OPEN FONT LICENSE"),
                         ("licenses/OFL-RobotoCondensed.txt", b"Roboto Project Authors")]:
        if marker not in payloads[name]:
            raise ValueError("Required copyright/license text is missing: " + name)
    return payloads
