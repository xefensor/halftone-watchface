#!/usr/bin/env python3
"""Permission-package exact SDK payloads with deterministic license documents."""

from pathlib import Path
import hashlib
import json
import zipfile
import subprocess
import os
from repo_workflow import require_new_artifacts
from release_licenses import license_payloads
from release_js import prepare_js, zip_payloads

root = Path(__file__).resolve().parents[1]
pkg = json.loads((root / "package.json").read_text())
# The stock SDK names its development bundle after the checkout directory.
source = root / "build" / (root.name + ".pbw")
output = Path(os.environ.get("PEBBLE_BUILD_OUTPUT", str(root / "build/candidate"))).resolve()
target = output / ("Halftone-" + pkg["version"] + ".pbw")
if output == (root / "dist").resolve():
    require_new_artifacts([target, target.with_name("Halftone-" + pkg["version"] + "-debug.zip")])
target.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(
    [
        "python3",
        str(root / "scripts/bundle-js.py"),
        str(root / "src/plugin/index.js"),
        str(root / "build/plugin.js"),
    ],
    check=True,
    cwd=root,
)
subprocess.run(["python3", str(root / "scripts/generate-config.py")], check=True, cwd=root)
licenses = license_payloads(root)
with zipfile.ZipFile(source) as sdk:
    assert sdk.testzip() is None
    assert len(sdk.namelist()) == len(set(sdk.namelist())) == 6
    info = json.loads(sdk.read("appinfo.json"))
    assert info["uuid"] == pkg["pebble"]["uuid"]
    assert info["versionLabel"] == pkg["version"]
    assert info["targetPlatforms"] == ["emery"]
    assert info["watchapp"]["watchface"] is True
    info["manifestVersion"] = 2
    info["usesPermissions"] = pkg["pebble"]["usesPermissions"]
    info["plugin"] = pkg["pebble"]["plugin"]
    info["configPage"] = "config.html"
    payloads = {name: sdk.read(name) for name in sdk.namelist() if not name.endswith(".map")}
    payloads["appinfo.json"] = (
        json.dumps(info, sort_keys=True, separators=(",", ":")) + "\n"
    ).encode()
    assert not set(payloads).intersection(licenses)
    payloads.update(licenses)
    payloads["config.html"] = (root / "config.html").read_bytes()
    runtime, debug_payloads = prepare_js(
        root,
        pkg["version"],
        sdk.read("pebble-js-app.js"),
        sdk.read("pebble-js-app.js.map"),
        (root / "build/plugin.js").read_bytes(),
    )
    payloads.update(runtime)
    target.write_bytes(zip_payloads(payloads))
    debug = target.with_name("Halftone-" + pkg["version"] + "-debug.zip")
    debug.write_bytes(zip_payloads(debug_payloads))
    with zipfile.ZipFile(target) as result:
        assert result.testzip() is None
        assert set(result.namelist()) == (set(sdk.namelist()) - {"pebble-js-app.js.map"}) | set(
            licenses
        ) | {"plugin.js", "config.html"}
        for name in sdk.namelist():
            if name not in ("appinfo.json", "pebble-js-app.js", "pebble-js-app.js.map"):
                assert sdk.read(name) == result.read(name)
        for name, data in licenses.items():
            assert result.read(name) == data
print(target)
print(hashlib.sha256(target.read_bytes()).hexdigest())
print(debug)
print(hashlib.sha256(debug.read_bytes()).hexdigest())

(target.parent / "SHA256SUMS.txt").write_text(
    "".join(
        hashlib.sha256(p.read_bytes()).hexdigest() + "  " + p.name + "\n" for p in (target, debug)
    )
)
