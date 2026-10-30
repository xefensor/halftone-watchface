#!/usr/bin/env python3
"""Add the plugin-consumer permission manifest to an already-built Halftone PBW.

Run `pebble build` first, then `python3 scripts/package-beta.py`. The stock SDK
may omit the new permission fields; this follows Pebble's pack-plugin-pbw.py
approach without changing watch binaries, resources, or bundled JavaScript.
"""

import argparse
import json
import os
from pathlib import Path
import re
import tempfile
import zipfile


def default_input(project, package):
    """SDK releases use either the package name or project-directory name."""
    candidates = list(dict.fromkeys([
        project / "build" / (package["name"] + ".pbw"),
        project / "build" / (project.name + ".pbw"),
    ]))
    matches = []
    for candidate in candidates:
        if not candidate.is_file():
            continue
        try:
            with zipfile.ZipFile(candidate) as archive:
                info = json.loads(archive.read("appinfo.json"))
            if (info.get("uuid") == package["pebble"]["uuid"] and
                    info.get("versionLabel") == package["version"]):
                matches.append(candidate)
        except (ValueError, KeyError, zipfile.BadZipFile):
            continue
    if len(matches) == 1:
        return matches[0]
    if matches:
        raise ValueError("multiple matching SDK PBWs found; select one with --input")
    raise ValueError("no matching SDK PBW found in build/; run pebble build or select --input")


def package_beta(project, source, output):
    project, source, output = map(Path, (project, source, output))
    package = json.loads((project / "package.json").read_text(encoding="utf-8"))
    pebble = package["pebble"]
    permissions = pebble.get("usesPermissions")
    if not isinstance(permissions, list) or "Location" not in permissions:
        raise ValueError("package.json must declare usesPermissions including Location")
    if not re.fullmatch(r"\d+\.\d+\.\d+", package["version"]):
        raise ValueError("use a numeric SDK version; the filename identifies this as a beta")
    if source.resolve() == output.resolve():
        raise ValueError("output must differ from the original SDK-built PBW")

    with zipfile.ZipFile(source) as archive:
        entries = archive.infolist()
        names = [entry.filename for entry in entries]
        if len(names) != len(set(names)):
            raise ValueError("input PBW contains duplicate ZIP entries")
        if "appinfo.json" not in names or "pebble-js-app.js" not in names:
            raise ValueError("input must be an SDK-built watchface PBW with JavaScript")
        if archive.testzip() is not None:
            raise ValueError("input PBW failed its ZIP integrity check")
        payload = {entry.filename: archive.read(entry) for entry in entries}
        appinfo = json.loads(payload["appinfo.json"])

    if appinfo.get("uuid") != pebble["uuid"]:
        raise ValueError("PBW UUID differs from package.json; refusing to change app identity")
    if appinfo.get("versionLabel") != package["version"]:
        raise ValueError("PBW version differs from package.json; run pebble build again")
    if appinfo.get("watchapp", {}).get("watchface") is not True:
        raise ValueError("input PBW is not a watchface")
    if appinfo.get("targetPlatforms") != pebble.get("targetPlatforms"):
        raise ValueError("PBW platforms differ from package.json; run pebble build again")

    appinfo["manifestVersion"] = 2
    appinfo["usesPermissions"] = permissions
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=".halftone-beta-", suffix=".pbw", dir=output.parent)
    os.close(descriptor)
    try:
        with zipfile.ZipFile(temporary, "w") as archive:
            for entry in entries:
                data = (json.dumps(appinfo, indent=2, ensure_ascii=False) + "\n").encode("utf-8") \
                    if entry.filename == "appinfo.json" else payload[entry.filename]
                archive.writestr(entry, data)
        with zipfile.ZipFile(temporary) as archive:
            if archive.testzip() is not None or archive.namelist() != names:
                raise ValueError("output PBW failed ZIP validation")
            packaged_info = json.loads(archive.read("appinfo.json"))
            if packaged_info != appinfo:
                raise ValueError("output permission manifest differs from the requested manifest")
            for name in names:
                if name != "appinfo.json" and archive.read(name) != payload[name]:
                    raise ValueError("packaging changed an SDK-built payload: " + name)
        os.replace(temporary, output)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return output


def main():
    project = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="SDK-built PBW (default: detect matching package/project PBW in build/)")
    parser.add_argument("--output", type=Path, help="Beta PBW output path")
    args = parser.parse_args()
    package = json.loads((project / "package.json").read_text(encoding="utf-8"))
    output = args.output or project / "dist" / ("Halftone-" + package["version"] + "-beta.1.pbw")
    try:
        source = args.input or default_input(project, package)
        result = package_beta(project, source, output)
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        parser.exit(1, "Cannot package beta: " + str(error) + "\n")
    print("Packaged " + str(result))
    print("Verified manifestVersion 2, declared permissions, original UUID and unchanged SDK payloads.")


if __name__ == "__main__":
    main()
