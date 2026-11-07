"""Validate the exact committed dependency releases used by Halftone."""
from pathlib import Path, PurePosixPath
import base64
import hashlib
import io
import json
import re
import tarfile


DEPENDENCIES = (
    ("CORE.json", "pebble-watchface-core", "0.5.2"),
    ("ACTIVITIES.json", "pebble-activities", "0.4.4"),
)

# Repository locations are independent of the stable npm/SDK package names.
REPOSITORIES = {
    "pebble-watchface-core": "https://github.com/xefensor/pebble-lib-core",
    "pebble-activities": "https://github.com/xefensor/pebble-lib-activities",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def safe_name(name):
    path = PurePosixPath(name)
    return (not path.is_absolute() and ".." not in path.parts and
            "\\" not in name and name.startswith("package/"))


def verify_dependency(root, specification):
    """Check the reviewed pin against declarations, lockfile and archive bytes.

    Installed/staged SDK bytes are checked separately by the native bundle audit.
    """
    root = Path(root)
    metadata_file, name, version = specification
    pin = json.loads((root / "vendor" / metadata_file).read_text(encoding="utf-8"))
    label = name + " " + version
    artifact = name + "-" + version + ".tgz"
    require(pin["package"] == name and pin["version"] == version and
            pin["artifact"] == artifact, "Unexpected dependency release: " + label)
    require(pin["repository"] == REPOSITORIES[name] and
            re.fullmatch(r"[0-9a-f]{40}", pin["source_commit"]) and
            pin["source_commit"] != "0" * 40 and
            re.fullmatch(r"[0-9a-f]{64}", pin["sha256"]),
            "Invalid dependency provenance: " + label)
    require(pin["sdk"] == "4.33.1" and pin["platforms"] == ["emery"],
            "Unexpected dependency SDK/platforms: " + label)
    reference = "file:vendor/" + artifact
    package = json.loads((root / "package.json").read_text(encoding="utf-8"))
    require(package["dependencies"][name] == reference,
            "The app must use the committed pinned archive: " + name)
    raw = (root / "vendor" / artifact).read_bytes()
    require(hashlib.sha256(raw).hexdigest() == pin["sha256"],
            "Pinned archive checksum differs: " + name)
    integrity = "sha512-" + base64.b64encode(hashlib.sha512(raw).digest()).decode()
    require(integrity == pin["integrity"], "Pinned npm integrity differs: " + name)
    lock = json.loads((root / "package-lock.json").read_text(encoding="utf-8"))
    entry = lock["packages"]["node_modules/" + name]
    require(entry["version"] == version and entry["integrity"] == integrity and
            entry["resolved"] == reference and
            lock["packages"][""]["dependencies"][name] == reference,
            "Lockfile differs from the committed archive: " + name)
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
        members = archive.getmembers()
        require(len(members) == len({item.name for item in members}) and
                all(item.isfile() and safe_name(item.name) for item in members),
                "Pinned archive contains duplicate, nonregular or unsafe entries: " + name)
        files = {item.name.removeprefix("package/"): archive.extractfile(item).read()
                 for item in members}
    require({"package.json", "LICENSE", "dist.zip", "src/js/index.js"} <= files.keys(),
            "Pinned archive omits required package files: " + name)
    info = json.loads(files["package.json"])
    require(info["name"] == name and info["version"] == version,
            "Pinned package metadata differs: " + name)
    require(not info["pebble"].get("messageKeys"),
            "Package-owned keys could renumber existing app settings: " + name)
    return pin, files
