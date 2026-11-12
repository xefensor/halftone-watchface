#!/usr/bin/env python3
"""Build and permission-package a local Halftone candidate without publication."""

from pathlib import Path
import subprocess
import os

root = Path(__file__).resolve().parents[1]
from repo_workflow import build_output

output_directory = build_output(root, "Halftone")
subprocess.run(["pebble", "clean"], cwd=root, check=True)
subprocess.run(["python3", "scripts/bundle-js.py", "src/plugin/index.js", "build/plugin.js"], cwd=root, check=True)
(root / "plugin.js").write_bytes((root / "build/plugin.js").read_bytes())
for command in (
    ["python3", "scripts/generate-config.py"],
    ["pebble", "build"],
    ["python3", "scripts/package-release.py"],
):
    subprocess.run(
        command,
        cwd=root,
        check=True,
        env={**os.environ, "PEBBLE_BUILD_OUTPUT": str(output_directory)},
    )

from repo_workflow import record_build
import json

version = json.loads((root / "package.json").read_text())["version"]
record_build(
    root,
    output_directory / ("Halftone-" + version + ".pbw"),
    output_directory / ("Halftone-" + version + "-debug.zip"),
)
